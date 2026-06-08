import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import {
  Bookmark,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  FileText,
  Filter,
  LayoutGrid,
  Loader2,
  MapPin,
  MoreVertical,
  Search,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type JobBoardItem = {
  id: string;
  userId: string;
  platform: string | null;
  jobTitle: string | null;
  companyName: string | null;
  jobLocation: string | null;
  jobType: string | null;
  jobDescription: string | null;
  companyLink: string | null;
  salaryRange: string | null;
  createdAt: string;
  updatedAt: string;
  status?: "applied" | "saved";
};

type JobBoardTab = "all" | "applied" | "saved";

type JobBoardResponse = {
  items: JobBoardItem[];
  page: number;
  limit: number;
  total: number;
  search?: string;
  tab?: JobBoardTab;
  summary: {
    total: number;
    applied: number;
    saved: number;
    interviews: number;
  };
};

const TABS: { id: JobBoardTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "all", label: "All Jobs", icon: LayoutGrid },
  { id: "applied", label: "Applied", icon: Send },
  { id: "saved", label: "Saved", icon: Bookmark },
];

function inferSeniority(title: string | null): string {
  const t = String(title ?? "").toLowerCase();
  if (/\b(senior|sr\.?|lead|principal|staff|director)\b/.test(t)) return "Senior Level";
  if (/\b(junior|jr\.?|entry|intern|graduate)\b/.test(t)) return "Entry Level";
  return "Mid Level";
}

function platformStyle(platform: string | null): { bg: string; label: string } {
  const p = String(platform ?? "").toLowerCase();
  if (p.includes("linkedin")) return { bg: "bg-[#0a66c2]", label: "in" };
  if (p.includes("indeed")) return { bg: "bg-[#2164f3]", label: "I" };
  if (p.includes("glassdoor")) return { bg: "bg-[#0caa41]", label: "G" };
  if (p.includes("wellfound") || p.includes("angellist"))
    return { bg: "bg-[#000000]", label: "W" };
  if (p.includes("monster")) return { bg: "bg-[#6e46ae]", label: "M" };
  return { bg: "bg-[#6366f1]", label: (platform ?? "J").charAt(0).toUpperCase() };
}

function companyInitials(name: string | null): string {
  const parts = String(name ?? "Co")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function postedAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

function SummaryStat({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  loading,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#e8ecf4] bg-white px-4 py-3 shadow-sm">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          iconBg,
          iconColor
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div>
        <p className="text-lg font-bold leading-none text-[#0f172a]">
          {loading ? "—" : value}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-[#94a3b8]">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "applied" | "saved" }) {
  if (status === "applied") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <Check className="h-3 w-3" strokeWidth={2.5} />
        Applied
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <Bookmark className="h-3 w-3" strokeWidth={2} />
      Saved
    </span>
  );
}

export function JobBoardTable() {
  const [query, setQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [tab, setTab] = useState<JobBoardTab>("all");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(query.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [tab, limit]);

  const searchParam = debouncedSearch
    ? `&search=${encodeURIComponent(debouncedSearch)}`
    : "";

  const { data, isLoading, error } = useQuery<JobBoardResponse>({
    queryKey: ["/api/job-board", page, limit, debouncedSearch, tab],
    queryFn: async () => {
      return fetchJson<JobBoardResponse>(
        `/api/job-board?page=${page}&limit=${limit}&tab=${tab}${searchParam}`,
        { credentials: "include", cache: "no-store" },
      );
    },
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, safePage - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  const rangeStart = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const rangeEnd = Math.min(safePage * limit, total);

  return (
    <div className="rounded-2xl border border-[#e8ecf4] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {/* Header */}
      <div className="border-b border-[#e8ecf4] px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#6366f1] text-white shadow-sm shadow-indigo-200/60">
              <Briefcase className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0f172a]">Job Board</h1>
              <p className="mt-0.5 text-sm text-[#64748b]">
                Auto-apply jobs from your connected platforms.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat
              label="Total Jobs"
              value={data?.summary.total ?? 0}
              icon={FileText}
              iconBg="bg-[#f5f3ff]"
              iconColor="text-[#6366f1]"
              loading={isLoading}
            />
            <SummaryStat
              label="Applied"
              value={data?.summary.applied ?? 0}
              icon={Send}
              iconBg="bg-[#eff6ff]"
              iconColor="text-[#3b82f6]"
              loading={isLoading}
            />
            <SummaryStat
              label="Saved"
              value={data?.summary.saved ?? 0}
              icon={Bookmark}
              iconBg="bg-[#fdf2f8]"
              iconColor="text-[#ec4899]"
              loading={isLoading}
            />
            <SummaryStat
              label="Interviews"
              value={data?.summary.interviews ?? 0}
              icon={Calendar}
              iconBg="bg-[#ecfdf5]"
              iconColor="text-emerald-600"
              loading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="border-b border-[#e8ecf4] px-6 py-4 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
                  tab === id
                    ? "bg-[#f5f3ff] text-[#6366f1]"
                    : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#334155]"
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {label}
                {tab === id ? (
                  <span className="h-0.5 w-full absolute bottom-0 left-0 bg-[#6366f1] hidden" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="flex flex-1 items-center gap-3 lg:max-w-xl lg:justify-end">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search jobs by title, company, or location..."
                className="h-11 rounded-xl border-[#e2e8f0] bg-[#fafbff] pl-10 text-sm shadow-sm placeholder:text-[#94a3b8] focus-visible:border-[#a5b4fc] focus-visible:ring-[#c7d2fe]/50"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-xl border-[#e2e8f0] bg-white px-4 text-sm font-semibold text-[#6366f1] shadow-sm hover:bg-[#f5f3ff]"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#e8ecf4] bg-[#fafbff] text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
              {["Platform", "Title", "Company", "Location", "Type", "Salary", "Posted", "Status", ""].map(
                (col) => (
                  <th key={col || "actions"} className="px-4 py-3 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      {col}
                      {col && col !== "Status" && col !== "" ? (
                        <ChevronDown className="h-3 w-3 opacity-40" />
                      ) : null}
                    </span>
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-red-600">
                  {(error as Error).message}
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-[#64748b]">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="mt-2 text-sm">Loading jobs…</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-[#64748b]">
                  No jobs found. Save roles from auto-apply to see them here.
                </td>
              </tr>
            ) : (
              rows.map((job) => {
                const platform = platformStyle(job.platform);
                const status = job.status ?? "saved";
                return (
                  <tr
                    key={job.id}
                    className="border-b border-[#f1f5f9] transition hover:bg-[#fafbff]/80"
                  >
                    <td className="px-4 py-4">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold text-white",
                          platform.bg
                        )}
                      >
                        {platform.label}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#0f172a]">{job.jobTitle ?? "—"}</p>
                      <p className="mt-0.5 text-[11px] text-[#94a3b8]">
                        {inferSeniority(job.jobTitle)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e8ecf4] bg-white text-[10px] font-bold text-[#64748b]">
                          {companyInitials(job.companyName)}
                        </div>
                        <span className="font-medium text-[#334155]">
                          {job.companyName ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 text-[#64748b]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
                        {job.jobLocation ?? "Remote"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-[#f5f3ff] px-2.5 py-1 text-[11px] font-semibold text-[#6366f1]">
                        {job.jobType ?? "Full-time"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-medium text-[#334155]">
                      {job.salaryRange ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-[#64748b]">
                      {postedAgo(job.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#64748b]"
                            aria-label="Job actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {job.companyLink ? (
                            <DropdownMenuItem
                              onClick={() => window.open(job.companyLink!, "_blank")}
                            >
                              Open job link
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(job.jobTitle ?? "")}
                          >
                            Copy title
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer pagination */}
      <div className="flex flex-col gap-4 border-t border-[#e8ecf4] px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-sm text-[#64748b]">
          {total === 0
            ? "No jobs to show"
            : `Showing ${rangeStart} to ${rangeEnd} of ${total} jobs`}
        </p>

        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#64748b] transition hover:bg-[#f8fafc] disabled:opacity-40"
          >
            Previous
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={cn(
                "h-8 min-w-8 rounded-lg px-2 text-sm font-semibold transition",
                n === safePage
                  ? "bg-[#f5f3ff] text-[#6366f1]"
                  : "text-[#64748b] hover:bg-[#f8fafc]"
              )}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#64748b] transition hover:bg-[#f8fafc] disabled:opacity-40"
          >
            Next
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 text-sm text-[#64748b]">
          <span>Jobs per page</span>
          <div className="relative">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-9 appearance-none rounded-lg border border-[#e2e8f0] bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-[#334155] shadow-sm outline-none focus:border-[#a5b4fc]"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
          </div>
        </div>
      </div>
    </div>
  );
}
