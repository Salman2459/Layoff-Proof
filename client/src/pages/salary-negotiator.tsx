import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  ChevronRight,
  DollarSign,
  FileText,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { LayoffProofDashboardHeader } from "@/components/layoffproof/LayoffProofDashboardHeader";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofSelect } from "@/components/layoffproof/LayoffProofSelect";
import { SalaryNegotiatorFeatureCards } from "@/components/layoffproof/salary/SalaryNegotiatorFeatureCards";
import { SalaryNegotiatorHeroBanner } from "@/components/layoffproof/salary/SalaryNegotiatorHeroBanner";
import { SalaryNegotiatorStepper } from "@/components/layoffproof/salary/SalaryNegotiatorStepper";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, getApiErrorMessage, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SalaryData {
  jobTitle: string;
  location: string;
  experienceLevel: string;
  currentSalary: string;
  targetSalary: string;
  strengths: string[];
  achievements: string[];
  companySize: string;
  industry: string;
}

const inputClass =
  "w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#a5b4fc] focus:ring-2 focus:ring-[#c7d2fe]/60 disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-medium text-[#475569]";

const cardClass = "rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm sm:p-6";

const primaryBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200/50 transition hover:from-[#4f46e5] hover:to-[#9333ea] disabled:cursor-not-allowed disabled:opacity-50";

const outlineBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-5 py-2.5 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc] disabled:opacity-50";

const iconBtnClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] transition hover:border-[#c4b5fd] hover:bg-[#f5f3ff] hover:text-[#7c3aed] disabled:opacity-50";

function experienceLevelFromTotalExperience(totalExperience: unknown): string {
  const nRaw =
    typeof totalExperience === "string"
      ? Number(totalExperience)
      : typeof totalExperience === "number"
        ? totalExperience
        : NaN;
  const n = Number.isFinite(nRaw) ? nRaw : NaN;
  if (!Number.isFinite(n)) return "";
  if (n <= 2) return "entry";
  if (n <= 5) return "mid";
  if (n <= 10) return "senior";
  return "lead";
}

function formatExperienceLevel(level: string): string {
  const map: Record<string, string> = {
    entry: "Entry Level",
    mid: "Mid Level",
    senior: "Senior Level",
    lead: "Lead / Principal",
  };
  return map[level] ?? level;
}

function formatCompanySize(size: string): string {
  const map: Record<string, string> = {
    startup: "Startup (1–50)",
    small: "Small (51–200)",
    medium: "Medium (201–1000)",
    large: "Large (1000+)",
  };
  return map[size] ?? size;
}

function splitLinesToItems(text: unknown): string[] {
  if (typeof text !== "string") return [];
  return text
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function greeting(first?: string | null, last?: string | null): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (f && l) return `${f} ${l}`;
  return f || l || "there";
}

function salaryIncreasePct(current: string, target: string): string | null {
  const c = parseInt(current, 10);
  const t = parseInt(target, 10);
  if (!Number.isFinite(c) || !Number.isFinite(t) || c <= 0) return null;
  return (((t - c) / c) * 100).toFixed(1);
}

function formatSalary(value: unknown): string {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString()}`;
}

function PageShell({
  children,
  greetingName,
}: {
  children: React.ReactNode;
  greetingName: string;
}) {
  return (
    <LayoffProofLayout activeNavId="salary-negotiator">
      <LayoffProofDashboardHeader greeting={greetingName} />
      {children}
    </LayoffProofLayout>
  );
}

function normalizeStringArray(input: unknown, maxItems: number): string[] {
  if (!Array.isArray(input)) return [];
  const toStringSafe = (v: unknown): string => {
    if (typeof v === "string") return v.trim();
    if (typeof v === "number") return String(v);
    if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      const candidate =
        obj.name ?? obj.label ?? obj.skill ?? obj.title ?? obj.value ?? obj.text;
      if (typeof candidate === "string") return candidate.trim();
    }
    return "";
  };
  return input
    .map(toStringSafe)
    .filter(Boolean)
    .slice(0, maxItems);
}

export default function SalaryNegotiator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const name = greeting(user?.firstName, user?.lastName);
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [deletingResearchId, setDeletingResearchId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SalaryData>({
    jobTitle: "",
    location: "",
    experienceLevel: "",
    currentSalary: "",
    targetSalary: "",
    strengths: [""],
    achievements: [""],
    companySize: "",
    industry: "",
  });
  const [strategy, setStrategy] = useState<Record<string, unknown> | null>(null);
  const cleanedStrategyText = String(strategy?.negotiationStrategy || "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}#{1,6}\s*$/gm, "")
    .trim();

  const { data: existingResearch } = useQuery<Record<string, unknown>[]>({
    queryKey: ["/api/salary-research"],
    enabled: isAuthenticated,
  });

  const { data: jobProfile } = useQuery({
    queryKey: ["userJobProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/profile/jobprofile/${user.id}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) return null;
      return json.data ?? null;
    },
    enabled: !!user?.id,
  });

  const didPrefillRef = useRef(false);
  useEffect(() => {
    if (!jobProfile || didPrefillRef.current) return;
    didPrefillRef.current = true;

    const nextJobTitle =
      typeof jobProfile?.profession === "string" ? jobProfile.profession : "";
    const nextLocation =
      [jobProfile?.city, jobProfile?.country].filter(Boolean).join(", ") || "";
    const nextExperienceLevel = experienceLevelFromTotalExperience(
      jobProfile?.totalExperience,
    );
    const nextCurrentSalary =
      jobProfile?.currentSalary != null ? String(jobProfile.currentSalary) : "";
    const nextTargetSalary =
      jobProfile?.expectedSalary != null ? String(jobProfile.expectedSalary) : "";
    const nextStrengths = normalizeStringArray(jobProfile?.skills, 3);
    const nextAchievements = splitLinesToItems(jobProfile?.achievements);

    setFormData((prev) => ({
      ...prev,
      jobTitle: prev.jobTitle || nextJobTitle,
      location: prev.location || nextLocation,
      experienceLevel: prev.experienceLevel || nextExperienceLevel,
      currentSalary: prev.currentSalary || nextCurrentSalary,
      targetSalary: prev.targetSalary || nextTargetSalary,
      strengths:
        prev.strengths.filter((s) => s.trim()).length > 0
          ? prev.strengths
          : nextStrengths.length > 0
            ? nextStrengths
            : prev.strengths,
      achievements:
        prev.achievements.filter((a) => a.trim()).length > 0
          ? prev.achievements
          : nextAchievements.length > 0
            ? nextAchievements
            : prev.achievements,
    }));
  }, [jobProfile]);

  const generateStrategyMutation = useMutation({
    mutationFn: async (data: SalaryData) => {
      const payload = {
        jobTitle: data.jobTitle,
        location: data.location,
        experienceLevel: data.experienceLevel,
        currentSalary: parseInt(data.currentSalary, 10),
        targetSalary: parseInt(data.targetSalary, 10),
        strengths: data.strengths.filter((s) => s.trim()),
        achievements: data.achievements.filter((a) => a.trim()),
        companySize: data.companySize,
        industry: data.industry,
      };
      return await apiRequest("POST", "/api/salary-research", payload);
    },
    onSuccess: (response) => {
      setStrategy(response as Record<string, unknown>);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ["/api/salary-research"] });
      toast({
        title: "Strategy Generated",
        description: "Your personalized salary negotiation strategy is ready!",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to generate strategy. Please try again."),
        variant: "destructive",
      });
    },
  });

  const deleteResearchMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/salary-research/${id}`);
    },
    onMutate: async (id: string) => {
      setDeletingResearchId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-research"] });
      toast({ title: "Deleted", description: "Previous research removed." });
    },
    onSettled: () => {
      setDeletingResearchId(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete research."),
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.jobTitle || !formData.location || !formData.experienceLevel) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (
        !formData.currentSalary ||
        !formData.targetSalary ||
        formData.strengths.filter((s) => s.trim()).length === 0
      ) {
        toast({
          title: "Missing Information",
          description: "Please provide salary information and at least one strength.",
          variant: "destructive",
        });
        return;
      }
      generateStrategyMutation.mutate(formData);
    }
  };

  const handleBack = () => setStep(Math.max(1, step - 1));

  const addArrayField = (field: "strengths" | "achievements") => {
    setFormData((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeArrayField = (field: "strengths" | "achievements", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const updateArrayField = (
    field: "strengths" | "achievements",
    index: number,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const startNewResearch = () => {
    setFormData({
      jobTitle: "",
      location: "",
      experienceLevel: "",
      currentSalary: "",
      targetSalary: "",
      strengths: [""],
      achievements: [""],
      companySize: "",
      industry: "",
    });
    setStrategy(null);
    setStep(1);
  };

  if (isLoading) {
    return (
      <PageShell greetingName={name}>
        <div className="flex flex-1 items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
        </div>
      </PageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageShell greetingName={name}>
        <div className="flex flex-1 items-center justify-center px-4 py-24">
          <div className={cn(cardClass, "max-w-md text-center")}>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#ede9fe]">
              <DollarSign className="h-6 w-6 text-[#8b5cf6]" />
            </div>
            <h1 className="text-xl font-bold text-[#0f172a]">Access Required</h1>
            <p className="mt-2 text-sm text-[#64748b]">
              Please log in to access the Salary Negotiator.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  const researchList = Array.isArray(existingResearch) ? existingResearch : [];
  const increasePct = salaryIncreasePct(formData.currentSalary, formData.targetSalary);
  const marketData = strategy?.marketData as { averageSalary?: number } | undefined;

  return (
    <PageShell greetingName={name}>
      <main className="flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <SalaryNegotiatorHeroBanner />

          <div className="mt-6">
            <SalaryNegotiatorStepper currentStep={step} />
          </div>

          {step === 1 && (
            <>
              <div className={cardClass}>
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede9fe]">
                    <Briefcase className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0f172a]">Job Information</h2>
                    <p className="mt-0.5 text-sm text-[#64748b]">
                      Tell us about the role you&apos;re negotiating for
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="jobTitle" className={labelClass}>
                      Job Title <span className="text-[#ef4444]">*</span>
                    </label>
                    <div className="relative">
                      <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        id="jobTitle"
                        type="text"
                        value={formData.jobTitle}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))
                        }
                        placeholder="e.g. Software Engineer, Product Manager"
                        className={cn(inputClass, "pl-9")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="location" className={labelClass}>
                        Location <span className="text-[#ef4444]">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                        <input
                          id="location"
                          type="text"
                          value={formData.location}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, location: e.target.value }))
                          }
                          placeholder="e.g. San Francisco, CA"
                          className={cn(inputClass, "pl-9")}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="experienceLevel" className={labelClass}>
                        Experience Level <span className="text-[#ef4444]">*</span>
                      </label>
                      <LayoffProofSelect
                        id="experienceLevel"
                        value={formData.experienceLevel}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            experienceLevel: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select your level</option>
                        <option value="entry">Entry Level (0–2 years)</option>
                        <option value="mid">Mid Level (3–5 years)</option>
                        <option value="senior">Senior Level (6–10 years)</option>
                        <option value="lead">Lead / Principal (10+ years)</option>
                      </LayoffProofSelect>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="industry" className={labelClass}>
                        Industry
                      </label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                        <input
                          id="industry"
                          type="text"
                          value={formData.industry}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, industry: e.target.value }))
                          }
                          placeholder="e.g. Technology, Healthcare"
                          className={cn(inputClass, "pl-9")}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="companySize" className={labelClass}>
                        Company Size
                      </label>
                      <LayoffProofSelect
                        id="companySize"
                        value={formData.companySize}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, companySize: e.target.value }))
                        }
                      >
                        <option value="">Select company size</option>
                        <option value="startup">Startup (1–50)</option>
                        <option value="small">Small (51–200)</option>
                        <option value="medium">Medium (201–1000)</option>
                        <option value="large">Large (1000+)</option>
                      </LayoffProofSelect>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button type="button" onClick={handleNext} className={primaryBtnClass}>
                      Next Step
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#94a3b8]">
                <Lock className="h-3 w-3" />
                Your salary details are private and never shared.
              </p>

              <div className="mt-8">
                <SalaryNegotiatorFeatureCards />
              </div>

              {researchList.length > 0 && (
                <div className={cn(cardClass, "mt-8")}>
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#8b5cf6]" />
                    <h2 className="text-base font-bold text-[#0f172a]">Previous Research</h2>
                  </div>
                  <div className="space-y-3">
                    {researchList.map((research) => (
                      <div
                        key={String(research.id)}
                        className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-[#0f172a]">
                              {String(research.jobTitle)}
                            </h4>
                            <p className="text-xs text-[#64748b]">
                              {String(research.location)} ·{" "}
                              {formatExperienceLevel(String(research.experienceLevel))}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                              <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 font-medium text-[#475569]">
                                Current: {formatSalary(research.currentSalary)}
                              </span>
                              <span className="rounded-full bg-[#ede9fe] px-2.5 py-0.5 font-medium text-[#6d28d9]">
                                Target: {formatSalary(research.targetSalary)}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full border border-[#e2e8f0] bg-white px-2.5 py-0.5 text-[10px] font-medium text-[#64748b]">
                              {research.createdAt
                                ? new Date(String(research.createdAt)).toLocaleDateString()
                                : "—"}
                            </span>
                            <button
                              type="button"
                              className={iconBtnClass}
                              onClick={() => deleteResearchMutation.mutate(String(research.id))}
                              disabled={deleteResearchMutation.isPending}
                              aria-label="Delete previous research"
                            >
                              {deletingResearchId === research.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <div className={cardClass}>
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede9fe]">
                  <Target className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0f172a]">
                    Salary Information & Background
                  </h2>
                  <p className="mt-0.5 text-sm text-[#64748b]">
                    Provide your current situation and negotiation goals
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="currentSalary" className={labelClass}>
                      Current Salary (USD) <span className="text-[#ef4444]">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        id="currentSalary"
                        type="number"
                        value={formData.currentSalary}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, currentSalary: e.target.value }))
                        }
                        placeholder="75000"
                        className={cn(inputClass, "pl-9")}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="targetSalary" className={labelClass}>
                      Target Salary (USD) <span className="text-[#ef4444]">*</span>
                    </label>
                    <div className="relative">
                      <TrendingUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        id="targetSalary"
                        type="number"
                        value={formData.targetSalary}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, targetSalary: e.target.value }))
                        }
                        placeholder="95000"
                        className={cn(inputClass, "pl-9")}
                      />
                    </div>
                  </div>
                </div>

                {increasePct && (
                  <div className="rounded-xl border border-[#c4b5fd] bg-[#f5f3ff] px-4 py-3 text-sm text-[#5b21b6]">
                    Targeting a{" "}
                    <span className="font-bold text-[#7c3aed]">{increasePct}%</span> increase from
                    your current salary.
                  </div>
                )}

                <div>
                  <label className={labelClass}>
                    Your Key Strengths <span className="text-[#ef4444]">*</span>
                  </label>
                  <p className="mb-3 text-xs text-[#64748b]">
                    What makes you valuable? Skills, experience, and unique qualities.
                  </p>
                  {formData.strengths.map((strength, index) => (
                    <div key={index} className="mb-2 flex gap-2">
                      <input
                        value={strength}
                        onChange={(e) => updateArrayField("strengths", index, e.target.value)}
                        placeholder="e.g. Expert in React, 5+ years leadership experience"
                        className={cn(inputClass, "flex-1")}
                      />
                      <button
                        type="button"
                        className={iconBtnClass}
                        onClick={() => removeArrayField("strengths", index)}
                        aria-label="Remove strength"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField("strengths")}
                    className={cn(outlineBtnClass, "mt-2 px-4 py-2 text-xs")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Strength
                  </button>
                </div>

                <div>
                  <label className={labelClass}>Key Achievements</label>
                  <p className="mb-3 text-xs text-[#64748b]">
                    Quantifiable accomplishments that demonstrate your impact.
                  </p>
                  {formData.achievements.map((achievement, index) => (
                    <div key={index} className="mb-2 flex gap-2">
                      <input
                        value={achievement}
                        onChange={(e) => updateArrayField("achievements", index, e.target.value)}
                        placeholder="e.g. Increased team productivity by 30%"
                        className={cn(inputClass, "flex-1")}
                      />
                      <button
                        type="button"
                        className={iconBtnClass}
                        onClick={() => removeArrayField("achievements", index)}
                        aria-label="Remove achievement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField("achievements")}
                    className={cn(outlineBtnClass, "mt-2 px-4 py-2 text-xs")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Achievement
                  </button>
                </div>

                <div className="flex justify-between pt-1">
                  <button type="button" onClick={handleBack} className={outlineBtnClass}>
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={generateStrategyMutation.isPending}
                    className={primaryBtnClass}
                  >
                    {generateStrategyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Strategy...
                      </>
                    ) : (
                      <>
                        Generate Strategy
                        <TrendingUp className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && strategy && (
            <div className="space-y-6">
              <div className={cardClass}>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ede9fe]">
                    <Award className="h-5 w-5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0f172a]">
                      Your Negotiation Strategy
                    </h2>
                    <p className="text-xs text-[#64748b]">
                      {formData.jobTitle} · {formData.location}
                      {formData.companySize
                        ? ` · ${formatCompanySize(formData.companySize)}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-[#faf5ff] to-[#fdf4ff] p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#0f172a]">Salary Range Analysis</h3>
                    {increasePct && (
                      <span className="rounded-full bg-[#ede9fe] px-3 py-1 text-xs font-bold text-[#6d28d9]">
                        +{increasePct}% target increase
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
                    <div className="rounded-xl border border-[#e9d5ff]/60 bg-white/80 p-4">
                      <p className="text-xs font-medium text-[#64748b]">Current</p>
                      <p className="mt-1 text-xl font-bold text-[#0f172a]">
                        {formatSalary(formData.currentSalary)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#c4b5fd] bg-white p-4 shadow-sm">
                      <p className="text-xs font-medium text-[#7c3aed]">Target</p>
                      <p className="mt-1 text-xl font-bold text-[#6d28d9]">
                        {formatSalary(formData.targetSalary)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#e9d5ff]/60 bg-white/80 p-4">
                      <p className="text-xs font-medium text-[#64748b]">Market Average</p>
                      <p className="mt-1 text-xl font-bold text-[#0f172a]">
                        {marketData?.averageSalary
                          ? formatSalary(marketData.averageSalary)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {cleanedStrategyText && (
                <div className={cardClass}>
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#8b5cf6]" />
                    <h2 className="text-base font-bold text-[#0f172a]">Negotiation Playbook</h2>
                  </div>
                  <div className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] p-5">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#334155]">
                      {cleanedStrategyText}
                    </pre>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={cn(cardClass, "bg-[#f5f3ff]/40")}>
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#8b5cf6]" />
                    <h3 className="text-sm font-bold text-[#0f172a]">Your Strengths</h3>
                  </div>
                  <ul className="space-y-2">
                    {formData.strengths
                      .filter((s) => s.trim())
                      .map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-[#334155]">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b5cf6]" />
                          {strength}
                        </li>
                      ))}
                  </ul>
                </div>

                <div className={cn(cardClass, "bg-[#faf5ff]/40")}>
                  <div className="mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-[#a855f7]" />
                    <h3 className="text-sm font-bold text-[#0f172a]">Key Achievements</h3>
                  </div>
                  <ul className="space-y-2">
                    {formData.achievements
                      .filter((a) => a.trim())
                      .map((achievement, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-[#334155]">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a855f7]" />
                          {achievement}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              <div className="flex justify-center">
                <button type="button" onClick={startNewResearch} className={outlineBtnClass}>
                  Create New Research
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </PageShell>
  );
}
