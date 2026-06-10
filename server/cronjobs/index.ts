import { scheduleJob } from "node-schedule";
import "./fetchLayoffs";
import { expirePromoSubscriptions } from "./expirePromoSubscriptions";
import { runApproveAffiliateCommissions } from "./approveAffiliateCommissions";

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

  const runAffiliateApproval = () => {
    void runApproveAffiliateCommissions().catch((err) => {
      console.error("approveAffiliateCommissions:", err);
    });
  };

  setTimeout(runAffiliateApproval, 90_000);

  scheduleJob("30 * * * *", async () => {
    console.log(`⏰ [${new Date().toISOString()}] Affiliate commission approval check`);
    await runApproveAffiliateCommissions();
  });

  console.log("✅ Promo expiry cron scheduled (hourly at :15, first run ~60s after boot)");
  console.log("✅ Affiliate commission approval cron scheduled (hourly at :30)");
}
