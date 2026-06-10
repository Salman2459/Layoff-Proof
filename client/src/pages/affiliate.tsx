import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Handshake, Loader2, Users, DollarSign } from "lucide-react";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofPageHeader } from "@/components/layoffproof/LayoffProofPageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AffiliateMeResponse = {
  referral_code: string;
  referral_link: string;
  commission_amount: number;
  total_referrals: number;
  active_referrals: number;
  pending_commission: number;
  approved_commission: number;
  paid_commission: number;
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-[0_2px_16px_rgba(15,23,42,0.05)]">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#ede9fe]">
        <Icon className="h-4 w-4 text-[#8b5cf6]" strokeWidth={2} />
      </div>
      <p className="text-2xl font-bold text-[#0f172a]">{value}</p>
      <p className="mt-1 text-sm text-[#64748b]">{label}</p>
    </div>
  );
}

export default function AffiliatePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<AffiliateMeResponse | null>({
    queryKey: ["/api/affiliate/me"],
    queryFn: getQueryFn<AffiliateMeResponse | null>({ on401: "returnNull" }),
    enabled: !!user,
  });

  const handleCopy = async () => {
    if (!data?.referral_link) return;
    try {
      await navigator.clipboard.writeText(data.referral_link);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <LayoffProofLayout activeNavId="affiliate">
      <LayoffProofPageHeader
        title="Affiliate Program"
        subtitle="Share your link and earn commission when friends subscribe."
      />

      <div className="px-8 py-6">
        {authLoading || isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
          </div>
        ) : error || !data ? (
          <div className="rounded-2xl border border-[#e8ecf4] bg-white p-8 text-center text-[#64748b]">
            Unable to load affiliate data. Please try again later.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-[0_2px_16px_rgba(15,23,42,0.05)] sm:p-7">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ede9fe]">
                  <Handshake className="h-4 w-4 text-[#8b5cf6]" strokeWidth={2} />
                </div>
                <h2 className="text-lg font-bold text-[#0f172a]">Your Referral Link</h2>
              </div>
              <p className="mb-4 text-sm text-[#64748b]">
                Share this link with friends. When they sign up and subscribe, you earn{" "}
                <span className="font-semibold text-[#334155]">
                  {formatMoney(data.commission_amount)}
                </span>{" "}
                per referral (after a 30-day hold).
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  readOnly
                  value={data.referral_link}
                  className="h-11 flex-1 rounded-xl border-[#e2e8f0] bg-[#f8fafc] font-mono text-sm text-[#334155]"
                />
                <Button
                  type="button"
                  onClick={handleCopy}
                  className="h-11 shrink-0 rounded-xl bg-[#8b5cf6] px-5 hover:bg-[#7c3aed]"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-3 text-xs text-[#94a3b8]">
                Referral code: <span className="font-mono font-medium">{data.referral_code}</span>
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-base font-semibold text-[#0f172a]">Your Stats</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Total Referrals" value={data.total_referrals} icon={Users} />
                <StatCard label="Active Referrals" value={data.active_referrals} icon={Users} />
                <StatCard
                  label="Pending Commission"
                  value={formatMoney(data.pending_commission)}
                  icon={DollarSign}
                />
                <StatCard
                  label="Approved Commission"
                  value={formatMoney(data.approved_commission)}
                  icon={DollarSign}
                />
                <StatCard
                  label="Paid Commission"
                  value={formatMoney(data.paid_commission)}
                  icon={DollarSign}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoffProofLayout>
  );
}
