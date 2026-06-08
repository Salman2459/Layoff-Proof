import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Crown, Menu, Sparkles, X } from "lucide-react";
import { LayoffProofLogo } from "@/components/LayoffProofLogo";
import { cn } from "@/lib/utils";
import { layoffProofNavItems } from "./layoffproof-nav";

type LayoffProofLayoutProps = {
  children: React.ReactNode;
  activeNavId?: string;
};

export function LayoffProofLayout({ children, activeNavId = "dashboard" }: LayoffProofLayoutProps) {
  const [path] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="layoffproof-root flex min-h-screen bg-[#f4f6fb] font-[Inter,system-ui,sans-serif]">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[#e8ecf4] bg-white px-4 py-5 transition-transform duration-200 lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="text-sm font-semibold text-[#1e293b]">Menu</span>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f8fafc]"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Link
          href="/dashboard"
          className="mb-8 flex items-center gap-2 px-2 no-underline"
          onClick={() => setMobileNavOpen(false)}
        >
          <LayoffProofLogo
            iconClassName="h-9 w-9 text-sm"
            textClassName="text-[15px] font-semibold tracking-tight"
          />
          <Sparkles className="h-4 w-4 shrink-0 text-[#a78bfa]" strokeWidth={2} />
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {layoffProofNavItems.map((item) => {
            const isActive =
              item.id === activeNavId ||
              (item.match ? item.match(path) : path === item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg py-2.5 text-[13px] font-medium no-underline transition-colors",
                  isActive
                    ? "border-l-[3px] border-[#6366f1] bg-[#eef2ff] pl-[9px] pr-3 text-[#4f46e5]"
                    : "px-3 text-[#64748b] hover:bg-[#f8fafc] hover:text-[#334155]"
                )}
              >
                <Icon
                  className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-[#6366f1]")}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#5b21b6] p-4 shadow-lg shadow-indigo-200/50">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <Crown className="h-5 w-5 text-amber-300" fill="currentColor" />
          </div>
          <p className="text-sm font-semibold leading-snug text-white">Upgrade to Premium</p>
          <p className="mt-1 text-[11px] leading-relaxed text-indigo-100/90">
            Unlock unlimited AI tools & auto apply
          </p>
          <Link
            href="/subscribe"
            onClick={() => setMobileNavOpen(false)}
            className="mt-3 flex w-full items-center justify-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#4f46e5] no-underline shadow-sm transition hover:bg-indigo-50"
          >
            Upgrade Now
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-[248px]">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#e8ecf4] bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2e8f0] text-[#334155]"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="no-underline">
            <LayoffProofLogo
              iconClassName="h-8 w-8 text-xs"
              textClassName="text-sm font-semibold"
            />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
