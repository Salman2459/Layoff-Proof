import { LayoffProofProfileMenu } from "@/components/layoffproof/LayoffProofProfileMenu";
import { useShellManagesChrome } from "./layoffproof-shell-chrome";

type LayoffProofPageHeaderProps = {
  title: string;
  subtitle: string;
};

export function LayoffProofPageHeaderView({ title, subtitle }: LayoffProofPageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-[#e8ecf4] bg-[#f4f6fb]/95 px-8 py-6 backdrop-blur-sm">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#0f172a]">{title}</h1>
        <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p>
      </div>

      <div className="flex shrink-0 items-center">
        <LayoffProofProfileMenu />
      </div>
    </header>
  );
}

export function LayoffProofPageHeader(props: LayoffProofPageHeaderProps) {
  if (useShellManagesChrome()) {
    return null;
  }

  return <LayoffProofPageHeaderView {...props} />;
}
