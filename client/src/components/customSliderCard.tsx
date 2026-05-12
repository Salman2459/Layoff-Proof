import { useState } from "react";

const plans = [
  { jobs: 25, sub: "(Shield base)", price: 1900 },
  { jobs: 150, sub: "(Pro base)", price: 3400 },
  { jobs: 300, sub: undefined, price: 4900 },
  { jobs: 500, sub: "(Elite base)", price: 6400 },
  { jobs: 750, sub: undefined, price: 8400 },
  { jobs: 1000, sub: undefined, price: 10900 },
  { jobs: 1500, sub: undefined, price: 14400 },
  { jobs: 2000, sub: undefined, price: 17900 },
] as const;

export const CustomSliderCard = ({
  setPlans,
  setResumeEngineModalOpen,
  onCheckout,
}: {
  setPlans: (plans: any) => void;
  setResumeEngineModalOpen: (open: boolean) => void;
  onCheckout?: (opts: { addonPriceCents: number; jobsPerMonth: number }) => void;
}) => {
  const [index, setIndex] = useState(0);
  const current = plans[index];
  const max = plans.length - 1;
  const fillPct = max === 0 ? 0 : (index / max) * 100;

  const getMyPlan = () => {
    onCheckout?.({ addonPriceCents: current.price, jobsPerMonth: current.jobs });
  setPlans((prev: any) =>
    prev.map((p: any) => {
      if (p.isResumeEngine === true) {
        return {
          ...p,
          resumeEngineAddon: {
            jobsPerMonth: current.jobs,
            addonPriceCents: current.price,
          },
        };
      }
      return p;
    }),
  );
  // If we’re launching checkout inside the modal, keep it open.
  if (!onCheckout) setResumeEngineModalOpen(false);
  };


  return (
    <div className=" p-6 text-center">
      <div className="mb-4 flex flex-wrap justify-between gap-2 text-[10px] sm:text-sm">
        {plans.map((plan, i) => (
          <div
            key={plan.jobs}
            onClick={() => setIndex(i)}
            className={`flex min-w-[2.5rem] cursor-pointer flex-col items-center font-bold ${
              i === index ? "text-indigo-600" : "text-gray-400"
            }`}
          >
            <span className="text-base sm:text-lg">{plan.jobs.toLocaleString()}</span>
            {plan.sub ? <span className="mt-0.5 max-w-[4.5rem] font-normal leading-tight">{plan.sub}</span> : null}
          </div>
        ))}
      </div>

<div className="input-range">
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
        className="slider w-full cursor-pointer appearance-none"
        style={{
          background: `linear-gradient(
            to right,
            #4F46E5 0%,
            #4F46E5 ${fillPct}%,
            #E5E7EB ${fillPct}%,
            #E5E7EB 100%
          )`,
        }}
      />

</div>

      {/* Card */}
      <div className="mt-10 rounded-2xl border-2 border-indigo-500 p-6 shadow-md transition-all duration-300">
        <h2 className="text-2xl font-semibold">Shield</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">MORE APPLICATIONS, MORE INTERVIEWS</p>

        <p className="mt-2 text-gray-600 dark:text-gray-300">${current.price/100}/month</p>

        <div className="mt-4 text-5xl font-bold text-indigo-600">
          {current.jobs.toLocaleString()} Apps
        </div>
        {current.sub ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{current.sub}</p>
        ) : null}

        <p className="text-indigo-500">per month</p>

        <p className="mt-2 font-semibold">+${Math.round(current.price / 100 / 4)}/week</p>

        <div className="mt-4 rounded-lg bg-gray-100 p-3 dark:bg-zinc-800 dark:text-gray-300">
          1x more opportunities
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-white hover:bg-indigo-700"
          onClick={getMyPlan}
        >
          Get My Plan
        </button>
      </div>
    </div>
  );
};
