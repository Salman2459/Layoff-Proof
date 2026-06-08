import { FileText, Shield, BarChart3 } from "lucide-react";

/** Decorative hero graphics matching the LayoffProof mockup */
export function LayoffProofHeroIllustration() {
  return (
    <div className="relative hidden h-full min-h-[200px] w-[280px] shrink-0 lg:block">
      <div className="absolute right-4 top-2 rotate-[-6deg] rounded-xl border border-white/20 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500" />
          <div>
            <div className="h-2 w-16 rounded bg-slate-200" />
            <div className="mt-1 h-1.5 w-12 rounded bg-slate-100" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded bg-slate-100" />
          <div className="h-1.5 w-4/5 rounded bg-slate-100" />
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          92% Match
        </div>
      </div>

      <div className="absolute right-16 top-20 rotate-[4deg] rounded-lg border border-white/25 bg-white/10 p-2.5 shadow-lg backdrop-blur-md">
        <FileText className="h-8 w-8 text-white/90" strokeWidth={1.5} />
      </div>

      <div className="absolute bottom-6 right-8 w-[140px] rotate-[-2deg] rounded-xl border border-white/20 bg-white/90 p-3 shadow-xl">
        <div className="mb-2 flex items-end justify-between gap-1">
          {[40, 65, 45, 80, 55].map((h, i) => (
            <div
              key={i}
              className="w-4 rounded-t bg-gradient-to-t from-indigo-500 to-violet-400"
              style={{ height: `${h * 0.35}px` }}
            />
          ))}
        </div>
        <BarChart3 className="h-3 w-3 text-indigo-400" />
      </div>

      <div className="absolute bottom-16 right-32 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/90 shadow-lg">
        <Shield className="h-5 w-5 text-white" strokeWidth={2} />
      </div>
    </div>
  );
}
