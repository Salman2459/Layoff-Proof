import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Linkedin,
  Mail,
  Bot,
  Users,
  Briefcase,
  BarChart3,
  Award,
} from "lucide-react";

export const HM_PRIMARY = "#5D5FEF";
export const HM_PRIMARY_DARK = "#4F46E5";

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Tools", href: "#tools" },
  { label: "Templates", href: "#templates" },
  { label: "Resources", href: "#resources" },
  { label: "Pricing", href: "#pricing" },
] as const;

export const TRUST_LOGOS = [
  "Google",
  "Microsoft",
  "Amazon",
  "Meta",
  "Apple",
  "Tesla",
  "Adobe",
  "IBM",
  "Airbnb",
  "Slack",
] as const;

export type FeatureCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  iconBg: string;
};

export const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: FileText,
    title: "AI Resume Builder",
    description: "Create ATS-friendly resumes tailored to each job in minutes.",
    iconBg: "bg-indigo-100 text-indigo-600",
  },
  {
    icon: Linkedin,
    title: "LinkedIn Optimizer",
    description: "Boost profile visibility with AI-powered headline and summary tips.",
    iconBg: "bg-blue-100 text-blue-600",
  },
  {
    icon: Mail,
    title: "AI Cover Letter",
    description: "Generate personalized cover letters for every application.",
    iconBg: "bg-rose-100 text-rose-600",
  },
  {
    icon: Bot,
    title: "AI Auto Apply",
    description: "Apply to matching roles automatically while you focus on prep.",
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    icon: Users,
    title: "Interview Preparation",
    description: "Practice with AI mock interviews and instant feedback.",
    iconBg: "bg-cyan-100 text-cyan-600",
  },
  {
    icon: Briefcase,
    title: "Job Tracker",
    description: "Track applications, interviews, and offers in one place.",
    iconBg: "bg-amber-100 text-amber-600",
  },
  {
    icon: BarChart3,
    title: "Resume Analyzer",
    description: "Get instant ATS scores and actionable improvement tips.",
    iconBg: "bg-fuchsia-100 text-fuchsia-600",
  },
  {
    icon: Award,
    title: "Skills Boost",
    description: "Personalized upskilling paths aligned to your target role.",
    iconBg: "bg-orange-100 text-orange-600",
  },
];

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Create Your Profile",
    description: "Add your experience, skills, and career goals in one guided flow.",
  },
  {
    step: 2,
    title: "Build & Optimize",
    description: "Generate resumes and optimize LinkedIn with AI suggestions.",
  },
  {
    step: 3,
    title: "Apply Smarter",
    description: "Use AI cover letters and auto-apply to roles that match you.",
  },
  {
    step: 4,
    title: "Track Progress",
    description: "Monitor applications and interviews from your dashboard.",
  },
  {
    step: 5,
    title: "Land the Role",
    description: "Interview with confidence using prep tools and insights.",
  },
] as const;

export type ToolPreview = {
  id: string;
  icon: LucideIcon;
  iconBg: string;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  href: string;
};

export const TOOL_PREVIEWS: ToolPreview[] = [
  {
    id: "resume",
    icon: FileText,
    iconBg: "bg-gradient-to-br from-sky-500 to-blue-600",
    title: "AI Resume Builder",
    description:
      "Design professional, ATS-optimized resumes with live preview and multiple templates.",
    bullets: ["20+ modern templates", "AI bullet suggestions", "One-click PDF export"],
    cta: "Create Resume",
    href: "/resume-builder",
  },
  {
    id: "linkedin",
    icon: Linkedin,
    iconBg: "bg-gradient-to-br from-blue-600 to-indigo-700",
    title: "LinkedIn Optimizer",
    description: "Analyze and improve your LinkedIn profile for recruiter visibility.",
    bullets: ["Profile strength score", "Headline & summary AI", "Keyword optimization"],
    cta: "Optimize Profile",
    href: "/linkedin-optimizer",
  },
  {
    id: "cover",
    icon: Mail,
    iconBg: "bg-gradient-to-br from-rose-400 to-pink-600",
    title: "AI Cover Letter",
    description: "Tailored cover letters based on your resume and the job description.",
    bullets: ["Job-specific tone", "Quick edits with AI", "Copy or download"],
    cta: "Write Cover Letter",
    href: "/cover-letter",
  },
  {
    id: "auto-apply",
    icon: Bot,
    iconBg: "bg-gradient-to-br from-violet-500 to-indigo-600",
    title: "AI Auto Apply",
    description: "Save hours by applying to qualified jobs with your saved profile.",
    bullets: ["Smart job matching", "Application tracking", "Profile auto-fill"],
    cta: "Start Auto Apply",
    href: "/auto-job-apply-dashboard",
  },
  {
    id: "interview",
    icon: Users,
    iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
    title: "Interview Preparation",
    description: "Practice role-specific questions and get scored feedback instantly.",
    bullets: ["Mock interview AI", "Answer scoring", "Questions for interviewers"],
    cta: "Practice Now",
    href: "/interview-preparation",
  },
  {
    id: "tracker",
    icon: Briefcase,
    iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
    title: "Job Tracker",
    description: "Kanban-style tracking from applied to offer with reminders.",
    bullets: ["Pipeline view", "Status updates", "Notes per application"],
    cta: "Track Jobs",
    href: "/lay-offs",
  },
  {
    id: "analyzer",
    icon: BarChart3,
    iconBg: "bg-gradient-to-br from-fuchsia-500 to-purple-600",
    title: "Resume Analyzer",
    description: "See how your resume scores against ATS systems and job posts.",
    bullets: ["ATS compatibility", "Gap analysis", "Improvement checklist"],
    cta: "Analyze Resume",
    href: "/recruiter-outreach",
  },
  {
    id: "skills",
    icon: Award,
    iconBg: "bg-gradient-to-br from-orange-400 to-red-500",
    title: "Skills Boost",
    description: "Identify skill gaps and get a learning plan for your target role.",
    bullets: ["Skills assessment", "Learning paths", "Role alignment"],
    cta: "Boost Skills",
    href: "/skills-assessment",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "Layoff Proof helped me tailor my resume and LinkedIn in one weekend. I landed three interviews the next month.",
    name: "Sarah Chen",
    role: "Product Manager",
    avatar: "SC",
  },
  {
    quote:
      "The interview prep tool felt like a real mock session. I was way more confident in my onsite.",
    name: "Marcus Johnson",
    role: "Software Engineer",
    avatar: "MJ",
  },
  {
    quote:
      "Auto apply plus the job tracker kept me organized. I finally stopped losing track of applications.",
    name: "Elena Rodriguez",
    role: "Marketing Lead",
    avatar: "ER",
  },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Tools", href: "#tools" },
      { label: "Pricing", href: "#pricing" },
      { label: "Templates", href: "#templates" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "#" },
      { label: "Career Guides", href: "#" },
      { label: "Resume Tips", href: "#" },
      { label: "Interview Tips", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "FAQ", href: "#" },
      { label: "Community", href: "#" },
      { label: "Status", href: "#" },
    ],
  },
] as const;

export const HERO_TOOLS = [
  { icon: FileText, label: "Resume Builder", bg: "from-sky-500 to-blue-600" },
  { icon: Linkedin, label: "LinkedIn", bg: "from-blue-600 to-indigo-700" },
  { icon: Mail, label: "Cover Letter", bg: "from-rose-400 to-pink-600" },
  { icon: Bot, label: "Auto Apply", bg: "from-violet-500 to-indigo-600" },
  { icon: Users, label: "Interview", bg: "from-cyan-500 to-blue-600" },
  { icon: Briefcase, label: "Job Tracker", bg: "from-amber-400 to-orange-500" },
] as const;
