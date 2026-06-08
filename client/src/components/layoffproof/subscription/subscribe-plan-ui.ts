export function planTagline(name: string, description?: string | null): string {
  if (description?.trim()) return description.trim();
  if (name.includes("Radar")) return "Essential tools to scan jobs and apply smarter.";
  if (name.includes("Pro")) return "Advanced tools to stand out and get more interviews.";
  if (name.includes("Autopilot")) return "Full automation to save time and land more offers.";
  return "";
}

type CatalogPlan = { id: string; name: string };

function catalogPlanMatchesSlug(plan: CatalogPlan, slug: string): boolean {
  const n = plan.name.toLowerCase();
  const s = slug.toLowerCase().trim();
  if (!s || s === "free") return false;
  if (s.includes("autopilot") || s === "autopilot") return n.includes("autopilot");
  if (s.includes("radar") || s === "radar") return n.includes("radar");
  if (s === "pro" || s === "premium" || s.includes("-pro") || s.endsWith("pro")) {
    return n.includes(" - pro") || n.endsWith(" pro");
  }
  return n.includes(s);
}

/** Resolve which Stripe catalog product is the user's current plan. */
export function resolveCurrentCatalogPlanId(
  catalog: CatalogPlan[],
  opts: {
    hasAccess: boolean;
    currentProductId?: string | null;
    purchasedPlanId?: string | null;
    stripePlanLabel?: string | null;
  },
): string | null {
  if (!opts.hasAccess || catalog.length === 0) return null;

  const { currentProductId, purchasedPlanId, stripePlanLabel } = opts;

  if (currentProductId) {
    const byStripe = catalog.find((p) => p.id === currentProductId);
    if (byStripe) return byStripe.id;
  }

  if (purchasedPlanId?.startsWith("prod_")) {
    const byId = catalog.find((p) => p.id === purchasedPlanId);
    if (byId) return byId.id;
  }

  for (const slug of [purchasedPlanId, stripePlanLabel]) {
    if (!slug || slug === "free") continue;
    if (slug.startsWith("prod_")) continue;
    const bySlug = catalog.find((p) => catalogPlanMatchesSlug(p, slug));
    if (bySlug) return bySlug.id;
  }

  return null;
}

export function planCardActionLabel(opts: {
  isCurrent: boolean;
  isResumeEngine?: boolean;
  canManagePlan: boolean;
  planPriceCents: number;
  currentPlanPriceCents: number;
}): string {
  if (opts.isCurrent) return "Current plan";
  if (opts.isResumeEngine) return "Add Resume Engine";
  if (opts.canManagePlan) {
    if (opts.planPriceCents > opts.currentPlanPriceCents) return "Upgrade";
    if (opts.planPriceCents < opts.currentPlanPriceCents) return "Downgrade";
    return "Change plan";
  }
  return "Subscribe";
}

const filledPurpleBtn =
  "border-2 border-[#8b5cf6] bg-[#8b5cf6] text-white shadow-sm hover:border-[#7c3aed] hover:bg-[#7c3aed]";

const outlinePurpleBtn =
  "border-2 border-[#8b5cf6] bg-white text-[#8b5cf6] hover:border-[#7c3aed] hover:bg-[#8b5cf6] hover:text-white active:border-[#7c3aed] active:bg-[#7c3aed] active:text-white";

export function subscribeButtonClass(opts: {
  isSelected: boolean;
  isFeatured: boolean;
}): string {
  if (opts.isSelected || opts.isFeatured) {
    return filledPurpleBtn;
  }
  return outlinePurpleBtn;
}
