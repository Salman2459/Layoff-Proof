import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Compass,
  Loader2,
  Map,
  Plus,
  Star,
  Target,
  Trash2,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { CareerPathFeatureCards } from "@/components/layoffproof/career/CareerPathFeatureCards";
import { CareerPathHeroBanner } from "@/components/layoffproof/career/CareerPathHeroBanner";
import { CareerPathStepper } from "@/components/layoffproof/career/CareerPathStepper";
import { LayoffProofDashboardHeader } from "@/components/layoffproof/LayoffProofDashboardHeader";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofSelect } from "@/components/layoffproof/LayoffProofSelect";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, getApiErrorMessage, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CareerPathData {
  currentRole: string;
  experienceYears: number;
  skills: string[];
  interests: string[];
  goals: string[];
}

const inputClass =
  "w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#a5b4fc] focus:ring-2 focus:ring-[#c7d2fe]/60 disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-medium text-[#475569]";

const cardClass = "rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm sm:p-6";

const primaryBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200/50 transition hover:from-[#4f46e5] hover:to-[#9333ea] disabled:cursor-not-allowed disabled:opacity-50";

const outlineBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-5 py-2.5 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc] disabled:opacity-50";

const experienceOptions = [
  { value: "1", label: "0-1 years (Entry Level)" },
  { value: "3", label: "2-3 years" },
  { value: "5", label: "4-5 years" },
  { value: "7", label: "6-7 years" },
  { value: "10", label: "8-10 years" },
  { value: "15", label: "11-15 years" },
  { value: "20", label: "16+ years (Senior/Executive)" },
];

function greeting(first?: string | null, last?: string | null): string {
  return first?.trim() || last?.trim() || "there";
}

function PageShell({
  children,
  greetingName,
}: {
  children: React.ReactNode;
  greetingName: string;
}) {
  return (
    <LayoffProofLayout activeNavId="career">
      <LayoffProofDashboardHeader greeting={greetingName} />
      {children}
    </LayoffProofLayout>
  );
}

function difficultyColor(difficulty: string) {
  if (difficulty === "Low") return "bg-[#dcfce7] text-[#166534]";
  if (difficulty === "Medium") return "bg-[#fef9c3] text-[#854d0e]";
  return "bg-[#fee2e2] text-[#991b1b]";
}

export default function CareerPathAnalyzer() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const name = greeting(user?.firstName, user?.lastName);
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CareerPathData>({
    currentRole: "",
    experienceYears: 0,
    skills: [""],
    interests: [""],
    goals: [""],
  });
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);

  const { data: existingPaths } = useQuery({
    queryKey: ["/api/career-paths"],
    enabled: isAuthenticated,
  });

  const generateAnalysisMutation = useMutation({
    mutationFn: async (data: CareerPathData) => {
      const payload = {
        currentRole: data.currentRole,
        experienceYears: data.experienceYears,
        skills: data.skills.filter((s) => s.trim()),
        interests: data.interests.filter((i) => i.trim()),
        goals: data.goals.filter((g) => g.trim()),
      };
      return await apiRequest("POST", "/api/career-paths", payload);
    },
    onSuccess: (response) => {
      setAnalysis(response as Record<string, unknown>);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ["/api/career-paths"] });
      toast({
        title: "Analysis Complete",
        description: "Your personalized career path analysis is ready!",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to generate analysis. Please try again."),
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.currentRole || formData.experienceYears <= 0) {
        toast({
          title: "Missing Information",
          description: "Please provide your current role and experience level.",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.skills.filter((s) => s.trim()).length === 0) {
        toast({
          title: "Missing Information",
          description: "Please add at least one skill.",
          variant: "destructive",
        });
        return;
      }
      generateAnalysisMutation.mutate(formData);
    }
  };

  const handleBack = () => setStep(Math.max(1, step - 1));

  const addArrayField = (field: "skills" | "interests" | "goals") => {
    setFormData((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeArrayField = (field: "skills" | "interests" | "goals", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const updateArrayField = (
    field: "skills" | "interests" | "goals",
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const startNewAnalysis = () => {
    setFormData({
      currentRole: "",
      experienceYears: 0,
      skills: [""],
      interests: [""],
      goals: [""],
    });
    setAnalysis(null);
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
              <Compass className="h-6 w-6 text-[#8b5cf6]" />
            </div>
            <h1 className="text-xl font-bold text-[#0f172a]">Access Required</h1>
            <p className="mt-2 text-sm text-[#64748b]">
              Please log in to access the Career Path Analyzer.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  const paths = Array.isArray(existingPaths) ? existingPaths : [];
  const pathways = (analysis?.pathways as Record<string, unknown>[] | undefined) ?? [];
  const nextSteps = (analysis?.nextSteps as string[] | undefined) ?? [];

  return (
    <PageShell greetingName={name}>
      <main className="flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <CareerPathHeroBanner />

          <div className="mt-6">
            <CareerPathStepper currentStep={step} />
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <>
              <div className={cardClass}>
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede9fe]">
                    <Target className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0f172a]">Current Career Situation</h2>
                    <p className="mt-0.5 text-sm text-[#64748b]">
                      Tell us about your current role and experience level
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="current-role" className={labelClass}>
                      Current Role <span className="text-[#ef4444]">*</span>
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        id="current-role"
                        type="text"
                        value={formData.currentRole}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, currentRole: e.target.value }))
                        }
                        placeholder="e.g. Software Engineer, Marketing Manager, Data Analyst"
                        className={cn(inputClass, "pl-9")}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="experience-years" className={labelClass}>
                      Years of Experience <span className="text-[#ef4444]">*</span>
                    </label>
                    <LayoffProofSelect
                      id="experience-years"
                      value={formData.experienceYears > 0 ? String(formData.experienceYears) : ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          experienceYears: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      leftIcon={<Calendar className="h-4 w-4" strokeWidth={2} />}
                    >
                      <option value="">Select your years of experience</option>
                      {experienceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </LayoffProofSelect>
                  </div>

                  <div className="flex justify-end">
                    <button type="button" onClick={handleNext} className={primaryBtnClass}>
                      Next Step
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <CareerPathFeatureCards />
              </div>

              {paths.length > 0 && (
                <div className={cn(cardClass, "mt-8")}>
                  <div className="mb-4 flex items-center gap-2">
                    <Map className="h-5 w-5 text-[#8b5cf6]" />
                    <h2 className="text-base font-bold text-[#0f172a]">Previous Analyses</h2>
                  </div>
                  <div className="space-y-3">
                    {paths.map((path: Record<string, unknown>) => (
                      <div
                        key={String(path.id)}
                        className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-[#0f172a]">
                              {String(path.currentRole)}
                            </h4>
                            <p className="text-xs text-[#64748b]">
                              {String(path.experienceYears)} years experience
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(path.skills as string[] | undefined)?.slice(0, 3).map((skill, i) => (
                                <span
                                  key={i}
                                  className="rounded-full border border-[#e2e8f0] bg-white px-2 py-0.5 text-[10px] font-medium text-[#64748b]"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full border border-[#e2e8f0] bg-white px-2.5 py-0.5 text-[10px] font-medium text-[#64748b]">
                            {path.createdAt
                              ? new Date(String(path.createdAt)).toLocaleDateString()
                              : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className={cardClass}>
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede9fe]">
                  <Star className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0f172a]">Skills, Interests & Goals</h2>
                  <p className="mt-0.5 text-sm text-[#64748b]">
                    Help us understand your strengths and career aspirations
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {(
                  [
                    {
                      field: "skills" as const,
                      label: "Your Skills *",
                      hint: "What are you good at? Include both technical and soft skills.",
                      placeholder: "e.g. JavaScript, Leadership, Data Analysis, Communication",
                    },
                    {
                      field: "interests" as const,
                      label: "Your Interests",
                      hint: "What aspects of work do you enjoy most?",
                      placeholder: "e.g. Problem solving, Team collaboration, Creative design",
                    },
                    {
                      field: "goals" as const,
                      label: "Career Goals",
                      hint: "Where do you want to be in 3-5 years?",
                      placeholder: "e.g. Lead a team, Start my own company, Become a senior architect",
                    },
                  ] as const
                ).map((section) => (
                  <div key={section.field}>
                    <p className={labelClass}>{section.label}</p>
                    <p className="mb-3 text-xs text-[#64748b]">{section.hint}</p>
                    {formData[section.field].map((value, index) => (
                      <div key={index} className="mb-2 flex gap-2">
                        <input
                          value={value}
                          onChange={(e) =>
                            updateArrayField(section.field, index, e.target.value)
                          }
                          placeholder={section.placeholder}
                          className={cn(inputClass, "flex-1")}
                        />
                        <button
                          type="button"
                          onClick={() => removeArrayField(section.field, index)}
                          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] text-[#64748b] transition hover:border-[#fecaca] hover:bg-[#fef2f2] hover:text-[#ef4444]"
                          aria-label={`Remove ${section.field}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addArrayField(section.field)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#c4b5fd] bg-[#faf5ff] px-4 py-2 text-xs font-semibold text-[#7c3aed] transition hover:bg-[#f3e8ff]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add {section.field === "skills" ? "Skill" : section.field === "interests" ? "Interest" : "Goal"}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <button type="button" onClick={handleBack} className={outlineBtnClass}>
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={generateAnalysisMutation.isPending}
                  className={primaryBtnClass}
                >
                  {generateAnalysisMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing Career Paths...
                    </>
                  ) : (
                    <>
                      Analyze Career Paths
                      <TrendingUp className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && analysis && (
            <div className="space-y-6">
              <div className={cardClass}>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ede9fe]">
                    <Map className="h-5 w-5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0f172a]">Your Career Path Analysis</h2>
                    <p className="text-xs text-[#64748b]">
                      AI-generated recommendations based on your profile and market trends
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-[#faf5ff] to-[#fdf4ff] p-6">
                  <h3 className="mb-4 text-sm font-semibold text-[#0f172a]">Profile Summary</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                      { icon: Users, label: "Current Role", value: formData.currentRole, bg: "bg-[#ede9fe]", color: "text-[#8b5cf6]" },
                      { icon: Clock, label: "Experience", value: `${formData.experienceYears} years`, bg: "bg-[#f3e8ff]", color: "text-[#7c3aed]" },
                      { icon: Star, label: "Key Skills", value: String(formData.skills.filter((s) => s.trim()).length), bg: "bg-[#dbeafe]", color: "text-[#3b82f6]" },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="text-center">
                          <div className={`mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full ${item.bg}`}>
                            <Icon className={`h-5 w-5 ${item.color}`} />
                          </div>
                          <p className="text-xs text-[#64748b]">{item.label}</p>
                          <p className="text-sm font-semibold text-[#0f172a]">{item.value}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {pathways.length > 0 && (
                <div className={cardClass}>
                  <div className="mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-[#8b5cf6]" />
                    <h2 className="text-base font-bold text-[#0f172a]">Recommended Career Pathways</h2>
                  </div>
                  <div className="space-y-4">
                    {pathways.map((pathway, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] p-5"
                      >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-[#0f172a]">
                              {String(pathway.title)}
                            </h4>
                            <p className="mt-0.5 text-xs text-[#64748b]">
                              {String(pathway.description)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                              difficultyColor(String(pathway.difficulty))
                            )}
                          >
                            {String(pathway.difficulty)} Difficulty
                          </span>
                        </div>

                        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold text-[#0f172a]">Timeline</p>
                            <p className="text-xs text-[#64748b]">{String(pathway.timeline)}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#0f172a]">Salary Range</p>
                            <p className="text-xs text-[#64748b]">{String(pathway.salaryRange)}</p>
                          </div>
                        </div>

                        {(pathway.requiredSkills as string[] | undefined)?.length ? (
                          <div className="mb-4">
                            <p className="mb-2 text-xs font-semibold text-[#0f172a]">Required Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(pathway.requiredSkills as string[]).map((skill, i) => (
                                <span
                                  key={i}
                                  className="rounded-full border border-[#e2e8f0] bg-white px-2 py-0.5 text-[10px] font-medium text-[#64748b]"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {(pathway.nextSteps as string[] | undefined)?.length ? (
                          <div>
                            <p className="mb-2 text-xs font-semibold text-[#0f172a]">Next Steps</p>
                            <ul className="space-y-1.5">
                              {(pathway.nextSteps as string[]).map((s, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-xs text-[#64748b]"
                                >
                                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {nextSteps.length > 0 && (
                <div className={cardClass}>
                  <div className="mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#8b5cf6]" />
                    <h2 className="text-base font-bold text-[#0f172a]">Immediate Action Items</h2>
                  </div>
                  <ul className="space-y-3">
                    {nextSteps.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ede9fe] text-[10px] font-bold text-[#7c3aed]">
                          {index + 1}
                        </div>
                        <span className="text-sm text-[#334155]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-center">
                <button type="button" onClick={startNewAnalysis} className={outlineBtnClass}>
                  Create New Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </PageShell>
  );
}
