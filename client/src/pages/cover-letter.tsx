import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  FileEdit,
  Loader2,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofDashboardHeader } from "@/components/layoffproof/LayoffProofDashboardHeader";
import { CoverLetterHeroIllustration } from "@/components/layoffproof/cover-letter/CoverLetterHeroIllustration";
import { CoverLetterPreviewEmpty } from "@/components/layoffproof/cover-letter/CoverLetterPreviewEmpty";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  loadCoverLetterDraft,
  saveCoverLetterDraft,
} from "@/lib/coverLetterDraft";
import { cn } from "@/lib/utils";
import { extractApiErrorMessage, parseFetchJsonBody } from "@/lib/queryClient";

interface PersonalData {
  name: string;
  email: string;
  phone: string;
  degree: string;
  university: string;
  profession: string;
  yearsExperience: string;
  currentCompany: string;
  currentLocation: string;
  workArrangement: string;
  mainResponsibility: string;
  topDuty: string;
  skills: string;
  certifications: string;
  tools: string;
}

interface JobDetails {
  position: string;
  company: string;
  reason: string;
}

function greeting(first?: string | null, last?: string | null): string {
  return first?.trim() || last?.trim() || "there";
}

const inputClass =
  "w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#a5b4fc] focus:ring-2 focus:ring-[#c7d2fe]/60 disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-medium text-[#475569]";

export default function CoverLetter() {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [uploadedResume, setUploadedResume] = useState<File | null>(null);
  const [parsedResumeData, setParsedResumeData] = useState<Record<string, string> | null>(null);
  const [fetchingDataFromFile, setFetchingDataFromFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [jobDetails, setJobDetails] = useState<JobDetails>({ position: "", company: "", reason: "" });
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [personalData, setPersonalData] = useState<PersonalData>({
    name: "",
    email: "",
    phone: "",
    degree: "",
    university: "",
    profession: "",
    yearsExperience: "",
    currentCompany: "",
    currentLocation: "",
    workArrangement: "",
    mainResponsibility: "",
    topDuty: "",
    skills: "",
    certifications: "",
    tools: "",
  });
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const [isImproving, setIsImproving] = useState(false);
  const [improvementInstructions, setImprovementInstructions] = useState("");
  const [isImprovingLoading, setIsImprovingLoading] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const name = greeting(user?.firstName, user?.lastName);

  // Restore the last cover letter for this user
  useEffect(() => {
    if (!user?.id || draftRestored) return;
    const draft = loadCoverLetterDraft(user.id);
    setDraftRestored(true);
    if (!draft) return;

    if (draft.generatedLetter) setGeneratedLetter(draft.generatedLetter);
    if (draft.jobDetails) {
      setJobDetails({
        position: draft.jobDetails.position || "",
        company: draft.jobDetails.company || "",
        reason: draft.jobDetails.reason || "",
      });
    }
    if (draft.personalData && typeof draft.personalData === "object") {
      setPersonalData((prev) => ({
        ...prev,
        ...draft.personalData,
      }));
    }
    if (draft.parsedResumeData) setParsedResumeData(draft.parsedResumeData);
    if (draft.activeTab === "upload" || draft.activeTab === "manual") {
      setActiveTab(draft.activeTab);
    }
    if (typeof draft.improvementInstructions === "string") {
      setImprovementInstructions(draft.improvementInstructions);
    }
  }, [user?.id, draftRestored]);

  // Persist cover letter + form inputs whenever they change
  useEffect(() => {
    if (!user?.id || !draftRestored) return;

    const hasContent =
      !!generatedLetter.trim() ||
      !!jobDetails.position.trim() ||
      !!jobDetails.company.trim() ||
      !!personalData.name.trim() ||
      !!parsedResumeData;

    if (!hasContent) return;

    const timer = window.setTimeout(() => {
      saveCoverLetterDraft(user.id, {
        generatedLetter,
        jobDetails,
        personalData: { ...personalData },
        parsedResumeData,
        activeTab,
        improvementInstructions,
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [
    user?.id,
    draftRestored,
    generatedLetter,
    jobDetails,
    personalData,
    parsedResumeData,
    activeTab,
    improvementInstructions,
  ]);

  const processFile = async (file: File) => {
    setUploadedResume(file);
    setParsedResumeData(null);
    setGeneratedLetter("");

    try {
      const formData = new FormData();
      formData.append("resume", file);
      if (user?.id) formData.append("id", user.id);
      setFetchingDataFromFile(true);

      const response = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });

      const data = await parseFetchJsonBody(response);
      if (!response.ok) {
        toast({
          title: "Upload Error",
          description: extractApiErrorMessage(
            data,
            "Failed to process your resume. Please try again.",
          ),
          variant: "destructive",
        });
        return;
      }
      setParsedResumeData(data.parsedData);

      toast({
        title: "Resume Uploaded!",
        description: "Your resume has been processed and key information extracted.",
      });
    } catch (error: unknown) {
      toast({
        title: "Upload Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to process your resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setFetchingDataFromFile(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const generateCoverLetterFromResume = async () => {
    if (!parsedResumeData || !jobDetails.position || !jobDetails.company) {
      toast({
        title: "Missing Information",
        description: "Please upload a resume and provide all required job details.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const formattedParsedData = {
        name: parsedResumeData.name || "",
        email: parsedResumeData.email || "",
        phone: parsedResumeData.phone || "",
        degree: parsedResumeData.degree || "",
        university: parsedResumeData.university || "",
        profession: parsedResumeData.profession || "",
        yearsExperience: parsedResumeData.yearsExperience || "",
        currentCompany: parsedResumeData.currentCompany || "",
        currentLocation: parsedResumeData.currentLocation || "",
        workArrangement: parsedResumeData.workArrangement || "",
        mainResponsibility: parsedResumeData.mainResponsibility || "",
        topDuty: parsedResumeData.topDuty || "",
        skills: parsedResumeData.skills || "",
        certifications: parsedResumeData.certifications || "",
        tools: parsedResumeData.tools || "",
      };

      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsedData: formattedParsedData,
          jobDetails,
          method: "resume",
        }),
      });

      const data = await parseFetchJsonBody(response);
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data, response.statusText));
      }

      setGeneratedLetter(String(data.coverLetter ?? ""));

      toast({
        title: data.generatedBy === "ai" ? "Success!" : "Generated!",
        description:
          data.generatedBy === "ai"
            ? "Your cover letter is ready."
            : "Cover letter created from a simple template (full generation was unavailable).",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate cover letter.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCoverLetterManual = async () => {
    if (!personalData.name || !personalData.profession || !jobDetails.position || !jobDetails.company) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalData,
          jobDetails,
          method: "manual",
          id: user?.id,
        }),
      });

      const data = await parseFetchJsonBody(response);
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data, response.statusText));
      }

      setGeneratedLetter(String(data.coverLetter ?? ""));

      toast({
        title: data.generatedBy === "ai" ? "Success!" : "Generated!",
        description:
          data.generatedBy === "ai"
            ? "Your cover letter is ready."
            : "Cover letter created from a simple template (full generation was unavailable).",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate cover letter.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImproveLetter = async () => {
    if (!improvementInstructions.trim()) {
      toast({
        title: "Instructions Required",
        description: "Please tell the AI how to improve your letter.",
        variant: "destructive",
      });
      return;
    }

    setIsImprovingLoading(true);
    try {
      const response = await fetch("/api/improve-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalLetter: generatedLetter,
          instructions: improvementInstructions,
          id: user?.id,
        }),
      });

      const data = await parseFetchJsonBody(response);
      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(data, "Failed to improve the cover letter."),
        );
      }

      setGeneratedLetter(String(data.improvedLetter ?? ""));
      toast({ title: "Success!", description: "Your cover letter has been improved." });
      setIsImproving(false);
      setImprovementInstructions("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not improve the letter.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsImprovingLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLetter);
    toast({ title: "Copied!", description: "Cover letter copied to clipboard." });
  };

  const downloadLetter = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedLetter], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "cover_letter.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({ title: "Downloaded!", description: "Cover letter downloaded successfully." });
  };

  const jobFields = (
    <div className="space-y-4">
      <div>
        <label htmlFor="position" className={labelClass}>
          Job Position <span className="text-[#ef4444]">*</span>
        </label>
        <input
          id="position"
          type="text"
          placeholder="e.g., Software Engineer"
          value={jobDetails.position}
          onChange={(e) => setJobDetails({ ...jobDetails, position: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="company" className={labelClass}>
          Company Name <span className="text-[#ef4444]">*</span>
        </label>
        <input
          id="company"
          type="text"
          placeholder="e.g., Google"
          value={jobDetails.company}
          onChange={(e) => setJobDetails({ ...jobDetails, company: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="reason" className={labelClass}>
          Why this position?
        </label>
        <input
          id="reason"
          type="text"
          placeholder="e.g., career growth, new challenges"
          value={jobDetails.reason}
          onChange={(e) => setJobDetails({ ...jobDetails, reason: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  );

  return (
    <LayoffProofLayout activeNavId="cover-letter">
      <LayoffProofDashboardHeader greeting={name} />

      <main className="flex-1 px-4 pb-10 sm:px-6 lg:px-8">
        {/* Page hero */}
        <div className="flex items-start justify-between gap-6 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#8b5cf6] shadow-sm shadow-violet-200/60">
              <FileEdit className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[26px] font-bold tracking-tight text-[#0f172a]">
                Cover Letter Generator
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#64748b]">
                Create professional, personalized cover letters that stand out to employers and get
                you noticed.
              </p>
            </div>
          </div>
          <CoverLetterHeroIllustration />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Input panel */}
          <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex rounded-xl bg-[#f1f5f9] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                  activeTab === "upload"
                    ? "bg-white text-[#7c3aed] shadow-sm"
                    : "text-[#64748b] hover:text-[#334155]"
                )}
              >
                <Upload className="h-4 w-4" strokeWidth={2} />
                Upload Resume
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                  activeTab === "manual"
                    ? "bg-white text-[#7c3aed] shadow-sm"
                    : "text-[#64748b] hover:text-[#334155]"
                )}
              >
                <User className="h-4 w-4" strokeWidth={2} />
                Fill Manually
              </button>
            </div>

            {activeTab === "upload" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-[#0f172a]">Upload Your Resume</h2>
                  <p className="mt-1 text-sm text-[#64748b]">
                    Upload your resume file to extract your information automatically.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
                    isDragging
                      ? "border-[#8b5cf6] bg-[#f5f3ff]"
                      : "border-[#e2e8f0] bg-[#fafafa] hover:border-[#c4b5fd] hover:bg-[#faf5ff]"
                  )}
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ede9fe]">
                    <Upload className="h-6 w-6 text-[#8b5cf6]" strokeWidth={2} />
                  </div>
                  <p className="text-sm font-semibold text-[#0f172a]">
                    Click to upload or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-[#94a3b8]">
                    Supports .txt, .pdf, .doc, .docx files
                  </p>
                </div>

                {uploadedResume && (
                  <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3">
                    <p className="text-sm font-medium text-[#166534]">
                      Resume uploaded: {uploadedResume.name}
                    </p>
                    {parsedResumeData && (
                      <div className="mt-2 space-y-0.5 text-xs text-[#15803d]">
                        <p>
                          <span className="font-medium">Name:</span>{" "}
                          {parsedResumeData.name || "Not detected"}
                        </p>
                        <p>
                          <span className="font-medium">Profession:</span>{" "}
                          {parsedResumeData.profession || "Not detected"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {fetchingDataFromFile && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm text-[#1d4ed8]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fetching data from file...
                  </div>
                )}

                {jobFields}

                <button
                  type="button"
                  onClick={generateCoverLetterFromResume}
                  disabled={isGenerating || !parsedResumeData}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7c3aed] disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? "Generating with AI..." : "Generate Cover Letter"}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-bold text-[#0f172a]">Personal Information</h2>
                  <p className="mt-1 text-sm text-[#64748b]">
                    Fill in your details to generate a professional cover letter.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["name", "Full Name", "John Doe", true],
                      ["email", "Email", "john@example.com", true],
                      ["phone", "Phone Number", "+1 (555) 123-4567", true],
                      ["degree", "Degree", "Bachelor's in Computer Science", true],
                      ["university", "University", "Stanford University", true],
                      ["profession", "Profession", "Software Development", true],
                      ["yearsExperience", "Years of Experience", "5", true],
                      ["currentCompany", "Current Company", "Tech Corp Inc.", false],
                      ["currentLocation", "Current Location", "San Francisco, CA", false],
                      ["workArrangement", "Work Arrangement", "Remote/Hybrid/Onsite", false],
                    ] as const
                  ).map(([key, label, placeholder, required]) => (
                    <div key={key} className={key === "name" || key === "email" ? "" : ""}>
                      <label htmlFor={key} className={labelClass}>
                        {label}
                        {required && <span className="text-[#ef4444]"> *</span>}
                      </label>
                      <input
                        id={key}
                        type={key === "email" ? "email" : "text"}
                        placeholder={placeholder}
                        value={personalData[key]}
                        onChange={(e) =>
                          setPersonalData({ ...personalData, [key]: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>

                {(
                  [
                    ["mainResponsibility", "Main Responsibility", "Describe your main job responsibility..."],
                    ["topDuty", "Top Duty/Achievement", "Describe your top duty or achievement..."],
                    ["skills", "Skills & Hard Skills", "List your relevant skills..."],
                    ["certifications", "Certifications", "List your certifications..."],
                    ["tools", "Tools & Methods", "Tools and methods you use to stay organized..."],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label htmlFor={key} className={labelClass}>
                      {label}
                    </label>
                    <textarea
                      id={key}
                      rows={3}
                      placeholder={placeholder}
                      value={personalData[key]}
                      onChange={(e) => setPersonalData({ ...personalData, [key]: e.target.value })}
                      className={cn(inputClass, "resize-y")}
                    />
                  </div>
                ))}

                <div className="border-t border-[#e8ecf4] pt-5">
                  <h3 className="mb-4 text-sm font-bold text-[#0f172a]">Job Details</h3>
                  {jobFields}
                </div>

                <button
                  type="button"
                  onClick={generateCoverLetterManual}
                  disabled={isGenerating}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7c3aed] disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? "Generating with AI..." : "Generate Cover Letter"}
                </button>
              </div>
            )}
          </div>

          {/* Preview panel */}
          <div className="rounded-2xl border border-[#e8ecf4] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e8ecf4] px-5 py-4 sm:px-6">
              <h2 className="text-base font-bold text-[#0f172a]">Generated Cover Letter</h2>
              {generatedLetter && (
                <div className="flex flex-wrap gap-2">
                  {!isImproving && (
                    <button
                      type="button"
                      onClick={() => setIsImproving(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#8b5cf6]" />
                      Improve
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={downloadLetter}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              )}
            </div>

            {generatedLetter ? (
              <div className="space-y-4 p-5 sm:p-6">
                <textarea
                  value={generatedLetter}
                  onChange={(e) => setGeneratedLetter(e.target.value)}
                  className={cn(inputClass, "min-h-[420px] resize-y font-mono text-[13px] leading-relaxed")}
                  placeholder="Your generated cover letter will appear here..."
                />
                {isImproving && (
                  <div className="space-y-3 rounded-xl border border-[#e8ecf4] bg-[#f8fafc] p-4">
                    <label htmlFor="improve-instructions" className="text-sm font-semibold text-[#0f172a]">
                      How should we improve this letter?
                    </label>
                    <textarea
                      id="improve-instructions"
                      rows={3}
                      placeholder="e.g., Make it more formal, shorten the second paragraph..."
                      value={improvementInstructions}
                      onChange={(e) => setImprovementInstructions(e.target.value)}
                      className={cn(inputClass, "resize-y")}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsImproving(false)}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-[#64748b] hover:bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleImproveLetter}
                        disabled={isImprovingLoading}
                        className="flex items-center gap-2 rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7c3aed] disabled:opacity-50"
                      >
                        {isImprovingLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Submit Improvement
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <CoverLetterPreviewEmpty />
            )}
          </div>
        </div>
      </main>
    </LayoffProofLayout>
  );
}
