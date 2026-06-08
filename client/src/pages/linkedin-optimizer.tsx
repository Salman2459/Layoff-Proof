"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofPageHeader } from "@/components/layoffproof/LayoffProofPageHeader";
import {
  LinkedInOptimizerBanner,
  LinkedInPageActions,
  LinkedInProfilePreviewCard,
  LinkedInSetupCard,
  OptimizationSuggestionsPanel,
  ProfileChecklistPanel,
  ProfileStrengthCard,
} from "@/components/layoffproof/linkedin/LinkedInOptimizerCards";
import {
  LinkedInProfileEditor,
  type LinkedInProfileData,
} from "@/components/layoffproof/linkedin/LinkedInProfileEditor";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { extractApiErrorMessage, parseFetchJsonBody } from "@/lib/queryClient";
import {
  buildChecklist,
  computeStats,
  countSuggestionsByImpact,
  exportChecklistText,
  flattenSuggestions,
  normalizeAnalysisReport,
  toApiProfilePayload,
  toOptimizerProfileData,
  type AnalysisReportPayload,
  type LinkedInSuggestion,
} from "@/lib/linkedinOptimizer";

type SuggestionTab = "all" | "high" | "improve" | "good" | "completed";

export default function LinkedInOptimizer() {
  const [profilePdf, setProfilePdf] = useState<File | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [targetJobTitle, setTargetJobTitle] = useState("");
  const [analysisStep, setAnalysisStep] = useState("");
  const [profileData, setProfileData] = useState<LinkedInProfileData | null>(null);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReportPayload | null>(null);
  const [apiError, setApiError] = useState("");
  const [activeTab, setActiveTab] = useState<SuggestionTab>("all");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [showAllChecklist, setShowAllChecklist] = useState(false);
  const [highlightField, setHighlightField] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const isAnalyzing = analysisStep !== "";
  const hasReport = !!profileData && !!analysisReport;

  const suggestions = useMemo(
    () => (analysisReport ? flattenSuggestions(analysisReport) : []),
    [analysisReport]
  );

  const checklist = useMemo(
    () =>
      buildChecklist(
        profileData as unknown as Record<string, unknown> | null,
        analysisReport
      ),
    [profileData, analysisReport]
  );

  const stats = useMemo(
    () =>
      computeStats(
        checklist,
        suggestions,
        analysisReport?.score ?? 0
      ),
    [checklist, suggestions, analysisReport?.score]
  );

  const tabCounts = useMemo(() => {
    const c = countSuggestionsByImpact(suggestions);
    const completedChecklist = checklist.filter((i) => i.status === "complete").length;
    return {
      all: suggestions.length + completedChecklist,
      high: c.high,
      improve: c.improve,
      good: c.good,
      completed: completedChecklist,
    };
  }, [suggestions, checklist]);

  const emptyChecklist = useMemo(() => buildChecklist(null, null), []);
  const emptyStats = useMemo(
    () => computeStats(emptyChecklist, [], 0),
    [emptyChecklist]
  );
  const emptyTabCounts = useMemo(
    () => ({ all: 0, high: 0, improve: 0, good: 0, completed: 0 }),
    []
  );

  const displayedSuggestions = useMemo(() => {
    if (activeTab === "completed") {
      return checklist
        .filter((c) => c.status === "complete")
        .map((c) => ({
          id: `done-${c.id}`,
          title: c.label,
          description: "This section looks complete on your profile.",
          impact: "completed" as const,
          actionLabel: "Done",
        }));
    }
    if (activeTab === "all") return suggestions;
    return suggestions.filter((s) => s.impact === activeTab);
  }, [activeTab, suggestions, checklist]);

  const profileView = useMemo(() => {
    if (!profileData) {
      return {
        name: "Your Name",
        headline: "Add your professional headline",
        location: "",
        connections: "",
        company: "Company",
        school: "Education",
      };
    }
    const exp = profileData.experience[0];
    const edu = profileData.education[0];
    return {
      name: profileData.name || "Your Name",
      headline: profileData.profession || "Professional headline",
      location: profileData.location || "",
      connections: "500+ connections",
      company: exp?.company || "Company",
      school: edu?.school || "Education",
      profileImageUrl: profileData.profileImageUrl,
    };
  }, [profileData]);

  const importProfile = async (): Promise<LinkedInProfileData> => {
    if (profilePdf) {
      const form = new FormData();
      form.append("file", profilePdf);
      if (user?.id) form.append("id", String(user.id));
      const res = await fetch("/api/import-linkedin-resume-pdf", { method: "POST", body: form });
      const data = await parseFetchJsonBody(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(data, "Failed to import PDF."));
      }
      return data.resumeData as LinkedInProfileData;
    }

    if (linkedinUrl.trim() && linkedinUrl.includes("linkedin.com")) {
      const res = await fetch("/api/import-linkedin-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileUrl: linkedinUrl.trim(),
          ...(user?.id ? { id: user.id } : {}),
        }),
      });
      const data = await parseFetchJsonBody(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(data, "Failed to import LinkedIn URL."));
      }
      return data.resumeData as LinkedInProfileData;
    }

    throw new Error("Upload a LinkedIn PDF or enter a valid LinkedIn profile URL.");
  };

  const runAnalysis = async (isRefresh = false) => {
    if (!isRefresh && !profilePdf && !linkedinUrl.trim()) {
      toast({
        title: "Profile required",
        description: "Upload a PDF or paste your LinkedIn URL.",
        variant: "destructive",
      });
      return;
    }
    if (!targetJobTitle.trim()) {
      toast({
        title: "Target role required",
        description: "Enter the job title you're targeting.",
        variant: "destructive",
      });
      return;
    }

    setApiError("");
    if (!isRefresh) {
      setProfileData(null);
      setAnalysisReport(null);
    }

    try {
      let fetched = profileData;
      if (!isRefresh || !fetched) {
        setAnalysisStep("Importing profile...");
        fetched = await importProfile();
        setProfileData(fetched);
      }

      setAnalysisStep("Analyzing with AI...");
      const apiPayload = toApiProfilePayload(
        toOptimizerProfileData(fetched as unknown as Record<string, unknown>)
      );

      const optimizeRes = await fetch("/api/optimize-linkedin-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profileData: apiPayload,
          targetJobTitle: targetJobTitle.trim(),
        }),
      });
      const optimizeData = await parseFetchJsonBody(optimizeRes);

      if (optimizeRes.ok && optimizeData.analysisReport) {
        setAnalysisReport(normalizeAnalysisReport(optimizeData));
        if (optimizeData.improvedContent?.headline && fetched) {
          setProfileData((prev) =>
            prev
              ? {
                  ...prev,
                  profession: optimizeData.improvedContent.headline || prev.profession,
                  summary: optimizeData.improvedContent.summary || prev.summary,
                }
              : prev
          );
        }
        toast({
          title: "Analysis complete",
          description: `LinkedIn insights for ${fetched.name} are ready.`,
        });
        return;
      }

      const analyzeRes = await fetch("/api/analyze-profile-with-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profileData: fetched,
          targetJobTitle: targetJobTitle.trim(),
        }),
      });
      const analyzeData = await parseFetchJsonBody(analyzeRes);
      if (!analyzeRes.ok) {
        throw new Error(
          extractApiErrorMessage(
            analyzeData,
            extractApiErrorMessage(optimizeData, "AI analysis failed."),
          ),
        );
      }
      setAnalysisReport(normalizeAnalysisReport(analyzeData));
      toast({
        title: "Analysis complete",
        description: `Feedback for ${fetched.name} is ready.`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Analysis failed";
      setApiError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setAnalysisStep("");
    }
  };

  const handleExport = () => {
    if (!profileData || !analysisReport) return;
    const text = exportChecklistText(
      checklist,
      stats,
      profileData.name || "Profile"
    );
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "linkedin-profile-checklist.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Checklist downloaded." });
  };

  const scrollToEditor = (field?: string) => {
    setHighlightField(field ?? null);
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => setHighlightField(null), 3000);
  };

  const mapSuggestionToField = (s: LinkedInSuggestion): string | undefined => {
    const t = s.title.toLowerCase();
    if (t.includes("headline")) return "profession";
    if (t.includes("about") || t.includes("summary")) return "summary";
    if (t.includes("experience")) return "experience-0-description";
    return s.fieldHint;
  };

  const handleImprove = (s: LinkedInSuggestion) => {
    scrollToEditor(mapSuggestionToField(s));
  };

  const canAnalyze =
    !!targetJobTitle.trim() && (!!profilePdf || linkedinUrl.trim().includes("linkedin.com"));

  return (
    <LayoffProofLayout activeNavId="linkedin">
      <LayoffProofPageHeader
        title="LinkedIn Optimizer"
        subtitle="Optimize your LinkedIn profile to attract recruiters and get more opportunities ✨"
      />

      <div className="flex-1 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mt-2 mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <LinkedInPageActions
            onRefresh={() => runAnalysis(true)}
            onExport={handleExport}
            isAnalyzing={isAnalyzing}
            hasReport={hasReport}
          />
        </div>

        {!hasReport && (
          <div className="mb-6">
            <LinkedInSetupCard
              targetJobTitle={targetJobTitle}
              onTargetJobTitleChange={setTargetJobTitle}
              profilePdf={profilePdf}
              onPdfChange={setProfilePdf}
              linkedinUrl={linkedinUrl}
              onLinkedinUrlChange={setLinkedinUrl}
              isAnalyzing={isAnalyzing}
              analysisStep={analysisStep}
              onAnalyze={() => runAnalysis(false)}
              disabled={!canAnalyze}
            />
          </div>
        )}

        {apiError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold text-red-900">Analysis failed</p>
              <p className="mt-1 text-sm text-red-700">{apiError}</p>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="mb-6 grid gap-5 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl bg-white" />
            <div className="h-64 animate-pulse rounded-2xl bg-white" />
          </div>
        )}

        {!isAnalyzing && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <ProfileStrengthCard
                stats={hasReport ? stats : emptyStats}
                summary={
                  hasReport
                    ? analysisReport?.summary
                    : "Run analysis above to get your LinkedIn strength score and personalized feedback."
                }
              />
              <LinkedInProfilePreviewCard profile={profileView} />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <OptimizationSuggestionsPanel
                suggestions={hasReport ? displayedSuggestions : []}
                tabCounts={hasReport ? tabCounts : emptyTabCounts}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onImprove={handleImprove}
                showAll={showAllSuggestions}
                onToggleShowAll={() => setShowAllSuggestions((v) => !v)}
                emptyMessage={
                  hasReport
                    ? undefined
                    : "Run analysis to see AI-powered suggestions for your target role."
                }
              />
              <ProfileChecklistPanel
                checklist={hasReport ? checklist : emptyChecklist}
                showAll={showAllChecklist}
                onToggleShowAll={() => setShowAllChecklist((v) => !v)}
              />
            </div>

            {hasReport && (
              <>
                <LinkedInOptimizerBanner onOptimize={() => scrollToEditor("profession")} />

                <div ref={editorRef}>
                  {profileData && (
                    <LinkedInProfileEditor
                      profileData={profileData}
                      setProfileData={setProfileData}
                      highlightField={highlightField}
                    />
                  )}
                </div>

                <details className="rounded-2xl border border-[#e8ecf4] bg-white">
                  <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[#334155]">
                    Re-run analysis or change source
                  </summary>
                  <div className="border-t border-[#e8ecf4] p-5">
                    <LinkedInSetupCard
                      targetJobTitle={targetJobTitle}
                      onTargetJobTitleChange={setTargetJobTitle}
                      profilePdf={profilePdf}
                      onPdfChange={setProfilePdf}
                      linkedinUrl={linkedinUrl}
                      onLinkedinUrlChange={setLinkedinUrl}
                      isAnalyzing={isAnalyzing}
                      analysisStep={analysisStep}
                      onAnalyze={() => runAnalysis(false)}
                      disabled={!canAnalyze}
                    />
                  </div>
                </details>
              </>
            )}
          </div>
        )}
      </div>
    </LayoffProofLayout>
  );
}
