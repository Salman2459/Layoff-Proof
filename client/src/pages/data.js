/**
 * Tool promo cards for the Elevate landing "Powerful AI Tools" section.
 * access: "tool" uses handleToolAccess(toolPath); "ai-auto-apply" uses profile check flow; "coming-soon" disables CTA.
 */
export const elevateLandingToolCards = [
  {
    id: "resume-builder",
    title: "Resume Builder",
    description:
      "Create ATS-optimized resumes with AI assistance. Stand out from the crowd with professionally designed templates.",
    features: [
      "ATS-friendly templates & keyword suggestions",
      "AI rewrites tailored to each job description",
      "Export polished PDFs in one click",
    ],
    iconKey: "FileText",
    theme: {
      bar: "from-teal-600 via-cyan-500 to-slate-700",
      iconTile: "bg-gradient-to-br from-teal-600 to-cyan-700",
      bullet: "bg-teal-600",
    },
    popular: true,
    premium: true,
    access: "tool",
    toolPath: "/tools/resume-builder",
  },
  {
    id: "cover-letter",
    title: "Cover Letter Generator",
    description:
      "Generate personalized cover letters that perfectly match job descriptions and company culture.",
    features: [
      "Matches tone to company and role",
      "Highlights your wins without sounding generic",
      "Multiple drafts you can refine in seconds",
    ],
    iconKey: "Mail",
    theme: {
      bar: "from-blue-600 via-indigo-600 to-indigo-800",
      iconTile: "bg-gradient-to-br from-blue-700 to-indigo-900",
      bullet: "bg-indigo-600",
    },
    premium: true,
    access: "tool",
    toolPath: "/tools/cover-letter",
  },
  {
    id: "interview-preparation",
    title: "Interview Preparation",
    description:
      "Practice with AI-powered mock interviews. Get real-time feedback and improve your confidence.",
    features: [
      "Role-specific question banks",
      "Instant feedback on structure and clarity",
      "Build confidence before the real interview",
    ],
    iconKey: "Users",
    theme: {
      bar: "from-emerald-500 via-teal-500 to-cyan-600",
      iconTile: "bg-gradient-to-br from-emerald-600 to-teal-700",
      bullet: "bg-teal-600",
    },
    premium: true,
    access: "tool",
    toolPath: "/tools/interview-preparation",
  },
  {
    id: "linkedin-optimizer",
    title: "LinkedIn Optimizer",
    description:
      "Optimize your LinkedIn profile for maximum visibility and professional networking opportunities.",
    features: [
      "Headline and about section optimization",
      "Keyword boosts for recruiter search",
      "Actionable tips to grow your network",
    ],
    iconKey: "Linkedin",
    theme: {
      bar: "from-sky-500 via-blue-600 to-indigo-700",
      iconTile: "bg-gradient-to-br from-blue-700 to-indigo-800",
      bullet: "bg-blue-600",
    },
    premium: true,
    access: "tool",
    toolPath: "/tools/linkedin-optimizer",
  },
  {
    id: "recruiter-outreach",
    title: "Recruiter Outreach Script Generator",
    description:
      "Generate personalized outreach messages for recruiters and hiring managers that get responses.",
    features: [
      "Cold DM and email templates",
      "Personalized openers that feel human",
      "Follow-up sequences that stay professional",
    ],
    iconKey: "MessageSquare",
    theme: {
      bar: "from-indigo-600 via-blue-600 to-slate-800",
      iconTile: "bg-gradient-to-br from-indigo-600 to-blue-800",
      bullet: "bg-indigo-600",
    },
    popular: true,
    premium: true,
    access: "tool",
    toolPath: "/tools/recruiter-outreach",
  },
  {
    id: "layoff-tracker",
    title: "Layoff Tracker",
    description:
      "Real-time layoff tracking and job security insights to help you stay informed about market changes.",
    features: [
      "Monitor companies and industries you care about",
      "Early signals to plan your next move",
      "Context to pair with your job search tools",
    ],
    iconKey: "TrendingDown",
    theme: {
      bar: "from-cyan-500 via-blue-500 to-blue-700",
      iconTile: "bg-gradient-to-br from-sky-500 to-blue-700",
      bullet: "bg-sky-600",
    },
    premium: true,
    access: "tool",
    toolPath: "/dashboard",
  },
  {
    id: "ai-auto-apply",
    title: "AI Auto Apply",
    description:
      "Automate your job applications with AI-powered precision and smart optimization.",
    features: [
      "Smart form filling from your profile",
      "Application tracking in one place",
      "Save hours on repetitive submissions",
    ],
    iconKey: "Bot",
    theme: {
      bar: "from-teal-600 via-cyan-600 to-indigo-700",
      iconTile: "bg-gradient-to-br from-teal-600 to-indigo-800",
      bullet: "bg-cyan-600",
    },
    premium: true,
    access: "ai-auto-apply",
  },
  {
    id: "salary-negotiator",
    title: "Salary Negotiator",
    description:
      "Get data-driven insights and proven strategies for successful salary negotiations and raises.",
    features: [
      "Benchmark ranges for your role and location",
      "Scripts for counter-offers and promotions",
      "Confidence backed by talking points",
    ],
    iconKey: "Briefcase",
    theme: {
      bar: "from-amber-400 via-yellow-500 to-orange-500",
      iconTile: "bg-gradient-to-br from-amber-500 to-orange-600",
      bullet: "bg-amber-500",
    },
    premium: true,
    access: "tool",
    toolPath: "/tools/salary-negotiator",
  },
  {
    id: "networking-assistant",
    title: "Networking Assistant",
    description:
      "Build meaningful professional connections with AI-powered networking strategies and templates.",
    features: [
      "Event and LinkedIn outreach ideas",
      "Keep relationships warm with reminders",
      "Templates that sound authentic",
    ],
    iconKey: "Users",
    theme: {
      bar: "from-slate-600 via-indigo-600 to-violet-700",
      iconTile: "bg-gradient-to-br from-slate-600 to-indigo-800",
      bullet: "bg-indigo-600",
    },
    premium: true,
    access: "tool",
    toolPath: "/tools/networking-assistant",
  },
  {
    id: "skills-assessment",
    title: "Skills Assessment",
    description:
      "Evaluate and improve your professional skills with comprehensive assessments and learning paths.",
    features: [
      "Gap analysis against target roles",
      "Prioritized learning roadmap",
      "Track progress as you upskill",
    ],
    iconKey: "Award",
    theme: {
      bar: "from-orange-400 via-amber-500 to-red-400",
      iconTile: "bg-gradient-to-br from-orange-500 to-red-600",
      bullet: "bg-orange-500",
    },
    premium: true,
    access: "coming-soon",
  },
];
