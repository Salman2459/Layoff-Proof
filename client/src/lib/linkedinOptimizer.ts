export type FeedbackStatus = "positive" | "negative" | "warning";

export type SuggestionImpact = "high" | "improve" | "good" | "completed";

export type LinkedInSuggestion = {
  id: string;
  title: string;
  description: string;
  impact: SuggestionImpact;
  actionLabel: string;
  categoryId?: string;
  fieldHint?: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  icon: string;
  status: "complete" | "attention" | "missing";
};

export type LinkedInProfileView = {
  name: string;
  headline: string;
  location: string;
  connections: string;
  company?: string;
  school?: string;
  profileImageUrl?: string;
};

export type OptimizerStats = {
  score: number;
  completed: number;
  toImprove: number;
  missing: number;
  goodToHave: number;
  totalChecklist: number;
};

export type AnalysisCategory = {
  id: string;
  title: string;
  items?: Array<{
    id: string;
    title: string;
    content?: string;
    feedback?: Array<{
      text: string;
      status: FeedbackStatus;
      suggestion?: string;
    }>;
    items?: Array<{
      text: string;
      status: FeedbackStatus;
      suggestion?: string;
    }>;
  }>;
};

export type AnalysisReportPayload = {
  score: number;
  summary?: string;
  needsImprovement: number;
  wellDone: number;
  categories: AnalysisCategory[];
};

const CHECKLIST_DEFINITIONS: { id: string; label: string; icon: string }[] = [
  { id: "photo", label: "Profile photo", icon: "user" },
  { id: "headline", label: "Headline", icon: "type" },
  { id: "summary", label: "Summary / About", icon: "file" },
  { id: "experience", label: "Experience", icon: "briefcase" },
  { id: "education", label: "Education", icon: "graduation" },
  { id: "skills", label: "Skills", icon: "sparkles" },
  { id: "certifications", label: "Certifications", icon: "award" },
  { id: "languages", label: "Languages", icon: "globe" },
  { id: "location", label: "Location", icon: "map" },
  { id: "contact", label: "Contact info", icon: "mail" },
  { id: "featured", label: "Featured section", icon: "star" },
  { id: "recommendations", label: "Recommendations", icon: "message" },
  { id: "volunteer", label: "Volunteer experience", icon: "heart" },
  { id: "projects", label: "Projects", icon: "folder" },
  { id: "publications", label: "Publications", icon: "book" },
  { id: "courses", label: "Courses", icon: "book-open" },
  { id: "honors", label: "Honors & awards", icon: "trophy" },
  { id: "interests", label: "Interests", icon: "lightbulb" },
  { id: "customUrl", label: "Custom URL", icon: "link" },
  { id: "banner", label: "Background banner", icon: "image" },
];

function mapCategoryToImpact(categoryId: string, status: FeedbackStatus): SuggestionImpact {
  if (status === "positive") return "completed";
  if (categoryId === "highImpact" || categoryId === "basicInfo") return "high";
  if (categoryId === "tips") return "good";
  if (status === "warning") return "improve";
  return "improve";
}

function actionLabelFor(impact: SuggestionImpact, title: string): string {
  if (impact === "completed") return "Done";
  if (title.toLowerCase().includes("skill")) return "Add Skills";
  if (title.toLowerCase().includes("background") || title.toLowerCase().includes("banner"))
    return "Add Background";
  if (title.toLowerCase().includes("headline")) return "Improve";
  if (title.toLowerCase().includes("summary") || title.toLowerCase().includes("about"))
    return "Improve";
  return "Improve";
}

export function flattenSuggestions(report: AnalysisReportPayload): LinkedInSuggestion[] {
  const out: LinkedInSuggestion[] = [];
  let idx = 0;

  for (const cat of report.categories) {
    for (const item of cat.items ?? []) {
      const feedbackList =
        item.feedback ??
        item.items?.map((sub) => ({
          text: sub.text,
          status: sub.status,
          suggestion: sub.suggestion,
        })) ??
        [];

      for (const fb of feedbackList) {
        if (fb.status === "positive") continue;
        const impact = mapCategoryToImpact(cat.id, fb.status);
        out.push({
          id: `${cat.id}-${idx++}`,
          title: item.title || cat.title,
          description: fb.suggestion || fb.text,
          impact,
          actionLabel: actionLabelFor(impact, item.title || cat.title),
          categoryId: cat.id,
          fieldHint: item.id,
        });
      }
    }
  }

  if (out.length === 0 && report.summary) {
    out.push({
      id: "summary-0",
      title: "Profile overview",
      description: report.summary,
      impact: "improve",
      actionLabel: "Improve",
    });
  }

  return out;
}

export function buildChecklist(
  profile: Record<string, unknown> | null,
  report: AnalysisReportPayload | null
): ChecklistItem[] {
  const p = profile ?? {};
  const headline = String(p.profession ?? p.headline ?? "").trim();
  const summary = String(p.summary ?? p.about ?? "").trim();
  const skills = (p.skills as unknown[]) ?? [];
  const experience = (p.experience as unknown[]) ?? [];
  const education = (p.education as unknown[]) ?? [];
  const location = String(p.location ?? "").trim();

  const negativeTopics = new Set<string>();
  if (report) {
    for (const s of flattenSuggestions(report)) {
      negativeTopics.add(s.title.toLowerCase());
    }
  }

  const rules: Record<string, "complete" | "attention" | "missing"> = {
    photo: p.profileImageUrl ? "complete" : "missing",
    headline: headline ? (negativeTopics.has("headline") ? "attention" : "complete") : "missing",
    summary: summary ? (negativeTopics.has("about") ? "attention" : "complete") : "missing",
    experience: experience.length
      ? negativeTopics.has("experience")
        ? "attention"
        : "complete"
      : "missing",
    education: education.length ? "complete" : "attention",
    skills: skills.length >= 5 ? "complete" : skills.length ? "attention" : "missing",
    certifications: "attention",
    languages: "attention",
    location: location ? "complete" : "missing",
    contact: p.email || p.phone ? "complete" : "attention",
    featured: "attention",
    recommendations: "attention",
    volunteer: "attention",
    projects: "attention",
    publications: "attention",
    courses: "attention",
    honors: "attention",
    interests: "attention",
    customUrl: p.linkedin || p.website ? "complete" : "attention",
    banner: "attention",
  };

  return CHECKLIST_DEFINITIONS.map((def) => ({
    ...def,
    status: rules[def.id] ?? "attention",
  }));
}

export function computeStats(
  checklist: ChecklistItem[],
  suggestions: LinkedInSuggestion[],
  score: number
): OptimizerStats {
  const completed = checklist.filter((c) => c.status === "complete").length;
  const missing = checklist.filter((c) => c.status === "missing").length;
  const toImprove = suggestions.filter((s) => s.impact === "high" || s.impact === "improve").length;
  const goodToHave = suggestions.filter((s) => s.impact === "good").length;

  return {
    score,
    completed,
    toImprove: toImprove || Math.max(0, checklist.filter((c) => c.status === "attention").length),
    missing,
    goodToHave: goodToHave || Math.max(0, Math.floor((100 - score) / 20)),
    totalChecklist: checklist.length,
  };
}

export function strengthLabel(score: number): string {
  if (score >= 85) return "Great!";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Needs work";
}

export function toOptimizerProfileData(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    headline: raw.headline ?? raw.profession,
    about: raw.about ?? raw.summary,
    profession: raw.profession ?? raw.headline,
    summary: raw.summary ?? raw.about,
  };
}

export function toApiProfilePayload(raw: Record<string, unknown>) {
  return {
    name: raw.name ?? "",
    headline: raw.profession ?? raw.headline ?? "",
    about: raw.summary ?? raw.about ?? "",
    location: raw.location ?? "",
    followers: raw.followers ?? raw.connectionCount ?? "",
    experience: raw.experience ?? [],
    education: raw.education ?? [],
    skills: raw.skills ?? [],
    certifications: raw.certifications ?? [],
    languages: raw.languages ?? [],
    profileImageUrl: raw.profileImageUrl ?? "",
    linkedin: raw.linkedin ?? "",
  };
}

export function normalizeAnalysisReport(raw: unknown): AnalysisReportPayload {
  const root = raw as Record<string, unknown>;
  const ar = (root.analysisReport ?? root) as AnalysisReportPayload;
  return {
    score: Number(ar.score) || 0,
    summary: typeof ar.summary === "string" ? ar.summary : "",
    needsImprovement: Number(ar.needsImprovement) || 0,
    wellDone: Number(ar.wellDone) || 0,
    categories: Array.isArray(ar.categories) ? ar.categories : [],
  };
}

export function countSuggestionsByImpact(suggestions: LinkedInSuggestion[]) {
  return {
    all: suggestions.length,
    high: suggestions.filter((s) => s.impact === "high").length,
    improve: suggestions.filter((s) => s.impact === "improve").length,
    good: suggestions.filter((s) => s.impact === "good").length,
    completed: suggestions.filter((s) => s.impact === "completed").length,
  };
}

export function exportChecklistText(
  checklist: ChecklistItem[],
  stats: OptimizerStats,
  profileName: string
): string {
  const lines = [
    `LinkedIn Profile Checklist — ${profileName}`,
    `Score: ${stats.score}/100`,
    "",
    ...checklist.map((c) => {
      const mark =
        c.status === "complete" ? "✓" : c.status === "missing" ? "✗" : "!";
      return `${mark} ${c.label}`;
    }),
  ];
  return lines.join("\n");
}
