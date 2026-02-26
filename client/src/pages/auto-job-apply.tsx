import { toast } from '@/hooks/use-toast';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from '@/hooks/useAuth';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Bot, Loader2 } from 'lucide-react';
import { Formik } from 'formik';
import * as Yup from 'yup';


// Types for form data
interface PersonalDetails {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneCode: string;
    linkedin: string;
    twitter: string;
    website: string;
    github: string;
}

interface Residency {
    street: string;
    buildingNo: string;
    apartmentNo: string;
    country: string;
    city: string;
    zip: string;
    authorizedCountries: string[];
    sponsorship: 'REQUIRED' | 'NOT_REQUIRED';
    relocate: 'YES' | 'NO';
}

interface EducationItem {
    school: string;
    degree: string;
    fieldOfStudy: string;
    fromMonth: string;
    fromYear: string;
    toMonth: string;
    toYear: string;
    isCurrentlyStudying: boolean;
    description: string;
}

interface ExperienceItem {
    company: string;
    title: string;
    fromMonth: string;
    fromYear: string;
    toMonth: string;
    toYear: string;
    currentlyWorking: boolean;
    description: string;
}

interface LanguageItem {
    language: string;
    proficiency: string;
}

interface Skill {
    name: string;
}

interface General {
    expectedSalary: number | '';
    expectedSalaryCurrency: string;
    currentSalary: number | '';
    currentSalaryCurrency: string;
    noticePeriod: number | '';
    startDate: Date | null;
    race: string;
    disability: string;
    veteran: string;
}

interface Achievements {
    achievements: string;
}

// Shape returned by /api/upload-resume (Claude resume parser)
interface ParsedResumeFromApi {
    name?: string;
    email?: string;
    phone?: string;
    profession?: string;
    summary?: string;
    experience?: Array<{
        title?: string;
        company?: string;
        location?: string;
        duration?: string;
        description?: string;
        responsibilities?: string[];
    }>;
    skills?: string[];
    education?: Array<{
        degree?: string;
        institution?: string;
        duration?: string;
    }>;
    certifications?: string[];
    achievements?: string[];
    projects?: unknown[];
    languages?: string[];
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
}

interface FormData {
    profileCompletion: number;
    personal: PersonalDetails;
    residency: Residency;
    experience: {
        totalExperience: string;
        experiences: ExperienceItem[];
    };
    education: {
        education: EducationItem[];
    };
    skillAndLanguages: {
        skills: Skill[];
        languages: LanguageItem[];
    };
    general: General;
    achievements: Achievements;
    resume: File | null;
    /** Saved resume URL from profile (shown when user returns to step 1 so they see resume is on file) */
    resumeUrl: string | null;
    recommendationLetters: FileList | null;
    certificates: FileList | null;
}

// Multi-step form config: step index -> { label, section for API }
const STEP_CONFIG: { label: string; section: string }[] = [
    { label: 'Resume & Personal', section: 'personal' },
    { label: 'Residency', section: 'residency' },
    { label: 'Experience', section: 'experience' },
    { label: 'Education', section: 'education' },
    { label: 'Skills & Languages', section: 'skillAndLanguages' },
    { label: 'General', section: 'general' },
    { label: 'Achievements', section: 'achievements' },
    { label: 'Documents', section: 'documents' },
];

const TOTAL_STEPS = STEP_CONFIG.length;

// Allowed fields per section (must match server SECTION_FIELDS) – only these are sent in payload
const SECTION_ALLOWED_FIELDS: Record<string, string[]> = {
    personal: ['firstName', 'lastName', 'email', 'phone', 'linkedin', 'twitter', 'website', 'github'],
    residency: ['street', 'buildingNo', 'apartmentNo', 'country', 'city', 'zip', 'authorizedCountries', 'sponsorship', 'relocate'],
    experience: ['totalExperience', 'experiences'],
    education: ['education'],
    skillAndLanguages: ['skills', 'languages'],
    general: ['expectedSalary', 'expectedSalaryCurrency', 'currentSalary', 'currentSalaryCurrency', 'noticePeriod', 'startDate', 'race', 'disability', 'veteran'],
    achievements: ['achievements'],
};

function pickPayloadFields<T extends Record<string, unknown>>(data: T, allowedFields: string[]): Record<string, unknown> {
    if (!data || typeof data !== 'object') return {};
    return Object.fromEntries(
        Object.entries(data).filter(([key]) => allowedFields.includes(key))
    ) as Record<string, unknown>;
}

/** Build the exact payload for the current step: only section data with allowed fields. */
function buildStepPayload(currentStep: number, values: FormData): { apiSection: string; payload: Record<string, unknown> } {
    const { section } = STEP_CONFIG[currentStep];
    const apiSection = section === 'documents' ? 'general' : section;
    const raw = section === 'documents' ? values.general : (values as unknown as Record<string, unknown>)[section];
    const allowed = SECTION_ALLOWED_FIELDS[apiSection];
    const payload = allowed ? pickPayloadFields((raw ?? {}) as Record<string, unknown>, allowed) : (raw as Record<string, unknown>) ?? {};
    return { apiSection, payload };
}

// Per-step Yup validation (only the current step's required fields)
function getStepSchema(step: number): Yup.ObjectSchema<Partial<FormData>> {
    switch (step) {
        case 0:
            return Yup.object({
                personal: Yup.object({
                    firstName: Yup.string().required('First name is required'),
                    lastName: Yup.string().required('Last name is required'),
                    email: Yup.string().email('Invalid email').required('Email is required'),
                    phone: Yup.string().required('Phone is required'),
                }),
            }) as Yup.ObjectSchema<Partial<FormData>>;
        case 1:
            return Yup.object({
                residency: Yup.object({
                    country: Yup.string().required('Country is required'),
                    city: Yup.string().required('City is required'),
                }),
            }) as Yup.ObjectSchema<Partial<FormData>>;
        case 2:
            return Yup.object({
                experience: Yup.object({
                    totalExperience: Yup.string().required('Total experience is required'),
                }),
            }) as Yup.ObjectSchema<Partial<FormData>>;
        case 3:
            return Yup.object({
                education: Yup.object({
                    education: Yup.array().min(1, 'Add at least one education entry'),
                }),
            }) as Yup.ObjectSchema<Partial<FormData>>;
        case 4:
            return Yup.object({
                skillAndLanguages: Yup.object({
                    skills: Yup.array().of(Yup.object({ name: Yup.string() })).min(3, 'Add at least 3 skills'),
                }),
            }) as Yup.ObjectSchema<Partial<FormData>>;
        case 5:
            return Yup.object({
                general: Yup.object({
                    expectedSalary: Yup.mixed().required('Expected salary is required'),
                    noticePeriod: Yup.mixed().required('Notice period is required'),
                    startDate: Yup.mixed().required('Start date is required'),
                    race: Yup.string().required('Race/ethnicity is required'),
                    disability: Yup.string().required('Disability status is required'),
                    veteran: Yup.string().required('Veteran status is required'),
                }),
            }) as Yup.ObjectSchema<Partial<FormData>>;
        case 6:
            return Yup.object({
                achievements: Yup.object({
                    achievements: Yup.string().required('Achievements are required'),
                }),
            }) as Yup.ObjectSchema<Partial<FormData>>;
        case 7:
            return Yup.object({}); // Documents step: no required fields
        default:
            return Yup.object({});
    }
}

const defaultInitialValues: FormData = {
    profileCompletion: 50,
    personal: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        phoneCode: '',
        linkedin: '',
        twitter: '',
        website: '',
        github: '',
    },
    residency: {
        street: '',
        buildingNo: '',
        apartmentNo: '',
        country: 'Pakistan',
        city: 'Faisalabad',
        zip: '',
        authorizedCountries: [],
        sponsorship: 'NOT_REQUIRED',
        relocate: 'NO',
    },
    experience: { totalExperience: '0', experiences: [] },
    education: { education: [] },
    skillAndLanguages: { languages: [], skills: [] },
    certificates: null,
    general: {
        expectedSalary: '',
        expectedSalaryCurrency: '',
        currentSalary: '',
        currentSalaryCurrency: '',
        noticePeriod: '',
        startDate: new Date(),
        race: '',
        disability: '',
        veteran: '',
    },
    achievements: { achievements: '' },
    resume: null,
    resumeUrl: null,
    recommendationLetters: null,
};

function buildInitialFromProfile(p: Record<string, unknown>): FormData {
    const defStr = (v: unknown) => (v != null && v !== '' ? String(v) : '');
    const defNum = (v: unknown): number | '' => (typeof v === 'number' && !Number.isNaN(v) ? v : '');
    const defArr = (v: unknown, d: unknown[]): unknown[] => (Array.isArray(v) ? v : d);
    const exp = defArr(p.experiences, []) as FormData['experience']['experiences'];
    const edu = defArr(p.education, []) as FormData['education']['education'];
    const sk = defArr(p.skills, []) as { name: string }[];
    const lang = defArr(p.languages, []) as { language: string; proficiency: string }[];
    const startDate = p.startDate != null ? (typeof p.startDate === 'string' ? new Date(p.startDate) : p.startDate instanceof Date ? p.startDate : null) : null;
    return {
        ...defaultInitialValues,
        personal: {
            firstName: defStr(p.firstName) || defaultInitialValues.personal.firstName,
            lastName: defStr(p.lastName) || defaultInitialValues.personal.lastName,
            email: defStr(p.email) || defaultInitialValues.personal.email,
            phone: defStr(p.phone) || defaultInitialValues.personal.phone,
            phoneCode: defStr(p.phoneCode) || defaultInitialValues.personal.phoneCode,
            linkedin: defStr(p.linkedin) || defaultInitialValues.personal.linkedin,
            twitter: defStr(p.twitter) || defaultInitialValues.personal.twitter,
            website: defStr(p.website) || defaultInitialValues.personal.website,
            github: defStr(p.github) || defaultInitialValues.personal.github,
        },
        residency: {
            street: defStr(p.street) || defaultInitialValues.residency.street,
            buildingNo: defStr(p.buildingNo) || defaultInitialValues.residency.buildingNo,
            apartmentNo: defStr(p.apartmentNo) || defaultInitialValues.residency.apartmentNo,
            country: defStr(p.country) || defaultInitialValues.residency.country,
            city: defStr(p.city) || defaultInitialValues.residency.city,
            zip: defStr(p.zip) || defaultInitialValues.residency.zip,
            authorizedCountries: Array.isArray(p.authorizedCountries) ? (p.authorizedCountries as string[]) : defaultInitialValues.residency.authorizedCountries,
            sponsorship: defStr(p.sponsorship) === 'REQUIRED' ? 'REQUIRED' : (defStr(p.sponsorship) === 'NOT_REQUIRED' ? 'NOT_REQUIRED' : defaultInitialValues.residency.sponsorship),
            relocate: defStr(p.relocate) === 'YES' ? 'YES' : (defStr(p.relocate) === 'NO' ? 'NO' : defaultInitialValues.residency.relocate),
        },
        experience: {
            totalExperience: defStr(p.totalExperience) || defaultInitialValues.experience.totalExperience || '0',
            experiences: exp.length ? exp : defaultInitialValues.experience.experiences,
        },
        education: { education: edu.length ? edu : defaultInitialValues.education.education },
        skillAndLanguages: {
            skills: sk.length ? sk : defaultInitialValues.skillAndLanguages.skills,
            languages: lang.length ? lang : defaultInitialValues.skillAndLanguages.languages,
        },
        general: {
            expectedSalary: defNum(p.expectedSalary) !== '' ? defNum(p.expectedSalary) : defaultInitialValues.general.expectedSalary,
            expectedSalaryCurrency: defStr(p.expectedSalaryCurrency) || defaultInitialValues.general.expectedSalaryCurrency,
            currentSalary: defNum(p.currentSalary) !== '' ? defNum(p.currentSalary) : defaultInitialValues.general.currentSalary,
            currentSalaryCurrency: defStr(p.currentSalaryCurrency) || defaultInitialValues.general.currentSalaryCurrency,
            noticePeriod: defNum(p.noticePeriod) !== '' ? defNum(p.noticePeriod) : defaultInitialValues.general.noticePeriod,
            startDate: startDate ?? defaultInitialValues.general.startDate,
            race: defStr(p.race) || defaultInitialValues.general.race,
            disability: defStr(p.disability) || defaultInitialValues.general.disability,
            veteran: defStr(p.veteran) || defaultInitialValues.general.veteran,
        },
        achievements: { achievements: defStr(p.achievements) || defaultInitialValues.achievements.achievements },
        resumeUrl: (typeof p.resume === 'string' && p.resume) ? p.resume : null,
    };
}

const AutoJobApply: React.FC = () => {
    const [, setLocation] = useLocation();
    const [currentStep, setCurrentStep] = useState(0);
    const [errors, setErrors] = useState<string[]>([]);
    const [savingSection, setSavingSection] = useState<string | null>(null);
    const [resumeParseLoading, setResumeParseLoading] = useState(false);
    const [uploadingDocument, setUploadingDocument] = useState<'resume' | 'certificate' | 'recommendation' | null>(null);
    const { user } = useAuth();
    const id = user && typeof user === 'object' && 'id' in user ? (user as { id: string }).id : undefined;
    // Ref so resume parse (async) can read latest Formik values and call setValues with merged result
    const latestFormValuesRef = useRef<FormData>(defaultInitialValues);
    // Initialize from profile only once so refetches (e.g. after save) don't overwrite unsaved Education/Skills
    const [initialValues, setInitialValues] = useState<FormData>(defaultInitialValues);
    const [profileLoaded, setProfileLoaded] = useState(false);

    // Parse duration string (e.g. "2020 - 2022", "Jan 2019 - Present") to from/to years and months
    const parseDuration = (duration: string | undefined): { fromYear: string; fromMonth: string; toYear: string; toMonth: string; currentlyWorking: boolean } => {
        const result = { fromYear: '', fromMonth: '', toYear: '', toMonth: '', currentlyWorking: false };
        if (!duration || !duration.trim()) return result;
        const lower = duration.toLowerCase();
        result.currentlyWorking = lower.includes('present') || lower.includes('current');
        const yearMatch = duration.match(/\b(20\d{2}|19\d{2})\b/g);
        if (yearMatch && yearMatch.length >= 1) {
            result.fromYear = yearMatch[0];
            if (yearMatch.length >= 2 && !result.currentlyWorking) result.toYear = yearMatch[1];
            else if (result.currentlyWorking) result.toYear = new Date().getFullYear().toString();
        }
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const fromMonthMatch = lower.match(new RegExp(`(${months.join('|')})[a-z]*\\s*(\\d{4})?`, 'i'));
        if (fromMonthMatch) result.fromMonth = fromMonthMatch[1].slice(0, 3);
        return result;
    };

    // Map API parsed resume into form (all steps). Uses ref for latest values so async parse can merge and setValues once.
    const applyParsedResumeToForm = (parsed: ParsedResumeFromApi, setValues: (values: FormData) => void) => {
        const prev = latestFormValuesRef.current;
        const next = { ...prev };
        if (parsed.name?.trim()) {
            const parts = parsed.name.trim().split(/\s+/);
            next.personal = { ...prev.personal, firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
        }
        if (parsed.email?.trim()) next.personal = { ...next.personal, email: parsed.email.trim() };
        if (parsed.phone?.trim()) next.personal = { ...next.personal, phone: parsed.phone.trim() };
        const link = (url: string | undefined) => (url && url.trim() ? (url.startsWith('http') ? url : `https://${url}`) : '');
        if (parsed.linkedin?.trim()) next.personal = { ...next.personal, linkedin: link(parsed.linkedin) || parsed.linkedin.trim() };
        if (parsed.github?.trim()) next.personal = { ...next.personal, github: link(parsed.github) || parsed.github.trim() };
        if (parsed.website?.trim()) next.personal = { ...next.personal, website: link(parsed.website) || parsed.website.trim() };
        if (parsed.location?.trim()) {
            const loc = parsed.location.trim();
            const comma = loc.lastIndexOf(',');
            if (comma > 0) {
                next.residency = { ...prev.residency, city: loc.slice(0, comma).trim(), country: loc.slice(comma + 1).trim() };
            } else {
                next.residency = { ...prev.residency, city: loc };
            }
        }
        if (parsed.experience?.length) {
            next.experience = {
                ...prev.experience,
                experiences: parsed.experience.map(exp => {
                    const { fromYear, fromMonth, toYear, toMonth, currentlyWorking } = parseDuration(exp.duration);
                    const desc = [exp.description, ...(exp.responsibilities || [])].filter(Boolean).join('\n');
                    return {
                        company: exp.company?.trim() || '',
                        title: exp.title?.trim() || '',
                        fromMonth,
                        fromYear,
                        toMonth,
                        toYear,
                        currentlyWorking,
                        description: desc.trim(),
                    };
                }),
            };
            const totalYears = next.experience.experiences.length;
            if (totalYears > 0) next.experience = { ...next.experience, totalExperience: String(Math.max(1, totalYears)) };
        }
        if (parsed.education?.length) {
            next.education = {
                education: parsed.education.map(edu => {
                    const { fromYear, toYear } = parseDuration(edu.duration);
                    return {
                        school: edu.institution?.trim() || '',
                        degree: edu.degree?.trim() || '',
                        fieldOfStudy: '',
                        fromMonth: '',
                        fromYear,
                        toMonth: '',
                        toYear,
                        isCurrentlyStudying: false,
                        description: '',
                    };
                }),
            };
        }
        if (parsed.skills?.length) {
            next.skillAndLanguages = {
                ...prev.skillAndLanguages,
                skills: parsed.skills.filter(Boolean).map(s => ({ name: String(s).trim() })),
            };
        }
        if (parsed.languages?.length) {
            next.skillAndLanguages = {
                ...next.skillAndLanguages,
                languages: parsed.languages.filter(Boolean).map(lang => ({ language: String(lang).trim(), proficiency: 'Fluent' })),
            };
        }
        const achievementParts: string[] = [];
        if (parsed.summary?.trim()) achievementParts.push(parsed.summary.trim());
        if (parsed.achievements?.length) achievementParts.push(...parsed.achievements.filter(Boolean).map(String));
        if (parsed.certifications?.length) achievementParts.push('Certifications: ' + parsed.certifications.filter(Boolean).join(', '));
        if (achievementParts.length) next.achievements = { achievements: achievementParts.join('\n\n') };
        latestFormValuesRef.current = next;
        setValues(next);
    };

    const parseResumeAndFillForm = async (file: File, setValues: (values: FormData) => void) => {
        if (!id) {
            toast({ title: 'Sign in required', description: 'Please sign in to parse your resume.', variant: 'destructive' });
            return;
        }
        setResumeParseLoading(true);
        try {
            const fd = new FormData();
            fd.append('resume', file);
            fd.append('id', id);
            const res = await fetch('/api/upload-resume', { method: 'POST', body: fd, credentials: 'include' });
            const json = await res.json();
            if (!res.ok) {
                toast({ title: 'Parse failed', description: json.error || 'Could not parse resume.', variant: 'destructive' });
                return;
            }
            const parsedData = json.parsedData as ParsedResumeFromApi;
            if (parsedData) applyParsedResumeToForm(parsedData, setValues);
            toast({ title: 'Resume parsed', description: 'Form fields have been filled from your resume.' });
        } catch (e) {
            toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to parse resume.', variant: 'destructive' });
        } finally {
            setResumeParseLoading(false);
        }
    };

    // Fetch existing profile from DB (same endpoint as dashboard: job profile by userId)
    const queryClient = useQueryClient();
    const { data: profileData } = useQuery({
        queryKey: ['userJobProfile', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await fetch(`/api/profile/jobprofile/${id}`, { credentials: 'include' });
            const json = await res.json();
            if (!res.ok) return null;
            return json.data ?? null;
        },
        enabled: !!id,
    });

    // Initialize form and step from profile only once when profile first loads (prevents refetches from wiping Education/Skills)
    useEffect(() => {
        if (!profileData || profileLoaded) return;
        setInitialValues(buildInitialFromProfile(profileData as Record<string, unknown>));
        const apiStep = (profileData as Record<string, unknown>).currentStep;
        const stepNum = typeof apiStep === 'number' && apiStep >= 1 ? apiStep : 1;
        const index = Math.max(0, Math.min(stepNum - 1, TOTAL_STEPS - 1));
        setCurrentStep(index);
        setProfileLoaded(true);
    }, [profileData, profileLoaded]);

    // Profile completion from form values (used inside Formik)
    const profileCompletionFromValues = (values: FormData) => {
        let score = 0;
        const p = values.personal;
        if (p.firstName && p.lastName && p.email && p.phone) score += 20;
        else if (p.firstName || p.lastName || p.email || p.phone) score += 10;
        const r = values.residency;
        if (r.country && r.city) score += 10;
        else if (r.country || r.city) score += 5;
        if (values.experience.experiences.length > 0) score += 15;
        if (values.education.education.length > 0) score += 15;
        const hasSkills = values.skillAndLanguages.skills.length >= 3;
        const hasLanguage = values.skillAndLanguages.languages.length > 0;
        if (hasSkills && hasLanguage) score += 15;
        else if (hasSkills || hasLanguage) score += 7;
        if (values.resume || values.resumeUrl) score += 10;
        if (values.achievements.achievements) score += 5;
        if (values.recommendationLetters && values.recommendationLetters.length > 0) score += 5;
        if (values.certificates && values.certificates.length > 0) score += 5;
        const g = values.general;
        if (g.expectedSalary && g.noticePeriod) score += 10;
        else if (g.expectedSalary || g.noticePeriod) score += 5;
        return score;
    };

    const resumeFileRef = useRef<HTMLInputElement | null>(null);
    const recommendationFileRef = useRef<HTMLInputElement | null>(null);
    const certificatesFileRef = useRef<HTMLInputElement | null>(null);

    const handleBrowseClick = (ref: React.RefObject<HTMLInputElement>) => {
        ref.current?.click();
    };

    const updateMutation = useMutation({
        mutationFn: async ({ section, payload, currentStep }: { section: string; payload: Record<string, unknown>; currentStep: number }) => {
            return await apiRequest('POST', `/api/profile/${section}/${id}`, { [section]: payload, currentStep });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userJobProfile', id] });
            toast({ title: "Profile Updated", description: "Successfully updated your profile." });
        },
        onError: (error: unknown) => {
            const errorMessage = error instanceof Error ? error.message : "Failed to update profile.";
            setErrors([errorMessage]);
            toast({ title: "Save failed", description: errorMessage, variant: "destructive" });
        },
        onSettled: () => setSavingSection(null),
    });
    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        type: 'resume' | 'recommendationLetters' | 'certificates',
        setValues: (values: FormData) => void
    ) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        if (type === 'resume') {
            const file = files[0];
            const withResume = { ...latestFormValuesRef.current, resume: file };
            latestFormValuesRef.current = withResume;
            setValues(withResume);
            parseResumeAndFillForm(file, setValues);
        } else if (type === 'recommendationLetters') {
            const prev = latestFormValuesRef.current;
            const existingFiles = prev.recommendationLetters ? Array.from(prev.recommendationLetters) : [];
            const dataTransfer = new DataTransfer();
            [...existingFiles, ...Array.from(files)].forEach(f => dataTransfer.items.add(f));
            const next = { ...prev, recommendationLetters: dataTransfer.files };
            latestFormValuesRef.current = next;
            setValues(next);
        } else if (type === 'certificates') {
            const prev = latestFormValuesRef.current;
            const existingFiles = prev.certificates ? Array.from(prev.certificates) : [];
            const dataTransfer = new DataTransfer();
            [...existingFiles, ...Array.from(files)].forEach(f => dataTransfer.items.add(f));
            const next = { ...prev, certificates: dataTransfer.files };
            latestFormValuesRef.current = next;
            setValues(next);
        }
    };

    const removeFile = (type: 'recommendationLetters' | 'certificates', indexToRemove: number, setValues: (fn: (prev: FormData) => FormData) => void) => {
        setValues(prev => {
            const fileList = type === 'recommendationLetters' ? prev.recommendationLetters : prev.certificates;
            if (!fileList) return prev;
            const filesArray = Array.from(fileList);
            const filteredFiles = filesArray.filter((_, index) => index !== indexToRemove);
            if (filteredFiles.length === 0) return { ...prev, [type]: null };
            const dataTransfer = new DataTransfer();
            filteredFiles.forEach(file => dataTransfer.items.add(file));
            return { ...prev, [type]: dataTransfer.files };
        });
    };

    const removeResume = (setValues: (fn: (prev: FormData) => FormData) => void) => {
        setValues(prev => ({ ...prev, resume: null }));
    };

    const handleUpdate = (section: keyof FormData, field: string, value: unknown, setValues: (fn: (prev: FormData) => FormData) => void) => {
        setValues(prev => ({
            ...prev,
            [section]: { ...(prev[section] as Record<string, unknown>), [field]: value }
        }));
    };



    const addLanguage = (setValues: (fn: (prev: FormData) => FormData) => void) => {
        setValues(prev => ({
            ...prev,
            skillAndLanguages: {
                ...prev.skillAndLanguages,
                languages: [...prev.skillAndLanguages.languages, { language: '', proficiency: '' }],
            }
        }));
    };

    const updateLanguage = (index: number, field: keyof LanguageItem, value: string, values: FormData, setValues: (fn: (prev: FormData) => FormData) => void) => {
        const newLanguages = [...values.skillAndLanguages.languages];
        newLanguages[index] = { ...newLanguages[index], [field]: value };
        setValues(prev => ({
            ...prev,
            skillAndLanguages: { ...prev.skillAndLanguages, languages: newLanguages }
        }));
    };

    const removeLanguage = (index: number, setValues: (fn: (prev: FormData) => FormData) => void) => {
        setValues(prev => ({
            ...prev,
            skillAndLanguages: {
                ...prev.skillAndLanguages,
                languages: prev.skillAndLanguages.languages.filter((_, i) => i !== index),
            }
        }));
    };

    const addSkill = (skillName: string, values: FormData, setValues: (fn: (prev: FormData) => FormData) => void) => {
        if (!values.skillAndLanguages.skills.find(s => s.name === skillName)) {
            setValues(prev => ({
                ...prev,
                skillAndLanguages: {
                    ...prev.skillAndLanguages,
                    skills: [...prev.skillAndLanguages.skills, { name: skillName }],
                }
            }));
        }
    };

    const removeSkill = (skillName: string, setValues: (fn: (prev: FormData) => FormData) => void) => {
        setValues(prev => ({
            ...prev,
            skillAndLanguages: {
                ...prev.skillAndLanguages,
                skills: prev.skillAndLanguages.skills.filter(s => s.name !== skillName),
            }
        }));
    };

    // Experience handlers
    const [experienceForm, setExperienceForm] = useState<ExperienceItem>({
        company: '', title: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', currentlyWorking: false, description: '',
    });
    const [isAddingExperience, setIsAddingExperience] = useState(false);
    const [editingExperienceIndex, setEditingExperienceIndex] = useState<number | null>(null);

    const resetExperienceForm = () => {
        setExperienceForm({ company: '', title: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', currentlyWorking: false, description: '' });
        setIsAddingExperience(false);
        setEditingExperienceIndex(null);
    };

    const saveExperience = (setValues: (fn: (prev: FormData) => FormData) => void) => {
        if (!experienceForm.company || !experienceForm.title || !experienceForm.fromMonth || !experienceForm.fromYear) return;
        setValues(prev => {
            const updated = [...prev.experience.experiences];
            if (editingExperienceIndex !== null) {
                updated[editingExperienceIndex] = experienceForm;
            } else {
                updated.push(experienceForm);
            }
            return { ...prev, experience: { ...prev.experience, experiences: updated } };
        });
        resetExperienceForm();
    };

    const saveAndAddMoreExperience = (setValues: (fn: (prev: FormData) => FormData) => void) => {
        if (!experienceForm.company || !experienceForm.title || !experienceForm.fromMonth || !experienceForm.fromYear) return;
        setValues(prev => {
            const updated = [...prev.experience.experiences];
            if (editingExperienceIndex !== null) {
                updated[editingExperienceIndex] = experienceForm;
            } else {
                updated.push(experienceForm);
            }
            return { ...prev, experience: { ...prev.experience, experiences: updated } };
        });
        setExperienceForm({ company: '', title: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', currentlyWorking: false, description: '' });
        setEditingExperienceIndex(null);
    };

    const editExperience = (index: number, values: FormData) => {
        setExperienceForm(values.experience.experiences[index]);
        setEditingExperienceIndex(index);
        setIsAddingExperience(true);
    };

    const deleteExperience = (index: number, setValues: (fn: (prev: FormData) => FormData) => void) => {
        setValues(prev => ({
            ...prev,
            experience: {
                ...prev.experience,
                experiences: prev.experience.experiences.filter((_, i) => i !== index),
            }
        }));
    };

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => String(currentYear - i));

    // Education handlers
    const [educationForm, setEducationForm] = useState<EducationItem>({
        school: '', degree: '', fieldOfStudy: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', isCurrentlyStudying: false, description: '',
    });
    const [isAddingEducation, setIsAddingEducation] = useState(false);
    const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null);

    const resetEducationForm = () => {
        setEducationForm({ school: '', degree: '', fieldOfStudy: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', isCurrentlyStudying: false, description: '' });
        setIsAddingEducation(false);
        setEditingEducationIndex(null);
    };

    const saveEducation = (setValues: (fn: (prev: FormData) => FormData) => void) => {
        if (!educationForm.school || !educationForm.degree || !educationForm.fromMonth || !educationForm.fromYear) return;
        setValues(prev => {
            const updated = [...prev.education.education];
            if (editingEducationIndex !== null) {
                updated[editingEducationIndex] = educationForm;
            } else {
                updated.push(educationForm);
            }
            return { ...prev, education: { ...prev.education, education: updated } };
        });
        resetEducationForm();
    };

    const saveAndAddMoreEducation = (setValues: (fn: (prev: FormData) => FormData) => void) => {
        if (!educationForm.school || !educationForm.degree || !educationForm.fromMonth || !educationForm.fromYear) return;
        setValues(prev => {
            const updated = [...prev.education.education];
            if (editingEducationIndex !== null) {
                updated[editingEducationIndex] = educationForm;
            } else {
                updated.push(educationForm);
            }
            return { ...prev, education: { ...prev.education, education: updated } };
        });
        setEducationForm({ school: '', degree: '', fieldOfStudy: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', isCurrentlyStudying: false, description: '' });
        setEditingEducationIndex(null);
    };

    const editEducation = (index: number, values: FormData) => {
        setEducationForm(values.education.education[index]);
        setEditingEducationIndex(index);
        setIsAddingEducation(true);
    };

    const deleteEducation = (index: number, setValues: (fn: (prev: FormData) => FormData) => void) => {
        setValues(prev => ({
            ...prev,
            education: {
                ...prev.education,
                education: prev.education.education.filter((_, i) => i !== index),
            }
        }));
    };



    return (
        <Formik
            key={profileLoaded ? 'loaded' : 'default'}
            initialValues={initialValues}
            enableReinitialize={false}
            validationSchema={getStepSchema(currentStep)}
            validateOnChange
            validateOnBlur
            onSubmit={() => {}}
        >
            {({ values, setValues, isValid, validateForm, setTouched }: { values: FormData; setValues: (values: FormData) => void; isValid: boolean; validateForm: () => Promise<Record<string, unknown>>; setTouched: (touched: Record<string, unknown>) => void }) => {
                latestFormValuesRef.current = values;
                // Wrapper so handlers that use setValues(prev => next) still work (they get latest from ref)
                const setValuesWithPrev = (fn: (prev: FormData) => FormData) => {
                    const next = fn(latestFormValuesRef.current);
                    latestFormValuesRef.current = next;
                    setValues(next);
                };
                const profileCompletion = profileCompletionFromValues(values);
                const handleSaveAndNext = async () => {
                    // Use ref so we have the latest values (setValuesWithPrev updates ref synchronously; Formik state may be stale)
                    const latestValues = latestFormValuesRef.current;
                    const schema = getStepSchema(currentStep);
                    let errs: Record<string, unknown> = {};
                    try {
                        await schema.validate(latestValues, { abortEarly: false });
                    } catch (e) {
                        if (e && typeof e === 'object' && 'inner' in e) {
                            const yupErr = e as { inner?: Array<{ path?: string; message?: string }> };
                            errs = (yupErr.inner || []).reduce((acc, i) => {
                                if (i.path) acc[i.path] = i.message;
                                return acc;
                            }, {} as Record<string, unknown>);
                        } else if (e && typeof e === 'object' && 'path' in e) {
                            const yupErr = e as { path?: string; message?: string };
                            if (yupErr.path) errs[yupErr.path] = (yupErr as { message?: string }).message;
                        }
                    }
                    if (Object.keys(errs).length > 0) {
                        const { section } = STEP_CONFIG[currentStep];
                        const sectionKeys = (latestValues as Record<string, unknown>)[section];
                        const touchedSection = sectionKeys && typeof sectionKeys === 'object'
                            ? Object.fromEntries(Object.keys(sectionKeys as object).map(k => [k, true]))
                            : {};
                        setTouched({ [section]: touchedSection } as Record<string, unknown>);
                        setValues(latestValues);
                        return;
                    }
                    const { apiSection, payload } = buildStepPayload(currentStep, latestValues);
                    const payloadStep = Math.min(currentStep + 2, TOTAL_STEPS);
                    setSavingSection(apiSection);
                    updateMutation.mutate(
                        { section: apiSection, payload, currentStep: payloadStep },
                        {
                            onSuccess: (_, { currentStep: savedStep }) => {
                                if (savedStep >= TOTAL_STEPS) {
                                    setLocation('/tools/auto-job-apply-dashboard');
                                } else {
                                    setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
                                }
                            },
                        }
                    );
                };
                return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-gray-50">
            {/* Sticky Profile Progress Bar */}
            <div className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${profileCompletion === 100 ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                                {profileCompletion === 100 ? <CheckCircle2 className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 leading-tight">Profile Completion</h3>
                                <p className="text-xs text-gray-500 font-medium">
                                    {profileCompletion < 100 ? `${100 - profileCompletion}% more to reach 100%` : "Profile is ready for auto-apply!"}
                                </p>
                            </div>
                        </div>
                        <div className="flex-1 max-w-xs">
                            <div className="flex items-center justify-between mb-1.5 px-1">
                                <span className={`text-xs font-bold ${profileCompletion === 100 ? 'text-green-600' : 'text-purple-600'}`}>
                                    {profileCompletion}% Complete
                                </span>
                                {profileCompletion < 40 && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                        <AlertCircle className="w-3 h-3" /> Basic
                                    </span>
                                )}
                            </div>
                            <Progress value={profileCompletion} className="h-2 rounded-full bg-gray-100" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Step indicator */}
            <div className="flex flex-wrap gap-2 mb-6">
                {STEP_CONFIG.map((step, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentStep(idx)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentStep === idx ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300'}`}
                    >
                        {idx + 1}. {step.label}
                    </button>
                ))}
            </div>

            {/* Step 0: Resume & Personal */}
            {currentStep === 0 && (
            <>
                <input
                    type="file"
                    id="resume"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    ref={resumeFileRef}
                    disabled={resumeParseLoading}
                    onChange={(e) => handleFileChange(e, 'resume', setValues)}
                />
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className='flex justify-between items-center mb-2'>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Resume</h4>
                        {resumeParseLoading && (
                            <span className="text-sm text-purple-600 font-medium flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Auto filling form…
                            </span>
                        )}
                        <button type="button" disabled={resumeParseLoading || uploadingDocument === 'resume'} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2" onClick={async () => {
                            if (!values.resume) {
                                toast({ title: "No file selected", description: "Please select a resume to upload.", variant: "destructive" });
                                return;
                            }
                            setUploadingDocument('resume');
                            try {
                                const fd = new FormData();
                                fd.append('file', values.resume);
                                await apiRequest('POST', `/api/profile/documentupdate/${id}?documentType=resume`, fd);
                                toast({ title: "Success", description: "Resume uploaded successfully." });
                            } catch (err) {
                                toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Could not upload resume.", variant: "destructive" });
                            } finally {
                                setUploadingDocument(null);
                            }
                        }}>
                            {uploadingDocument === 'resume' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {uploadingDocument === 'resume' ? 'Uploading…' : 'Upload'}
                        </button>
                    </div>
                    {values.resume ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-purple-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm text-gray-700">{values.resume.name} ({(values.resume.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); removeResume(setValuesWithPrev); }} className="ml-2 text-gray-400 hover:text-red-600 transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ) : values.resumeUrl ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center flex-wrap gap-2">
                                    <svg className="w-5 h-5 text-purple-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm text-gray-700">Resume on file</span>
                                    <a href={values.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline">View</a>
                                </div>
                                <button type="button" onClick={() => !resumeParseLoading && handleBrowseClick(resumeFileRef)} className="ml-2 text-sm text-purple-600 hover:text-purple-700 font-medium">Upload new</button>
                            </div>
                        </div>
                    ) : (
                        <div onClick={() => !resumeParseLoading && handleBrowseClick(resumeFileRef)} className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${resumeParseLoading ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-purple-500 cursor-pointer'}`}>
                            <div className="flex flex-col items-center space-y-2">
                                <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                <h5 className="text-md font-medium text-gray-900">Drag–n–Drop your CV here</h5>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className="w-12 h-px bg-gray-300"></span>
                                    <span>or</span>
                                    <span className="w-12 h-px bg-gray-300"></span>
                                </div>
                                <span className="text-purple-600 font-medium">Browse</span>
                                <p className="text-xs text-gray-500">(File types: pdf, doc, docx, txt, rtf)</p>
                            </div>
                        </div>
                    )}
                </div>

            {/* Personal Details (same step) */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 mt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h4>
                <p className="text-sm text-gray-600 mb-4">Manually fill out all details to auto-populate job applications and generate a professional cover letter based on your information.</p>
                <div className="text-sm text-gray-500 mb-4">Required fields are marked <span className="text-red-500">*</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First name <span className="text-red-500">*</span></label>
                        <input type="text" value={values.personal.firstName} onChange={(e) => handleUpdate('personal', 'firstName', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter your first name..." required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last name <span className="text-red-500">*</span></label>
                        <input type="text" value={values.personal.lastName} onChange={(e) => handleUpdate('personal', 'lastName', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter your last name..." required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                        <input type="email" value={values.personal.email} onChange={(e) => handleUpdate('personal', 'email', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter your email..." required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                        <div className="flex">
                            <select value={values.personal.phoneCode} onChange={(e) => handleUpdate('personal', 'phoneCode', e.target.value, setValuesWithPrev)} className="w-20 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 focus:ring-purple-500 focus:border-purple-500">
                                <option>+92</option><option>+1</option><option>+44</option>
                            </select>
                            <input type="text" value={values.personal.phone} onChange={(e) => handleUpdate('personal', 'phone', e.target.value, setValuesWithPrev)} className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter your phone..." required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                        <input type="text" value={values.personal.linkedin} onChange={(e) => handleUpdate('personal', 'linkedin', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter your LinkedIn URL..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">X/Twitter URL</label>
                        <input type="text" value={values.personal.twitter} onChange={(e) => handleUpdate('personal', 'twitter', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter your X/Twitter URL..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                        <input type="text" value={values.personal.website} onChange={(e) => handleUpdate('personal', 'website', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter your Website URL..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                        <input type="text" value={values.personal.github} onChange={(e) => handleUpdate('personal', 'github', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter your GitHub URL..." />
                    </div>
                </div>
            </div>
            </>)}

            {/* Step 1: Residency */}
            {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Residency</h4>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                            <input type="text" value={values.residency.street} onChange={(e) => handleUpdate('residency', 'street', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Street" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Building No</label>
                            <input type="text" value={values.residency.buildingNo} onChange={(e) => handleUpdate('residency', 'buildingNo', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Building No" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apartment No</label>
                            <input type="text" value={values.residency.apartmentNo} onChange={(e) => handleUpdate('residency', 'apartmentNo', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Apartment No" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
                            <select value={values.residency.country} required onChange={(e) => handleUpdate('residency', 'country', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500">
                                <option value="Pakistan">Pakistan</option><option value="USA">USA</option><option value="UK">UK</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                            <select value={values.residency.city} required onChange={(e) => handleUpdate('residency', 'city', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500">
                                <option value="Faisalabad">Faisalabad</option><option value="Lahore">Lahore</option><option value="Karachi">Karachi</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                            <input type="text" value={values.residency.zip} onChange={(e) => handleUpdate('residency', 'zip', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="ZIP" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">I legally authorized to work in</label>
                        <div className="border border-gray-300 rounded-md p-2 flex flex-wrap gap-2">
                            {values.residency.authorizedCountries.map((country, idx) => (
                                <span key={idx} className="inline-flex items-center bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">
                                    {country}
                                    <button type="button" onClick={() => handleUpdate('residency', 'authorizedCountries', values.residency.authorizedCountries.filter(c => c !== country), setValuesWithPrev)} className="ml-1 text-purple-600 hover:text-purple-800">×</button>
                                </span>
                            ))}
                            <input type="text" placeholder="Add country..." className="flex-1 outline-none text-sm" onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    e.preventDefault();
                                    handleUpdate('residency', 'authorizedCountries', [...values.residency.authorizedCountries, e.currentTarget.value.trim()], setValuesWithPrev);
                                    e.currentTarget.value = '';
                                }
                            }} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Will you now or in the future require sponsorship for employment visa status?</h5>
                            <div className="flex gap-4">
                                <label className="inline-flex items-center">
                                    <input type="radio" name="sponsorship" value="REQUIRED" checked={values.residency.sponsorship === 'REQUIRED'} onChange={(e) => handleUpdate('residency', 'sponsorship', e.target.value as 'REQUIRED' | 'NOT_REQUIRED', setValuesWithPrev)} className="h-4 w-4 text-purple-600 focus:ring-purple-500" />
                                    <span className="ml-2 text-sm text-gray-700">Yes</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="sponsorship" value="NOT_REQUIRED" checked={values.residency.sponsorship === 'NOT_REQUIRED'} onChange={(e) => handleUpdate('residency', 'sponsorship', e.target.value as 'REQUIRED' | 'NOT_REQUIRED', setValuesWithPrev)} className="h-4 w-4 text-purple-600 focus:ring-purple-500" />
                                    <span className="ml-2 text-sm text-gray-700">No</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Are you willing to relocate</h5>
                            <div className="flex gap-4">
                                <label className="inline-flex items-center">
                                    <input type="radio" name="relocate" value="YES" checked={values.residency.relocate === 'YES'} onChange={(e) => handleUpdate('residency', 'relocate', e.target.value as 'YES' | 'NO', setValuesWithPrev)} className="h-4 w-4 text-purple-600 focus:ring-purple-500" />
                                    <span className="ml-2 text-sm text-gray-700">Yes</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="relocate" value="NO" checked={values.residency.relocate === 'NO'} onChange={(e) => handleUpdate('residency', 'relocate', e.target.value as 'YES' | 'NO', setValuesWithPrev)} className="h-4 w-4 text-purple-600 focus:ring-purple-500" />
                                    <span className="ml-2 text-sm text-gray-700">No</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Step 2: Working Experience */}
            {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Working Experience</h4>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total year(s) of experience <span className="text-red-500">*</span></label>
                        <select value={values.experience.totalExperience} onChange={(e) => handleUpdate('experience', 'totalExperience', e.target.value, setValuesWithPrev)} className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500">
                            {Array.from({ length: 31 }, (_, i) => (<option key={i} value={String(i)}>{i}</option>))}
                        </select>
                    </div>
                    {values.experience.experiences.length > 0 && (
                        <div className="space-y-3">
                            {values.experience.experiences.map((exp, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:shadow-sm transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h5 className="font-semibold text-gray-900">{exp.title}</h5>
                                            <p className="text-sm text-gray-600">{exp.company}</p>
                                            <p className="text-xs text-gray-500 mt-1">{exp.fromMonth} {exp.fromYear} – {exp.currentlyWorking ? 'Present' : `${exp.toMonth} ${exp.toYear}`}</p>
                                            {exp.description && <p className="text-sm text-gray-600 mt-2">{exp.description}</p>}
                                        </div>
                                        <div className="flex space-x-2 text-sm shrink-0 ml-4">
                                            <button type="button" onClick={() => editExperience(idx, values)} className="text-purple-600 hover:text-purple-800 hover:underline">Edit</button>
                                            <button type="button" onClick={() => deleteExperience(idx, setValuesWithPrev)} className="text-red-500 hover:text-red-700 hover:underline">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                        {/* Add/Edit experience form */}
                        {isAddingExperience ? (
                            <div className="border border-purple-200 rounded-lg p-5 bg-purple-50/30">
                                <h5 className="text-md font-semibold text-gray-900 mb-4">{editingExperienceIndex !== null ? 'Edit Experience' : 'Add Experience'}</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={experienceForm.title}
                                            onChange={(e) => setExperienceForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="e.g. Software Engineer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={experienceForm.company}
                                            onChange={(e) => setExperienceForm(prev => ({ ...prev, company: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="e.g. Google"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">From Month <span className="text-red-500">*</span></label>
                                        <select
                                            value={experienceForm.fromMonth}
                                            onChange={(e) => setExperienceForm(prev => ({ ...prev, fromMonth: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option value="">Select month...</option>
                                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">From Year <span className="text-red-500">*</span></label>
                                        <select
                                            value={experienceForm.fromYear}
                                            onChange={(e) => setExperienceForm(prev => ({ ...prev, fromYear: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option value="">Select year...</option>
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>

                                    {!experienceForm.currentlyWorking && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">To Month <span className="text-red-500">*</span></label>
                                                <select
                                                    value={experienceForm.toMonth}
                                                    onChange={(e) => setExperienceForm(prev => ({ ...prev, toMonth: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                                >
                                                    <option value="">Select month...</option>
                                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">To Year <span className="text-red-500">*</span></label>
                                                <select
                                                    value={experienceForm.toYear}
                                                    onChange={(e) => setExperienceForm(prev => ({ ...prev, toYear: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                                >
                                                    <option value="">Select year...</option>
                                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="mt-3">
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={experienceForm.currentlyWorking}
                                            onChange={(e) => setExperienceForm(prev => ({ ...prev, currentlyWorking: e.target.checked, toMonth: '', toYear: '' }))}
                                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">I currently work here</span>
                                    </label>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={experienceForm.description}
                                        onChange={(e) => setExperienceForm(prev => ({ ...prev, description: e.target.value }))}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Describe your responsibilities and achievements..."
                                    />
                                </div>

                                <div className="mt-4 flex justify-end gap-3">
                                    <button type="button" onClick={resetExperienceForm} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
                                    <button type="button" onClick={() => saveAndAddMoreExperience(setValuesWithPrev)} disabled={savingSection === 'experience'} className="px-4 py-2 border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2">
                                        {savingSection === 'experience' && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {savingSection === 'experience' ? 'Saving…' : 'Save & Add More'}
                                    </button>
                                    <button type="button" onClick={() => saveExperience(setValuesWithPrev)} disabled={savingSection === 'experience'} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2">
                                        {savingSection === 'experience' && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {savingSection === 'experience' ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={values.experience.experiences.length === 0 ? 'text-center py-8' : ''}>
                                {values.experience.experiences.length === 0 && (
                                    <>
                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <h4 className="mt-2 text-lg font-medium text-gray-900">Add your roles</h4>
                                        <p className="text-sm text-gray-500 mb-4">Add your past and current roles to enhance your profile.</p>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsAddingExperience(true)}
                                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                    Add Experience
                                </button>
                            </div>
                        )}
                </div>
            </div>
            )}

            {/* Step 3: Education */}
            {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Education</h4>
                <div className="space-y-4">
                    {values.education.education.length > 0 && (
                        <div className="space-y-3">
                            {values.education.education.map((edu, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:shadow-sm transition-shadow">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h5 className="font-semibold text-gray-900">{edu.degree}</h5>
                                            <p className="text-sm text-gray-600">{edu.school}</p>
                                            <p className="text-xs text-gray-500 mt-1">{edu.fromMonth} {edu.fromYear} – {edu.isCurrentlyStudying ? 'Present' : `${edu.toMonth} ${edu.toYear}`}</p>
                                            {edu.fieldOfStudy && <p className="text-sm text-gray-600 mt-2">Field of Study: {edu.fieldOfStudy}</p>}
                                            {edu.description && <p className="text-sm text-gray-600 mt-2">{edu.description}</p>}
                                        </div>
                                        <div className="flex space-x-2 text-sm shrink-0 ml-4">
                                            <button type="button" onClick={() => editEducation(idx, values)} className="text-purple-600 hover:text-purple-800 hover:underline">Edit</button>
                                            <button type="button" onClick={() => deleteEducation(idx, setValuesWithPrev)} className="text-red-500 hover:text-red-700 hover:underline">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add/Edit education form */}
                    {isAddingEducation ? (
                        <div className="border border-purple-200 rounded-lg p-5 bg-purple-50/30">
                            <h5 className="text-md font-semibold text-gray-900 mb-4">{editingEducationIndex !== null ? 'Edit Education' : 'Add Education'}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">School/University <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={educationForm.school}
                                        onChange={(e) => setEducationForm(prev => ({ ...prev, school: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="e.g. Harvard University"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Degree <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={educationForm.degree}
                                        onChange={(e) => setEducationForm(prev => ({ ...prev, degree: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="e.g. Bachelor of Science"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                                    <input
                                        type="text"
                                        value={educationForm.fieldOfStudy}
                                        onChange={(e) => setEducationForm(prev => ({ ...prev, fieldOfStudy: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="e.g. Computer Science"
                                    />
                                </div>
                                <div className="hidden md:block"></div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From Month <span className="text-red-500">*</span></label>
                                    <select
                                        value={educationForm.fromMonth}
                                        onChange={(e) => setEducationForm(prev => ({ ...prev, fromMonth: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="">Select month...</option>
                                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From Year <span className="text-red-500">*</span></label>
                                    <select
                                        value={educationForm.fromYear}
                                        onChange={(e) => setEducationForm(prev => ({ ...prev, fromYear: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="">Select year...</option>
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>

                                {!educationForm.isCurrentlyStudying && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">To Month <span className="text-red-500">*</span></label>
                                            <select
                                                value={educationForm.toMonth}
                                                onChange={(e) => setEducationForm(prev => ({ ...prev, toMonth: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            >
                                                <option value="">Select month...</option>
                                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">To Year <span className="text-red-500">*</span></label>
                                            <select
                                                value={educationForm.toYear}
                                                onChange={(e) => setEducationForm(prev => ({ ...prev, toYear: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            >
                                                <option value="">Select year...</option>
                                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-3">
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={educationForm.isCurrentlyStudying}
                                        onChange={(e) => setEducationForm(prev => ({ ...prev, isCurrentlyStudying: e.target.checked, toMonth: '', toYear: '' }))}
                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">I am currently studying here</span>
                                </label>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={educationForm.description}
                                    onChange={(e) => setEducationForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="Describe your achievements, societies, or notable coursework..."
                                />
                            </div>

                            <div className="mt-4 flex justify-end gap-3">
                                <button type="button" onClick={resetEducationForm} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="button" onClick={() => saveAndAddMoreEducation(setValuesWithPrev)} disabled={savingSection === 'education'} className="px-4 py-2 border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2">
                                    {savingSection === 'education' && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {savingSection === 'education' ? 'Saving…' : 'Save & Add More'}
                                </button>
                                <button type="button" onClick={() => saveEducation(setValuesWithPrev)} disabled={savingSection === 'education'} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2">
                                    {savingSection === 'education' && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {savingSection === 'education' ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={values.education.education.length === 0 ? 'text-center py-8' : ''}>
                            {values.education.education.length === 0 && (
                                <>
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                    </svg>
                                    <h4 className="mt-2 text-lg font-medium text-gray-900">Add your education</h4>
                                    <p className="text-sm text-gray-500 mb-4">Add your academic background to complete your profile.</p>
                                </>
                            )}
                            <button type="button" onClick={() => setIsAddingEducation(true)} className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Add Education {values.education.education.length > 0 ? 'Another' : ''}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Step 4: Skills & Languages */}
            {currentStep === 4 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Skills & Languages</h4>
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Languages</h5>
                        {values.skillAndLanguages.languages.map((lang, idx) => (
                            <div key={idx} className="flex items-start gap-4 border-b pb-4 last:border-0 border-gray-100">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                                    <select value={lang.language} onChange={(e) => updateLanguage(idx, 'language', e.target.value, values, setValuesWithPrev)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500">
                                        <option>Urdu</option><option>English</option><option>Punjabi</option><option>Arabic</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Proficiency</label>
                                    <select value={lang.proficiency} onChange={(e) => updateLanguage(idx, 'proficiency', e.target.value, values, setValuesWithPrev)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500">
                                        <option value="">Select...</option><option>Beginner</option><option>Intermediate</option><option>Fluent</option><option>Native</option>
                                    </select>
                                </div>
                                <button type="button" onClick={() => removeLanguage(idx, setValuesWithPrev)} className="mt-8 text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50" title="Remove Language">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ))}
                        <div className="flex justify-end">
                            <button type="button" onClick={() => addLanguage(setValuesWithPrev)} className="text-purple-600 hover:text-purple-800 text-sm font-medium inline-flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add more languages
                            </button>
                        </div>
                    </div>
                    <hr className="border-gray-100" />
                    <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Skills</h5>
                        <p className="text-xs text-gray-500 mb-3">Add skills that highlight your expertise (Maximum 100)</p>
                        <div className="border border-gray-300 rounded-md p-2 mb-2">
                            <div className="flex flex-wrap gap-2">
                                {values.skillAndLanguages.skills.map((skill, idx) => (
                                    <span key={idx} className="inline-flex items-center bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">
                                        {skill.name}
                                        <button type="button" onClick={() => removeSkill(skill.name, setValuesWithPrev)} className="ml-1 text-purple-600 hover:text-purple-800">×</button>
                                    </span>
                                ))}
                                <input type="text" placeholder="Add skill..." className="flex-1 outline-none text-sm min-w-[120px]" onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                        e.preventDefault();
                                        addSkill(e.currentTarget.value.trim(), values, setValuesWithPrev);
                                        e.currentTarget.value = '';
                                    }
                                }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Step 5: General */}
            {currentStep === 5 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">General</h4>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected annual salary</label>
                        <div className="flex">
                            <select value={values.general.expectedSalaryCurrency} onChange={(e) => handleUpdate('general', 'expectedSalaryCurrency', e.target.value, setValuesWithPrev)} className="w-20 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 focus:ring-purple-500 focus:border-purple-500">
                                <option>USD</option><option>EUR</option><option>GBP</option><option>PKR</option>
                            </select>
                            <input type="number" value={values.general.expectedSalary} onChange={(e) => handleUpdate('general', 'expectedSalary', e.target.value ? parseInt(e.target.value) : '', setValuesWithPrev)} className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter salary" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current annual salary</label>
                        <div className="flex">
                            <select value={values.general.currentSalaryCurrency} onChange={(e) => handleUpdate('general', 'currentSalaryCurrency', e.target.value, setValuesWithPrev)} className="w-20 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 focus:ring-purple-500 focus:border-purple-500">
                                <option>USD</option><option>EUR</option><option>GBP</option><option>PKR</option>
                            </select>
                            <input type="number" value={values.general.currentSalary} onChange={(e) => handleUpdate('general', 'currentSalary', e.target.value ? parseInt(e.target.value) : '', setValuesWithPrev)} className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter salary" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notice period (days)</label>
                        <input type="number" value={values.general.noticePeriod} onChange={(e) => handleUpdate('general', 'noticePeriod', e.target.value ? parseInt(e.target.value) : '', setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter notice period" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected date to start</label>
                        <input type="date" value={values.general.startDate ? values.general.startDate.toISOString().split('T')[0] : ''} onChange={(e) => handleUpdate('general', 'startDate', e.target.value ? new Date(e.target.value) : null, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Race/ethnicity</label>
                        <select value={values.general.race} required onChange={(e) => handleUpdate('general', 'race', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500">
                            <option value="">Select...</option><option>Asian</option><option>Black</option><option>Hispanic</option><option>White</option><option>Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Disability</label>
                        <select value={values.general.disability} required onChange={(e) => handleUpdate('general', 'disability', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500">
                            <option value="">Select...</option><option>Yes</option><option>No</option><option>Prefer not to say</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Veteran status</label>
                        <select value={values.general.veteran} required onChange={(e) => handleUpdate('general', 'veteran', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500">
                            <option value="">Select...</option><option>Veteran</option><option>Not a veteran</option><option>Prefer not to say</option>
                        </select>
                    </div>
                </div>
            </div>
            )}

            {/* Step 6: Achievements */}
            {currentStep === 6 && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h4>
                <textarea required rows={6} value={values.achievements.achievements} onChange={(e) => handleUpdate('achievements', 'achievements', e.target.value, setValuesWithPrev)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" placeholder="Enter your achievements or let AI generate them for you..." />
            </div>
            )}

            {/* Step 7: Documents (Certificates + Recommendation Letters) */}
            {currentStep === 7 && (
            <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Courses & certificates</h4>
                    <button type="button" disabled={uploadingDocument === 'certificate'} onClick={async () => {
                        if (!values.certificates || values.certificates.length === 0) {
                            toast({ title: "No file selected", description: "Please select a certificate to upload.", variant: "destructive" });
                            return;
                        }
                        setUploadingDocument('certificate');
                        try {
                            const fd = new FormData();
                            fd.append('file', values.certificates[0]);
                            await apiRequest('POST', `/api/profile/documentupdate/${id}?documentType=certificate`, fd);
                            toast({ title: "Success", description: "Certificate uploaded successfully." });
                        } catch (err) {
                            toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Could not upload certificate.", variant: "destructive" });
                        } finally {
                            setUploadingDocument(null);
                        }
                    }} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2">
                        {uploadingDocument === 'certificate' && <Loader2 className="w-4 h-4 animate-spin" />}
                        {uploadingDocument === 'certificate' ? 'Uploading…' : 'Upload Certificate'}
                    </button>
                </div>
                <div onClick={() => handleBrowseClick(certificatesFileRef)} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                    <div className="flex flex-col items-center space-y-2">
                        <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                        {values.certificates && values.certificates.length > 0 ? <h5 className="text-md font-medium text-purple-600">{values.certificates.length} file(s) selected</h5> : <h5 className="text-md font-medium text-gray-900">Drag–n–Drop certificates here</h5>}
                        <div className="flex items-center gap-2 text-sm text-gray-500"><span className="w-12 h-px bg-gray-300"></span><span>or</span><span className="w-12 h-px bg-gray-300"></span></div>
                        <span className="text-purple-600 font-medium">Browse</span>
                        <p className="text-xs text-gray-500">(File types: pdf, doc, docx, jpg, png)</p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple ref={certificatesFileRef} onChange={(e) => handleFileChange(e, 'certificates', setValues)} />
                </div>
                {values.certificates && values.certificates.length > 0 && (
                    <div className="mt-4 space-y-2">
{Array.from(values.certificates).map((file: File, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-purple-600 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    <span className="text-sm text-gray-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); removeFile('certificates', index, setValuesWithPrev); }} className="ml-2 text-gray-400 hover:text-red-600 transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recommendation Letters (Step 7) */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-gray-900">Recommendation letters</h4>
                    <button type="button" disabled={uploadingDocument === 'recommendation'} onClick={async () => {
                        if (!values.recommendationLetters || values.recommendationLetters.length === 0) {
                            toast({ title: "No file selected", description: "Please select a recommendation letter to upload.", variant: "destructive" });
                            return;
                        }
                        setUploadingDocument('recommendation');
                        try {
                            const fd = new FormData();
                            fd.append('file', values.recommendationLetters[0]);
                            await apiRequest('POST', `/api/profile/documentupdate/${id}?documentType=recommendation_letter`, fd);
                            toast({ title: "Success", description: "Recommendation letter uploaded successfully." });
                        } catch (err) {
                            toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Could not upload letter.", variant: "destructive" });
                        } finally {
                            setUploadingDocument(null);
                        }
                    }} className="px-4 py-2 mb-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2">
                        {uploadingDocument === 'recommendation' && <Loader2 className="w-4 h-4 animate-spin" />}
                        {uploadingDocument === 'recommendation' ? 'Uploading…' : 'Upload Letter'}
                    </button>
                </div>
                <div onClick={() => handleBrowseClick(recommendationFileRef)} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                    <div className="flex flex-col items-center space-y-2">
                        <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                        {values.recommendationLetters && values.recommendationLetters.length > 0 ? <h5 className="text-md font-medium text-purple-600">{values.recommendationLetters.length} file(s) selected</h5> : <h5 className="text-md font-medium text-gray-900">Drag–n–Drop recommendation letter here</h5>}
                        <div className="flex items-center gap-2 text-sm text-gray-500"><span className="w-12 h-px bg-gray-300"></span><span>or</span><span className="w-12 h-px bg-gray-300"></span></div>
                        <span className="text-purple-600 font-medium">Browse</span>
                        <p className="text-xs text-gray-500">(File types: pdf, doc, docx, txt, rtf)</p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.rtf" multiple ref={recommendationFileRef} onChange={(e) => handleFileChange(e, 'recommendationLetters', setValues)} />
                </div>
                {values.recommendationLetters && values.recommendationLetters.length > 0 && (
                    <div className="mt-4 space-y-2">
{Array.from(values.recommendationLetters).map((file: File, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-purple-600 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                                    <span className="text-sm text-gray-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); removeFile('recommendationLetters', index, setValuesWithPrev); }} className="ml-2 text-gray-400 hover:text-red-600 transition-colors">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            </>
            )}

            {/* Back / Save & Next — Back only from step 2 onward */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                {currentStep >= 1 ? (
                    <button type="button" onClick={() => setCurrentStep(s => Math.max(0, s - 1))} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                        Back
                    </button>
                ) : (
                    <div />
                )}
                <button type="button" onClick={handleSaveAndNext} disabled={!!savingSection} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2">
                    {savingSection ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {currentStep < TOTAL_STEPS - 1 ? (savingSection ? 'Saving…' : 'Save & Next') : (savingSection ? 'Saving…' : 'Finish')}
                </button>
            </div>
        </div>
                );
            }}
        </Formik>
    );
};

export default AutoJobApply;