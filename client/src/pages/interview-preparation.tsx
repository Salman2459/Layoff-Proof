import { useState } from "react";
import {
  BarChart3,
  CheckCircle,
  Download,
  FileText,
  HelpCircle,
  Info,
  Lightbulb,
  Link2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofDashboardHeader } from "@/components/layoffproof/LayoffProofDashboardHeader";
import { LayoffProofSelect } from "@/components/layoffproof/LayoffProofSelect";
import { InterviewPrepFeatureCards } from "@/components/layoffproof/interview/InterviewPrepFeatureCards";
import { InterviewPrepHeroIllustration } from "@/components/layoffproof/interview/InterviewPrepHeroIllustration";
import { useToast } from "@/hooks/use-toast";
import { extractApiErrorMessage, parseFetchJsonBody } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question: string;
  category: string;
  modelAnswer: string;
  interviewerIntent: string;
  userAnswer?: string;
  score?: number;
  feedback?: string;
  isAnswered: boolean;
}

interface JobAnalysis {
  jobTitle: string;
  company: string;
  keySkills: string[];
  requirements: string[];
  questions: Question[];
  questionsToAskInterviewer: {
    question: string;
    goodImpression: string;
  }[];
}

const inputClass =
  "w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#a5b4fc] focus:ring-2 focus:ring-[#c7d2fe]/60 disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-medium text-[#475569]";

const cardClass = "rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm sm:p-6";

const primaryBtnClass =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200/50 transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-50";

function greeting(first?: string | null, last?: string | null): string {
  return first?.trim() || last?.trim() || "there";
}

function QuestionsToAskCard({
  questions,
}: {
  questions: { question: string; goodImpression: string }[];
}) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className={cardClass}>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#dbeafe]">
          <HelpCircle className="h-5 w-5 text-[#3b82f6]" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#0f172a]">Your Questions for the Interviewer</h2>
          <p className="text-xs text-[#64748b]">
            Smart questions show engagement and help you evaluate the role.
          </p>
        </div>
      </div>
      <ul className="space-y-4">
        {questions.map((item, index) => (
          <li key={index} className="text-sm text-[#334155]">
            <span className="font-medium text-[#0f172a]">{item.question}</span>
            <div className="mt-2 rounded-xl border border-[#e8ecf4] bg-[#f8fafc] p-3 text-xs leading-relaxed text-[#64748b]">
              <span className="font-semibold text-[#475569]">Good impression: </span>
              {item.goodImpression}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const featurePills = [
  { label: "AI-Generated Questions", icon: Sparkles, bg: "bg-[#ede9fe]", text: "text-[#7c3aed]" },
  { label: "Intelligent Scoring", icon: BarChart3, bg: "bg-[#fce7f3]", text: "text-[#db2777]" },
  { label: "Personalized Feedback", icon: MessageSquare, bg: "bg-[#dbeafe]", text: "text-[#2563eb]" },
] as const;

export default function InterviewPreparation() {
  const [step, setStep] = useState<"input" | "questions" | "practice" | "results">("input");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [interviewType, setInterviewType] = useState("mixed");
  const [interviewerRole, setInterviewerRole] = useState("hiring_manager");
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isScoring, setIsScoring] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const name = greeting(user?.firstName, user?.lastName);

  const generateQuestions = async () => {
    if (!jobDescription.trim() && !jobTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide either a job description or job title to generate questions.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          jobTitle,
          interviewType,
          interviewerRole,
          id: user?.id,
        }),
      });

      const analysisBody = await parseFetchJsonBody(response);
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(analysisBody, response.statusText));
      }
      const analysis = analysisBody as unknown as JobAnalysis;
      setJobAnalysis(analysis);
      setStep("questions");

      toast({
        title: "Questions Generated!",
        description: `Generated ${analysis.questions.length} tailored interview questions.`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startPractice = () => {
    setStep("practice");
    setCurrentQuestionIndex(0);
  };

  const submitAnswer = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const scoreAnswers = async () => {
    if (!jobAnalysis) return;
    setIsScoring(true);
    try {
      const response = await fetch("/api/score-interview-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: jobAnalysis.questions,
          userAnswers,
          jobTitle: jobAnalysis.jobTitle,
        }),
      });

      const scoredBody = await parseFetchJsonBody(response);
      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(scoredBody, "Failed to score answers"),
        );
      }
      const scoredQuestions = scoredBody.questions as Question[];
      setJobAnalysis((prev) =>
        prev ? { ...prev, questions: scoredQuestions } : null
      );
      setStep("results");

      toast({
        title: "Scoring Complete!",
        description: "Your interview answers have been evaluated with personalized feedback.",
      });
    } catch (error: unknown) {
      toast({
        title: "Scoring Failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to score answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScoring(false);
    }
  };

  const restartSession = () => {
    setStep("input");
    setJobDescription("");
    setJobTitle("");
    setJobAnalysis(null);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
  };

  return (
    <LayoffProofLayout activeNavId="interview">
      <LayoffProofDashboardHeader greeting={name} />

      <main className="flex-1 px-4 pb-10 sm:px-6 lg:px-8">
        {/* Page hero */}
        <div className="flex items-start justify-between gap-6 py-6">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold tracking-tight text-[#0f172a]">
              AI Interview Question Generator & Scorer
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#64748b]">
              Get personalized interview questions based on job descriptions and receive
              AI-powered scoring with detailed feedback.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {featurePills.map((pill) => {
                const Icon = pill.icon;
                return (
                  <span
                    key={pill.label}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                      pill.bg,
                      pill.text
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    {pill.label}
                  </span>
                );
              })}
            </div>
          </div>
          <InterviewPrepHeroIllustration />
        </div>

        <div className="mx-auto max-w-5xl">
          {step === "input" && (
            <>
              <div className={cardClass}>
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede9fe]">
                    <FileText className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#0f172a]">Step 1: Job Information</h2>
                    <p className="mt-0.5 text-sm text-[#64748b]">
                      Provide job details to generate relevant interview questions.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="job-title" className={labelClass}>
                      Job Title (Optional)
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        id="job-title"
                        type="text"
                        placeholder="e.g., Software Engineer, Marketing Manager"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className={cn(inputClass, "pl-9")}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="job-description" className={labelClass}>
                      Job Description or LinkedIn Job Link
                    </label>
                    <div className="relative">
                      <textarea
                        id="job-description"
                        placeholder="Paste the full job description here or provide a LinkedIn job link..."
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        rows={8}
                        className={cn(inputClass, "min-h-[180px] resize-y pr-10")}
                      />
                      <Link2 className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 text-[#94a3b8]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="interview-type" className={labelClass}>
                        <span className="inline-flex items-center gap-1">
                          Interview Type
                          <Info className="h-3.5 w-3.5 text-[#94a3b8]" aria-hidden />
                        </span>
                      </label>
                      <LayoffProofSelect
                        id="interview-type"
                        value={interviewType}
                        onChange={(e) => setInterviewType(e.target.value)}
                      >
                        <option value="behavioral">Behavioral</option>
                        <option value="technical">Technical</option>
                        <option value="managerial">Managerial</option>
                        <option value="mixed">Mixed (Recommended)</option>
                      </LayoffProofSelect>
                    </div>
                    <div>
                      <label htmlFor="interviewer-role" className={labelClass}>
                        <span className="inline-flex items-center gap-1">
                          Interview With
                          <Info className="h-3.5 w-3.5 text-[#94a3b8]" aria-hidden />
                        </span>
                      </label>
                      <LayoffProofSelect
                        id="interviewer-role"
                        value={interviewerRole}
                        onChange={(e) => setInterviewerRole(e.target.value)}
                      >
                        <option value="hiring_manager">Hiring Manager</option>
                        <option value="hr_recruiter">HR / Recruiter</option>
                        <option value="technical_lead">Technical Lead / Senior Engineer</option>
                        <option value="team_member">Peer / Team Member</option>
                        <option value="executive">Executive / C-Level</option>
                      </LayoffProofSelect>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={generateQuestions}
                    disabled={isGenerating || (!jobDescription.trim() && !jobTitle.trim())}
                    className={primaryBtnClass}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Interview Questions
                      </>
                    )}
                  </button>
                </div>
              </div>

              <InterviewPrepFeatureCards />
            </>
          )}

          {step === "questions" && jobAnalysis && (
            <div className="space-y-6">
              <div className={cardClass}>
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dcfce7]">
                      <CheckCircle className="h-5 w-5 text-[#22c55e]" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#0f172a]">
                        Generated Questions for: {jobAnalysis.jobTitle}
                      </h2>
                      <p className="mt-0.5 text-sm text-[#64748b]">
                        Review the questions you might be asked, then start your practice session.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={startPractice}
                    className="shrink-0 rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#7c3aed]"
                  >
                    Start Practice
                  </button>
                </div>

                <div className="space-y-3">
                  {jobAnalysis.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] p-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[#0f172a]">
                          Question {index + 1}
                        </h3>
                        <span className="shrink-0 rounded-full border border-[#e2e8f0] bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
                          {question.category}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-[#334155]">{question.question}</p>

                      {question.interviewerIntent && (
                        <div className="mt-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3">
                          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#92400e]">
                            <Lightbulb className="h-3.5 w-3.5 text-[#f59e0b]" />
                            Why they&apos;re asking this
                          </div>
                          <p className="text-xs leading-relaxed text-[#78350f]">
                            {question.interviewerIntent}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <QuestionsToAskCard questions={jobAnalysis.questionsToAskInterviewer} />
            </div>
          )}

          {step === "practice" && jobAnalysis && (
            <div className="space-y-6">
              <div className={cardClass}>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#0f172a]">
                    Question {currentQuestionIndex + 1} of {jobAnalysis.questions.length}
                  </h2>
                  <span className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
                    {jobAnalysis.questions[currentQuestionIndex]?.category}
                  </span>
                </div>

                <div className="space-y-5">
                  <div className="rounded-xl border border-[#c7d2fe] bg-[#eef2ff] p-5">
                    <p className="text-base leading-relaxed text-[#312e81]">
                      {jobAnalysis.questions[currentQuestionIndex]?.question}
                    </p>
                  </div>

                  {jobAnalysis.questions[currentQuestionIndex]?.interviewerIntent && (
                    <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4">
                      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#92400e]">
                        <Lightbulb className="h-4 w-4 text-[#f59e0b]" />
                        Keep in mind why they&apos;re asking
                      </h4>
                      <p className="text-sm text-[#78350f]">
                        {jobAnalysis.questions[currentQuestionIndex]?.interviewerIntent}
                      </p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="user-answer" className={labelClass}>
                      Your Answer
                    </label>
                    <textarea
                      id="user-answer"
                      placeholder="Type your answer here..."
                      value={userAnswers[jobAnalysis.questions[currentQuestionIndex]?.id] || ""}
                      onChange={(e) =>
                        submitAnswer(
                          jobAnalysis.questions[currentQuestionIndex]?.id,
                          e.target.value
                        )
                      }
                      rows={6}
                      className={cn(inputClass, "min-h-[150px] resize-y")}
                    />
                  </div>

                  <div className="flex justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc] disabled:opacity-40"
                    >
                      Previous
                    </button>
                    {currentQuestionIndex < jobAnalysis.questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                        className="rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7c3aed]"
                      >
                        Next Question
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={scoreAnswers}
                        disabled={isScoring}
                        className="flex items-center gap-2 rounded-xl bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50"
                      >
                        {isScoring ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Scoring...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="h-4 w-4" />
                            Score My Answers
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <QuestionsToAskCard questions={jobAnalysis.questionsToAskInterviewer} />
            </div>
          )}

          {step === "results" && jobAnalysis && (
            <div className="space-y-6">
              <div className={cardClass}>
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fef9c3]">
                      <Star className="h-5 w-5 text-[#eab308]" fill="currentColor" strokeWidth={0} />
                    </div>
                    <h2 className="text-base font-bold text-[#0f172a]">Interview Results</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={restartSession}
                      className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Try Again
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export PDF
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {jobAnalysis.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-xl border border-[#e8ecf4] bg-[#fafafa] p-5"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[#0f172a]">
                          Question {index + 1}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[#e2e8f0] bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
                            {question.category}
                          </span>
                          {question.score != null && (
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                                question.score >= 8
                                  ? "bg-[#dcfce7] text-[#166534]"
                                  : question.score >= 5
                                    ? "bg-[#fef9c3] text-[#854d0e]"
                                    : "bg-[#fee2e2] text-[#991b1b]"
                              )}
                            >
                              Score: {question.score}/10
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mb-4 text-sm text-[#334155]">{question.question}</p>
                      <div className="mb-3 rounded-xl border border-[#e8ecf4] bg-white p-4">
                        <h4 className="mb-1.5 text-xs font-semibold text-[#0f172a]">Your Answer</h4>
                        <p className="whitespace-pre-wrap text-sm text-[#475569]">
                          {userAnswers[question.id] || "No answer provided"}
                        </p>
                      </div>
                      {question.feedback && (
                        <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
                          <h4 className="mb-1.5 text-xs font-semibold text-[#1e40af]">
                            AI Feedback
                          </h4>
                          <p className="whitespace-pre-wrap text-sm text-[#1d4ed8]">
                            {question.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <QuestionsToAskCard questions={jobAnalysis.questionsToAskInterviewer} />
            </div>
          )}
        </div>
      </main>
    </LayoffProofLayout>
  );
}
