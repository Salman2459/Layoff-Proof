import type { ReactNode } from "react";
import { Link } from "wouter";
import { Check } from "lucide-react";
import { LayoffProofLogo } from "@/components/LayoffProofLogo";

const TRUST_ITEMS = [
  "AI resume & cover letter builder",
  "LinkedIn profile optimization",
  "Interview prep & job tracking",
] as const;

type AuthLayoutProps = {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-white font-[Inter,system-ui,sans-serif] text-[#0f172a]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#fafbff] via-white to-[#f0f1ff] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
          <div
            className="pointer-events-none absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#5D5FEF]/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl"
            aria-hidden
          />

          <Link href="/" className="relative z-10 no-underline">
            <LayoffProofLogo />
          </Link>

          <div className="relative z-10 max-w-lg">
            <span className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#5D5FEF]">
              AI-Powered Career Platform
            </span>
            <h2 className="mt-6 text-[38px] font-bold leading-[1.12] tracking-tight text-[#0f172a] xl:text-[42px]">
              Land More Interviews.{" "}
              <span className="text-[#5D5FEF]">Get Hired Faster.</span>
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#64748b]">
              Build standout resumes, optimize LinkedIn, auto-apply to jobs, and practice
              interviews — all in one career copilot.
            </p>
            <ul className="mt-8 space-y-3">
              {TRUST_ITEMS.map((text) => (
                <li key={text} className="flex items-center gap-2.5 text-[14px] text-[#64748b]">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-[13px] text-[#94a3b8]">
            © {new Date().getFullYear()} Layoff Proof
          </p>
        </aside>

        <div className="relative flex flex-col">
          <header className="flex h-16 items-center justify-between border-b border-[#eef0f4] px-6 lg:absolute lg:left-0 lg:right-0 lg:top-0 lg:z-10 lg:border-0 lg:bg-transparent lg:px-12 lg:pt-8">
            <Link href="/" className="no-underline lg:hidden">
              <LayoffProofLogo iconClassName="h-8 w-8 text-xs" textClassName="text-base font-bold" />
            </Link>
            <Link
              href="/"
              className="text-[13px] font-semibold text-[#64748b] no-underline transition hover:text-[#5D5FEF] lg:ml-auto"
            >
              ← Back to home
            </Link>
          </header>

          <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12 lg:py-16">
            <div className="w-full max-w-xl">
              <div className="rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="mb-8 hidden justify-center lg:flex">
                  <LayoffProofLogo />
                </div>
                <h1 className="text-[26px] font-bold tracking-tight text-[#0f172a] sm:text-[28px]">
                  {title}
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-[#64748b]">{description}</p>
                <div className="mt-7 space-y-5">{children}</div>
                {footer ? <div className="mt-6 border-t border-[#f1f5f9] pt-6">{footer}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fafbff] to-white font-[Inter,system-ui,sans-serif]">
      <div className="flex flex-col items-center gap-4">
        <LayoffProofLogo />
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e2e8f0] border-t-[#5D5FEF]" />
      </div>
    </div>
  );
}
