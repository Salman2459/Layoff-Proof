import type { LucideIcon } from "lucide-react";
import {
  User,
  FileText,
  Sparkles,
  Briefcase,
  GraduationCap,
  Trophy,
} from "lucide-react";

export const layoffproofInputClass =
  "h-11 rounded-lg border-[#e2e8f0] bg-white text-sm text-[#334155] shadow-sm placeholder:text-[#94a3b8] focus-visible:border-[#a5b4fc] focus-visible:ring-2 focus-visible:ring-[#c7d2fe]/50";

export const layoffproofLabelClass = "text-xs font-medium text-[#64748b]";

export type ResumeEditorSection =
  | "personal"
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "achievements";

export const RESUME_EDITOR_SECTIONS: {
  id: ResumeEditorSection;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { id: "personal", label: "Personal", description: "Your basic info", icon: User },
  { id: "summary", label: "Summary", description: "Professional intro", icon: FileText },
  { id: "skills", label: "Skills", description: "Your expertise", icon: Sparkles },
  { id: "experience", label: "Experience", description: "Work history", icon: Briefcase },
  { id: "education", label: "Education", description: "Academic background", icon: GraduationCap },
  { id: "achievements", label: "Achievements", description: "Awards & wins", icon: Trophy },
];

export const SECTION_ORDER: ResumeEditorSection[] = [
  "personal",
  "summary",
  "skills",
  "experience",
  "education",
  "achievements",
];

export function nextSection(current: ResumeEditorSection): ResumeEditorSection | null {
  const i = SECTION_ORDER.indexOf(current);
  return i >= 0 && i < SECTION_ORDER.length - 1 ? SECTION_ORDER[i + 1] : null;
}
