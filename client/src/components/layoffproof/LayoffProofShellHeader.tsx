import { useAuth } from "@/hooks/useAuth";
import { LayoffProofDashboardHeaderView } from "./LayoffProofDashboardHeader";
import { LayoffProofPageHeaderView } from "./LayoffProofPageHeader";
import { resolveShellHeaderConfig } from "./layoffproof-shell-headers";

function userGreeting(first?: string | null, last?: string | null): string {
  return first?.trim() || last?.trim() || "there";
}

type LayoffProofShellHeaderProps = {
  path: string;
};

/** Sticky top header — stays mounted while route content loads beneath it. */
export function LayoffProofShellHeader({ path }: LayoffProofShellHeaderProps) {
  const { user } = useAuth();
  const config = resolveShellHeaderConfig(path);
  const name = userGreeting(user?.firstName, user?.lastName);

  if (config.type === "none") {
    return null;
  }

  if (config.type === "page") {
    return (
      <LayoffProofPageHeaderView title={config.title} subtitle={config.subtitle} />
    );
  }

  return (
    <LayoffProofDashboardHeaderView
      greeting={name}
      subtitle={config.subtitle}
    />
  );
}
