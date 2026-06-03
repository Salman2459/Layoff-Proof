/**
 * Shared job-profile completion scoring and missing-field detection.
 * Used by auto-job-apply, dashboard, and profile settings.
 */

export interface JobProfileLike {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  country?: string | null;
  city?: string | null;
  totalExperience?: string | null;
  /** Account-level job title from /profile settings */
  jobTitle?: string | null;
  experiences?: Array<{ company?: string; title?: string }> | null;
  education?: unknown[] | null;
  skills?: Array<{ name?: string }> | null;
  languages?: unknown[] | null;
  resume?: string | null;
  /** Present on the auto-job-apply form when a resume is already saved */
  resumeUrl?: string | null;
  achievements?: string | null;
  certificates?: string | null;
  certificateFiles?: FileList | null;
  recommendationLetter?: string | null;
  recommendationLetters?: FileList | null;
  expectedSalary?: number | string | null;
  noticePeriod?: number | string | null;
}

export type ProfileChecklistItem = {
  id: string;
  label: string;
  isComplete: (profile: JobProfileLike) => boolean;
  /** Shown in the "required information" alert */
  required?: boolean;
};

const CHECKLIST: ProfileChecklistItem[] = [
  {
    id: "firstName",
    label: "First name",
    isComplete: (p) => !!p.firstName?.trim(),
  },
  {
    id: "lastName",
    label: "Last name",
    isComplete: (p) => !!p.lastName?.trim(),
  },
  {
    id: "email",
    label: "Email",
    isComplete: (p) => !!p.email?.trim(),
  },
  {
    id: "phone",
    label: "Phone",
    isComplete: (p) => !!p.phone?.trim(),
  },
  {
    id: "location",
    label: "Location",
    isComplete: (p) => !!p.city?.trim() && !!p.country?.trim(),
  },
  {
    id: "linkedin",
    label: "LinkedIn URL",
    isComplete: (p) => !!p.linkedin?.trim(),
  },
  {
    id: "currentJobTitle",
    label: "Current job title",
    isComplete: (p) =>
      !!p.jobTitle?.trim() || !!p.experiences?.[0]?.title?.trim(),
    required: true,
  },
  {
    id: "currentCompany",
    label: "Current company",
    isComplete: (p) => !!p.experiences?.[0]?.company?.trim(),
  },
  {
    id: "yearsExperience",
    label: "Years of experience",
    isComplete: (p) => !!p.totalExperience?.trim(),
    required: true,
  },
  {
    id: "workExperience",
    label: "Work experience",
    isComplete: (p) => (p.experiences?.length ?? 0) > 0,
  },
  {
    id: "education",
    label: "Education",
    isComplete: (p) => (p.education?.length ?? 0) > 0,
  },
  {
    id: "skills",
    label: "Skills (at least 3)",
    isComplete: (p) => (p.skills?.length ?? 0) >= 3,
    required: true,
  },
  {
    id: "languages",
    label: "Language",
    isComplete: (p) => (p.languages?.length ?? 0) > 0,
  },
  {
    id: "resume",
    label: "Resume",
    isComplete: (p) => !!(p.resume?.trim() || p.resumeUrl?.trim()),
    required: true,
  },
  {
    id: "achievements",
    label: "Achievements",
    isComplete: (p) => !!p.achievements?.trim(),
  },
  {
    id: "certificates",
    label: "Certificates",
    isComplete: (p) =>
      !!p.certificates?.trim() || (p.certificateFiles?.length ?? 0) > 0,
  },
  {
    id: "salaryPrefs",
    label: "Salary & notice period",
    isComplete: (p) =>
      !!(p.expectedSalary != null && String(p.expectedSalary) !== "") &&
      !!(p.noticePeriod != null && String(p.noticePeriod) !== ""),
  },
];

export type ProfileCompletionResult = {
  percent: number;
  missingFields: string[];
  requiredMissing: string[];
  completedCount: number;
  totalCount: number;
};

export function getJobProfileCompletion(
  profile: JobProfileLike | null | undefined
): ProfileCompletionResult {
  if (!profile) {
    return {
      percent: 0,
      missingFields: CHECKLIST.map((c) => c.label),
      requiredMissing: CHECKLIST.filter((c) => c.required).map((c) => c.label),
      completedCount: 0,
      totalCount: CHECKLIST.length,
    };
  }

  const missingFields: string[] = [];
  const requiredMissing: string[] = [];
  let completedCount = 0;

  for (const item of CHECKLIST) {
    if (item.isComplete(profile)) {
      completedCount += 1;
    } else {
      missingFields.push(item.label);
      if (item.required) requiredMissing.push(item.label);
    }
  }

  const totalCount = CHECKLIST.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  return {
    percent,
    missingFields,
    requiredMissing,
    completedCount,
    totalCount,
  };
}

export function getProfileCompletionLabel(percent: number): string {
  if (percent === 0) return "Start building your profile to get started";
  if (percent < 40) return "Just getting started — keep going!";
  if (percent <= 70) return "Good progress — fill in the remaining sections";
  if (percent < 100) return "Almost complete — you're nearly there!";
  return "Your profile is complete and ready!";
}

export function getProfileCompletionColors(percent: number) {
  if (percent < 40) return { text: "text-red-600", bar: "bg-red-500" };
  if (percent <= 70) return { text: "text-amber-600", bar: "bg-amber-500" };
  return { text: "text-green-600", bar: "bg-green-500" };
}

/** Map auto-job-apply Formik values to {@link JobProfileLike}. */
export function formValuesToJobProfile(values: {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    linkedin: string;
  };
  residency: { country: string; city: string };
  experience: {
    totalExperience: string;
    experiences: Array<{ company: string; title: string }>;
  };
  education: { education: unknown[] };
  skillAndLanguages: { skills: unknown[]; languages: unknown[] };
  general: { expectedSalary: number | ""; noticePeriod: number | "" };
  achievements: { achievements: string };
  resume: File | null;
  resumeUrl: string | null;
  certificates?: FileList | null;
  recommendationLetters?: FileList | null;
}): JobProfileLike {
  const hasCertFiles = (values.certificates?.length ?? 0) > 0;
  const hasRecFiles = (values.recommendationLetters?.length ?? 0) > 0;
  return {
    firstName: values.personal.firstName,
    lastName: values.personal.lastName,
    email: values.personal.email,
    phone: values.personal.phone,
    linkedin: values.personal.linkedin,
    country: values.residency.country,
    city: values.residency.city,
    totalExperience: values.experience.totalExperience,
    experiences: values.experience.experiences,
    education: values.education.education,
    skills: values.skillAndLanguages.skills as JobProfileLike["skills"],
    languages: values.skillAndLanguages.languages,
    resume: values.resumeUrl,
    resumeUrl: values.resumeUrl,
    achievements: values.achievements.achievements,
    certificates: hasCertFiles ? "uploaded" : undefined,
    certificateFiles: values.certificates ?? undefined,
    recommendationLetter: hasRecFiles ? "uploaded" : undefined,
    recommendationLetters: values.recommendationLetters ?? undefined,
    expectedSalary: values.general.expectedSalary,
    noticePeriod: values.general.noticePeriod,
  };
}
