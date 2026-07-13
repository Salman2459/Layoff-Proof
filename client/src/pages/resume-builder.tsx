import React, { useState, useEffect, useRef } from "react";

/** Debounce delay (ms) before live preview regenerates after edits */
const RESUME_PREVIEW_DEBOUNCE_MS = 650;
import {
  Upload,
  FileText,
  Download,
  ArrowLeft,
  ArrowRight,
  Linkedin,
  ExternalLink,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  User as UserIcon,
  Link2,
  X,
} from "lucide-react";
import { MdLocationOn } from "react-icons/md";
import { SiGithub, SiLinkedin } from "react-icons/si";
import {
  getResumeProfileImageSrc,
  RESUME_PHOTO_TEMPLATE_NAMES,
  templateSupportsProfilePhoto,
} from "@shared/resumeTemplates";
import {
  compressImageFile,
  compressProfileImageDataUrl,
} from "@/lib/compressProfileImage";
import { loadResumeDraft, resumeDraftHasContent, saveResumeDraft } from "@/lib/resumeDraft";
import type { ResumeBuilderStep } from "@/lib/resumeDraft";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  extractApiErrorMessage,
  getApiErrorMessage,
  parseFetchJsonBody,
} from "@/lib/queryClient";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { ResumeBuilderChrome } from "@/components/layoffproof/ResumeBuilderChrome";
import { ResumeBuilderChooseMethod } from "@/components/layoffproof/ResumeBuilderChooseMethod";
import { ResumeBuilderLinkedInImport } from "@/components/layoffproof/ResumeBuilderLinkedInImport";
import { ResumeEditorStepper } from "@/components/layoffproof/ResumeEditorStepper";
import { LayoffProofTemplateStrip } from "@/components/layoffproof/LayoffProofTemplateStrip";
import { LayoffProofLivePreview } from "@/components/layoffproof/LayoffProofLivePreview";
import { ResumePreviewModal } from "@/components/layoffproof/ResumePreviewModal";
import {
  layoffproofInputClass,
  layoffproofLabelClass,
  nextSection,
  type ResumeEditorSection,
} from "@/components/layoffproof/resume-builder-ui";
import { cn } from "@/lib/utils";
import {
  normalizeStoredLinkedInProfileUrl,
  shouldCoalesceBareLinkedInToFullUrl,
} from "@/lib/linkedinProfileUrl";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

// Mock types - replace with your actual types
interface ParsedResumeData {
  name: string;
  email: string;
  phone: string;
  profession: string;
  profileImageDataUrl?: string;
  summary: string;
  experience: any[];
  skills: string[];
  education: any[];
  certifications: any[];
  achievements: any[];
  projects: any[];
  languages: string[];
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  style: "modern" | "classic" | "minimal" | "creative";
}

// Mock implementations - replace with your actual implementations
const useMutation = (config: any) => {
  const [isPending, setIsPending] = useState(false);

  return {
    isPending,
    mutate: async (data: any) => {
      setIsPending(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const result = await config.mutationFn(data);
        config.onSuccess?.(result, data);
      } catch (error) {
        config.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
};

// ===================================================================
// --- AI Helper Components ---
// ===================================================================
interface AIImproveButtonProps {
  fieldName: string;
  currentValue: string;
  resumeData: ParsedResumeData;
  onSuggestion: (fieldName: string, suggestion: string) => void;
  className?: string;
}

const AIImproveButton: React.FC<AIImproveButtonProps> = ({
  fieldName,
  currentValue,
  resumeData,
  onSuggestion,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [manualPrompt, setManualPrompt] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

  const handleImprove = async (
    improvementType: "general" | "manual",
    prompt?: string,
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/improve-with-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldName,
          existingText: currentValue,
          resumeContext: resumeData,
          improvementType,
          manualPrompt: prompt,
        }),
      });

      const body = await parseFetchJsonBody(response);
      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(body, "Failed to get AI suggestion."),
        );
      }

      const { suggestion } = body;
      onSuggestion(fieldName, suggestion);
      setPopoverOpen(false);
      toast({
        title: "Content Improved!",
        description: "The suggestion has been applied.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 text-yellow-500 hover:text-yellow-400 ${className}`}
          aria-label="Improve with AI"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <h4 className="font-medium leading-none">Improve with AI</h4>
          <Button
            onClick={() => handleImprove("general")}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
            Auto-Improve
          </Button>
          <div className="space-y-2">
            <Label htmlFor="manual-prompt">Or with custom instructions:</Label>
            <Textarea
              id="manual-prompt"
              placeholder="e.g., 'Make it more concise'"
              value={manualPrompt}
              onChange={(e) => setManualPrompt(e.target.value)}
            />
            <Button
              onClick={() => handleImprove("manual", manualPrompt)}
              disabled={isLoading || !manualPrompt}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
              Generate
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface AIInputWrapperProps extends AIImproveButtonProps {
  children: React.ReactNode;
}

const AIInputWrapper: React.FC<AIInputWrapperProps> = ({
  children,
  ...props
}) => {
  return (
    <div className="relative w-full">
      {children}
      <div className="absolute top-1/2 right-2 -translate-y-1/2">
        <AIImproveButton {...props} />
      </div>
    </div>
  );
};

// --- Helper Component for Progress Steps ---
const ProgressStepper = ({
  steps,
  currentStepIndex,
}: {
  steps: string[];
  currentStepIndex: number;
}) => (
  <div className="flex items-center justify-center w-full max-w-2xl mx-auto mb-8">
    {steps.map((step, index) => (
      <React.Fragment key={step}>
        <div className="flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              index <= currentStepIndex
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {index + 1}
          </div>
          <p
            className={`mt-2 text-xs text-center font-semibold transition-colors ${
              index === currentStepIndex ? "text-blue-600" : "text-gray-500"
            }`}
          >
            {step}
          </p>
        </div>
        {index < steps.length - 1 && (
          <div
            className={`flex-1 h-1 mx-4 transition-colors ${
              index < currentStepIndex ? "bg-blue-600" : "bg-gray-200"
            }`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

const resumeTemplates: ResumeTemplate[] = [
  {
  
    id: "emerald-sidebar",
    name: "Emerald Sidebar",
    description: "Modern two-column layout with emerald accents.",
    preview: "/api/template-preview/emerald-sidebar",
    style: "creative",
  },
  {
    id: "photo-classic",
    name: "Photo Classic",
    description: "Elegant layout with photo header and chip sections.",
    preview: "/api/template-preview/photo-classic",
    style: "modern",
  },
  {
    id: "brand-split",
    name: "Brand Split",
    description: "Teal/violet modern layout with a clean split grid.",
    preview: "/api/template-preview/brand-split",
    style: "modern",
  },
  {
    id: "professional",
    name: "Professional Blue",
    description: "Clean design with blue accents.",
    preview: "/api/template-preview/professional",
    style: "modern",
  },
  {
    id: "harvard",
    name: "Harvard Classic",
    description: "Traditional academic format.",
    preview: "/api/template-preview/harvard",
    style: "classic",
  },
  {
    id: "creative",
    name: "Creative Modern",
    description: "Two-column design with sidebar.",
    preview: "/api/template-preview/creative",
    style: "creative",
  },
  {
    id: "techie",
    name: "Techie",
    description: "Dark terminal-inspired layout for developers.",
    preview: "/api/template-preview/techie",
    style: "creative",
  },
];

function buildResumePayload(
  data: ParsedResumeData,
  user?: User,
): ParsedResumeData {
  const profileImageDataUrl = getResumeProfileImageSrc({
    profileImageDataUrl: data.profileImageDataUrl,
    profileImageUrl: user?.profileImageUrl,
  });
  return profileImageDataUrl
    ? { ...data, profileImageDataUrl }
    : { ...data, profileImageDataUrl: data.profileImageDataUrl ?? "" };
}

/** Compress inline photos so preview/PDF API bodies stay under proxy size limits. */
async function prepareResumePayloadForApi(
  data: ParsedResumeData,
  user?: User,
): Promise<ParsedResumeData> {
  const base = buildResumePayload(data, user);
  const src = base.profileImageDataUrl?.trim() ?? "";
  if (!src.startsWith("data:image/")) return base;
  const compressed = await compressProfileImageDataUrl(src);
  return { ...base, profileImageDataUrl: compressed };
}

const initialResumeData: ParsedResumeData = {
  name: "",
  email: "",
  phone: "",
  profession: "",
  profileImageDataUrl: "",
  summary: "",
  experience: [],
  skills: [],
  education: [],
  certifications: [],
  achievements: [],
  projects: [],
  languages: ["English"],
  location: "",
  linkedin: "",
  github: "",
  website: "",
};

// ===================================================================
// --- ✅ UPDATED Child Component for the Editor Form ---
// ===================================================================
const ResumeEditorForm = ({
  extractedData,
  setExtractedData,
  onAISuggestion,
  selectedTemplateId = "",
  activeTab = "personal",
  onTabChange,
  variant = "default",
  hideTabList = false,
  onSaveContinue,
  showProTip = false,
  onDismissProTip,
  onFlushPreview,
}: {
  extractedData: ParsedResumeData;
  setExtractedData: React.Dispatch<React.SetStateAction<ParsedResumeData>>;
  onAISuggestion: (fieldName: string, suggestion: string) => void;
  /** When set, used to show the Projects tab only for templates that render that section. */
  selectedTemplateId?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  variant?: "default" | "layoffproof";
  hideTabList?: boolean;
  onSaveContinue?: () => void;
  showProTip?: boolean;
  onDismissProTip?: () => void;
  /** Immediately refresh the live preview (e.g. after normalizing LinkedIn on blur). */
  onFlushPreview?: (data: ParsedResumeData) => void;
}) => {
  const isLayoffProof = variant === "layoffproof";
  const fieldInputClass = isLayoffProof ? layoffproofInputClass : undefined;
  const fieldLabelClass = isLayoffProof ? layoffproofLabelClass : undefined;
  const { toast } = useToast();
  const saveContinueFooter =
    isLayoffProof && onSaveContinue ? (
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={onSaveContinue}
          className="h-11 rounded-lg bg-[#6366f1] px-6 text-sm font-semibold text-white hover:bg-[#4f46e5]"
        >
          Save & Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ) : null;
  // --- Skills: badge input (type + Enter), same pattern as AI Auto Apply ---
  const MAX_SKILLS = 15;
  const skillsList = extractedData.skills || [];
  const skillCount = skillsList.length;
  const isSkillLimitReached = skillCount >= MAX_SKILLS;

  const addSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed || skillCount >= MAX_SKILLS) return;
    setExtractedData((prev) => {
      const list = prev.skills || [];
      if (list.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return prev;
      return {
        ...prev,
        skills: [...list, trimmed].slice(0, MAX_SKILLS),
      };
    });
  };

  const removeSkill = (skillName: string) => {
    setExtractedData((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((s) => s !== skillName),
    }));
  };
  const showProjectsTab = true;
  const supportsPhoto =
    !!selectedTemplateId && templateSupportsProfilePhoto(selectedTemplateId);
  const hasProfilePhoto = !!getResumeProfileImageSrc({
    profileImageDataUrl: extractedData.profileImageDataUrl,
  });
  // --- END NEW ---

  useEffect(() => {
    const raw = (extractedData.linkedin ?? "").trim();
    if (!raw || !shouldCoalesceBareLinkedInToFullUrl(raw)) return;
    const n = normalizeStoredLinkedInProfileUrl(raw);
    if (n && n !== raw) {
      setExtractedData((prev) => ({ ...prev, linkedin: n }));
    }
  }, [extractedData.linkedin, setExtractedData]);

  const formBody = (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          {!hideTabList ? (
          <TabsList
            className={`grid w-full mb-6 sm:mb-8 ${showProjectsTab ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7" : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"}`}
          >
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            {showProjectsTab ? (
              <TabsTrigger value="projects">Projects</TabsTrigger>
            ) : null}
          </TabsList>
          ) : null}

          <TabsContent value="personal" className="space-y-6 mt-0">
            {isLayoffProof ? (
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">Personal Information</h3>
                <p className="mt-0.5 text-xs text-[#64748b]">
                  Add your basic details to get started
                </p>
              </div>
            ) : (
              <h3 className="text-lg font-semibold sm:text-xl">Personal Information</h3>
            )}
            <div
              className={cn(
                "rounded-xl border p-4 sm:p-5",
                isLayoffProof
                  ? "border-dashed border-[#e2e8f0] bg-[#fafbfc]"
                  : "border-border bg-card"
              )}
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-6">
                <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
                  <div
                    className={cn(
                      "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border sm:h-[72px] sm:w-[72px]",
                      isLayoffProof
                        ? "border-[#e2e8f0] bg-[#f1f5f9]"
                        : "border-border bg-muted"
                    )}
                  >
                    {extractedData.profileImageDataUrl ? (
                      <img
                        src={extractedData.profileImageDataUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : isLayoffProof ? (
                      <UserIcon className="h-8 w-8 text-[#cbd5e1]" strokeWidth={1.5} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] leading-tight text-muted-foreground sm:text-xs">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 max-w-md">
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        isLayoffProof ? "text-[#334155]" : "text-foreground"
                      )}
                    >
                      {isLayoffProof ? "Profile Photo" : "Profile photo"}
                    </div>
                    <div
                      className={cn(
                        "text-xs",
                        isLayoffProof ? "text-[#94a3b8]" : "text-muted-foreground"
                      )}
                    >
                      {isLayoffProof
                        ? `Upload a professional photo (JPG, PNG, WebP). Shown on ${RESUME_PHOTO_TEMPLATE_NAMES}.`
                        : `Optional. Shown on ${RESUME_PHOTO_TEMPLATE_NAMES}.`}
                    </div>
                    {hasProfilePhoto && supportsPhoto ? (
                      <p className="mt-1 text-xs font-medium text-emerald-600">
                        Photo will appear on your resume preview.
                      </p>
                    ) : hasProfilePhoto && !supportsPhoto ? (
                      <p className="mt-1 text-xs text-amber-600">
                        Photo saved. Switch to {RESUME_PHOTO_TEMPLATE_NAMES} to show it on your resume.
                      </p>
                    ) : supportsPhoto ? (
                      <p className="mt-1 text-xs text-[#64748b]">
                        This template supports a profile photo — upload one to display it.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex w-full min-w-0 flex-col gap-3 md:w-auto md:shrink-0 md:items-end">
                  <Input
                    id="profile-photo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/")) {
                        toast({
                          title: "Invalid file",
                          description: "Please upload a JPG, PNG, or WebP image.",
                          variant: "destructive",
                        });
                        e.target.value = "";
                        return;
                      }
                      if (file.size > 8 * 1024 * 1024) {
                        toast({
                          title: "Image too large",
                          description: "Please upload an image under 8MB.",
                          variant: "destructive",
                        });
                        e.target.value = "";
                        return;
                      }
                      try {
                        const compressed = await compressImageFile(file);
                        setExtractedData({
                          ...extractedData,
                          profileImageDataUrl: compressed,
                        });
                      } catch {
                        toast({
                          title: "Upload failed",
                          description: "Could not process that image. Try another file.",
                          variant: "destructive",
                        });
                      } finally {
                        e.target.value = "";
                      }
                    }}
                  />
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center md:justify-end">
                    <Label
                      htmlFor="profile-photo"
                      className={cn(
                        "inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border px-4 text-sm font-semibold shadow-sm transition-colors sm:w-auto sm:min-w-[8.5rem]",
                        isLayoffProof
                          ? "border-[#6366f1] bg-white text-[#6366f1] hover:bg-[#eef2ff]"
                          : "border-border bg-card font-medium text-foreground hover:bg-muted"
                      )}
                    >
                      {isLayoffProof ? "Upload Photo" : "Upload photo"}
                    </Label>
                    {extractedData.profileImageDataUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full sm:h-9 sm:w-auto sm:min-w-[8.5rem]"
                        onClick={() =>
                          setExtractedData({
                            ...extractedData,
                            profileImageDataUrl: "",
                          })
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-center text-xs text-muted-foreground md:text-right">
                    JPG/PNG/WebP — optimized automatically for preview
                  </p>
                </div>
              </div>
              {!isLayoffProof && extractedData.profileImageDataUrl ? null : !isLayoffProof ? (
                <div className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
                  Tip: use a square image for best results.
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="fullName" className={fieldLabelClass}>Full Name</Label>
                <Input
                  id="fullName"
                  className={fieldInputClass}
                  value={extractedData.name}
                  onChange={(e) =>
                    setExtractedData({ ...extractedData, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
              {isLayoffProof ? (
                <div>
                  <Label htmlFor="profession-personal" className={fieldLabelClass}>
                    Professional Title
                  </Label>
                  <Input
                    id="profession-personal"
                    className={fieldInputClass}
                    value={extractedData.profession}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        profession: e.target.value,
                      })
                    }
                    placeholder="Software Engineer"
                  />
                </div>
              ) : null}
              <div>
                <Label htmlFor="email" className={fieldLabelClass}>Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  className={fieldInputClass}
                  value={extractedData.email}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      email: e.target.value,
                    })
                  }
                  placeholder="john.doe@email.com"
                />
              </div>
              <div>
                <Label htmlFor="phone" className={fieldLabelClass}>Phone Number</Label>
                <PhoneInput
                  country="us"
                  value={extractedData.phone?.replace(/\D/g, "") ?? ""}
                  onChange={(value) =>
                    setExtractedData({
                      ...extractedData,
                      phone: value ? `+${value}` : "",
                    })
                  }
                  inputProps={{
                    id: "phone",
                    name: "phone",
                    autoComplete: "tel",
                  }}
                  containerClass="w-full"
                  inputClass={
                    isLayoffProof
                      ? "!w-full !h-11 !rounded-lg !border-[#e2e8f0] !text-sm !shadow-sm focus:!border-[#a5b4fc] focus:!ring-2 focus:!ring-[#c7d2fe]/50"
                      : "!w-full !h-10 !py-2 !border !border-gray-300 !rounded-md !shadow-sm focus:!ring-primary focus:!border-primary"
                  }
                  dropdownClass="!z-[60]"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label
                  htmlFor="location"
                  className={cn("inline-flex items-center gap-2", fieldLabelClass)}
                >
                  <MdLocationOn className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                  Location
                </Label>
                <Input
                  id="location"
                  className={fieldInputClass}
                  value={extractedData.location}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      location: e.target.value,
                    })
                  }
                  placeholder="San Francisco, CA"
                />
              </div>
              {isLayoffProof ? (
                <div>
                  <Label
                    htmlFor="website"
                    className={cn("inline-flex items-center gap-2", fieldLabelClass)}
                  >
                    <Link2 className="h-4 w-4 shrink-0 text-[#6366f1]" aria-hidden />
                    Portfolio / Website
                  </Label>
                  <Input
                    id="website"
                    className={fieldInputClass}
                    value={extractedData.website}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        website: e.target.value,
                      })
                    }
                    placeholder="https://johndoe.com"
                  />
                </div>
              ) : null}
              <div>
                <Label
                  htmlFor="linkedin"
                  className={cn("inline-flex items-center gap-2", fieldLabelClass)}
                >
                  <SiLinkedin className="h-4 w-4 shrink-0 text-[#0A66C2]" aria-hidden />
                  LinkedIn Profile
                </Label>
                <Input
                  id="linkedin"
                  className={fieldInputClass}
                  value={extractedData.linkedin}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      linkedin: e.target.value,
                    })
                  }
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    setExtractedData((prev) => {
                      const next = !v
                        ? { ...prev, linkedin: "" }
                        : {
                            ...prev,
                            linkedin: normalizeStoredLinkedInProfileUrl(v),
                          };
                      onFlushPreview?.(next);
                      return next;
                    });
                  }}
                  placeholder="linkedin.com/in/johndoe"
                  autoComplete="url"
                  inputMode="url"
                />
              </div>
              <div>
                <Label
                  htmlFor="github"
                  className={cn("inline-flex items-center gap-2", fieldLabelClass)}
                >
                  <SiGithub className="h-4 w-4 shrink-0 text-[#24292f]" aria-hidden />
                  GitHub Profile
                </Label>
                <Input
                  id="github"
                  className={fieldInputClass}
                  value={extractedData.github}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      github: e.target.value,
                    })
                  }
                  placeholder="github.com/johndoe"
                />
              </div>
            </div>

            {saveContinueFooter}
          </TabsContent>
          <TabsContent value="summary" className="space-y-6 mt-0">
            <h3
              className={cn(
                "font-semibold",
                isLayoffProof ? "text-base font-bold text-[#0f172a]" : "text-xl"
              )}
            >
              Professional Summary
            </h3>
            {!isLayoffProof ? (
            <div>
              <Label htmlFor="profession">Professional Title</Label>
              <AIInputWrapper
                fieldName="profession"
                currentValue={extractedData.profession}
                resumeData={extractedData}
                onSuggestion={onAISuggestion}
              >
                <Input
                  id="profession"
                  value={extractedData.profession}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      profession: e.target.value,
                    })
                  }
                  placeholder="e.g., Software Engineer"
                  className="pr-10"
                />
              </AIInputWrapper>
            </div>
            ) : null}
            <div>
              <Label htmlFor="summary-text" className={fieldLabelClass}>Summary</Label>
              <AIInputWrapper
                fieldName="summary"
                currentValue={extractedData.summary}
                resumeData={extractedData}
                onSuggestion={onAISuggestion}
              >
                <Textarea
                  id="summary-text"
                  value={extractedData.summary}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      summary: e.target.value,
                    })
                  }
                  placeholder="Briefly describe your career, skills, and goals..."
                  className={cn("min-h-[120px] pr-10", isLayoffProof && layoffproofInputClass)}
                />
              </AIInputWrapper>
            </div>
            {saveContinueFooter}
          </TabsContent>

          <TabsContent value="skills" className="space-y-2">
            <h3 className="text-xl font-semibold">Skills</h3>
            <p className="text-sm text-gray-600">
              Type a skill and press Enter to add it, or use the ✨ icon to get
              AI suggestions. Max {MAX_SKILLS} skills.
            </p>
            <div className="relative w-full">
              <div
                className={cn(
                  "min-h-[42px] rounded-md border p-2 pr-10",
                  isLayoffProof ? "border-[#e2e8f0] bg-white" : "border-gray-300",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {skillsList.map((skill) => (
                    <span
                      key={skill}
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-sm",
                        isLayoffProof
                          ? "bg-[#6366f1]/15 text-[#6366f1]"
                          : "bg-primary/15 text-primary",
                      )}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className={cn(
                          "ml-1 leading-none hover:opacity-80",
                          isLayoffProof ? "text-[#6366f1]" : "text-primary",
                        )}
                        aria-label={`Remove ${skill}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={
                      isSkillLimitReached ? "Maximum skills reached" : "Add skill..."
                    }
                    disabled={isSkillLimitReached}
                    className="min-w-[120px] flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        e.preventDefault();
                        addSkill(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <AIImproveButton
                  fieldName="skills"
                  currentValue={skillsList.join(", ")}
                  resumeData={extractedData}
                  onSuggestion={onAISuggestion}
                />
              </div>
            </div>
            {isSkillLimitReached && (
              <p className="text-xs text-red-500">
                Maximum of {MAX_SKILLS} skills reached. Further skills will not
                be saved.
              </p>
            )}
            <p
              className={`text-sm text-right ${isSkillLimitReached ? "text-red-600 font-medium" : "text-gray-500"}`}
            >
              {skillCount} / {MAX_SKILLS} skills
            </p>
            {saveContinueFooter}
          </TabsContent>

          <TabsContent value="experience" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Work Experience</h3>
              <Button
                onClick={() =>
                  setExtractedData({
                    ...extractedData,
                    experience: [
                      ...extractedData.experience,
                      {
                        title: "",
                        company: "",
                        duration: "",
                        description: "",
                        responsibilities: [],
                      },
                    ],
                  })
                }
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Experience
              </Button>
            </div>
            {extractedData.experience.map((exp, index) => (
              <Card key={index} className="p-4 bg-gray-50 dark:bg-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Job Title</Label>
                    <AIInputWrapper
                      fieldName={`experience.${index}.title`}
                      currentValue={exp.title}
                      resumeData={extractedData}
                      onSuggestion={onAISuggestion}
                    >
                      <Input
                        value={exp.title}
                        onChange={(e) => {
                          const newExp = [...extractedData.experience];
                          newExp[index].title = e.target.value;
                          setExtractedData({
                            ...extractedData,
                            experience: newExp,
                          });
                        }}
                        className="pr-10"
                      />
                    </AIInputWrapper>
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={exp.company}
                      onChange={(e) => {
                        const newExp = [...extractedData.experience];
                        newExp[index].company = e.target.value;
                        setExtractedData({
                          ...extractedData,
                          experience: newExp,
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <Label>Duration</Label>
                  <Input
                    value={exp.duration}
                    onChange={(e) => {
                      const newExp = [...extractedData.experience];
                      newExp[index].duration = e.target.value;
                      setExtractedData({
                        ...extractedData,
                        experience: newExp,
                      });
                    }}
                    placeholder="Jan 2020 - Present"
                  />
                </div>
                <div className="mb-4">
                  <Label>Description</Label>
                  <AIInputWrapper
                    fieldName={`experience.${index}.description`}
                    currentValue={exp.description}
                    resumeData={extractedData}
                    onSuggestion={onAISuggestion}
                  >
                    <Textarea
                      value={exp.description}
                      onChange={(e) => {
                        const newExp = [...extractedData.experience];
                        newExp[index].description = e.target.value;
                        setExtractedData({
                          ...extractedData,
                          experience: newExp,
                        });
                      }}
                      placeholder="Describe your responsibilities and achievements."
                      className="pr-10"
                    />
                  </AIInputWrapper>
                </div>
                <Button
                  onClick={() =>
                    setExtractedData({
                      ...extractedData,
                      experience: extractedData.experience.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove
                </Button>
              </Card>
            ))}
            {saveContinueFooter}
          </TabsContent>
          <TabsContent value="education" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Education</h3>
              <Button
                onClick={() =>
                  setExtractedData({
                    ...extractedData,
                    education: [
                      ...(extractedData.education || []),
                      { degree: "", school: "", duration: "" },
                    ],
                  })
                }
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Education
              </Button>
            </div>
            {(extractedData.education || []).map((edu, index) => (
              <Card key={index} className="p-4 bg-gray-50 dark:bg-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Degree / Certificate</Label>
                    <Input
                      value={edu.degree}
                      onChange={(e) => {
                        const newEdu = [...extractedData.education];
                        newEdu[index].degree = e.target.value;
                        setExtractedData({
                          ...extractedData,
                          education: newEdu,
                        });
                      }}
                      placeholder="B.S. in Computer Science"
                    />
                  </div>
                  <div>
                    <Label>School / University</Label>
                    <Input
                      value={edu.school}
                      onChange={(e) => {
                        const newEdu = [...extractedData.education];
                        newEdu[index].school = e.target.value;
                        setExtractedData({
                          ...extractedData,
                          education: newEdu,
                        });
                      }}
                      placeholder="State University"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <Label>Duration</Label>
                  <Input
                    value={edu.duration}
                    onChange={(e) => {
                      const newEdu = [...extractedData.education];
                      newEdu[index].duration = e.target.value;
                      setExtractedData({ ...extractedData, education: newEdu });
                    }}
                    placeholder="2016 - 2020"
                  />
                </div>
                <Button
                  onClick={() =>
                    setExtractedData({
                      ...extractedData,
                      education: extractedData.education.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove
                </Button>
              </Card>
            ))}
            {saveContinueFooter}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold">Achievements</h3>
                <p className="text-sm text-muted-foreground">
                  Honors, awards, or notable accomplishments. They appear on your
                  downloaded PDF only when you add at least one entry.
                </p>
              </div>
              <Button
                type="button"
                onClick={() =>
                  setExtractedData({
                    ...extractedData,
                    achievements: [...(extractedData.achievements || []), ""],
                  })
                }
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" /> Add achievement
              </Button>
            </div>
            {(extractedData.achievements || []).map((achievement, index) => (
              <Card key={index} className="p-4 bg-gray-50 dark:bg-gray-800">
                <div className="mb-4">
                  <Label htmlFor={`achievement-${index}`}>Achievement</Label>
                  <Textarea
                    id={`achievement-${index}`}
                    value={String(achievement ?? "")}
                    onChange={(e) => {
                      const list = [...(extractedData.achievements || [])];
                      list[index] = e.target.value;
                      setExtractedData({
                        ...extractedData,
                        achievements: list,
                      });
                    }}
                    placeholder="e.g. Dean's List, Employee of the Year, published research..."
                    rows={3}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    setExtractedData({
                      ...extractedData,
                      achievements: (extractedData.achievements || []).filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove
                </Button>
              </Card>
            ))}
            {!(extractedData.achievements || []).length ? (
              <p className="text-sm text-muted-foreground">
                No achievements yet. Use &quot;Add achievement&quot; to list honors,
                awards, or milestones.
              </p>
            ) : null}
            {saveContinueFooter}
          </TabsContent>

          {showProjectsTab ? (
            <TabsContent value="projects" className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    Portfolio or side projects. They appear on your downloaded
                    PDF only when you add at least one entry.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    setExtractedData({
                      ...extractedData,
                      projects: [
                        ...(extractedData.projects || []),
                        { name: "", url: "", description: "" },
                      ],
                    })
                  }
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add project
                </Button>
              </div>
              {(extractedData.projects || []).map((proj: any, index: number) => (
                <Card
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor={`project-name-${index}`}>Project name</Label>
                      <Input
                        id={`project-name-${index}`}
                        value={
                          typeof proj === "string"
                            ? proj
                            : String(proj?.name ?? "")
                        }
                        onChange={(e) => {
                          const list = [...(extractedData.projects || [])];
                          const next =
                            typeof list[index] === "string"
                              ? {
                                  name: e.target.value,
                                  url: "",
                                  description: "",
                                }
                              : {
                                  ...(list[index] as object),
                                  name: e.target.value,
                                };
                          list[index] = next;
                          setExtractedData({
                            ...extractedData,
                            projects: list,
                          });
                        }}
                        placeholder="e.g. E-commerce dashboard"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`project-url-${index}`}>Project link</Label>
                      <Input
                        id={`project-url-${index}`}
                        value={
                          typeof proj === "string"
                            ? ""
                            : String(proj?.url ?? "")
                        }
                        onChange={(e) => {
                          const list = [...(extractedData.projects || [])];
                          const cur = list[index];
                          const next =
                            typeof cur === "string"
                              ? {
                                  name: cur,
                                  url: e.target.value,
                                  description: "",
                                }
                              : {
                                  ...(cur as object),
                                  url: e.target.value,
                                };
                          list[index] = next;
                          setExtractedData({
                            ...extractedData,
                            projects: list,
                          });
                        }}
                        placeholder="https://github.com/you/project"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label htmlFor={`project-desc-${index}`}>Description</Label>
                    <Textarea
                      id={`project-desc-${index}`}
                      value={
                        typeof proj === "string"
                          ? ""
                          : String(proj?.description ?? "")
                      }
                      onChange={(e) => {
                        const list = [...(extractedData.projects || [])];
                        const cur = list[index];
                        const next =
                          typeof cur === "string"
                            ? {
                                name: cur,
                                url: "",
                                description: e.target.value,
                              }
                            : {
                                ...(cur as object),
                                description: e.target.value,
                              };
                        list[index] = next;
                        setExtractedData({
                          ...extractedData,
                          projects: list,
                        });
                      }}
                      placeholder="Briefly describe what you built and the impact..."
                      rows={3}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() =>
                      setExtractedData({
                        ...extractedData,
                        projects: (extractedData.projects || []).filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </Button>
                </Card>
              ))}
              {!(extractedData.projects || []).length ? (
                <p className="text-sm text-muted-foreground">
                  No projects yet. Use &quot;Add project&quot; to list portfolio
                  pieces, repos, or case studies.
                </p>
              ) : null}
            </TabsContent>
          ) : null}
        </Tabs>
  );

  if (isLayoffProof) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#e8ecf4] bg-white p-6 shadow-sm">
          {formBody}
        </div>
        {showProTip && onDismissProTip ? (
          <div className="relative flex items-start gap-3 rounded-xl border border-[#c7d2fe] bg-[#eef2ff] px-4 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#6366f1]" />
            <p className="pr-6 text-xs leading-relaxed text-[#4338ca]">
              <span className="font-semibold">Pro Tip:</span> A professional photo can
              increase your profile views by up to 14x on LinkedIn.
            </p>
            <button
              type="button"
              onClick={onDismissProTip}
              className="absolute right-3 top-3 text-[#94a3b8] hover:text-[#64748b]"
              aria-label="Dismiss tip"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 lg:p-8">{formBody}</CardContent>
    </Card>
  );
};

export default function ResumeBuilder() {
  const [currentStep, setCurrentStep] = useState<
    | "select"
    | "upload"
    | "linkedin-url"
    | "manual-edit"
    | "templates"
    | "editor-preview"
  >("editor-preview");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] =
    useState<ParsedResumeData>(initialResumeData);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("emerald-sidebar");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("modern-professional");
  const [linkedinUrl, setLinkedinUrl] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [buildMethod, setBuildMethod] = useState<
    "upload" | "linkedin" | "manual" | null
  >("manual");
  const { toast } = useToast();
  const { user } = useAuth();
  const [debouncedExtractedData, setDebouncedExtractedData] =
    useState<ParsedResumeData>(extractedData);
  const prevStepRef = useRef<string | null>(null);
  const [editorSection, setEditorSection] = useState<ResumeEditorSection>("personal");
  const [showProTip, setShowProTip] = useState(true);
  const [previewViewMode, setPreviewViewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const persistResumeDraft = (
    data: ParsedResumeData,
    overrides?: {
      selectedTemplate?: string;
      selectedCatalogId?: string;
      currentStep?: ResumeBuilderStep;
      buildMethod?: "upload" | "linkedin" | "manual" | null;
      linkedinUrl?: string;
      editorSection?: string;
    },
  ) => {
    if (!user?.id) return;
    saveResumeDraft(user.id, data as unknown as Record<string, unknown>, {
      selectedTemplate: overrides?.selectedTemplate ?? selectedTemplate,
      selectedCatalogId: overrides?.selectedCatalogId ?? selectedCatalogId,
      currentStep: overrides?.currentStep ?? currentStep,
      buildMethod: overrides?.buildMethod ?? buildMethod,
      linkedinUrl: overrides?.linkedinUrl ?? linkedinUrl,
      editorSection: overrides?.editorSection ?? editorSection,
    });
  };

  const handleAISuggestion = (fieldName: string, suggestion: string) => {
    setExtractedData((prevData) => {
      if (fieldName === "skills") {
        const skillsArray = suggestion
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 15); // Enforce limit
        return { ...prevData, skills: skillsArray };
      }

      if (!fieldName.includes(".") && !fieldName.includes("[")) {
        if (fieldName === "linkedin") {
          return {
            ...prevData,
            linkedin: normalizeStoredLinkedInProfileUrl(suggestion),
          };
        }
        return { ...prevData, [fieldName]: suggestion };
      }

      const updatedData = JSON.parse(JSON.stringify(prevData));
      const keys = fieldName.replace(/\[(\d+)\]/g, ".$1").split(".");
      let current = updatedData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
        if (current === undefined) {
          console.error("Invalid path for AI suggestion update:", fieldName);
          return prevData;
        }
      }
      current[keys[keys.length - 1]] = suggestion;
      return updatedData;
    });
  };

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedExtractedData(extractedData);
    }, RESUME_PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(handler);
  }, [extractedData]);

  // Show correct preview immediately when opening the editor (don’t wait for debounce)
  useEffect(() => {
    if (
      currentStep === "editor-preview" &&
      prevStepRef.current !== "editor-preview"
    ) {
      setDebouncedExtractedData(extractedData);
    }
    prevStepRef.current = currentStep;
  }, [currentStep, extractedData]);

  useEffect(() => {
    if (!user?.id || draftRestored) return;

    const draft = loadResumeDraft(user.id);
    setDraftRestored(true);

    if (!draft || !resumeDraftHasContent(draft.data)) return;

    const restored = {
      ...initialResumeData,
      ...(draft.data as Partial<ParsedResumeData>),
    };
    const photo = restored.profileImageDataUrl?.trim() ?? "";

    const applyDraft = (data: ParsedResumeData) => {
      setExtractedData(data);
      setDebouncedExtractedData(data);
      if (draft.selectedTemplate) setSelectedTemplate(draft.selectedTemplate);
      if (draft.selectedCatalogId) setSelectedCatalogId(draft.selectedCatalogId);
      if (draft.linkedinUrl) setLinkedinUrl(draft.linkedinUrl);
      if (draft.buildMethod) setBuildMethod(draft.buildMethod);
      if (draft.editorSection) {
        setEditorSection(draft.editorSection as ResumeEditorSection);
      }

      const step = draft.currentStep;
      const validSteps: ResumeBuilderStep[] = [
        "select",
        "upload",
        "linkedin-url",
        "manual-edit",
        "templates",
        "editor-preview",
      ];
      // Prefer editor so the user can keep updating their saved resume
      if (step && validSteps.includes(step) && step !== "select") {
        setCurrentStep(step === "manual-edit" || step === "upload" || step === "linkedin-url"
          ? "editor-preview"
          : step);
      } else {
        setCurrentStep("editor-preview");
      }
    };

    if (photo.startsWith("data:image/") && photo.length > 380_000) {
      void compressProfileImageDataUrl(photo)
        .then((compressed) =>
          applyDraft({ ...restored, profileImageDataUrl: compressed }),
        )
        .catch(() => applyDraft(restored));
      return;
    }

    applyDraft(restored);
  }, [user?.id, draftRestored]);

  useEffect(() => {
    if (!user || !draftRestored) return;
    setExtractedData((prev) => {
      const name =
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        prev.name;
      const email = user.email?.trim() || prev.email;
      const accountPhoto = user.profileImageUrl?.trim() || "";
      const hasPhoto = !!getResumeProfileImageSrc({
        profileImageDataUrl: prev.profileImageDataUrl,
      });
      const nextPhoto =
        hasPhoto || !accountPhoto ? prev.profileImageDataUrl : accountPhoto;
      if (
        name === prev.name &&
        email === prev.email &&
        nextPhoto === prev.profileImageDataUrl
      ) {
        return prev;
      }
      return {
        ...prev,
        name: name || prev.name,
        email: email || prev.email,
        profileImageDataUrl: nextPhoto,
      };
    });
  }, [user, draftRestored]);

  useEffect(() => {
    if (!user?.id || !draftRestored) return;
    const timer = window.setTimeout(() => {
      // Avoid wiping a saved resume with an empty shell before the user starts
      if (
        !resumeDraftHasContent(extractedData as unknown as Record<string, unknown>) &&
        currentStep === "select"
      ) {
        return;
      }
      persistResumeDraft(extractedData);
    }, 800);
    return () => window.clearTimeout(timer);
    // persistResumeDraft closes over latest template/step values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    extractedData,
    selectedTemplate,
    selectedCatalogId,
    currentStep,
    buildMethod,
    linkedinUrl,
    editorSection,
    user?.id,
    draftRestored,
  ]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("id", user?.id || "");
      const response = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      const body = await parseFetchJsonBody(response);
      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(body, "Failed to upload resume."),
        );
      }
      return body;
    },
    onSuccess: (data: any) => {
      const parsed = { ...data.parsedData } as Partial<ParsedResumeData>;
      if (parsed.linkedin != null && parsed.linkedin !== "") {
        parsed.linkedin = normalizeStoredLinkedInProfileUrl(
          String(parsed.linkedin),
        );
      }
      const nextData = { ...initialResumeData, ...parsed };
      setExtractedData(nextData);
      setCurrentStep("templates");
      setBuildMethod("upload");
      persistResumeDraft(nextData, {
        currentStep: "templates",
        buildMethod: "upload",
      });
      toast({
        title: "Resume Extracted Successfully",
        description: "Your resume is saved. You can keep editing anytime.",
      });
    },
    onError: (error: any) =>
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      }),
  });

  const linkedinImportMutation = useMutation({
    mutationFn: async (profileUrl: string) => {
      const response = await fetch("/api/import-linkedin-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl, id: user?.id }),
      });
      const body = await parseFetchJsonBody(response);
      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(body, "Failed to import LinkedIn profile."),
        );
      }
      return body;
    },
    onSuccess: (data: any) => {
      if (data.resumeData) {
        const resumeData = { ...data.resumeData } as Partial<ParsedResumeData>;
        if (resumeData.linkedin != null && resumeData.linkedin !== "") {
          resumeData.linkedin = normalizeStoredLinkedInProfileUrl(
            String(resumeData.linkedin),
          );
        }
        const nextData = { ...initialResumeData, ...resumeData };
        setExtractedData(nextData);
        setCurrentStep("templates");
        setBuildMethod("linkedin");
        persistResumeDraft(nextData, {
          currentStep: "templates",
          buildMethod: "linkedin",
        });
        toast({
          title: "LinkedIn Profile Imported",
          description: "Your resume is saved. You can keep editing anytime.",
        });
      } else {
        toast({
          title: "Import Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) =>
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      }),
  });

  const generatePreviewMutation = useMutation({
    mutationFn: async (data: {
      templateId: string;
      resumeData: ParsedResumeData;
    }) => {
      const resumeData = await prepareResumePayloadForApi(data.resumeData, user);
      const response = await fetch("/api/generate-resume-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: data.templateId, resumeData }),
      });
      const payload = await parseFetchJsonBody(response);
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(payload, response.statusText));
      }
      if (!payload.html) throw new Error("Preview HTML missing from response");
      return payload.html;
    },
    onSuccess: (htmlContent: string) => setPreviewHtml(htmlContent),
    onError: (error: unknown) =>
      setPreviewHtml(
        `<p class='text-center text-red-500 p-8'>${getApiErrorMessage(error, "Error generating preview.")}</p>`,
      ),
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async (data: {
      templateId: string;
      resumeData: ParsedResumeData;
      id: string;
      isManual: boolean;
    }) => {
      const resumeData = await prepareResumePayloadForApi(data.resumeData, user);
      const response = await fetch("/api/generate-resume-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, resumeData }),
      });
      if (!response.ok) {
        const errorData = await parseFetchJsonBody(response);
        throw new Error(extractApiErrorMessage(errorData, response.statusText));
      }
      return response.blob();
    },
    onSuccess: (
      pdfBlob: Blob,
      variables: { templateId: string; resumeData: ParsedResumeData },
    ) => {
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      const fileName =
        `${variables.resumeData.name || "Resume"}_${variables.templateId}.pdf`.replace(
          /[^a-zA-Z0-9_-]/g,
          "_",
        );
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Resume Downloaded",
        description: "Your PDF resume has been downloaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Download Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (currentStep === "editor-preview" && selectedTemplate) {
      generatePreviewMutation.mutate({
        templateId: selectedTemplate,
        resumeData: buildResumePayload(debouncedExtractedData, user),
      });
    }
  }, [debouncedExtractedData, selectedTemplate, currentStep, user]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) =>
    setSelectedFile(event.target.files?.[0] || null);
  const handleExtractInformation = () =>
    selectedFile
      ? uploadMutation.mutate(selectedFile)
      : toast({ title: "No File Selected", variant: "destructive" });
  const handleLinkedinImport = () =>
    linkedinUrl && linkedinUrl.includes("linkedin.com")
      ? linkedinImportMutation.mutate(linkedinUrl)
      : toast({ title: "Invalid URL", variant: "destructive" });
  const handleDownloadPdf = () =>
    extractedData && selectedTemplate
      ? downloadPdfMutation.mutate({
          templateId: selectedTemplate,
          resumeData: buildResumePayload(extractedData, user),
          id: user?.id,
          isManual: true,
        })
      : toast({ title: "Missing Information", variant: "destructive" });

  const steps = [
    "Choose Method",
    "Input Data",
    "Select Template",
    "Review & Download",
  ];
  const getCurrentStepIndex = () => {
    switch (currentStep) {
      case "select":
        return 0;
      case "upload":
      case "linkedin-url":
      case "manual-edit":
        return 1;
      case "templates":
        return 2;
      case "editor-preview":
        return 3;
      default:
        return 0;
    }
  };

  const renderSelectStep = () => (
    <ResumeBuilderChooseMethod
      steps={steps}
      currentStepIndex={getCurrentStepIndex()}
      onUpload={() => {
        setBuildMethod("upload");
        setCurrentStep("upload");
      }}
      onLinkedIn={() => {
        setBuildMethod("linkedin");
        setCurrentStep("linkedin-url");
      }}
      onScratch={() => {
        setBuildMethod("manual");
        // Keep the saved resume when updating; only start blank if empty
        if (
          !resumeDraftHasContent(
            extractedData as unknown as Record<string, unknown>,
          )
        ) {
          setExtractedData(initialResumeData);
        }
        setCurrentStep("editor-preview");
      }}
    />
  );
  const renderLinkedinUrlStep = () => (
    <ResumeBuilderLinkedInImport
      steps={steps}
      currentStepIndex={getCurrentStepIndex()}
      linkedinUrl={linkedinUrl}
      onLinkedinUrlChange={setLinkedinUrl}
      onBack={() => setCurrentStep("select")}
      onImport={handleLinkedinImport}
      isImporting={linkedinImportMutation.isPending}
    />
  );
  const renderUploadStep = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <ProgressStepper steps={steps} currentStepIndex={getCurrentStepIndex()} />
      <div className="text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          AI-Powered Resume Builder
        </h1>
        <p className="text-gray-600">Upload your resume to begin.</p>
      </div>
      <Card className="p-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload Your Existing Resume</span>
          </CardTitle>
          <CardDescription>
            We'll extract the information to get you started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="resume-file">Choose your resume file</Label>
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-blue-400">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <Input
                id="resume-file"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Label
                htmlFor="resume-file"
                className="mt-4 inline-block cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Choose File
              </Label>
            </div>
            {selectedFile && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  ✓ Selected: {selectedFile.name}
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("select")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              onClick={handleExtractInformation}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending
                ? "Processing..."
                : "Extract Information"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  const renderTemplatesStep = () => (
    <div className="max-w-6xl mx-auto space-y-8">
      <ProgressStepper steps={steps} currentStepIndex={getCurrentStepIndex()} />
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Choose Your Resume Template</h1>
        <p className="text-gray-600">
          Select from our professionally designed templates.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resumeTemplates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${selectedTemplate === template.id ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"}`}
            onClick={() => setSelectedTemplate(template.id)}
          >
            <CardContent className="p-6">
              <div className="aspect-[3/4] bg-white rounded-lg mb-4 border overflow-hidden">
                {template.id === "professional" && (
                  <div className="w-full h-full p-3 text-xs">
                    <div className="text-center border-b-2 border-blue-500 pb-2 mb-2">
                      <div className="font-bold text-lg">John Doe</div>
                      <div className="text-gray-600">Software Engineer</div>
                      <div className="text-xs">
                        john@email.com | (555) 123-4567
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-blue-600">SUMMARY</div>
                      <div className="h-2 bg-gray-200 rounded"></div>
                      <div className="h-1 bg-gray-200 rounded w-3/4"></div>
                      <div className="font-semibold text-blue-600 mt-3">
                        EXPERIENCE
                      </div>
                      <div className="h-1 bg-gray-200 rounded"></div>
                      <div className="h-1 bg-gray-200 rounded w-2/3"></div>
                      <div className="font-semibold text-blue-600 mt-3">
                        SKILLS
                      </div>
                      <div className="flex gap-1">
                        <div className="h-1 bg-blue-200 rounded w-8"></div>
                        <div className="h-1 bg-blue-200 rounded w-6"></div>
                        <div className="h-1 bg-blue-200 rounded w-10"></div>
                      </div>
                    </div>
                  </div>
                )}
                {template.id === "harvard" && (
                  <div className="w-full h-full p-3 text-xs font-serif">
                    <div className="text-center mb-3">
                      <div className="font-bold text-lg">JOHN DOE</div>
                      <div className="text-gray-600">
                        123 Main St | john@email.com
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold underline">EDUCATION</div>
                      <div className="h-1 bg-gray-200 rounded"></div>
                      <div className="h-1 bg-gray-200 rounded w-3/4"></div>
                      <div className="font-bold underline mt-3">EXPERIENCE</div>
                      <div className="h-1 bg-gray-200 rounded"></div>
                      <div className="h-1 bg-gray-200 rounded w-2/3"></div>
                      <div className="font-bold underline mt-3">SKILLS</div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="h-1 bg-gray-200 rounded"></div>
                        <div className="h-1 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                )}
                {template.id === "creative" && (
                  <div className="w-full h-full flex">
                    <div className="w-2/5 bg-blue-900 text-white p-2 text-xs">
                      <div className="w-8 h-8 bg-gray-300 rounded-full mx-auto mb-1"></div>
                      <div className="text-center font-bold mb-2">CONTACT</div>
                      <div className="space-y-1">
                        <div className="h-1 bg-blue-300 rounded"></div>
                        <div className="h-1 bg-blue-300 rounded w-3/4"></div>
                      </div>
                      <div className="text-center font-bold mt-2 mb-1">
                        SKILLS
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 bg-blue-300 rounded"></div>
                        <div className="h-1 bg-blue-300 rounded w-2/3"></div>
                      </div>
                    </div>
                    <div className="w-3/5 p-2 text-xs">
                      <div className="font-bold text-lg mb-1">John Doe</div>
                      <div className="text-gray-600 mb-2">
                        Creative Designer
                      </div>
                      <div className="font-semibold mb-1">PROFILE</div>
                      <div className="space-y-1">
                        <div className="h-1 bg-gray-200 rounded"></div>
                        <div className="h-1 bg-gray-200 rounded w-3/4"></div>
                      </div>
                      <div className="font-semibold mt-2 mb-1">EXPERIENCE</div>
                      <div className="space-y-1">
                        <div className="h-1 bg-gray-200 rounded"></div>
                        <div className="h-1 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                )}
                {template.id === "emerald-sidebar" && (
                  <div className="w-full h-full flex">
                    <div className="w-2/5 bg-slate-50 p-2 text-[10px] border-r">
                      <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-1 ring-2 ring-emerald-200"></div>
                      <div className="text-center font-extrabold text-emerald-700 tracking-wide">
                        John Doe
                      </div>
                      <div className="text-center text-slate-500 font-semibold uppercase text-[9px]">
                        Software Engineer
                      </div>
                      <div className="mt-2 space-y-2">
                        <div>
                          <div className="text-[9px] font-extrabold tracking-[0.2em] text-emerald-600">
                            MY PORTFOLIO
                          </div>
                          <div className="mt-1 rounded-md border border-dashed p-1">
                            <div className="h-1 bg-slate-200 rounded"></div>
                            <div className="h-1 bg-slate-200 rounded w-2/3 mt-1"></div>
                          </div>
                        </div>
                        <div>
                          {/* Video resume block removed by request */}
                        </div>
                        <div>
                          <div className="text-[9px] font-extrabold tracking-[0.2em] text-emerald-600">
                            TECHNICAL SKILLS
                          </div>
                          <div className="mt-1 space-y-1">
                            <div className="h-1 bg-emerald-200 rounded w-2/3"></div>
                            <div className="h-1 bg-emerald-200 rounded w-1/2"></div>
                            <div className="h-1 bg-emerald-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-3/5 p-2 text-[10px]">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 mb-2"></div>
                      <div className="font-extrabold tracking-[0.2em] text-emerald-700 text-[9px] mb-1">
                        PROFESSIONAL HIGHLIGHTS
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 bg-slate-200 rounded"></div>
                        <div className="h-1 bg-slate-200 rounded w-5/6"></div>
                        <div className="h-1 bg-slate-200 rounded w-2/3"></div>
                      </div>
                      <div className="font-extrabold tracking-[0.2em] text-emerald-700 text-[9px] mt-3 mb-1">
                        WORK EXPERIENCE
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 bg-slate-200 rounded"></div>
                        <div className="h-1 bg-slate-200 rounded w-4/5"></div>
                        <div className="h-1 bg-slate-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                )}
                {template.id === "photo-classic" && (
                  <div className="w-full h-full p-3 text-[10px]">
                    <div className="flex gap-2 items-start">
                      <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow"></div>
                      <div className="flex-1">
                        <div className="font-extrabold text-base leading-none">
                          John Doe
                        </div>
                        <div className="font-semibold text-[10px]">
                          Software Engineer
                        </div>
                        <div className="mt-1 space-y-1">
                          <div className="h-1 bg-gray-200 rounded"></div>
                          <div className="h-1 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 bg-gray-100 rounded-md p-2 grid grid-cols-2 gap-1">
                      <div className="h-1 bg-gray-200 rounded"></div>
                      <div className="h-1 bg-gray-200 rounded"></div>
                      <div className="h-1 bg-gray-200 rounded"></div>
                      <div className="h-1 bg-gray-200 rounded"></div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <div className="font-black text-[11px]">
                          WORK EXPERIENCE
                        </div>
                        <div className="mt-1 space-y-1">
                          <div className="h-1 bg-gray-200 rounded"></div>
                          <div className="h-1 bg-gray-200 rounded w-4/5"></div>
                          <div className="h-1 bg-gray-200 rounded w-2/3"></div>
                        </div>
                        <div className="font-black text-[11px] mt-2">
                          EDUCATION
                        </div>
                        <div className="mt-1 space-y-1">
                          <div className="h-1 bg-gray-200 rounded w-4/5"></div>
                          <div className="h-1 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                      <div>
                        <div className="font-black text-[11px]">SKILLS</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 border rounded bg-gray-50"
                            >
                              Skill
                            </span>
                          ))}
                        </div>
                        <div className="font-black text-[11px] mt-2">
                          PROJECTS
                        </div>
                        <div className="mt-1 space-y-1">
                          <div className="h-1 bg-gray-200 rounded"></div>
                          <div className="h-1 bg-gray-200 rounded w-5/6"></div>
                          <div className="h-1 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {template.id === "brand-split" && (
                  <div className="w-full h-full">
                    <div className="h-14 w-full bg-gradient-to-r from-teal-200/80 via-white to-violet-200/80 relative overflow-hidden border-b">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(45,212,191,0.55),transparent_55%),radial-gradient(circle_at_90%_20%,rgba(167,139,250,0.50),transparent_55%)]"></div>
                      <div className="relative h-full flex items-center gap-2 px-3">
                        <div className="h-9 w-9 rounded-full bg-white ring-2 ring-teal-300 shadow-sm"></div>
                        <div className="flex-1">
                          <div className="font-extrabold text-[12px] leading-none">
                            John Doe
                          </div>
                          <div className="text-[9px] font-extrabold tracking-[0.2em] text-teal-700 uppercase">
                            Software Engineer
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-3 text-[10px]">
                      <div className="rounded-lg border bg-white p-2">
                        <div className="text-[9px] font-black tracking-[0.22em] uppercase bg-gradient-to-r from-teal-700 to-indigo-700 bg-clip-text text-transparent">
                          Summary
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="h-1 rounded bg-slate-200"></div>
                          <div className="h-1 rounded bg-slate-200 w-5/6"></div>
                          <div className="h-1 rounded bg-slate-200 w-2/3"></div>
                        </div>
                        <div className="text-[9px] font-black tracking-[0.22em] uppercase bg-gradient-to-r from-teal-700 to-indigo-700 bg-clip-text text-transparent mt-3">
                          Experience
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="h-1 rounded bg-slate-200"></div>
                          <div className="h-1 rounded bg-slate-200 w-4/5"></div>
                          <div className="h-1 rounded bg-slate-200 w-2/3"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="rounded-lg border bg-white p-2">
                          <div className="text-[9px] font-black tracking-[0.22em] uppercase bg-gradient-to-r from-teal-700 to-indigo-700 bg-clip-text text-transparent">
                            Skills
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-1">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                              <div
                                key={i}
                                className="h-4 rounded-md border bg-slate-50"
                              ></div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-white p-2">
                          <div className="text-[9px] font-black tracking-[0.22em] uppercase bg-gradient-to-r from-teal-700 to-indigo-700 bg-clip-text text-transparent">
                            Education
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="h-1 rounded bg-slate-200 w-4/5"></div>
                            <div className="h-1 rounded bg-slate-200 w-2/3"></div>
                          </div>
                        </div>
                        <div className="rounded-lg border bg-white p-2">
                          <div className="text-[9px] font-black tracking-[0.22em] uppercase bg-gradient-to-r from-teal-700 to-indigo-700 bg-clip-text text-transparent">
                            Projects
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="h-1 rounded bg-slate-200"></div>
                            <div className="h-1 rounded bg-slate-200 w-5/6"></div>
                            <div className="h-1 rounded bg-slate-200 w-2/3"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{template.name}</h3>
                  <Badge
                    variant={
                      template.style === "modern" ? "default" : "secondary"
                    }
                  >
                    {template.style}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() =>
            setCurrentStep(
              buildMethod === "manual"
                ? "manual-edit"
                : buildMethod === "upload"
                  ? "upload"
                  : "linkedin-url",
            )
          }
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          onClick={() => {
            if (!selectedTemplate) setSelectedTemplate("professional");
            setCurrentStep("editor-preview");
          }}
          disabled={!selectedTemplate}
        >
          Proceed to Editor <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderManualEditStep = () => (
    <div className="max-w-4xl mx-auto space-y-4">
      <ProgressStepper steps={steps} currentStepIndex={getCurrentStepIndex()} />
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Enter Your Details</h1>
        <p className="text-lg text-gray-600">
          Fill out your information to get started.
        </p>
      </div>
      <ResumeEditorForm
        extractedData={extractedData}
        setExtractedData={setExtractedData}
        onAISuggestion={handleAISuggestion}
        selectedTemplateId={selectedTemplate}
      />
      <div className="flex justify-between mt-4">
        <Button onClick={() => setCurrentStep("select")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          onClick={() => setCurrentStep("templates")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Save & Choose Template <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const handleEditorSaveContinue = () => {
    const next = nextSection(editorSection);
    if (next) {
      setEditorSection(next);
      return;
    }
    toast({
      title: "Section complete",
      description: "Your resume details are ready to preview and download.",
    });
  };

  const handleTemplateSelect = (serverTemplateId: string, catalogId?: string) => {
    setSelectedTemplate(serverTemplateId);
    if (catalogId) setSelectedCatalogId(catalogId);
    if (currentStep !== "editor-preview") {
      setCurrentStep("editor-preview");
    }
  };

  const refreshPreview = async () => {
    setDebouncedExtractedData(extractedData);
    if (selectedTemplate) {
      generatePreviewMutation.mutate({
        templateId: selectedTemplate,
        resumeData: buildResumePayload(extractedData, user),
      });
    }
  };

  const handleOpenPreviewModal = () => {
    refreshPreview();
    setPreviewModalOpen(true);
  };

  const renderEditorPreviewStep = () => (
    <>
      <ResumeBuilderChrome
        isSaving={generatePreviewMutation.isPending}
        onImportResume={() => setCurrentStep("select")}
        onPreview={handleOpenPreviewModal}
        onDownloadPdf={handleDownloadPdf}
        downloadPending={downloadPdfMutation.isPending}
      />
      <ResumePreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        previewHtml={previewHtml}
        isLoading={generatePreviewMutation.isPending}
        viewMode={previewViewMode}
        onViewModeChange={setPreviewViewMode}
        onRefresh={refreshPreview}
      />
      <ResumeEditorStepper
        activeSection={editorSection}
        onSectionChange={setEditorSection}
      />
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 lg:pr-3">
            <ResumeEditorForm
              extractedData={extractedData}
              setExtractedData={setExtractedData}
              onAISuggestion={handleAISuggestion}
              selectedTemplateId={selectedTemplate}
              activeTab={editorSection}
              onTabChange={(tab) => setEditorSection(tab as ResumeEditorSection)}
              variant="layoffproof"
              hideTabList
              onSaveContinue={handleEditorSaveContinue}
              showProTip={showProTip && editorSection === "personal"}
              onDismissProTip={() => setShowProTip(false)}
              onFlushPreview={setDebouncedExtractedData}
            />
          </div>
          <div className="min-w-0 space-y-4 lg:pl-3 lg:sticky lg:top-6 lg:self-start">
            <LayoffProofTemplateStrip
              selectedTemplateId={selectedTemplate}
              selectedCatalogId={selectedCatalogId}
              onSelect={handleTemplateSelect}
            />
            <LayoffProofLivePreview
              previewHtml={previewHtml}
              isLoading={generatePreviewMutation.isPending}
              viewMode={previewViewMode}
              onViewModeChange={setPreviewViewMode}
              onRefresh={refreshPreview}
            />
          </div>
        </div>
      </div>
    </>
  );

  const renderOnboardingContent = () => (
    <div className="px-8 py-6">
      <ResumeBuilderChrome downloadPending={downloadPdfMutation.isPending} />
      <div className="mt-6">
        {currentStep === "select" && renderSelectStep()}
        {currentStep === "upload" && renderUploadStep()}
        {currentStep === "linkedin-url" && renderLinkedinUrlStep()}
        {currentStep === "manual-edit" && renderManualEditStep()}
        {currentStep === "templates" && renderTemplatesStep()}
      </div>
    </div>
  );

  return (
    <LayoffProofLayout activeNavId="resume">
      {currentStep === "editor-preview"
        ? renderEditorPreviewStep()
        : renderOnboardingContent()}
    </LayoffProofLayout>
  );
}
