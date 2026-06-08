/** Welcome / platform overview video (same as elevate landing hero). */
const WELCOME_VIDEO_EMBED =
  "https://www.youtube-nocookie.com/embed/odnex9mQJI4?rel=0&modestbranding=1&playsinline=1";

export function LandingWelcomeVideo() {
  return (
    <div id="welcome-video" className="relative w-full max-w-[560px] scroll-mt-28">
      <div
        className="pointer-events-none absolute -inset-3 rounded-[32px] bg-gradient-to-br from-[#5D5FEF]/12 via-indigo-100/30 to-violet-100/20"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#0f172a] shadow-[0_28px_56px_-16px_rgba(15,23,42,0.14),0_12px_24px_-8px_rgba(93,95,239,0.12)]">
        <div className="aspect-video w-full">
          <iframe
            src={WELCOME_VIDEO_EMBED}
            title="Layoff Proof welcome video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
