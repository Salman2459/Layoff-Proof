import { JobBoardTable } from "@/components/job-board-table";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofDashboardHeader } from "@/components/layoffproof/LayoffProofDashboardHeader";
import { useAuth } from "@/hooks/useAuth";

function greeting(first?: string | null, last?: string | null): string {
  return first?.trim() || last?.trim() || "there";
}

export default function JobBoardPage() {
  const { user } = useAuth();
  const name = greeting(user?.firstName, user?.lastName);

  return (
    <LayoffProofLayout activeNavId="job-matches">
      <LayoffProofDashboardHeader greeting={name} />
      <main className="flex-1 px-8 py-6">
        <JobBoardTable />
      </main>
    </LayoffProofLayout>
  );
}
