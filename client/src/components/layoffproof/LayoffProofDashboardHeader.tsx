import { LayoffProofProfileMenu } from "@/components/layoffproof/LayoffProofProfileMenu";
import { useShellManagesChrome } from "./layoffproof-shell-chrome";

type LayoffProofDashboardHeaderProps = {
  greeting: string;
  subtitle?: string;
};

export function LayoffProofDashboardHeaderView({
  greeting,
  subtitle = "Let's accelerate your dream career with AI.",
}: LayoffProofDashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-6 border-b border-[#e8ecf4] bg-[#f4f6fb]/95 px-8 py-5 backdrop-blur-sm">
      <div className="min-w-0 shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-[#0f172a]">
          Hello, {greeting} 👋
        </h1>
        <p className="mt-0.5 text-[13px] text-[#64748b]">{subtitle}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center">
        <LayoffProofProfileMenu />
      </div>
    </header>
  );
}

export function LayoffProofDashboardHeader(props: LayoffProofDashboardHeaderProps) {
  if (useShellManagesChrome()) {
    return null;
  }

  return <LayoffProofDashboardHeaderView {...props} />;
}
