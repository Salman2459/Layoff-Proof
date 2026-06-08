import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofDashboardHeader } from "@/components/layoffproof/LayoffProofDashboardHeader";
import { ManageSubscriptionActive } from "@/components/layoffproof/subscription/ManageSubscriptionActive";
import { resolveCurrentCatalogPlanId } from "@/components/layoffproof/subscription/subscribe-plan-ui";
import { SubscriptionEmptyState } from "@/components/layoffproof/subscription/SubscriptionEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, getQueryFn } from "@/lib/queryClient";
import {
  hasSubscriberAccess,
  type StripeSubscriptionPayload,
  type SubscriptionUser,
} from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StripeCatalogProduct = {
  id: string;
  name: string;
  description?: string | null;
  default_price?: {
    unit_amount?: number | null;
    recurring?: { interval?: string | null } | null;
  } | null;
  metadata?: Record<string, string>;
};

type SubscriptionStatusResponse = {
  hasSubscription?: boolean;
  hasAccess?: boolean;
  status?: string | null;
  plan?: string | null;
  currentProductId?: string | null;
  subscriptionEndDate?: string | Date | null;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean;
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function statusLabel(
  status: string | null | undefined,
  cancelAtPeriodEnd?: boolean,
) {
  if (cancelAtPeriodEnd) return "Canceling at period end";
  const s = (status ?? "").toLowerCase();
  if (s === "active") return "Active";
  if (s === "trialing") return "Trial";
  if (s === "past_due") return "Past due";
  if (s === "canceled" || s === "cancelled") return "Canceled";
  if (s === "inactive") return "Inactive";
  if (s === "incomplete") return "Pending payment";
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "No subscription";
}

function greeting(first?: string | null, last?: string | null): string {
  return first?.trim() || last?.trim() || "there";
}

export default function ManageSubscription() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data: subStatus, isLoading: statusLoading } =
    useQuery<SubscriptionStatusResponse | null>({
      queryKey: ["/api/stripe/subscription-status"],
      queryFn: getQueryFn<SubscriptionStatusResponse | null>({ on401: "returnNull" }),
      enabled: !!user,
    });

  const { data: catalog = [], isLoading: catalogLoading } = useQuery<
    StripeCatalogProduct[]
  >({
    queryKey: ["/api/stripe/catalog"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/stripe/catalog");
      return Array.isArray(res) ? res : [];
    },
    enabled: !!user,
  });

  const hasAccess = hasSubscriberAccess({
    user: user as SubscriptionUser | undefined,
    stripePayload: subStatus as StripeSubscriptionPayload | undefined,
  });

  const purchasedPlanId = (user as SubscriptionUser | undefined)?.subscriptionPlan;
  const currentProductId =
    typeof subStatus?.currentProductId === "string"
      ? subStatus.currentProductId
      : null;

  const currentPlan = useMemo(() => {
    const planId = resolveCurrentCatalogPlanId(catalog, {
      hasAccess,
      currentProductId,
      purchasedPlanId,
      stripePlanLabel: subStatus?.plan,
    });
    return planId ? catalog.find((p) => p.id === planId) : undefined;
  }, [catalog, hasAccess, currentProductId, purchasedPlanId, subStatus?.plan]);

  const cancelAtPeriodEnd = !!subStatus?.cancelAtPeriodEnd;
  const stripeStatus = (subStatus?.status ?? "").toLowerCase();
  const dbStatus = (
    (user as SubscriptionUser | undefined)?.subscriptionStatus ?? ""
  ).toLowerCase();

  const renewalOrEndDate =
    subStatus?.currentPeriodEnd ??
    subStatus?.subscriptionEndDate ??
    (user as SubscriptionUser | undefined)?.subscriptionEndDate;

  const canCancel =
    !!user?.stripeSubscriptionId &&
    !cancelAtPeriodEnd &&
    !["canceled", "cancelled", "incomplete_expired"].includes(stripeStatus);

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/stripe/cancel-subscription"),
    onSuccess: (data: { currentPeriodEnd?: string; message?: string }) => {
      const endLabel = data?.currentPeriodEnd
        ? formatDate(data.currentPeriodEnd)
        : formatDate(renewalOrEndDate);
      toast({
        title: "Cancellation scheduled",
        description:
          data?.message ??
          `You keep full access until ${endLabel}. You will not be charged again after that.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/stripe/subscription-status"],
      });
      setCancelDialogOpen(false);
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not cancel",
        description: getApiErrorMessage(error, "Failed to cancel subscription."),
        variant: "destructive",
      });
    },
  });

  const isPageLoading = authLoading || statusLoading || catalogLoading;
  const name = greeting(user?.firstName, user?.lastName);
  const displayStatus = statusLabel(stripeStatus || dbStatus, cancelAtPeriodEnd);
  const isActiveStatus =
    ["active", "trialing"].includes(stripeStatus) ||
    ["active", "trialing"].includes(dbStatus);

  if (isPageLoading) {
    return (
      <LayoffProofLayout activeNavId="settings">
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
        </div>
      </LayoffProofLayout>
    );
  }

  if (!user) {
    return (
      <LayoffProofLayout activeNavId="settings">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <p className="mb-4 text-[#64748b]">Please sign in to manage your subscription.</p>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </LayoffProofLayout>
    );
  }

  const cancelDialog = (
    <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            Your subscription will stay active until the end of your current billing period
            {renewalOrEndDate ? ` (${formatDate(renewalOrEndDate)})` : ""}. You will not be
            charged again after that date. You keep full access until then.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>
            Keep subscription
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={cancelMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              cancelMutation.mutate();
            }}
          >
            {cancelMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Canceling…
              </>
            ) : (
              "Yes, cancel"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <LayoffProofLayout activeNavId="settings">
      <LayoffProofDashboardHeader greeting={name} />

      <main className="relative flex-1 overflow-hidden bg-white px-4 pb-10 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-[#ede9fe]/60 blur-3xl" />

        <div className="relative py-6">
          <h1 className="text-[26px] font-bold tracking-tight text-[#0f172a]">
            Manage Subscription
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            View your current plan, billing status, and cancel your subscription.
          </p>
        </div>

        {!hasAccess ? (
          <SubscriptionEmptyState />
        ) : (
          <ManageSubscriptionActive
            currentPlan={currentPlan}
            catalog={catalog}
            statusLabel={displayStatus}
            isActive={isActiveStatus}
            cancelAtPeriodEnd={cancelAtPeriodEnd}
            renewalOrEndDate={renewalOrEndDate}
            formatDate={formatDate}
            currentProductId={currentProductId}
            purchasedPlanId={purchasedPlanId}
            canCancel={canCancel}
            cancelPending={cancelMutation.isPending}
            onCancelClick={() => setCancelDialogOpen(true)}
          />
        )}

        {hasAccess ? cancelDialog : null}
      </main>
    </LayoffProofLayout>
  );
}
