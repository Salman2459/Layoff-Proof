import { Link } from "wouter";
import { Bot, Settings } from "lucide-react";

const INTRO_VIDEO_EMBED =
  "https://www.youtube-nocookie.com/embed/O--eX6ahffM?rel=0&modestbranding=1&playsinline=1";

type AutoJobApplyHeroProps = {
  displayName: string;
};

export function AutoJobApplyHero({ displayName }: AutoJobApplyHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4338ca] via-[#6366f1] to-[#7c3aed] shadow-xl shadow-indigo-300/30">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div className="relative grid items-center gap-8 p-8 lg:grid-cols-[1fr_340px] lg:p-10">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-200" strokeWidth={2} />
            <span className="text-sm font-medium text-indigo-200">AI Auto Apply</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-white sm:text-[32px]">
            Auto Job Apply Dashboard 👋
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-indigo-100">
            Welcome back, {displayName}! Let AI handle the applications while you focus on
            preparing for interviews.
          </p>
          <Link
            href="/auto-job-apply"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-[14px] font-semibold text-[#4f46e5] no-underline shadow-md transition hover:bg-indigo-50"
          >
            <Settings className="h-4 w-4" />
            Edit Profile
          </Link>
        </div>

        <div className="relative">
          <div className="absolute -left-6 -top-6 hidden h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm lg:flex">
            <Bot className="h-10 w-10 text-white/90" strokeWidth={1.5} />
          </div>
          <div className="overflow-hidden rounded-xl border border-white/20 bg-black/20 shadow-2xl">
            <div className="aspect-video w-full">
              <iframe
                src={INTRO_VIDEO_EMBED}
                title="AI Auto Apply intro video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
