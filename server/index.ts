import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { allCronjobs } from "./cronjobs/index";
import { handleStripeWebhook } from "./stripeWebhook";
import cors from "cors";

allCronjobs();

const isProduction = process.env.NODE_ENV === "production";

const app = express();
app.set("env", isProduction ? "production" : "development");
app.use(cors());
app.use("/uploads", express.static(path.resolve("uploads")));
// Stripe webhooks require the raw body for signature verification.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    Promise.resolve(handleStripeWebhook(req, res)).catch(next);
  },
);

app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Production serves built assets from dist/public; dev uses Vite middleware.
  if (isProduction) {
    serveStatic(app);
    log("production mode: serving static assets from dist/public");
  } else {
    await setupVite(app, server);
    log("development mode: Vite dev server enabled");
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const portEnv = process.env.PORT;
  const basePort = parseInt(portEnv || "5000", 10);
  const devPortFallback = !isProduction && portEnv === undefined;

  let listenPort = basePort;
  const maxDevPort = basePort + 50;

  const tryListen = () => {
    server.removeAllListeners("error");
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (
        err.code === "EADDRINUSE" &&
        devPortFallback &&
        listenPort < maxDevPort
      ) {
        log(`port ${listenPort} in use, trying ${listenPort + 1}…`);
        listenPort += 1;
        tryListen();
        return;
      }
      throw err;
    });
    server.listen(listenPort, "127.0.0.1", () => {
      server.removeAllListeners("error");
      log(`serving on port ${listenPort}`);
    });
  };

  tryListen();
})();
