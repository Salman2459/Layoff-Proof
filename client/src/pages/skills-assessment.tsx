import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Award,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Loader2,
  Lock,
  Plus,
  Rocket,
  Target,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import { LayoffProofDashboardHeader } from "@/components/layoffproof/LayoffProofDashboardHeader";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofSelect } from "@/components/layoffproof/LayoffProofSelect";
import { SkillsAssessmentFeatureCards } from "@/components/layoffproof/skills/SkillsAssessmentFeatureCards";
import { SkillsAssessmentHeroBanner } from "@/components/layoffproof/skills/SkillsAssessmentHeroBanner";
import { SkillsAssessmentStepper } from "@/components/layoffproof/skills/SkillsAssessmentStepper";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AssessmentData {
  assessmentType: string;
  currentRole: string;
  targetRole: string;
  skillsToAssess: string[];
}

interface SkillRating {
  skill: string;
  level: number;
  assessment: string;
}

const inputClass =
  "w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#a5b4fc] focus:ring-2 focus:ring-[#c7d2fe]/60 disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-medium text-[#475569]";

const cardClass = "rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm sm:p-6";

const primaryBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200/50 transition hover:from-[#4f46e5] hover:to-[#9333ea] disabled:cursor-not-allowed disabled:opacity-50";

const outlineBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-5 py-2.5 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc] disabled:opacity-50";

function getSkillLevelText(level: number) {
  switch (level) {
    case 1:
      return "Beginner";
    case 2:
      return "Basic";
    case 3:
      return "Intermediate";
    case 4:
      return "Advanced";
    case 5:
      return "Expert";
    default:
      return "Unknown";
  }
}

function getSkillLevelColor(level: number) {
  switch (level) {
    case 1:
      return "bg-[#fee2e2] text-[#991b1b]";
    case 2:
      return "bg-[#ffedd5] text-[#9a3412]";
    case 3:
      return "bg-[#fef9c3] text-[#854d0e]";
    case 4:
      return "bg-[#dbeafe] text-[#1e40af]";
    case 5:
      return "bg-[#dcfce7] text-[#166534]";
    default:
      return "bg-[#f1f5f9] text-[#475569]";
  }
}

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
    <LayoffProofLayout activeNavId="skills">
      <LayoffProofDashboardHeader greeting={greetingName} />
      {children}
    </LayoffProofLayout>
  );
}

export default function SkillsAssessment() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const name = greeting(user?.firstName, user?.lastName);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<AssessmentData>({
    assessmentType: "",
    currentRole: "",
    targetRole: "",
    skillsToAssess: [""],
  });
  const [skillRatings, setSkillRatings] = useState<SkillRating[]>([]);
  const [assessment, setAssessment] = useState<Record<string, unknown> | null>(null);

  const { data: existingAssessments } = useQuery({
    queryKey: ["/api/skills-assessments"],
    enabled: isAuthenticated,
  });

  const generateAssessmentMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return await apiRequest("POST", "/api/skills-assessments", data);
    },
    onSuccess: (response) => {
      setAssessment(response as Record<string, unknown>);
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ["/api/skills-assessments"] });
      toast({
        title: "Assessment Complete",
        description: "Your skills assessment and learning plan are ready!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.assessmentType || !formData.currentRole) {
        toast({
          title: "Missing Information",
          description: "Please select assessment type and current role.",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const validSkills = formData.skillsToAssess.filter((s) => s.trim());
      if (validSkills.length === 0) {
        toast({
          title: "Missing Skills",
          description: "Please add at least one skill to assess.",
          variant: "destructive",
        });
        return;
      }
      setSkillRatings(
        validSkills.map((skill) => ({
          skill,
          level: 1,
          assessment: "",
        }))
      );
      setStep(3);
    } else if (step === 3) {
      const incompleteRatings = skillRatings.filter((rating) => !rating.assessment.trim());
      if (incompleteRatings.length > 0) {
        toast({
          title: "Incomplete Assessment",
          description: "Please provide assessment details for all skills.",
          variant: "destructive",
        });
        return;
      }

      generateAssessmentMutation.mutate({
        assessmentType: formData.assessmentType,
        currentRole: formData.currentRole,
        targetRole: formData.targetRole,
        skillsToAssess: formData.skillsToAssess.filter((s) => s.trim()),
        assessment: skillRatings.map((rating) => ({
          ...rating,
          recommendations: [],
        })),
      });
    }
  };

  const handleBack = () => setStep(Math.max(1, step - 1));

  const addSkill = () => {
    setFormData((prev) => ({
      ...prev,
      skillsToAssess: [...prev.skillsToAssess, ""],
    }));
  };

  const removeSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      skillsToAssess: prev.skillsToAssess.filter((_, i) => i !== index),
    }));
  };

  const updateSkill = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      skillsToAssess: prev.skillsToAssess.map((skill, i) => (i === index ? value : skill)),
    }));
  };

  const updateSkillRating = (index: number, field: keyof SkillRating, value: string | number) => {
    setSkillRatings((prev) =>
      prev.map((rating, i) => (i === index ? { ...rating, [field]: value } : rating))
    );
  };

  const startNewAssessment = () => {
    setFormData({
      assessmentType: "",
      currentRole: "",
      targetRole: "",
      skillsToAssess: [""],
    });
    setSkillRatings([]);
    setAssessment(null);
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
              <Award className="h-6 w-6 text-[#8b5cf6]" />
            </div>
            <h1 className="text-xl font-bold text-[#0f172a]">Access Required</h1>
            <p className="mt-2 text-sm text-[#64748b]">
              Please log in to access the Skills Assessment.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  const assessments = Array.isArray(existingAssessments) ? existingAssessments : [];

  return (
    <PageShell greetingName={name}>
      <main className="flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <SkillsAssessmentHeroBanner />

          <div className="mt-6">
            <SkillsAssessmentStepper currentStep={step} />
          </div>

        {/* Step 1: Assessment Setup */}
        {step === 1 && (
          <>
            <div className={cardClass}>
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede9fe]">
                  <Target className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0f172a]">Assessment Setup</h2>
                  <p className="mt-0.5 text-sm text-[#64748b]">
                    Choose the type of assessment and provide role information
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="assessment-type" className={labelClass}>
                    Assessment Type <span className="text-[#ef4444]">*</span>
                  </label>
                  <LayoffProofSelect
                    id="assessment-type"
                    value={formData.assessmentType}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, assessmentType: e.target.value }))
                    }
                    leftIcon={<ClipboardList className="h-4 w-4" strokeWidth={2} />}
                  >
                    <option value="">Select assessment type</option>
                    <option value="technical">Technical Skills</option>
                    <option value="soft-skills">Soft Skills</option>
                    <option value="leadership">Leadership Skills</option>
                  </LayoffProofSelect>
                </div>

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
                      placeholder="e.g. Software Engineer, Marketing Manager"
                      className={cn(inputClass, "pl-9")}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="target-role" className={labelClass}>
                    Target Role (Optional)
                  </label>
                  <div className="relative">
                    <Rocket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      id="target-role"
                      type="text"
                      value={formData.targetRole}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, targetRole: e.target.value }))
                      }
                      placeholder="e.g. Senior Software Engineer, Product Manager"
                      className={cn(inputClass, "pl-9")}
                    />
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
              Your information is secure and will not be shared.
            </p>

            <div className="mt-8">
              <SkillsAssessmentFeatureCards />
            </div>

            {assessments.length > 0 && (
              <div className={cn(cardClass, "mt-8")}>
                <div className="mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#8b5cf6]" />
                  <h2 className="text-base font-bold text-[#0f172a]">Previous Assessments</h2>
                </div>
                <div className="space-y-3">
                  {assessments.map((assess: Record<string, unknown>) => (
                    <div
                      key={String(assess.id)}
                      className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-[#0f172a]">
                            {String(assess.assessmentType)} Skills
                          </h4>
                          <p className="text-xs text-[#64748b]">{String(assess.currentRole)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span className="rounded-full bg-[#ede9fe] px-2.5 py-0.5 text-[10px] font-bold text-[#7c3aed]">
                              Score: {String(assess.overallScore ?? "N/A")}
                            </span>
                            <span className="text-xs text-[#94a3b8]">
                              {Array.isArray(assess.assessment) ? assess.assessment.length : 0}{" "}
                              skills assessed
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-[#e2e8f0] bg-white px-2.5 py-0.5 text-[10px] font-medium text-[#64748b]">
                          {assess.completedAt
                            ? new Date(String(assess.completedAt)).toLocaleDateString()
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

        {/* Step 2: Skills Selection */}
        {step === 2 && (
          <div className={cardClass}>
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede9fe]">
                <Brain className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0f172a]">Skills to Assess</h2>
                <p className="mt-0.5 text-sm text-[#64748b]">
                  Add the skills you want to evaluate in this assessment
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[#64748b]">
                {formData.assessmentType === "technical" &&
                  "Technical skills like programming languages, frameworks, tools"}
                {formData.assessmentType === "soft-skills" &&
                  "Soft skills like communication, teamwork, problem-solving"}
                {formData.assessmentType === "leadership" &&
                  "Leadership skills like team management, strategic thinking, decision making"}
              </p>

              {formData.skillsToAssess.map((skill, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={skill}
                    onChange={(e) => updateSkill(index, e.target.value)}
                    placeholder={
                      formData.assessmentType === "technical"
                        ? "e.g. React, Python, AWS"
                        : formData.assessmentType === "soft-skills"
                          ? "e.g. Communication, Time Management"
                          : "e.g. Team Leadership, Strategic Planning"
                    }
                    className={cn(inputClass, "flex-1")}
                  />
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] text-[#64748b] transition hover:border-[#fecaca] hover:bg-[#fef2f2] hover:text-[#ef4444]"
                    aria-label="Remove skill"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addSkill}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#c4b5fd] bg-[#faf5ff] px-4 py-2 text-xs font-semibold text-[#7c3aed] transition hover:bg-[#f3e8ff]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Skill
              </button>
            </div>

            <div className="mt-6 flex justify-between">
              <button type="button" onClick={handleBack} className={outlineBtnClass}>
                Back
              </button>
              <button type="button" onClick={handleNext} className={primaryBtnClass}>
                Start Assessment
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Skill Rating */}
        {step === 3 && (
          <div className={cardClass}>
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede9fe]">
                <BarChart3 className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0f172a]">Rate Your Skills</h2>
                <p className="mt-0.5 text-sm text-[#64748b]">
                  For each skill, select your proficiency level and provide context
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {skillRatings.map((rating, index) => (
                <div key={index} className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[#0f172a]">{rating.skill}</h4>
                  <div className="space-y-4">
                    <div>
                      <p className={labelClass}>Proficiency Level</p>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => updateSkillRating(index, "level", level)}
                            className={cn(
                              "rounded-lg border py-2 text-sm font-semibold transition",
                              rating.level === level
                                ? "border-[#8b5cf6] bg-[#8b5cf6] text-white"
                                : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#c4b5fd]"
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                            getSkillLevelColor(rating.level)
                          )}
                        >
                          {getSkillLevelText(rating.level)}
                        </span>
                        <Progress value={rating.level * 20} className="h-1.5 flex-1" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`assessment-${index}`} className={labelClass}>
                        Describe your experience with {rating.skill}
                      </label>
                      <input
                        id={`assessment-${index}`}
                        value={rating.assessment}
                        onChange={(e) => updateSkillRating(index, "assessment", e.target.value)}
                        placeholder={`Describe your experience with ${rating.skill}, including projects, years of use, and achievements...`}
                        className={inputClass}
                      />
                    </div>
                  </div>
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
                disabled={generateAssessmentMutation.isPending}
                className={primaryBtnClass}
              >
                {generateAssessmentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Assessment...
                  </>
                ) : (
                  <>
                    Complete Assessment
                    <TrendingUp className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && assessment && (
          <div className="space-y-6">
            <div className={cardClass}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fef9c3]">
                  <Award className="h-5 w-5 text-[#eab308]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0f172a]">Your Skills Assessment Results</h2>
                  <p className="text-xs text-[#64748b]">
                    Comprehensive evaluation with personalized recommendations
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-[#faf5ff] to-[#fdf4ff] p-6">
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[#ede9fe]">
                    <span className="text-3xl font-bold text-[#7c3aed]">
                      {String(
                        assessment.overallScore ??
                          Math.round(
                            (skillRatings.reduce((sum, r) => sum + r.level, 0) /
                              skillRatings.length) *
                              20
                          )
                      )}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-[#0f172a]">Overall Score</h3>
                  <p className="text-sm text-[#64748b]">Out of 100 points</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-[#0f172a]">Strength Areas</h4>
                    <ul className="space-y-2">
                      {(
                        (assessment.strengthAreas as string[] | undefined) ??
                        skillRatings.filter((r) => r.level >= 4).map((r) => r.skill)
                      ).map((area, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-[#334155]">
                          <CheckCircle className="h-4 w-4 shrink-0 text-[#22c55e]" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-[#0f172a]">Improvement Areas</h4>
                    <ul className="space-y-2">
                      {(
                        (assessment.improvementAreas as string[] | undefined) ??
                        skillRatings.filter((r) => r.level <= 2).map((r) => r.skill)
                      ).map((area, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-[#334155]">
                          <Target className="h-4 w-4 shrink-0 text-[#8b5cf6]" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#8b5cf6]" />
                <h2 className="text-base font-bold text-[#0f172a]">Skill Breakdown</h2>
              </div>
              <div className="space-y-4">
                {skillRatings.map((rating, index) => (
                  <div key={index} className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-[#0f172a]">{rating.skill}</h4>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                          getSkillLevelColor(rating.level)
                        )}
                      >
                        {getSkillLevelText(rating.level)}
                      </span>
                    </div>
                    <Progress value={rating.level * 20} className="mb-3 h-1.5" />
                    <p className="text-sm text-[#64748b]">{rating.assessment}</p>
                    <div className="mt-3 rounded-xl border border-[#e8ecf4] bg-white p-3">
                      <h5 className="mb-1.5 text-xs font-semibold text-[#0f172a]">Recommendations</h5>
                      <ul className="space-y-1 text-xs text-[#64748b]">
                        <li>• Practice {rating.skill} through hands-on projects</li>
                        <li>• Seek mentorship from experts in {rating.skill}</li>
                        <li>• Consider online courses or certifications</li>
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={cardClass}>
              <div className="mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#8b5cf6]" />
                <h2 className="text-base font-bold text-[#0f172a]">Personalized Learning Plan</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Short Term (1–3 months)",
                    items: [
                      "Focus on immediate skill gaps",
                      "Complete online tutorials",
                      "Practice basic exercises",
                    ],
                    bg: "bg-[#faf5ff]",
                  },
                  {
                    title: "Medium Term (3–6 months)",
                    items: [
                      "Build practical projects",
                      "Seek advanced training",
                      "Get hands-on experience",
                    ],
                    bg: "bg-[#fdf4ff]",
                  },
                  {
                    title: "Long Term (6+ months)",
                    items: ["Master advanced concepts", "Lead projects and teams", "Mentor others"],
                    bg: "bg-[#f0fdf4]",
                  },
                ].map((phase) => (
                  <div key={phase.title} className={cn("rounded-xl p-4", phase.bg)}>
                    <h4 className="mb-2 text-sm font-semibold text-[#0f172a]">{phase.title}</h4>
                    <ul className="space-y-1 text-xs text-[#64748b]">
                      {phase.items.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button type="button" onClick={startNewAssessment} className={outlineBtnClass}>
                Take New Assessment
              </button>
            </div>
          </div>
        )}
        </div>
      </main>
    </PageShell>
  );
}
