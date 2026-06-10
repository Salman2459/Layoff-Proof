import { approveEligibleAffiliateCommissions } from "../affiliateService";

/** Moves pending commissions past their 30-day hold to approved. */
export async function runApproveAffiliateCommissions(): Promise<void> {
  const count = await approveEligibleAffiliateCommissions();
  if (count > 0) {
    console.log(`✅ Approved ${count} affiliate commission(s)`);
  }
}
