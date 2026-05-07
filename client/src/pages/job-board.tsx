import { JobBoardTable } from "@/components/job-board-table";
import GlobalHeader from "@/components/GlobalHeader";

export default function JobBoardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      <GlobalHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <JobBoardTable />
      </main>
    </div>
  );
}

