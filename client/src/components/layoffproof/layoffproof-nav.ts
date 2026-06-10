import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Linkedin,
  Mail,
  Briefcase,
  Sparkles,
  Users,
  BarChart3,
  Award,
  MessageCircle,
  Bookmark,
  FolderOpen,
  CreditCard,
  Settings,
  TrendingDown,
  DollarSign,
} from "lucide-react";

export type LayoffProofNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
};

export const layoffProofNavItems: LayoffProofNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    match: (p) => p === "/dashboard",
  },
  {
    id: "auto-apply",
    label: "AI Auto Apply",
    href: "/auto-job-apply-dashboard",
    icon: Bot,
    match: (p) => p.startsWith("/auto-job-apply"),
  },
  {
    id: "resume",
    label: "Resume Builder",
    href: "/resume-builder",
    icon: FileText,
    match: (p) => p.startsWith("/resume-builder"),
  },
  {
    id: "linkedin",
    label: "LinkedIn Optimize",
    href: "/linkedin-optimizer",
    icon: Linkedin,
  },
  {
    id: "cover-letter",
    label: "AI Cover Letter",
    href: "/cover-letter",
    icon: Mail,
  },
  {
    id: "lay-offs",
    label: "Lay offs",
    href: "/lay-offs",
    icon: TrendingDown,
    match: (p) => p === "/lay-offs",
  },
  {
    id: "job-board",
    label: "Job Board",
    href: "/job-board",
    icon: Sparkles,
    match: (p) => p === "/job-board",
  },
  {
    id: "interview",
    label: "Interview Prep",
    href: "/interview-preparation",
    icon: Users,
    match: (p) => p === "/interview-preparation",
  },
  {
    id: "resume-analyzer",
    label: "Resume Analyzer",
    href: "/recruiter-outreach",
    icon: BarChart3,
    match: (p) => p === "/recruiter-outreach",
  },
  {
    id: "skills",
    label: "Skills Boost",
    href: "/skills-assessment",
    icon: Award,
    match: (p) => p === "/skills-assessment",
  },
  {
    id: "career",
    label: "Career Assistant",
    href: "/career-path-analyzer",
    icon: MessageCircle,
    match: (p) => p === "/career-path-analyzer",
  },
  {
    id: "salary-negotiator",
    label: "Salary Negotiator",
    href: "/salary-negotiator",
    icon: DollarSign,
    match: (p) => p === "/salary-negotiator",
  },
  // {
  //   id: "saved",
  //   label: "Saved Jobs",
  //   href: "/job-board",
  //   icon: Bookmark,
  // },
  {
    id: "documents",
    label: "Documents",
    href: "/auto-job-apply",
    icon: FolderOpen,
  },
  {
    id: "subscription",
    label: "Subscription",
    href: "/subscribe",
    icon: CreditCard,
    match: (p) => p === "/subscribe",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/profile",
    icon: Settings,
    match: (p) => p === "/profile" || p === "/manage-subscription",
  },
];

export type LayoffProofToolCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  iconBg: string;
  popular?: boolean;
};

export const layoffProofToolCards: LayoffProofToolCard[] = [
  {
    id: "auto-apply",
    title: "AI Auto Apply",
    description: "Apply to jobs automatically with AI",
    href: "/auto-job-apply-dashboard",
    icon: Bot,
    iconBg: "bg-gradient-to-br from-violet-500 to-indigo-600",
    popular: true,
  },
  {
    id: "resume",
    title: "Resume Builder",
    description: "Create ATS-friendly resumes",
    href: "/resume-builder",
    icon: FileText,
    iconBg: "bg-gradient-to-br from-sky-500 to-blue-600",
  },
  {
    id: "linkedin",
    title: "LinkedIn Optimize",
    description: "Boost your LinkedIn profile",
    href: "/linkedin-optimizer",
    icon: Linkedin,
    iconBg: "bg-gradient-to-br from-blue-600 to-indigo-700",
    popular: true,
  },
  {
    id: "cover",
    title: "AI Cover Letter",
    description: "Generate tailored cover letters",
    href: "/cover-letter",
    icon: Mail,
    iconBg: "bg-gradient-to-br from-rose-400 to-pink-600",
  },
  {
    id: "tracker",
    title: "Job Tracker",
    description: "Track applications & status",
    href: "/lay-offs",
    icon: Briefcase,
    iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
  },
  {
    id: "matches",
    title: "Job Matches",
    description: "Find jobs that fit you",
    href: "/job-board",
    icon: Sparkles,
    iconBg: "bg-gradient-to-br from-emerald-400 to-teal-600",
  },
  {
    id: "interview",
    title: "Interview Prep",
    description: "Practice with AI mock interviews",
    href: "/interview-preparation",
    icon: Users,
    iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
  },
  {
    id: "analyzer",
    title: "Resume Analyzer",
    description: "Get instant resume feedback",
    href: "/recruiter-outreach",
    icon: BarChart3,
    iconBg: "bg-gradient-to-br from-fuchsia-500 to-purple-600",
  },
  {
    id: "skills",
    title: "Skills Boost",
    description: "Upskill with personalized paths",
    href: "/skills-assessment",
    icon: Award,
    iconBg: "bg-gradient-to-br from-orange-400 to-red-500",
  },
  {
    id: "assistant",
    title: "Career Assistant",
    description: "AI guidance for your career",
    href: "/career-path-analyzer",
    icon: MessageCircle,
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-700",
  },
  {
    id: "salary-negotiator",
    title: "Salary Negotiator",
    description: "Strategies and scripts for salary talks",
    href: "/salary-negotiator",
    icon: DollarSign,
    iconBg: "bg-gradient-to-br from-violet-500 to-indigo-600",
  },
];
