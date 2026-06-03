import { scheduleJob } from "node-schedule";
import "./fetchLayoffs";
import { expirePromoSubscriptions } from "./expirePromoSubscriptions";

/** Layoff fetch scheduler starts on `fetchLayoffs` import; promo expiry runs here. */
export function allCronjobs(): void {
  const runPromoExpiry = () => {
    void expirePromoSubscriptions().catch((err) => {
      console.error("expirePromoSubscriptions:", err);
    });
  };

  setTimeout(runPromoExpiry, 60_000);

  scheduleJob("15 * * * *", async () => {
    console.log(`⏰ [${new Date().toISOString()}] Promo subscription expiry check`);
    await expirePromoSubscriptions();
  });

  console.log("✅ Promo expiry cron scheduled (hourly at :15, first run ~60s after boot)");
}
