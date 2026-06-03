import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, getQueryFn } from "@/lib/queryClient";
import {
  hasSubscriberAccess,
  type StripeSubscriptionPayload,
  type SubscriptionUser,
} from "@/lib/subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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

function formatMoney(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

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

function statusVariant(
  status: string | null | undefined,
  cancelAtPeriodEnd?: boolean,
): "default" | "secondary" | "destructive" | "outline" {
  if (cancelAtPeriodEnd) return "outline";
  const s = (status ?? "").toLowerCase();
  if (s === "active" || s === "trialing") return "default";
  if (s === "past_due" || s === "incomplete") return "destructive";
  return "secondary";
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
    if (!catalog.length) return undefined;
    if (currentProductId) {
      const byStripe = catalog.find((p) => p.id === currentProductId);
      if (byStripe) return byStripe;
    }
    if (purchasedPlanId?.startsWith("prod_")) {
      return catalog.find((p) => p.id === purchasedPlanId);
    }
    return undefined;
  }, [catalog, currentProductId, purchasedPlanId]);

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

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">Please sign in to manage your subscription.</p>
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalHeader />

      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Subscription</h1>
          <p className="text-gray-600">
            View your current plan, billing status, and cancel your subscription.
          </p>
        </div>

        {!hasAccess ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                You do not have an active paid subscription yet.
              </p>
              <Button asChild className="lp-gradient-fill text-primary-foreground border-0">
                <Link href="/subscribe">
                  View plans
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-2 border-emerald-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Current plan
                  </span>
                  <Badge variant={statusVariant(stripeStatus || dbStatus, cancelAtPeriodEnd)}>
                    {statusLabel(stripeStatus || dbStatus, cancelAtPeriodEnd)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentPlan?.name ?? "Layoff Proof subscription"}
                  </p>
                  {currentPlan?.description ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentPlan.description}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Price
                    </p>
                    <p className="text-lg font-semibold text-foreground mt-1">
                      {formatMoney(currentPlan?.default_price?.unit_amount ?? null)}
                      {currentPlan?.default_price?.recurring?.interval ? (
                        <span className="text-sm font-normal text-muted-foreground">
                          {" "}
                          / {currentPlan.default_price.recurring.interval}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {cancelAtPeriodEnd ? "Access ends" : "Renews / ends"}
                    </p>
                    <p className="text-lg font-semibold text-foreground mt-1">
                      {formatDate(renewalOrEndDate)}
                    </p>
                  </div>
                </div>

                {hasAccess && (
                  <div
                    className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                      cancelAtPeriodEnd
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-emerald-50 border-emerald-200 text-emerald-900"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      {cancelAtPeriodEnd
                        ? `Your plan stays active until ${formatDate(renewalOrEndDate)}. After that, paid tools will be locked and you will not be charged again.`
                        : "You have full access to AI career tools on your current plan."}
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button variant="outline" asChild className="flex-1">
                    <Link href="/subscribe">Change plan</Link>
                  </Button>

                  {canCancel && (
                    <AlertDialog
                      open={cancelDialogOpen}
                      onOpenChange={setCancelDialogOpen}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={cancelMutation.isPending}
                        >
                          Cancel subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your subscription will stay active until the end of your
                            current billing period
                            {renewalOrEndDate
                              ? ` (${formatDate(renewalOrEndDate)})`
                              : ""}
                            . You will not be charged again after that date. You keep
                            full access until then.
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
                  )}
                </div>

                {cancelAtPeriodEnd && (
                  <p className="text-xs text-muted-foreground">
                    Cancellation is already scheduled. Access ends on{" "}
                    {formatDate(renewalOrEndDate)}.
                  </p>
                )}
                {!canCancel && !cancelAtPeriodEnd && hasAccess && (
                  <p className="text-xs text-muted-foreground">
                    This subscription is no longer active. Visit{" "}
                    <Link href="/subscribe" className="text-primary underline">
                      Subscribe
                    </Link>{" "}
                    to start a new plan.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">All available plans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {catalog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No plans loaded.</p>
                ) : (
                  catalog.map((plan) => {
                    const isCurrent =
                      plan.id === currentProductId ||
                      plan.id === purchasedPlanId;
                    return (
                      <div
                        key={plan.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          isCurrent
                            ? "border-emerald-500 bg-emerald-50/50"
                            : "border-border"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-foreground">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatMoney(plan.default_price?.unit_amount ?? null)}
                            {plan.default_price?.recurring?.interval
                              ? ` / ${plan.default_price.recurring.interval}`
                              : ""}
                          </p>
                        </div>
                        {isCurrent ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">
                            Selected
                          </Badge>
                        ) : null}
                      </div>
                    );
                  })
                )}
                <Button variant="link" asChild className="px-0 h-auto">
                  <Link href="/subscribe">Upgrade or change plan on Subscribe →</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
