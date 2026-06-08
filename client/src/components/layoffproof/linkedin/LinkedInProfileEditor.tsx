"use client";

import { useState } from "react";
import { ClipboardCopy, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export type LinkedInExperience = {
  title: string;
  company: string;
  duration: string;
  description: string;
};

export type LinkedInProfileData = {
  name: string;
  profession: string;
  summary: string;
  location: string;
  experience: LinkedInExperience[];
  education: { degree: string; school: string; duration: string }[];
  skills: string[];
  profileImageUrl?: string;
  linkedin?: string;
};

type Props = {
  profileData: LinkedInProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<LinkedInProfileData | null>>;
  highlightField?: string | null;
};

export function LinkedInProfileEditor({ profileData, setProfileData, highlightField }: Props) {
  const { toast } = useToast();
  const [improvingField, setImprovingField] = useState<string | null>(null);

  const handleCopyClick = (textToCopy: string, fieldName: string) => {
    navigator.clipboard.writeText(textToCopy);
    toast({ title: "Copied!", description: `"${fieldName}" copied to clipboard.` });
  };

  const handleImproveClick = async (fieldName: string, existingText: string) => {
    setImprovingField(fieldName);
    try {
      const response = await fetch("/api/improve-with-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldName,
          existingText,
          resumeContext: profileData,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to get AI suggestion.");

      setProfileData((current) => {
        if (!current) return null;
        const newData = JSON.parse(JSON.stringify(current)) as LinkedInProfileData;
        if (fieldName.startsWith("experience-")) {
          const parts = fieldName.split("-");
          const index = parseInt(parts[1], 10);
          const prop = parts[2] as keyof LinkedInExperience;
          if (newData.experience[index]) newData.experience[index][prop] = data.suggestion;
        } else if (fieldName === "profession" || fieldName === "summary" || fieldName === "name" || fieldName === "location") {
          newData[fieldName] = data.suggestion;
        }
        return newData;
      });

      toast({ title: "Content improved", description: `Updated "${fieldName}" with AI.` });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Improvement failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setImprovingField(null);
    }
  };

  const handleInputChange = (fieldName: string, value: string) => {
    setProfileData((current) => {
      if (!current) return null;
      const newData = JSON.parse(JSON.stringify(current)) as LinkedInProfileData;
      if (fieldName.startsWith("experience-")) {
        const parts = fieldName.split("-");
        const index = parseInt(parts[1], 10);
        const prop = parts[2] as keyof LinkedInExperience;
        if (newData.experience[index]) newData.experience[index][prop] = value;
      } else if (fieldName === "profession" || fieldName === "summary" || fieldName === "name" || fieldName === "location") {
        newData[fieldName] = value;
      }
      return newData;
    });
  };

  const fieldRing = (name: string) =>
    highlightField === name ? "ring-2 ring-[#6366f1] ring-offset-1" : "";

  return (
    <div id="linkedin-profile-editor" className="rounded-2xl border border-[#e8ecf4] bg-white shadow-sm">
      <div className="border-b border-[#e8ecf4] px-5 py-4">
        <h2 className="text-base font-bold text-[#0f172a]">Edit & improve your profile</h2>
        <p className="mt-0.5 text-sm text-[#64748b]">
          Update fields below and use AI to refine copy before posting on LinkedIn.
        </p>
      </div>
      <div className="space-y-6 p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#334155]">Professional headline</label>
            <div className="relative">
              <Input
                value={profileData.profession}
                onChange={(e) => handleInputChange("profession", e.target.value)}
                className={`pr-20 ${fieldRing("profession")}`}
              />
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCopyClick(profileData.profession, "Headline")}
                  disabled={!!improvingField}
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#6366f1]"
                  onClick={() => handleImproveClick("profession", profileData.profession)}
                  disabled={!!improvingField}
                >
                  {improvingField === "profession" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#334155]">About / summary</label>
            <div className="relative">
              <Textarea
                value={profileData.summary}
                onChange={(e) => handleInputChange("summary", e.target.value)}
                className={`min-h-[120px] pr-20 ${fieldRing("summary")}`}
              />
              <div className="absolute right-1 top-2 flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleCopyClick(profileData.summary, "Summary")}
                  disabled={!!improvingField}
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#6366f1]"
                  onClick={() => handleImproveClick("summary", profileData.summary)}
                  disabled={!!improvingField}
                >
                  {improvingField === "summary" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {profileData.experience.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-bold text-[#0f172a]">Experience</h3>
            <div className="space-y-4">
              {profileData.experience.map((exp, index) => {
                const descFieldName = `experience-${index}-description`;
                return (
                  <div
                    key={index}
                    className="space-y-3 rounded-xl border border-[#e8ecf4] bg-[#f8fafc] p-4"
                  >
                    <p className="text-sm font-semibold text-[#0f172a]">
                      {exp.title} · {exp.company}
                    </p>
                    <div className="relative">
                      <Textarea
                        value={exp.description}
                        onChange={(e) => handleInputChange(descFieldName, e.target.value)}
                        className={`min-h-[100px] pr-20 ${fieldRing(descFieldName)}`}
                      />
                      <div className="absolute right-1 top-2 flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyClick(exp.description, `Experience ${index + 1}`)}
                          disabled={!!improvingField}
                        >
                          <ClipboardCopy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#6366f1]"
                          onClick={() => handleImproveClick(descFieldName, exp.description)}
                          disabled={!!improvingField}
                        >
                          {improvingField === descFieldName ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
