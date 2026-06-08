import type { ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Check,
  Play,
  Star,
  Rocket,
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
} from "lucide-react";
import { LandingToolPreviewArt } from "@/components/landing/LandingToolPreviewArt";
import { LayoffProofLogo } from "@/components/LayoffProofLogo";
import { LayoffProofLandingNav } from "@/components/landing/LayoffProofLandingNav";
import { LandingPricingSection } from "@/components/landing/LandingPricingSection";
import { LandingWelcomeVideo } from "@/components/landing/LandingWelcomeVideo";
import {
  FEATURE_CARDS,
  HOW_IT_WORKS,
  TOOL_PREVIEWS,
  TESTIMONIALS,
  FOOTER_COLUMNS,
  TRUST_LOGOS,
} from "@/components/landing/layoffproof-landing-data";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#5D5FEF]">
      {children}
    </span>
  );
}

export default function LayoffProofLandingPage() {
  const { isAuthenticated } = useAuth();
  const primaryCtaHref = isAuthenticated ? "/dashboard" : "/signup";
  const primaryCtaLabel = isAuthenticated ? "Dashboard" : "Get Started";

  return (
    <div className="layoffproof-landing min-h-screen bg-white font-[Inter,system-ui,sans-serif] text-[#0f172a]">
      <LayoffProofLandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#fafbff] to-white pb-16 pt-12 lg:pb-24 lg:pt-16">
        <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-[#5D5FEF]/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div className="max-w-xl">
            <SectionBadge>AI-Powered Career Platform</SectionBadge>
            <h1 className="mt-5 text-[40px] font-bold leading-[1.1] tracking-tight text-[#0f172a] sm:text-[48px] lg:text-[52px]">
              Land More Interviews.{" "}
              <span className="text-[#5D5FEF]">Get Hired Faster.</span>
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-[#64748b]">
              Build standout resumes, optimize LinkedIn, auto-apply to jobs, and practice
              interviews — all powered by AI in one career copilot.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={primaryCtaHref}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#5D5FEF] px-6 text-[15px] font-semibold text-white no-underline shadow-md shadow-indigo-200/50 transition hover:bg-[#4F46E5]"
              >
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#welcome-video"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-6 text-[15px] font-semibold text-[#334155] no-underline transition hover:bg-[#f8fafc]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef2ff]">
                  <Play className="h-3.5 w-3.5 text-[#5D5FEF]" fill="#5D5FEF" />
                </span>
                See How It Works
              </a>
            </div>
            <ul className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {[
                "AI resume & cover letter builder",
                "LinkedIn profile optimization",
                "Interview prep & job tracking",
              ].map((text) => (
                <li key={text} className="flex items-center gap-2 text-[13px] text-[#64748b]">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center lg:justify-end">
            <LandingWelcomeVideo />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-[#f1f5f9] bg-[#fafbfc] py-10">
        <p className="text-center text-[14px] font-medium text-[#94a3b8]">
          Trusted by 100,000+ job seekers worldwide
        </p>
        <div className="mx-auto mt-8 flex max-w-[1100px] flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6">
          {TRUST_LOGOS.map((name) => (
            <span
              key={name}
              className="text-[15px] font-semibold tracking-tight text-[#cbd5e1] transition hover:text-[#94a3b8]"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <SectionBadge>All-in-one Platform</SectionBadge>
            <h2 className="mt-4 text-[36px] font-bold tracking-tight text-[#0f172a] sm:text-[40px]">
              Everything you need to get hired
            </h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-sm transition hover:border-[#c7d2fe] hover:shadow-md"
                >
                  <div
                    className={cn(
                      "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
                      card.iconBg
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#0f172a]">{card.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#64748b]">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-24 bg-[#fafbff] py-20 lg:py-28"
      >
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <SectionBadge>Simple Process</SectionBadge>
            <h2 className="mt-4 text-[36px] font-bold tracking-tight text-[#0f172a] sm:text-[40px]">
              How Layoff Proof Works
            </h2>
          </div>
          <div className="relative mt-16">
            <div
              className="absolute left-0 right-0 top-8 hidden h-0.5 bg-[#e2e8f0] lg:block"
              aria-hidden
            />
            <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
              {HOW_IT_WORKS.map((item) => (
                <li key={item.step} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#5D5FEF] text-lg font-bold text-white shadow-md shadow-indigo-200/60">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-[15px] font-bold text-[#0f172a]">{item.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#64748b]">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Tool previews */}
      <section id="tools" className="scroll-mt-24 py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <SectionBadge>Powerful Tools</SectionBadge>
            <h2 className="mt-4 text-[36px] font-bold tracking-tight text-[#0f172a] sm:text-[40px]">
              Explore Our AI-Powered Tools
            </h2>
          </div>
          <div className="mt-16 space-y-24">
            {TOOL_PREVIEWS.map((tool, index) => {
              const Icon = tool.icon;
              const reversed = index % 2 === 1;
              return (
                <div
                  key={tool.id}
                  id={index === 0 ? "templates" : undefined}
                  className={cn(
                    "grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
                    reversed && "lg:[&>div:first-child]:order-2"
                  )}
                >
                  <div className={reversed ? "lg:pl-4" : "lg:pr-4"}>
                    <div
                      className={cn(
                        "mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm",
                        tool.iconBg
                      )}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <h3 className="text-[28px] font-bold tracking-tight text-[#0f172a]">
                      {tool.title}
                    </h3>
                    <p className="mt-3 text-[16px] leading-relaxed text-[#64748b]">
                      {tool.description}
                    </p>
                    <ul className="mt-5 space-y-2">
                      {tool.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-center gap-2 text-[14px] text-[#475569]"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5D5FEF]" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={tool.href}
                      className="mt-6 inline-flex items-center gap-1 text-[15px] font-semibold text-[#5D5FEF] no-underline hover:text-[#4F46E5]"
                    >
                      {tool.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <LandingToolPreviewArt id={tool.id} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <LandingPricingSection />

      {/* Testimonials */}
      <section id="resources" className="scroll-mt-24 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <SectionBadge>Success Stories</SectionBadge>
            <h2 className="mt-4 text-[36px] font-bold tracking-tight text-[#0f172a] sm:text-[40px]">
              Loved by Job Seekers
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <article
                key={t.name}
                className="flex flex-col rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-sm"
              >
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                      strokeWidth={0}
                    />
                  ))}
                </div>
                <p className="mt-4 flex-1 text-[15px] leading-relaxed text-[#475569]">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3 border-t border-[#f1f5f9] pt-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#818cf8] to-[#6366f1] text-xs font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#0f172a]">{t.name}</p>
                    <p className="text-[12px] text-[#94a3b8]">{t.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-10 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === 0 ? "w-6 bg-[#5D5FEF]" : "w-2 bg-[#cbd5e1]"
                )}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-8 rounded-3xl bg-[#5D5FEF] px-8 py-10 text-center shadow-xl shadow-indigo-300/30 sm:flex-row sm:items-center sm:text-left sm:px-12 lg:py-12">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <Rocket className="h-7 w-7 text-white" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-[24px] font-bold text-white sm:text-[28px]">
                  Ready to Accelerate Your Career?
                </h2>
                <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-indigo-100 sm:mx-0 mx-auto">
                  Join 100,000+ job seekers who are getting hired faster with Layoff Proof.
                </p>
              </div>
            </div>
            <Link
              href={primaryCtaHref}
              className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-6 text-[15px] font-semibold text-[#5D5FEF] no-underline shadow-md transition hover:bg-indigo-50 sm:w-auto"
            >
              {primaryCtaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e8ecf4] bg-white pb-10 pt-14">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
            <div>
              <Link href="/" className="no-underline">
                <LayoffProofLogo />
              </Link>
              <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-[#64748b]">
                Your AI career copilot — resumes, applications, and interviews in one place.
              </p>
              <div className="mt-5 flex gap-3">
                {[
                  { Icon: Twitter, label: "Twitter" },
                  { Icon: Linkedin, label: "LinkedIn" },
                  { Icon: Instagram, label: "Instagram" },
                  { Icon: Facebook, label: "Facebook" },
                ].map(({ Icon, label }) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e8ecf4] text-[#64748b] transition hover:border-[#5D5FEF] hover:text-[#5D5FEF]"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="text-[14px] font-bold text-[#0f172a]">{col.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[14px] text-[#64748b] no-underline transition hover:text-[#5D5FEF]"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-12 border-t border-[#f1f5f9] pt-8 text-center text-[13px] text-[#94a3b8]">
            © {new Date().getFullYear()} Layoff Proof. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
