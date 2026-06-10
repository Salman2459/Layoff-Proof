import type { Express } from "express";
import { isAuthenticatedAny } from "./passwordAuth";
import { getAffiliateMe } from "./affiliateService";

export function setupAffiliateRoutes(app: Express): void {
  app.get("/api/affiliate/me", isAuthenticatedAny, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const data = await getAffiliateMe(userId, req);
      res.json(data);
    } catch (error) {
      console.error("GET /api/affiliate/me error:", error);
      res.status(500).json({ message: "Failed to load affiliate data" });
    }
  });
}
