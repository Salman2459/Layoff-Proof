import { useState } from "react";
import {
  ChevronRight,
  Clock,
  Copy,
  Linkedin,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofDashboardHeader } from "@/components/layoffproof/LayoffProofDashboardHeader";
import { LayoffProofSelect } from "@/components/layoffproof/LayoffProofSelect";
import { OutreachBestPractices } from "@/components/layoffproof/outreach/OutreachBestPractices";
import { OutreachHeroIllustration } from "@/components/layoffproof/outreach/OutreachHeroIllustration";
import { OutreachMessageEmpty } from "@/components/layoffproof/outreach/OutreachMessageEmpty";
import { useToast } from "@/hooks/use-toast";
import { extractApiErrorMessage, parseFetchJsonBody } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const messageTypes = [
  { id: "linkedin-dm", name: "LinkedIn DM", shortName: "LinkedIn DM", icon: Linkedin },
  { id: "email", name: "Cold Email", shortName: "Cold Email", icon: Mail },
  { id: "referral", name: "Referral Request", shortName: "Referral Request", icon: Users },
] as const;

const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Marketing",
  "Sales",
  "Consulting",
  "Education",
  "Manufacturing",
  "Retail",
  "Media",
];

const experienceLevels = [
  "Entry Level (0-2 years)",
  "Mid Level (3-5 years)",
  "Senior Level (6-10 years)",
  "Lead/Manager (10+ years)",
  "Executive (15+ years)",
];

const featurePills = [
  { label: "Personalized", icon: Target, bg: "bg-[#ede9fe]", text: "text-[#7c3aed]" },
  { label: "AI Powered", icon: Sparkles, bg: "bg-[#f3e8ff]", text: "text-[#9333ea]" },
  { label: "Multi-platform", icon: MessageSquare, bg: "bg-[#fce7f3]", text: "text-[#db2777]" },
] as const;

const inputClass =
  "w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#a5b4fc] focus:ring-2 focus:ring-[#c7d2fe]/60 disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-medium text-[#475569]";

const cardClass = "rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm sm:p-6";

function greeting(first?: string | null, last?: string | null): string {
  return first?.trim() || last?.trim() || "there";
}

export default function RecruiterOutreach() {
  const [activeTab, setActiveTab] = useState<(typeof messageTypes)[number]["id"]>("linkedin-dm");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");

  const [recruiterName, setRecruiterName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [yourName, setYourName] = useState("");
  const [yourRole, setYourRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [experience, setExperience] = useState("");
  const [tone, setTone] = useState("professional");

  const { user } = useAuth();
  const { toast } = useToast();

  const name = greeting(user?.firstName, user?.lastName);
  const activeType = messageTypes.find((type) => type.id === activeTab)!;
  const MessageTypeIcon = activeType.icon;
  const hasError = generatedMessage.startsWith("Error:");
  const hasMessage = !!generatedMessage && !hasError;

  const generateMessage = async () => {
    setIsGenerating(true);
    setGeneratedMessage("");

    try {
      const response = await fetch("/api/generate-outreach-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageType: activeTab,
          recruiterName,
          companyName,
          jobTitle,
          yourName,
          yourRole,
          industry,
          experience,
          tone,
          id: user?.id,
        }),
      });

      const data = await parseFetchJsonBody(response);
      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(data, "Failed to generate message from server"),
        );
      }
      setGeneratedMessage(data.generatedMessage);

      toast({
        title: "Message generated!",
        description: `Your ${activeType.shortName} is ready to review.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setGeneratedMessage(`Error: ${message}`);
      toast({ title: "Generation failed", description: message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast({ title: "Copied!", description: "Message copied to clipboard." });
  };

  return (
    <LayoffProofLayout activeNavId="resume-analyzer">
      <LayoffProofDashboardHeader greeting={name} />

      <main className="flex-1 px-4 pb-10 sm:px-6 lg:px-8">
        {/* Page hero */}
        <div className="flex items-start justify-between gap-6 py-6">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold tracking-tight text-[#0f172a]">
              Generate Personalized Outreach Scripts
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#64748b]">
              Create compelling LinkedIn DMs, cold emails, and referral requests that get noticed
              by recruiters.
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
          <OutreachHeroIllustration />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Left column — input */}
          <div className="space-y-5">
            {/* Step 1 */}
            <div className={cardClass}>
              <h2 className="mb-4 text-sm font-bold text-[#0f172a]">1. Select Message Type</h2>
              <div className="grid grid-cols-3 gap-2">
                {messageTypes.map((type) => {
                  const Icon = type.icon;
                  const isActive = activeTab === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setActiveTab(type.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition",
                        isActive
                          ? "border-[#8b5cf6] bg-[#faf5ff] text-[#7c3aed] shadow-sm"
                          : "border-[#e8ecf4] bg-[#fafafa] text-[#64748b] hover:border-[#c4b5fd] hover:bg-white"
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                      <span className="text-[11px] font-semibold leading-tight sm:text-xs">
                        {type.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2 */}
            <div className={cardClass}>
              <h2 className="mb-4 text-sm font-bold text-[#0f172a]">2. Provide Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="your-name" className={labelClass}>
                      Your Name
                    </label>
                    <input
                      id="your-name"
                      type="text"
                      placeholder="e.g., John Doe"
                      value={yourName}
                      onChange={(e) => setYourName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="your-role" className={labelClass}>
                      Your Current Role
                    </label>
                    <input
                      id="your-role"
                      type="text"
                      placeholder="e.g., Software Engineer"
                      value={yourRole}
                      onChange={(e) => setYourRole(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="recipient-name" className={labelClass}>
                      Recipient&apos;s Name
                    </label>
                    <input
                      id="recipient-name"
                      type="text"
                      placeholder="e.g., Jane Smith"
                      value={recruiterName}
                      onChange={(e) => setRecruiterName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="company-name" className={labelClass}>
                      Company Name
                    </label>
                    <input
                      id="company-name"
                      type="text"
                      placeholder="e.g., Google, Microsoft"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="target-job" className={labelClass}>
                    Target Job Title
                  </label>
                  <input
                    id="target-job"
                    type="text"
                    placeholder="e.g., Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="industry" className={labelClass}>
                      Industry
                    </label>
                    <LayoffProofSelect
                      id="industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    >
                      <option value="">Select industry</option>
                      {industries.map((ind) => (
                        <option key={ind} value={ind.toLowerCase()}>
                          {ind}
                        </option>
                      ))}
                    </LayoffProofSelect>
                  </div>
                  <div>
                    <label htmlFor="experience" className={labelClass}>
                      Experience Level
                    </label>
                    <LayoffProofSelect
                      id="experience"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                    >
                      <option value="">Select experience</option>
                      {experienceLevels.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </LayoffProofSelect>
                  </div>
                </div>

                <div>
                  <label htmlFor="tone" className={labelClass}>
                    Tone
                  </label>
                  <LayoffProofSelect
                    id="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="direct">Direct</option>
                  </LayoffProofSelect>
                </div>

                <button
                  type="button"
                  onClick={generateMessage}
                  disabled={isGenerating || !yourName}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200/50 transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Message...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate {activeType.shortName}
                    </>
                  )}
                </button>

                <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#94a3b8]">
                  <Lock className="h-3 w-3" />
                  Your information is secure and will not be shared.
                </p>
              </div>
            </div>
          </div>

          {/* Right column — output */}
          <div className="space-y-5">
            <div className={cardClass}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#0f172a]">Generated Message</h2>
                {hasMessage && (
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                )}
              </div>

              {isGenerating ? (
                <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#ddd6fe] bg-[#faf5ff]/60 px-6 py-12 text-center">
                  <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#8b5cf6]" />
                  <p className="text-sm font-semibold text-[#0f172a]">AI is crafting your message...</p>
                  <p className="mt-1 text-xs text-[#64748b]">This may take a few seconds</p>
                </div>
              ) : hasMessage || hasError ? (
                <textarea
                  readOnly={hasError}
                  value={generatedMessage}
                  onChange={(e) => !hasError && setGeneratedMessage(e.target.value)}
                  className={cn(
                    inputClass,
                    "min-h-[380px] resize-y font-mono text-[13px] leading-relaxed",
                    hasError && "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
                  )}
                />
              ) : (
                <OutreachMessageEmpty icon={MessageTypeIcon} label={activeType.shortName.toLowerCase()} />
              )}
            </div>

            {/* Quick Actions */}
            <div className={cardClass}>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#8b5cf6]" strokeWidth={2} />
                <h2 className="text-sm font-bold text-[#0f172a]">Quick Actions</h2>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={generateMessage}
                  disabled={isGenerating || !yourName}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#e8ecf4] bg-[#fafafa] px-4 py-3 text-left transition hover:border-[#c4b5fd] hover:bg-[#faf5ff] disabled:opacity-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ede9fe]">
                    <RefreshCw className="h-4 w-4 text-[#8b5cf6]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0f172a]">Generate Alternative Version</p>
                    <p className="text-xs text-[#64748b]">Get a different version of your message</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                </button>

                <div className="flex w-full items-center gap-3 rounded-xl border border-[#e8ecf4] bg-[#fafafa] px-4 py-3 opacity-70">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fce7f3]">
                    <Sparkles className="h-4 w-4 text-[#ec4899]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#0f172a]">Make It More Personal</p>
                      <span className="rounded-full bg-[#ede9fe] px-2 py-0.5 text-[10px] font-bold text-[#7c3aed]">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-xs text-[#64748b]">Add more personalization based on context</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                </div>

                <div className="flex w-full items-center gap-3 rounded-xl border border-[#e8ecf4] bg-[#fafafa] px-4 py-3 opacity-70">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe]">
                    <Clock className="h-4 w-4 text-[#3b82f6]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#0f172a]">Create Follow-up Message</p>
                      <span className="rounded-full bg-[#ede9fe] px-2 py-0.5 text-[10px] font-bold text-[#7c3aed]">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-xs text-[#64748b]">
                      Generate a follow-up message for no response
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <OutreachBestPractices />
      </main>
    </LayoffProofLayout>
  );
}
