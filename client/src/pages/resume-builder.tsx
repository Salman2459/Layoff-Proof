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
} from "lucide-react";
import { MdLocationOn } from "react-icons/md";
import { SiGithub, SiLinkedin } from "react-icons/si";
import { resumeLocationSvg, resumeSocialSvg } from "@shared/resumeSocialIcons";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import GlobalHeader from "@/components/GlobalHeader";
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get AI suggestion.");
      }

      const { suggestion } = await response.json();
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
  
];

/** Layouts that include a Projects block (keep in sync with server generateResumeHTML). */
const RESUME_TEMPLATES_WITH_PROJECTS = new Set([
  "photo-classic",
  "brand-split",
]);

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
}: {
  extractedData: ParsedResumeData;
  setExtractedData: (data: ParsedResumeData) => void;
  onAISuggestion: (fieldName: string, suggestion: string) => void;
  /** When set, used to show the Projects tab only for templates that render that section. */
  selectedTemplateId?: string;
}) => {
  const { toast } = useToast();
  // --- NEW: Add constants and derived state for clarity ---
  const MAX_SKILLS = 15;
  const skillsList = extractedData.skills || [];
  const skillCount = skillsList.length;
  const isSkillLimitReached = skillCount >= MAX_SKILLS;
  const showProjectsTab =
    !!selectedTemplateId &&
    RESUME_TEMPLATES_WITH_PROJECTS.has(selectedTemplateId);
  // --- END NEW ---

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList
            className={`grid w-full mb-6 sm:mb-8 ${showProjectsTab ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "grid-cols-3 sm:grid-cols-5"}`}
          >
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            {showProjectsTab ? (
              <TabsTrigger value="projects">Projects</TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <h3 className="text-lg font-semibold sm:text-xl">Personal Information</h3>
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-6">
                <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted sm:h-16 sm:w-16">
                    {extractedData.profileImageDataUrl ? (
                      <img
                        src={extractedData.profileImageDataUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] leading-tight text-muted-foreground sm:text-xs">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 max-w-md">
                    <div className="text-sm font-semibold text-foreground">
                      Profile photo
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Optional. Used in some templates (e.g. Emerald Sidebar).
                    </div>
                  </div>
                </div>

                <div className="flex w-full min-w-0 flex-col gap-3 md:w-auto md:shrink-0 md:items-end">
                  <Input
                    id="profile-photo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 1024 * 1024) {
                        // 1MB cap to keep PDFs light/stable
                        toast({
                          title: "Image too large",
                          description: "Please upload an image under 1MB.",
                          variant: "destructive",
                        });
                        e.target.value = "";
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result =
                          typeof reader.result === "string"
                            ? reader.result
                            : "";
                        setExtractedData({
                          ...extractedData,
                          profileImageDataUrl: result,
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center md:justify-end">
                    <Label
                      htmlFor="profile-photo"
                      className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted sm:h-9 sm:w-auto sm:min-w-[8.5rem]"
                    >
                      Upload photo
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
                    Max 1MB (JPG/PNG/WebP)
                  </p>
                </div>
              </div>
              {extractedData.profileImageDataUrl ? null : (
                <div className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
                  Tip: use a square image for best results.
                </div>
              )}
              <div className="mt-2 text-center text-xs text-muted-foreground sm:text-left">
                If your image is larger than 1MB, compress it first.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={extractedData.name}
                  onChange={(e) =>
                    setExtractedData({ ...extractedData, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
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
                <Label htmlFor="phone">Phone Number</Label>
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
                  inputClass="!w-full !h-10  !py-2 !border !border-gray-300 !rounded-md !shadow-sm focus:!ring-primary focus:!border-primary"
                  dropdownClass="!z-[60]"
                  placeholder="Enter your phone number..."
                />
              </div>
              <div>
                <Label
                  htmlFor="location"
                  className="inline-flex items-center gap-2"
                >
                  <MdLocationOn className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                  Location
                </Label>
                <Input
                  id="location"
                  value={extractedData.location}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      location: e.target.value,
                    })
                  }
                  placeholder="New York, NY"
                />
              </div>
              <div>
                <Label
                  htmlFor="linkedin"
                  className="inline-flex items-center gap-2"
                >
                  <SiLinkedin className="h-4 w-4 shrink-0 text-[#0A66C2]" aria-hidden />
                  LinkedIn Profile
                </Label>
                <Input
                  id="linkedin"
                  value={extractedData.linkedin}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      linkedin: e.target.value,
                    })
                  }
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>
              <div>
                <Label
                  htmlFor="github"
                  className="inline-flex items-center gap-2"
                >
                  <SiGithub className="h-4 w-4 shrink-0 text-[#24292f]" aria-hidden />
                  GitHub Profile
                </Label>
                <Input
                  id="github"
                  value={extractedData.github}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      github: e.target.value,
                    })
                  }
                  placeholder="https://github.com/johndoe"
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="summary" className="space-y-6">
            <h3 className="text-xl font-semibold">Professional Summary</h3>
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
            <div>
              <Label htmlFor="summary-text">Summary</Label>
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
                  className="min-h-[120px] pr-10"
                />
              </AIInputWrapper>
            </div>
          </TabsContent>

          <TabsContent value="skills" className="space-y-2">
            <h3 className="text-xl font-semibold">Skills</h3>
            <p className="text-sm text-gray-600">
              Enter your top skills (comma-separated), or use the ✨ icon to get
              AI suggestions. Max {MAX_SKILLS} skills.
            </p>
            <AIInputWrapper
              fieldName="skills"
              currentValue={skillsList.join(", ")}
              resumeData={extractedData}
              onSuggestion={onAISuggestion}
            >
              <Textarea
                value={skillsList.join(", ")}
                onChange={(e) => {
                  const skillsArray = e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, MAX_SKILLS); // Enforce limit
                  setExtractedData({ ...extractedData, skills: skillsArray });
                }}
                placeholder="React, JavaScript, Node.js, Project Management..."
                className="pr-10"
              />
            </AIInputWrapper>
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
          </TabsContent>

          {showProjectsTab ? (
            <TabsContent value="projects" className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    Shown on Photo Classic and Brand Split. Each line appears on
                    the resume (link URL, project name, or short description).
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    setExtractedData({
                      ...extractedData,
                      projects: [
                        ...(extractedData.projects || []),
                        { name: "", url: "" },
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
                      <Label>Project name</Label>
                      <Input
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
                        placeholder="e.g. Portfolio site"
                      />
                    </div>
                    <div>
                      <Label>Link or description</Label>
                      <Input
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
      </CardContent>
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
  >("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] =
    useState<ParsedResumeData>(initialResumeData);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [linkedinUrl, setLinkedinUrl] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [buildMethod, setBuildMethod] = useState<
    "upload" | "linkedin" | "manual" | null
  >(null);
  const { toast } = useToast();
  const user = useAuth();
  const [debouncedExtractedData, setDebouncedExtractedData] =
    useState<ParsedResumeData>(extractedData);
  const prevStepRef = useRef<string | null>(null);

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

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("id", user?.user?.id || "");
      const response = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data: any) => {
      setExtractedData({ ...initialResumeData, ...data.parsedData });
      setCurrentStep("templates");
      toast({ title: "Resume Extracted Successfully" });
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
        body: JSON.stringify({ profileUrl, id: user?.user?.id }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.resumeData) {
        setExtractedData({ ...initialResumeData, ...data.resumeData });
        setCurrentStep("templates");
        toast({ title: "LinkedIn Profile Imported" });
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
      // MOCK API: In a real app, this logic would be on your server and use the full generateResumeHTML function.
      return new Promise<string>((resolve) => {
        const { resumeData, templateId } = data;
        let html = "";

        const formatTextForHtml = (text: string = "") => {
          if (!text) return "";
          const escapedText = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
          return escapedText.replace(/\n/g, "<br />");
        };

        const renderExperience = (exp: any[]) =>
          exp
            .map(
              (e) => `
            <div class="job">
                <h4>${e.title || ""} at ${e.company || ""}</h4>
                <em>${e.duration || ""}</em>
                <p>${formatTextForHtml(e.description)}</p> 
            </div>`,
            )
            .join("");

        const renderEducation = (edu: any[]) =>
          edu
            .map(
              (e) => `
            <div class="education-item">
                <h4>${e.degree || ""}</h4>
                <em>${e.school || ""} (${e.duration || ""})</em>
            </div>`,
            )
            .join("");

        const renderSkills = (skills: string[] = []) =>
          skills.slice(0, 15).join(", ");

        switch (templateId) {
          case "emerald-sidebar":
            html = `
              <html><head><style>
                * { box-sizing: border-box; }
                body { font-family: Arial, sans-serif; margin: 0; font-size: 12px; color: #1f2937; }
                .page { display: flex; min-height: 100vh; background: #f3f4f6; padding: 18px; }
                .sheet { display: flex; width: 100%; max-width: 900px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; }
                .sidebar { width: 34%; padding: 18px 16px; background: #f8fafc; border-right: 1px solid #e5e7eb; }
                .main { width: 66%; padding: 18px 18px; }
                .avatar { width: 64px; height: 64px; border-radius: 999px; background: #e5e7eb; margin: 2px auto 10px; border: 3px solid #10b98133; }
                .avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 999px; display: block; }
                .name { text-align: center; font-weight: 800; font-size: 18px; letter-spacing: 0.5px; color: #0f766e; }
                .title { text-align: center; margin-top: 2px; color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; }
                .contact { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin: 10px 0 14px; color: #475569; font-size: 10px; }
                .pill { display: inline-flex; gap: 4px; align-items: center; padding: 3px 8px; border-radius: 999px; background: #ecfeff; border: 1px solid #99f6e4; }
                .s-h { font-size: 10px; letter-spacing: 2px; font-weight: 800; color: #059669; text-transform: uppercase; margin: 12px 0 8px; }
                .divider { height: 2px; background: linear-gradient(90deg,#10b981,#22c55e); margin: 8px 0 14px; border-radius: 999px; }
                .box { border: 1px dashed #cbd5e1; border-radius: 10px; padding: 10px; background: #ffffff; }
                .qr { width: 72px; height: 72px; border: 2px solid #10b98155; border-radius: 12px; display:flex; align-items:center; justify-content:center; margin: 8px 0; background: repeating-linear-gradient(45deg,#0f766e 0,#0f766e 2px,transparent 2px,transparent 6px); opacity: .15; }
                .list { margin: 0; padding-left: 14px; }
                .list li { margin: 4px 0; }
                .h2 { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #0f766e; font-weight: 900; margin: 0 0 8px; }
                .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
                .card .bar { height: 6px; border-radius: 999px; background: linear-gradient(90deg,#10b981,#22c55e); margin-bottom: 10px; }
                .muted { color: #64748b; }
              </style></head><body>
                <div class="page">
                  <div class="sheet">
                    <aside class="sidebar">
                      <div class="avatar">${resumeData.profileImageDataUrl ? `<img src="${resumeData.profileImageDataUrl}" alt="Profile"/>` : ``}</div>
                      <div class="name">${resumeData.name || "YOUR NAME"}</div>
                      <div class="title">${resumeData.profession || "Your Title"}</div>
                      <div class="contact">
                        ${resumeData.phone ? `<span class="pill">📞 ${resumeData.phone}</span>` : ""}
                        ${resumeData.email ? `<span class="pill">✉️ ${resumeData.email}</span>` : ""}
                        ${resumeData.location ? `<span class="pill">${resumeLocationSvg({ size: 12, fill: "#047857" })}${resumeData.location}</span>` : ""}
                      </div>
                      <div class="s-h">My Portfolio</div>
                      <div class="box">
                        <div class="muted" style="font-size:10px;">Click here to view</div>
                        <div style="font-weight:700; color:#0f766e;">${resumeData.website || resumeData.linkedin || "my_portfolio"}</div>
                      </div>
                      <div class="s-h">Area of Expertise</div>
                      <ul class="list">${(resumeData.skills || [])
                        .map((s: string) => `<li>${s}</li>`)
                        .join("")}</ul>
                      <div class="s-h">Education</div>
                      <div class="box">${
                        (resumeData.education || [])
                          .slice(0, 1)
                          .map(
                            (e: any) =>
                              `${e.degree || ""}<div class="muted" style="font-size:10px;">${e.school || ""}</div>`,
                          )
                          .join("") || "<span class='muted'>—</span>"
                      }</div>
                    </aside>
                    <main class="main">
                      <div class="divider"></div>
                      <div class="card">
                        <div class="bar"></div>
                        <div class="h2">Professional Highlights</div>
                        <div class="muted">${(resumeData.summary || "").slice(0, 260) || "Add a short, punchy highlight summary here."}</div>
                      </div>
                      <div class="card">
                        <div class="bar"></div>
                        <div class="h2">Work Experience</div>
                        ${renderExperience(resumeData.experience || []) || `<div class="muted">Add your experience to see it here.</div>`}
                      </div>
                    </main>
                  </div>
                </div>
              </body></html>`;
            break;
          case "photo-classic":
            html = `
              <html><head><style>
                * { box-sizing: border-box; }
                body { font-family: Georgia, 'Times New Roman', serif; margin: 0; color: #111827; background: white; }
                .page { max-width: 980px; margin: 0 auto; }
                .top { display: grid; grid-template-columns: 140px 1fr; gap: 18px; padding: 22px 24px 16px; align-items: start; }
                .photo { width: 120px; height: 120px; border-radius: 999px; overflow: hidden; background: #e5e7eb; border: 4px solid #ffffff; box-shadow: 0 10px 22px rgba(0,0,0,0.08); }
                .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .name { font-size: 30px; font-weight: 800; margin: 0; font-family: Georgia, 'Times New Roman', serif; }
                .role { margin-top: 4px; font-weight: 700; font-size: 14px; font-family: Arial, sans-serif; }
                .summary { margin-top: 8px; color: #374151; font-size: 12px; line-height: 1.4; font-family: Arial, sans-serif; }
                .band { background: #f3f4f6; border-top: 1px solid #e5e7eb; border-bottom: none; padding: 10px 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 10px; font-family: Arial, sans-serif; font-size: 11px; color: #111827; }
                .band span { display: inline-flex; gap: 8px; align-items: center; min-width: 0; }
                .icon { width: 18px; height: 18px; border-radius: 6px; background: #111827; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex: 0 0 auto; }
                .icon svg { display: block; }
                .grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 26px; padding: 18px 24px 24px; }
                h2 { font-size: 14px; letter-spacing: 0.02em; margin: 0 0 10px; font-weight: 900; }
                .section { margin-bottom: 18px; }
                .job { margin-bottom: 12px; }
                .job h4 { margin: 0; font-size: 12px; font-weight: 900; }
                .job .meta { font-size: 10px; color: #6b7280; font-style: italic; margin: 1px 0 6px; font-family: Arial, sans-serif; }
                .job ul { margin: 0; padding-left: 18px; font-size: 11px; font-family: Arial, sans-serif; }
                .job li { margin: 4px 0; }
                .chips { display: flex; flex-wrap: wrap; gap: 6px; font-family: Arial, sans-serif; }
                .chip { border: 1px solid #d1d5db; background: #f9fafb; border-radius: 6px; padding: 4px 8px; font-size: 11px; line-height: 1.25; white-space: normal; word-break: break-word; max-width: 100%; }
                .links { font-family: Arial, sans-serif; font-size: 11px; display: grid; gap: 6px; }
                .muted { color: #6b7280; font-family: Arial, sans-serif; font-size: 11px; }
                .edu h4 { margin: 0; font-size: 12px; font-weight: 900; }
                .edu .meta { font-size: 10px; color: #6b7280; font-style: italic; margin-top: 3px; font-family: Arial, sans-serif; }
                .two { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              </style></head><body>
                <div class="page">
                  <div class="top">
                    <div class="photo">${resumeData.profileImageDataUrl ? `<img src="${resumeData.profileImageDataUrl}" alt="Profile" />` : ``}</div>
                    <div>
                      <div class="name">${resumeData.name || "Your Name"}</div>
                      <div class="role">${resumeData.profession || "Your Title"}</div>
                      <div class="summary">${formatTextForHtml(resumeData.summary || "").slice(0, 520) || ""}</div>
                    </div>
                  </div>
                  <div class="band">
                    ${resumeData.email ? `<span><span class="icon">✉</span><span>${resumeData.email}</span></span>` : ""}
                    ${resumeData.location ? `<span><span class="icon">${resumeLocationSvg({ size: 12, fill: "#ffffff" })}</span><span>${resumeData.location}</span></span>` : ""}
                    ${resumeData.phone ? `<span><span class="icon">☎</span><span>${resumeData.phone}</span></span>` : ""}
                    ${resumeData.linkedin ? `<span><span class="icon">${resumeSocialSvg("linkedin", { size: 12, fill: "#ffffff" })}</span><span>${(resumeData.linkedin || "").replace(/^https?:\/\//, "")}</span></span>` : ""}
                    ${resumeData.github ? `<span><span class="icon">${resumeSocialSvg("github", { size: 12, fill: "#ffffff" })}</span><span>${(resumeData.github || "").replace(/^https?:\/\//, "")}</span></span>` : ""}
                  </div>
                  <div class="grid">
                    <div>
                      <div class="section">
                        <h2>WORK EXPERIENCE</h2>
                        ${
                          ((resumeData.experience || []) as any[])
                            .map(
                              (e: any) => `
                          <div class="job">
                            <h4>${e.title || ""}</h4>
                            <div class="meta">${e.company || ""} ${e.duration ? ` • ${e.duration}` : ""}</div>
                            <ul>${String(e.description || "")
                              .split(/\\n+/)
                              .filter(Boolean)
                              .slice(0, 5)
                              .map((x: string) => `<li>${x}</li>`)
                              .join("")}</ul>
                          </div>
                        `,
                            )
                            .join("") ||
                          `<div class="muted">Add experience to see it here.</div>`
                        }
                      </div>
                      <div class="section edu">
                        <h2>EDUCATION</h2>
                        ${
                          ((resumeData.education || []) as any[])
                            .slice(0, 2)
                            .map(
                              (e: any) => `
                          <div style="margin-bottom:10px;">
                            <h4>${e.degree || ""}</h4>
                            <div class="meta">${e.school || e.institution || ""}${e.duration ? ` • ${e.duration}` : e.year ? ` • ${e.year}` : ""}</div>
                          </div>
                        `,
                            )
                            .join("") || `<div class="muted">—</div>`
                        }
                      </div>
                    </div>
                    <div>
                      <div class="section">
                        <h2>SKILLS</h2>
                        <div class="chips">${(resumeData.skills || [])
                          .slice(0, 15)
                          .map((s: string) => `<span class="chip">${s}</span>`)
                          .join("")}</div>
                      </div>
                      <div class="section">
                        <h2>PROJECTS</h2>
                        <div class="links">
                          ${
                            Array.isArray(resumeData.projects)
                              ? (resumeData.projects as any[])
                                  .slice(0, 6)
                                  .map((p: any) => {
                                    const url =
                                      typeof p === "string"
                                        ? p
                                        : p?.url || p?.name || "";
                                    return url
                                      ? `<div>${String(url)}</div>`
                                      : "";
                                  })
                                  .join("")
                              : ""
                          }
                          ${Array.isArray(resumeData.projects) && (resumeData.projects as any[]).length ? "" : `<div class="muted">Add project links.</div>`}
                        </div>
                      </div>
                      <div class="section">
                        <h2>HONOR AWARDS</h2>
                        <div class="muted">${(resumeData.achievements || []).slice(0, 2).join("<br/>") || "—"}</div>
                      </div>
                      <div class="section">
                        <h2>LANGUAGES</h2>
                        <div class="two">${(resumeData.languages || [])
                          .slice(0, 4)
                          .map(
                            (l: string) =>
                              `<div><div style="font-weight:800;">${l}</div><div class="muted">Full/Professional Proficiency</div></div>`,
                          )
                          .join("")}</div>
                      </div>
                      <div class="section">
                        <h2>INTERESTS</h2>
                        <div class="chips">${
                          (resumeData.skills || [])
                            .slice(0, 3)
                            .map(
                              (s: string) => `<span class="chip">${s}</span>`,
                            )
                            .join("") || ""
                        }</div>
                      </div>
                    </div>
                  </div>
                </div>
              </body></html>`;
            break;
          case "brand-split":
            html = `
              <html><head><style>
                * { box-sizing: border-box; }
                body { margin: 0; background: #ffffff; color: #0f172a; font-family: Arial, sans-serif; }
                .page { width: 100%; max-width: 980px; margin: 0 auto; }
                .hero { position: relative; padding: 22px 26px 18px; overflow: hidden; }
                .hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(800px circle at 8% 0%, rgba(45,212,191,0.22), transparent 55%), radial-gradient(700px circle at 92% 10%, rgba(167,139,250,0.20), transparent 55%), linear-gradient(135deg, rgba(13,148,136,0.10), rgba(99,102,241,0.10)); }
                .hero-inner { position: relative; display: grid; grid-template-columns: 96px 1fr; gap: 16px; align-items: center; }
                .photo { width: 86px; height: 86px; border-radius: 999px; overflow: hidden; background: #e5e7eb; border: 4px solid #ffffff; box-shadow: 0 14px 28px rgba(2,6,23,0.10); }
                .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .name { font-size: 28px; font-weight: 900; letter-spacing: 0.02em; }
                .role { margin-top: 2px; color: #0f766e; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; }
                .meta { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: #334155; }
                .pill { padding: 4px 10px; border-radius: 999px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.75); }
                .grid { display: grid; grid-template-columns: 1.25fr 0.95fr; gap: 22px; padding: 18px 26px 26px; align-items: start; }
                .section { margin-bottom: 16px; }
                .h { font-size: 12px; font-weight: 900; letter-spacing: 0.22em; text-transform: uppercase; margin: 0 0 10px; }
                .h span { background: linear-gradient(90deg, #0d9488, #6366f1); -webkit-background-clip: text; background-clip: text; color: transparent; }
                .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px 12px; background: #ffffff; }
                .summary { color: #334155; font-size: 12px; line-height: 1.5; }
                .job { margin-bottom: 12px; }
                .job-title { font-weight: 900; font-size: 12px; }
                .job-meta { color: #64748b; font-size: 10px; margin-top: 2px; font-style: italic; }
                .job ul { margin: 6px 0 0; padding-left: 18px; color: #0f172a; font-size: 11px; }
                .job li { margin: 4px 0; }
                .skills { display: flex; flex-wrap: wrap; gap: 8px; }
                .skill { border: 1px solid #d1d5db; background: #f8fafc; border-radius: 10px; padding: 7px 10px; font-size: 11px; line-height: 1.25; white-space: normal; word-break: break-word; max-width: 100%; }
                .side { display: grid; gap: 14px; align-content: start; align-items: start; }
                .links { display: grid; gap: 6px; font-size: 11px; color: #0f172a; }
                .muted { color: #64748b; font-size: 11px; }
              </style></head><body>
                <div class="page">
                  <div class="hero">
                    <div class="hero-inner">
                      <div class="photo">${resumeData.profileImageDataUrl ? `<img src="${resumeData.profileImageDataUrl}" alt="Profile" />` : ``}</div>
                      <div>
                        <div class="name">${resumeData.name || "Your Name"}</div>
                        <div class="role">${resumeData.profession || "Your Title"}</div>
                        <div class="meta">
                          ${resumeData.email ? `<span class="pill">✉ ${resumeData.email}</span>` : ``}
                          ${resumeData.phone ? `<span class="pill">☎ ${resumeData.phone}</span>` : ``}
                          ${resumeData.location ? `<span class="pill" style="display:inline-flex;align-items:center;gap:6px;">${resumeLocationSvg({ size: 14, fill: "#0f766e" })}${resumeData.location}</span>` : ``}
                          ${resumeData.linkedin ? `<span class="pill" style="display:inline-flex;align-items:center;gap:6px;">${resumeSocialSvg("linkedin", { size: 14, fill: "#0A66C2" })}${(resumeData.linkedin || "").replace(/^https?:\/\//, "")}</span>` : ``}
                          ${resumeData.github ? `<span class="pill" style="display:inline-flex;align-items:center;gap:6px;">${resumeSocialSvg("github", { size: 14, fill: "#24292f" })}${(resumeData.github || "").replace(/^https?:\/\//, "")}</span>` : ``}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="grid">
                    <div class="side">
                      <div class="section card">
                        <div class="h"><span>Summary</span></div>
                        <div class="summary">${formatTextForHtml(resumeData.summary || "") || `<span class="muted">Add a short summary.</span>`}</div>
                      </div>

                      <div class="section card">
                        <div class="h"><span>Experience</span></div>
                        ${
                          ((resumeData.experience || []) as any[])
                            .map((e: any) => {
                              const bullets = String(e.description || "")
                                .split(/\\n+/)
                                .map((x: string) => x.trim())
                                .filter(Boolean)
                                .slice(0, 5)
                                .map((x: string) => `<li>${x}</li>`)
                                .join("");
                              return `
                                <div class="job">
                                  <div class="job-title">${e.title || ""}</div>
                                  <div class="job-meta">${e.company || ""}${e.duration ? ` • ${e.duration}` : ""}</div>
                                  ${bullets ? `<ul>${bullets}</ul>` : ``}
                                </div>
                              `;
                            })
                            .join("") || `<div class="muted">Add experience to see it here.</div>`
                        }
                      </div>
                    </div>

                    <div class="side">
                      <div class="section card">
                        <div class="h"><span>Skills</span></div>
                        <div class="skills">${(resumeData.skills || []).slice(0, 15).map((s: string) => `<div class="skill">${s}</div>`).join("")}</div>
                      </div>

                      <div class="section card">
                        <div class="h"><span>Education</span></div>
                        ${
                          ((resumeData.education || []) as any[])
                            .slice(0, 3)
                            .map((e: any) => `<div style="margin-bottom:10px;"><div style="font-weight:900;">${e.degree || ""}</div><div class="muted">${e.school || e.institution || ""}${e.year ? ` • ${e.year}` : ""}</div></div>`)
                            .join("") || `<div class="muted">—</div>`
                        }
                      </div>

                      <div class="section card">
                        <div class="h"><span>Projects</span></div>
                        <div class="links">
                          ${
                            Array.isArray(resumeData.projects)
                              ? (resumeData.projects as any[])
                                  .slice(0, 7)
                                  .map((p: any) => {
                                    const url = typeof p === "string" ? p : p?.url || p?.name || "";
                                    return url ? `<div>${String(url)}</div>` : "";
                                  })
                                  .join("")
                              : ""
                          }
                          ${Array.isArray(resumeData.projects) && (resumeData.projects as any[]).length ? "" : `<div class="muted">Add project links.</div>`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </body></html>`;
            break;
          case "harvard":
            html = `
              <html><head><style>
                body { font-family: 'Times New Roman', serif; margin: 2rem; color: #333; } p { white-space: normal; }
                .header { text-align: center; border-bottom: none; padding-bottom: 10px; margin-bottom: 20px;}
                .header h1 { margin: 0; font-size: 2.5rem; text-transform: uppercase; } .header p { margin: 5px 0 0; font-size: 1rem; }
                .section h2 { text-transform: uppercase; border-bottom: none; padding-bottom: 5px; margin-top: 20px; font-size: 1.2rem; }
                .job, .education-item { margin-bottom: 15px; } h4 { margin: 0 0 5px; }
              </style></head><body>
                <div class="header"><h1>${resumeData.name || "YOUR NAME"}</h1><p>${resumeData.location ? `<span style="display:inline-flex;align-items:center;gap:5px;vertical-align:middle;">${resumeLocationSvg({ size: 14, fill: "#333333" })}${resumeData.location}</span>` : ""}${resumeData.location && (resumeData.email || resumeData.phone) ? " | " : ""}${resumeData.email || ""}${resumeData.email && resumeData.phone ? " | " : ""}${resumeData.phone || ""}</p>${resumeData.linkedin ? `<p style="margin-top:6px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;justify-content:center;">${resumeSocialSvg("linkedin", { size: 14, fill: "#0A66C2" })}${resumeData.linkedin}</p>` : ""}${resumeData.github ? `<p style="margin-top:4px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;justify-content:center;">${resumeSocialSvg("github", { size: 14, fill: "#24292f" })}${resumeData.github}</p>` : ""}</div>
                <div class="section"><h2>Summary</h2><p>${formatTextForHtml(resumeData.summary)}</p></div>
                <div class="section"><h2>Skills</h2><p>${renderSkills(resumeData.skills)}</p></div>
                <div class="section"><h2>Experience</h2>${renderExperience(resumeData.experience)}</div>
                <div class="section"><h2>Education</h2>${renderEducation(resumeData.education)}</div>
              </body></html>`;
            break;

          case "creative":
            html = `
              <html><head><style>
                body { font-family: 'Helvetica Neue', sans-serif; margin: 0; font-size: 14px; display: flex; } p { white-space: normal; }
                .sidebar { background-color: #1e3a8a; color: white; width: 35%; padding: 2rem; } .sidebar h1 { font-size: 2rem; margin-top: 0; }
                .sidebar h2 { border-bottom: none; padding-bottom: 5px; font-size: 1.1rem; } .sidebar p, .sidebar li { font-size: 0.9rem; }
                .main { width: 65%; padding: 2rem; } .main h2 { color: #1e3a8a; border-bottom: none; padding-bottom: 5px; }
                .job, .education-item { margin-bottom: 20px; } h4 { margin: 0 0 5px; }
              </style></head><body>
                <div class="sidebar">
                  <h1>${resumeData.name || "Your Name"}</h1><p>${resumeData.profession || "Your Profession"}</p>
                  <h2>Contact</h2><p>${resumeData.email}<br/>${resumeData.phone}${resumeData.location ? `<br/><span style="display:inline-flex;align-items:center;gap:8px;">${resumeLocationSvg({ size: 18, fill: "#ffffff" })}<span>${resumeData.location}</span></span>` : ""}</p>
                  ${resumeData.linkedin ? `<p style="display:flex;align-items:flex-start;gap:8px;margin-top:10px;font-size:0.9rem;">${resumeSocialSvg("linkedin", { size: 18, fill: "#ffffff" })}<span style="word-break:break-all;">${resumeData.linkedin}</span></p>` : ""}
                  ${resumeData.github ? `<p style="display:flex;align-items:flex-start;gap:8px;margin-top:8px;font-size:0.9rem;">${resumeSocialSvg("github", { size: 18, fill: "#ffffff" })}<span style="word-break:break-all;">${resumeData.github}</span></p>` : ""}
                </div>
                <div class="main">
                  <h2>Summary</h2><p>${formatTextForHtml(resumeData.summary)}</p>
                  <h2>Skills</h2><ul>${(resumeData.skills || [])
                    .slice(0, 15)
                    .map((s) => `<li>${s}</li>`)
                    .join("")}</ul>
                  <h2>Experience</h2>${renderExperience(resumeData.experience)}
                  <h2>Education</h2>${renderEducation(resumeData.education)}
                </div>
              </body></html>`;
            break;

          case "professional":
          default:
            html = `
              <html><head><style>
                body { font-family: Arial, sans-serif; margin: 2rem; } p { white-space: normal; }
                .header { text-align: center; border-bottom: none; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { color: #2563eb; margin: 0; font-size: 2.5rem; } .header p { margin: 5px 0; color: #555; }
                .section h2 { color: #2563eb; border-bottom: none; padding-bottom: 5px; margin-top: 20px; }
                .job, .education-item { margin-bottom: 15px; } h4 { margin: 0 0 5px; }
              </style></head><body>
                <div class="header"><h1>${resumeData.name || "YOUR NAME"}</h1><p>${resumeData.profession || "Your Profession"}</p><p>${resumeData.email || ""}${resumeData.email && resumeData.phone ? " | " : ""}${resumeData.phone || ""}${(resumeData.email || resumeData.phone) && resumeData.location ? " | " : ""}${resumeData.location ? `<span style="display:inline-flex;align-items:center;gap:5px;">${resumeLocationSvg({ size: 14, fill: "#555555" })}${resumeData.location}</span>` : ""}</p>${resumeData.linkedin ? `<p style="margin-top:8px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;">${resumeSocialSvg("linkedin", { size: 15, fill: "#0A66C2" })}<a href="${resumeData.linkedin}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;">LinkedIn</a></p>` : ""}${resumeData.github ? `<p style="margin-top:4px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;">${resumeSocialSvg("github", { size: 15, fill: "#24292f" })}<a href="${resumeData.github}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;">GitHub</a></p>` : ""}</div>
                <div class="section"><h2>Summary</h2><p>${formatTextForHtml(resumeData.summary)}</p></div>
                <div class="section"><h2>Skills</h2><p>${renderSkills(resumeData.skills)}</p></div>
                <div class="section"><h2>Experience</h2>${renderExperience(resumeData.experience)}</div>
                <div class="section"><h2>Education</h2>${renderEducation(resumeData.education)}</div>
              </body></html>`;
            break;
        }
        resolve(html);
      });
    },
    onSuccess: (htmlContent: string) => setPreviewHtml(htmlContent),
    onError: () =>
      setPreviewHtml(
        "<p class='text-center text-red-500 p-8'>Error generating preview.</p>",
      ),
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async (data: {
      templateId: string;
      resumeData: ParsedResumeData;
      id: string;
      isManual: boolean;
    }) => {
      const response = await fetch("/api/generate-resume-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(
          (typeof errorData.message === "string" && errorData.message) ||
            (typeof errorData.error === "string" && errorData.error) ||
            response.statusText,
        );
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
        resumeData: debouncedExtractedData,
      });
    }
  }, [debouncedExtractedData, selectedTemplate, currentStep]);

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
          resumeData: extractedData,
          id: user?.user?.id,
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
    <div className="max-w-4xl mx-auto space-y-8">
      <ProgressStepper steps={steps} currentStepIndex={getCurrentStepIndex()} />
      <div className="text-center">
        <div className="bg-blue-50 dark:bg-blue-950 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold">Build Your Resume</h1>
        <p className="text-lg text-gray-600">
          Choose how you'd like to get started
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card
          className="border-2 border-dashed hover:border-blue-400 cursor-pointer group"
          onClick={() => {
            setBuildMethod("upload");
            setCurrentStep("upload");
          }}
        >
          <CardContent className="p-8 text-center">
            <div className="bg-blue-50 group-hover:bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Upload Existing Resume
            </h3>
            <p className="text-gray-600 mb-4">
              We'll extract the info to get you started fast.
            </p>
            <Button variant="outline" className="mt-2">
              Upload Resume
            </Button>
          </CardContent>
        </Card>
        <Card
          className="border-2 border-dashed hover:border-blue-400 cursor-pointer group"
          onClick={() => {
            setBuildMethod("linkedin");
            setCurrentStep("linkedin-url");
          }}
        >
          <CardContent className="p-8 text-center">
            <div className="bg-blue-50 group-hover:bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <Linkedin className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Import from LinkedIn</h3>
            <p className="text-gray-600 mb-4">
              Pull info directly from your LinkedIn profile.
            </p>
            <Button variant="outline" className="mt-2">
              Connect LinkedIn
            </Button>
          </CardContent>
        </Card>
        <Card
          className="md:col-span-2 border-2 border-dashed hover:border-green-400 cursor-pointer group"
          onClick={() => {
            setBuildMethod("manual");
            setExtractedData(initialResumeData);
            setCurrentStep("manual-edit");
          }}
        >
          <CardContent className="p-8 text-center">
            <div className="bg-green-50 group-hover:bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Start From Scratch</h3>
            <p className="text-gray-600 mb-4">
              Fill in your details manually with our guided form.
            </p>
            <Button variant="outline" className="mt-2">
              Start Building
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
  const renderLinkedinUrlStep = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <ProgressStepper steps={steps} currentStepIndex={getCurrentStepIndex()} />
      <div className="text-center">
        <div className="bg-blue-50 dark:bg-blue-950 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Linkedin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold">Import from LinkedIn</h1>
        <p className="text-lg text-gray-600">
          Enter your public profile URL to get started.
        </p>
      </div>
      <Card>
        <CardContent className="p-8 space-y-6">
          <div>
            <Label htmlFor="linkedin-url" className="text-left block">
              LinkedIn Profile URL
            </Label>
            <Input
              id="linkedin-url"
              type="url"
              placeholder="https://www.linkedin.com/in/your-profile"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => setCurrentStep("select")}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              onClick={handleLinkedinImport}
              disabled={linkedinImportMutation.isPending || !linkedinUrl}
              className="flex-1"
            >
              {linkedinImportMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" /> Import
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
          onClick={() => setCurrentStep("editor-preview")}
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

  const renderEditorPreviewStep = () => (
    <div className="max-w-full mx-auto space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        <div className="h-[calc(100vh-100px)] overflow-y-auto pr-2">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Review Your Details</h1>
            <Button
              variant="outline"
              onClick={() => setCurrentStep("templates")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Templates
            </Button>
          </div>
          <ResumeEditorForm
            extractedData={extractedData}
            setExtractedData={setExtractedData}
            onAISuggestion={handleAISuggestion}
            selectedTemplateId={selectedTemplate}
          />
        </div>
        <div className="h-[calc(100vh-100px)] flex flex-col sticky top-[50px]">
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <h2 className="text-2xl font-bold">Live Preview</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Updates {RESUME_PREVIEW_DEBOUNCE_MS / 1000}s after you stop typing
            </p>
          </div>
          <div className="flex-1 bg-gray-200 p-4 rounded-lg flex items-center justify-center dark:bg-gray-700">
            <div className="relative w-full h-full bg-white shadow-lg min-h-[480px]">
              {previewHtml ? (
                <>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full min-h-[480px] border-0"
                    title="Resume Preview"
                  />
                  {generatePreviewMutation.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/60 backdrop-blur-[1px]">
                      <div className="flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2 text-sm text-gray-700 shadow-md dark:bg-gray-800 dark:text-gray-200">
                        <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                        <span>Updating preview…</span>
                      </div>
                    </div>
                  )}
                </>
              ) : generatePreviewMutation.isPending ? (
                <div className="flex items-center justify-center h-full min-h-[480px] text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading
                  preview…
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[480px] text-gray-500">
                  <p>Preview will appear here.</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={handleDownloadPdf}
              disabled={!selectedTemplate || downloadPdfMutation.isPending}
              className="w-full"
            >
              {downloadPdfMutation.isPending
                ? "Generating..."
                : "Download as PDF"}
              <Download className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <GlobalHeader />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4">
        <div className="container mx-auto">
          {currentStep === "select" && renderSelectStep()}
          {currentStep === "upload" && renderUploadStep()}
          {currentStep === "linkedin-url" && renderLinkedinUrlStep()}
          {currentStep === "manual-edit" && renderManualEditStep()}
          {currentStep === "templates" && renderTemplatesStep()}
          {currentStep === "editor-preview" && renderEditorPreviewStep()}
        </div>
      </div>
    </>
  );
}
