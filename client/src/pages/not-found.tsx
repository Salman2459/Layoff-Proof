import { Link } from "wouter";
import { ArrowLeft, Home, LayoutDashboard, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofLogo } from "@/components/LayoffProofLogo";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { label: "Resume Builder", href: "/resume-builder" },
  { label: "AI Auto Apply", href: "/auto-job-apply-dashboard" },
  { label: "Job Tracker", href: "/job-tracker" },
  { label: "Interview Prep", href: "/interview-preparation" },
] as const;

function NotFoundContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const homeHref = isAuthenticated ? "/dashboard" : "/";
  const homeLabel = isAuthenticated ? "Go to Dashboard" : "Back to Home";

  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-center px-6 py-16",
        isAuthenticated ? "min-h-[calc(100vh-80px)]" : "min-h-screen",
      )}
    >
      <div className="w-full max-w-lg text-center">
        <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6366f1]/20 to-[#7c3aed]/20 blur-xl"
            aria-hidden
          />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-[#e8ecf4] bg-white shadow-lg shadow-indigo-100/60">
            <span className="bg-gradient-to-br from-[#6366f1] to-[#7c3aed] bg-clip-text text-4xl font-black tracking-tight text-transparent">
              404
            </span>
          </div>
        </div>

        <span className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#6366f1]">
          Page not found
        </span>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#0f172a] sm:text-3xl">
          This page took a wrong turn
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-[#64748b] sm:text-base">
          The link may be broken, outdated, or the page may have been moved. Head back to
          your dashboard or pick a tool below to keep moving forward.
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={homeHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-6 text-sm font-semibold text-white no-underline shadow-sm transition hover:bg-[#4f46e5]"
          >
            {isAuthenticated ? (
              <LayoutDashboard className="h-4 w-4" />
            ) : (
              <Home className="h-4 w-4" />
            )}
            {homeLabel}
          </Link>
          <Link
            href={isAuthenticated ? "/resume-builder" : "/signup"}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-6 text-sm font-semibold text-[#334155] no-underline shadow-sm transition hover:bg-[#f8fafc]"
          >
            <Sparkles className="h-4 w-4 text-[#6366f1]" />
            {isAuthenticated ? "Open Resume Builder" : "Get Started "}
          </Link>
        </div>

        {isAuthenticated ? (
          <div className="mt-10 rounded-2xl border border-[#e8ecf4] bg-white p-5 text-left shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
              Popular destinations
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded-lg border border-[#f1f5f9] bg-[#fafbfc] px-3 py-2.5 text-sm font-medium text-[#334155] no-underline transition hover:border-[#c7d2fe] hover:bg-[#eef2ff] hover:text-[#6366f1]"
                  >
                    {item.label}
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-[#cbd5e1]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6366f1] no-underline hover:text-[#4f46e5]"
          >
            <ArrowLeft className="h-4 w-4" />
            Already have an account? Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

export default function NotFound() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center layoffproof-page-loader">
        <div className="layoffproof-loader-ring" aria-hidden />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <LayoffProofLayout>
        <NotFoundContent isAuthenticated />
      </LayoffProofLayout>
    );
  }

  return (
    <div className="layoffproof-page-loader min-h-screen font-[Inter,system-ui,sans-serif] text-[#0f172a]">
      <header className="border-b border-[#e8ecf4]/80 bg-white/80 px-6 py-4 backdrop-blur-sm">
        <Link href="/" className="inline-flex no-underline">
          <LayoffProofLogo />
        </Link>
      </header>
      <NotFoundContent isAuthenticated={false} />
    </div>
  );
}
