import { Link } from "wouter";
import { LayoutDashboard } from "lucide-react";
import { LayoffProofLogo } from "@/components/LayoffProofLogo";
import { useAuth } from "@/hooks/useAuth";
import { NAV_LINKS } from "./layoffproof-landing-data";

export function LayoffProofLandingNav() {
  const { isAuthenticated } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-[#eef0f4] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6 lg:px-8">
        <Link href="/" className="no-underline">
          <LayoffProofLogo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-1 text-[14px] font-medium text-[#475569] transition hover:text-[#5D5FEF]"
            >
              {item.label}
              {/* {["Features", "Tools", "Templates", "Resources"].includes(item.label) && (
                <ChevronDown className="h-3.5 w-3.5 opacity-50" strokeWidth={2} />
              )} */}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#5D5FEF] px-5 text-[14px] font-semibold text-white no-underline shadow-sm transition hover:bg-[#4F46E5]"
            >
              <LayoutDashboard className="h-4 w-4" strokeWidth={2} />
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-[14px] font-semibold text-[#475569] no-underline transition hover:text-[#5D5FEF] sm:inline"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#5D5FEF] px-5 text-[14px] font-semibold text-white no-underline shadow-sm transition hover:bg-[#4F46E5]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
