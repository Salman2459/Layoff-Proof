import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { hasActiveSubscription } from '@/lib/subscription';
import {
    User, Briefcase, FileText, MapPin, GraduationCap,
    Code2, Globe, ChevronRight, Linkedin, Search, CheckCircle2,
    Clock, AlertTriangle, Bot, Settings, Phone, Mail, Award,
    X, Calendar, AlertCircle, Building2, Rocket, DownloadCloud, ExternalLink
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types — matches userJobProfiles schema exactly
// ─────────────────────────────────────────────────────────────────────────────
interface SkillItem { name: string; }
interface LangItem { language: string; proficiency: string; }
interface ExperienceItem {
    company: string; title: string;
    fromMonth: string; fromYear: string;
    toMonth: string; toYear: string;
    currentlyWorking: boolean; description: string;
}
interface EducationItem {
    school: string; degree: string; fieldOfStudy: string;
    fromMonth: string; fromYear: string;
    toMonth: string; toYear: string;
    isCurrentlyStudying: boolean; description: string;
}

interface ProfileData {
    id?: string;
    userId?: string;
    // Personal
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    phoneCode?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
    github?: string;
    // Residency
    street?: string;
    buildingNo?: string;
    apartmentNo?: string;
    country?: string;
    city?: string;
    zip?: string;
    authorizedCountries?: string[];
    sponsorship?: string;
    relocate?: string;
    // Experience & Skills
    totalExperience?: string;
    experiences?: ExperienceItem[];
    skills?: SkillItem[];
    languages?: LangItem[];
    // Education
    education?: EducationItem[];
    // General Preferences
    expectedSalary?: number | string;
    expectedSalaryCurrency?: string;
    currentSalary?: number | string;
    currentSalaryCurrency?: string;
    noticePeriod?: number | string;
    race?: string;
    disability?: string;
    veteran?: string;
    // Documents
    achievements?: string;
    certificates?: string;
    recommendationLetter?: string;
    resume?: string;
    // Meta
    profileCompletion?: number;
    createdAt?: string;
    updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function calcProgress(p: ProfileData | null | undefined): number {
    if (!p) return 0;
    let score = 0;
    if (p.firstName && p.lastName && p.email && p.phone) score += 20;
    else if (p.firstName || p.lastName || p.email || p.phone) score += 10;
    if (p.country && p.city) score += 10;
    else if (p.country || p.city) score += 5;
    if (p.experiences && p.experiences.length > 0) score += 15;
    if (p.education && p.education.length > 0) score += 15;
    const hasSkills = (p.skills?.length ?? 0) >= 3;
    const hasLang = (p.languages?.length ?? 0) > 0;
    if (hasSkills && hasLang) score += 15;
    else if (hasSkills || hasLang) score += 7;
    if (p.resume) score += 10;
    if (p.recommendationLetter) score += 5;
    if (p.certificates) score += 5;
    if (p.achievements) score += 5;
    if (p.expectedSalary && p.noticePeriod) score += 10;
    else if (p.expectedSalary || p.noticePeriod) score += 5;
    return Math.min(100, score);
}

function scoreColor(n: number) {
    if (n < 40) return { text: 'text-red-500', bg: 'bg-red-500' };
    if (n <= 70) return { text: 'text-amber-500', bg: 'bg-amber-500' };
    return { text: 'text-green-600', bg: 'bg-green-500' };
}

function scoreLabel(n: number) {
    if (n === 0) return 'Start building your profile to get started';
    if (n < 40) return 'Just getting started — keep going!';
    if (n <= 70) return 'Good progress – fill in the remaining sections';
    if (n < 100) return "Almost complete — you're nearly there!";
    return '🎉 Your profile is complete and ready!';
}

// ─────────────────────────────────────────────────────────────────────────────
// Section checklist row
// ─────────────────────────────────────────────────────────────────────────────
function SectionRow({ icon: Icon, label, done }: { icon: any; label: string; done: boolean }) {
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${done ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
            <div className={`p-1.5 rounded-md ${done ? 'bg-green-100' : 'bg-white border border-gray-200'}`}>
                <Icon className={`w-4 h-4 ${done ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <span className={`text-sm font-medium flex-1 ${done ? 'text-green-800' : 'text-gray-600'}`}>{label}</span>
            {done
                ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                : <AlertTriangle className="w-4 h-4 text-amber-400" />
            }
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform card
// ─────────────────────────────────────────────────────────────────────────────
interface PlatformCardProps {
    name: string;
    icon: React.ReactNode;
    description: string;
    gradient: string;
    badgeColor: string;
    status: 'available' | 'coming_soon';
    features: string[];
    onLaunch?: (platformName: string) => void; // Optional prop for launch handler
}

function PlatformCard({ name, icon, description, gradient, badgeColor, status, features, onLaunch }: PlatformCardProps) {
    const isAvailable = status === 'available';
    return (
        <div className={`relative bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 ${isAvailable ? 'cursor-pointer hover:-translate-y-1' : 'opacity-80'}`}>
            <div className={`h-2 w-full ${gradient}`} />
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${gradient}`}>{icon}</div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}>
                        {isAvailable ? 'Available' : 'Coming Soon'}
                    </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{name}</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{description}</p>
                <ul className="space-y-2 mb-6">
                    {features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            {f}
                        </li>
                    ))}
                </ul>
                {isAvailable ? (
                    <button
                        onClick={() => onLaunch?.(name)} // Safe call to optional onLaunch
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold ${gradient} hover:opacity-90 transition-opacity`}
                    >
                        Launch <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed">
                        <Clock className="w-4 h-4" /> Coming Soon
                    </button>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// LaunchFilterModal Component (New)
// ─────────────────────────────────────────────────────────────────────────────
interface LaunchFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: (filters: any) => void;
    platformName: string | null;
}

function LaunchFilterModal({ isOpen, onClose, onProceed, platformName }: LaunchFilterModalProps) {
    const [jobTitle, setJobTitle] = React.useState('');
    const [location, setLocation] = React.useState('');
    const [salaryMin, setSalaryMin] = React.useState('');
    const [jobType, setJobType] = React.useState('full-time');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onProceed({ jobTitle, location, salaryMin, jobType });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Premium Backdrop with Blur */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/20">
                <div className="bg-gradient-to-r from-purple-700 to-indigo-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Bot className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold">Launch {platformName}</h3>
                    </div>
                    <p className="text-purple-100 text-xs">Set your preferences for this auto-apply session.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-4">
                        {['Monster', 'Indeed', 'Wellfound'].includes(platformName || '') ? (
                            <div className="py-4 space-y-4">
                                <div className="flex flex-col items-center text-center space-y-3 bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-1">
                                        <Search className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="font-bold text-gray-900">Manual Search Instructions</h4>
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            On the platform <span className="font-extrabold text-indigo-700">{platformName}</span> please search on it manually.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-800 leading-normal">
                                        <strong>Pro Tip:</strong> Open the {platformName} search results page you want to target, then click proceed.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label htmlFor="jobTitle" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Job Title / Keywords</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            id="jobTitle"
                                            value={jobTitle}
                                            onChange={(e) => setJobTitle(e.target.value)}
                                            placeholder="e.g., Software Engineer"
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="location" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            id="location"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder="City / Country"
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] px-4 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-purple-200 text-sm flex items-center justify-center gap-2"
                        >
                            Proceed to Apply <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// InstallExtensionModal Component
// ─────────────────────────────────────────────────────────────────────────────
interface InstallExtensionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function InstallExtensionModal({ isOpen, onClose }: InstallExtensionModalProps) {
    if (!isOpen) return null;

    const EXTENSION_URL = "https://chromewebstore.google.com/detail/pjjgjmpddhcimgndknogclblnfceoajb?utm_source=item-share-cb";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 p-8 text-white text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm border border-white/10">
                        <DownloadCloud className="w-10 h-10 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold mb-2">Extension Required</h3>
                    <p className="text-purple-100 text-sm leading-relaxed">
                        To use the AI Auto-Apply features, you need to install our browser extension.
                    </p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 font-bold text-indigo-600 text-sm">1</div>
                            <p className="text-sm text-gray-600 leading-snug">Click the button below to go to the Chrome WebStore.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 font-bold text-indigo-600 text-sm">2</div>
                            <p className="text-sm text-gray-600 leading-snug">Click <strong>"Add to Chrome"</strong> and follow the prompts.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 font-bold text-indigo-600 text-sm">3</div>
                            <p className="text-sm text-gray-600 leading-snug">Refresh this page to start applying!</p>
                        </div>
                    </div>

                    <a
                        href={EXTENSION_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 group"
                    >
                        Install Extension
                        <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>

                    <button
                        onClick={onClose}
                        className="w-full text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────


export default function AutoJobApplyDashboard() {
    const { user } = useAuth();
    const id = (user as any)?.id;
    const { toast } = useToast();
    const [hasSubscription, setHasSubscription] = useState<boolean>(false)





    // Extension Installation Check
    const [isExtensionInstalled, setIsExtensionInstalled] = React.useState<boolean | null>(null);
    const checkExtensionInstalled = React.useCallback(() => {
        return new Promise<boolean>((resolve) => {
            const extensionId = "pjjgjmpddhcimgndknogclblnfceoajb";
            if (typeof window === "undefined") {
                setIsExtensionInstalled(false);
                resolve(false);
                return;
            }

            // Best-practice for web pages: handshake with the extension content script via postMessage.
            // (chrome.runtime.sendMessage is not reliably available from normal web pages.)
            const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const timeoutMs = 900;

            const onMessage = (event: MessageEvent) => {
                if (event.source !== window) return;
                const data = event.data;
                if (!data || typeof data !== "object") return;
                if (data?.source !== "LP_EXTENSION") return;
                if (data?.type !== "PONG") return;
                if (data?.nonce !== nonce) return;

                window.removeEventListener("message", onMessage);
                clearTimeout(timer);
                setIsExtensionInstalled(true);
                resolve(true);
            };

            const timer = window.setTimeout(() => {
                window.removeEventListener("message", onMessage);

                // Fallback: only try chrome.runtime if it's truly available.
                const sendMessage = (window as any)?.chrome?.runtime?.sendMessage;
                if (typeof sendMessage !== "function") {
                    setIsExtensionInstalled(false);
                    resolve(false);
                    return;
                }

                try {
                    sendMessage(extensionId, { action: "PING" }, () => {
                        const lastError = (window as any)?.chrome?.runtime?.lastError;
                        if (lastError) {
                            setIsExtensionInstalled(false);
                            resolve(false);
                        } else {
                            setIsExtensionInstalled(true);
                            resolve(true);
                        }
                    });
                } catch {
                    setIsExtensionInstalled(false);
                    resolve(false);
                }
            }, timeoutMs);

            window.addEventListener("message", onMessage);
            window.postMessage(
                { source: "LP_WEBAPP", type: "PING", nonce, extensionId },
                window.location.origin,
            );
        });
    }, []);

    // Fetch full job profile from DB — /api/profile/jobprofile/:id (queries by userId)
    const { data: profileData, isLoading } = useQuery<ProfileData | null>({
        queryKey: ['userJobProfile', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await fetch(`/api/profile/jobprofile/${id}`);
            const json = await res.json();
            // json.data contains the full userJobProfiles row
            const fetchedData = json.data ?? null;
            console.log("user data fetched:", fetchedData);
            return fetchedData;
        },
        enabled: !!id,
    });

    const [selectedPlatform, setSelectedPlatform] = React.useState<string | null>(null);
    const [isLaunchModalOpen, setIsLaunchModalOpen] = React.useState(false);
    const [isInstallModalOpen, setIsInstallModalOpen] = React.useState(false);

    const handleLaunch = async (platform: string) => {
        const isInstalled = await checkExtensionInstalled();

        if (!isInstalled) {
            setIsInstallModalOpen(true);
            return;
        }
        if (!hasActiveSubscription(user)) {
            toast({
                title: "Subscription Required",
                description: "Please upgrade to access this tool.",
                variant: "destructive"
            });
            window.location.href = '/pricing';
            return;
        }

        setHasSubscription(true);
        setSelectedPlatform(platform);
        setIsLaunchModalOpen(true);
    };

    const handleProceedLaunch = async (filters: any) => {
        console.log(`Launching ${selectedPlatform} with filters:`, filters);

        // Send message to extension
        const extensionId = "pjjgjmpddhcimgndknogclblnfceoajb";
        // @ts-ignore
        if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
            try {
                // @ts-ignore
                window.chrome.runtime.sendMessage(
                    extensionId,
                    {
                        action: "START_AUTO_APPLY",
                        platform: selectedPlatform,
                        filters: filters,
                        userId: id,
                        subscription: hasSubscription
                    },
                    (response: any) => {
                        console.log("Extension response:", response);
                    }
                );
            } catch (e) {
                console.error("Failed to send message to extension:", e);
            }
        }

        setIsLaunchModalOpen(false);
        // Toast to show it's proceeding
        toast({
            title: `Starting ${selectedPlatform} Apply`,
            description: "AI engine is starting with your selected filters.",
        });
    };

    const completion = useMemo(() => calcProgress(profileData), [profileData]);
    const colors = scoreColor(completion);

    const fullName = [profileData?.firstName, profileData?.lastName].filter(Boolean).join(' ') || 'Not set';
    const location = [profileData?.city, profileData?.country].filter(Boolean).join(', ') || 'Not set';

    const sections = [
        { icon: User, label: 'Personal Details', done: !!(profileData?.firstName && profileData?.email && profileData?.phone) },
        { icon: MapPin, label: 'Residency Info', done: !!(profileData?.country && profileData?.city) },
        { icon: Briefcase, label: 'Work Experience', done: !!(profileData?.experiences && profileData.experiences.length > 0) },
        { icon: GraduationCap, label: 'Education', done: !!(profileData?.education && profileData.education.length > 0) },
        { icon: Code2, label: 'Skills & Languages', done: !!(profileData?.skills && profileData.skills.length >= 3) },
        { icon: FileText, label: 'Resume Uploaded', done: !!profileData?.resume },
        { icon: Award, label: 'Certifications', done: !!profileData?.certificates },
        { icon: Mail, label: 'Recommendation Letter', done: !!profileData?.recommendationLetter },
        { icon: Award, label: 'Achievements', done: !!profileData?.achievements },
        { icon: Globe, label: 'General Preferences', done: !!(profileData?.expectedSalary || profileData?.noticePeriod) },
    ];

    const platforms: PlatformCardProps[] = [
        {
            name: 'LinkedIn',
            icon: <Linkedin className="w-6 h-6 text-white" />,
            description: 'Automatically apply to LinkedIn Easy Apply jobs that match your profile and preferences.',
            gradient: 'bg-gradient-to-r from-blue-600 to-blue-500',
            badgeColor: 'bg-blue-100 text-blue-700',
            status: 'available',
            features: ['Smart job matching with your profile', 'Auto-fills all Easy Apply forms', 'Skips jobs below your salary range', 'Human-like typing & behavior'],
        },
        {
            name: 'Glassdoor',
            icon: <Building2 className="w-6 h-6 text-white" />,
            description: 'Apply on Glassdoor with AI that uses your profile to complete applications consistently.',
            gradient: 'bg-gradient-to-r from-emerald-600 to-teal-500',
            badgeColor: 'bg-emerald-100 text-emerald-700',
            status: 'available',
            features: ['Profile-based job targeting', 'Auto-fills application fields', 'Smart question handling', 'Application tracking'],
        },
        {
            name: 'Wellfound',
            icon: <Rocket className="w-6 h-6 text-white" />,
            description: 'Apply to startup roles on Wellfound faster with AI-powered auto-apply.',
            gradient: 'bg-gradient-to-r from-violet-600 to-fuchsia-500',
            badgeColor: 'bg-violet-100 text-violet-700',
            status: 'available',
            features: ['Startup-focused role matching', 'Auto-fills startup application forms', 'Keeps your profile consistent', 'Fast multi-apply sessions'],
        },
        {
            name: 'Monster',
            icon: <Briefcase className="w-6 h-6 text-white" />,
            description: 'Let AI handle Monster applications end-to-end while you focus on interview prep.',
            gradient: 'bg-gradient-to-r from-orange-600 to-amber-500',
            badgeColor: 'bg-orange-100 text-orange-700',
            status: 'available',
            features: ['Quick apply flows', 'Form autofill + validation', 'Resume-aware field mapping', 'Application tracking'],
        },
        {
            name: 'Indeed',
            icon: <Search className="w-6 h-6 text-white" />,
            description: 'Soon: apply to Indeed listings with the same AI auto-apply engine and your saved job profile.',
            gradient: 'bg-gradient-to-r from-sky-800 to-blue-700',
            badgeColor: 'bg-sky-100 text-sky-800',
            status: 'coming_soon',
            features: [
                'Indeed job search & match to your profile',
                'Planned: one-click and quick-apply flows',
                'Consistent answers from your saved data',
                'Application activity in one place',
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Bot className="w-5 h-5 opacity-80" />
                                <span className="text-sm font-medium text-purple-200">AI Auto Apply</span>
                            </div>
                            <h1 className="text-3xl font-bold">Auto Job Apply Dashboard</h1>
                            <p className="text-purple-200 mt-1 text-sm">
                                Welcome back, {profileData?.firstName || (user as any)?.email?.split('@')[0] || 'there'} 👋 — let AI handle the applications.
                            </p>
                        </div>
                        <Link href="/tools/auto-job-apply">
                            <button className="flex items-center gap-2 bg-white text-purple-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-purple-50 transition-colors text-sm">
                                <Settings className="w-4 h-4" /> Edit Profile
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* ── Profile Summary + Completion (side-by-side on large screens) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Profile Info Card — shows real DB data */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
                        {/* Avatar + name */}
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                                {profileData?.firstName?.[0]?.toUpperCase() || (user as any)?.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 text-lg leading-tight">
                                    {isLoading ? '...' : fullName}
                                </h2>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    {isLoading ? '...' : location}
                                </p>
                            </div>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                                <span className="truncate">{profileData?.email || <span className="text-gray-300 italic">Not provided</span>}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-4 h-4 text-purple-400 shrink-0" />
                                <span>
                                    {profileData?.phone
                                        ? `${profileData.phoneCode ?? ''} ${profileData.phone}`.trim()
                                        : <span className="text-gray-300 italic">Not provided</span>
                                    }
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Briefcase className="w-4 h-4 text-purple-400 shrink-0" />
                                <span>
                                    {profileData?.totalExperience
                                        ? `${profileData.totalExperience} yrs experience`
                                        : <span className="text-gray-300 italic">Experience not set</span>
                                    }
                                </span>
                            </div>
                            {profileData?.linkedin && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Linkedin className="w-4 h-4 text-purple-400 shrink-0" />
                                    <a href={profileData.linkedin} className="text-blue-600 hover:underline truncate text-xs" target="_blank" rel="noreferrer">
                                        LinkedIn Profile
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Skills — schema: [{name: string}] */}
                        {(profileData?.skills?.length ?? 0) > 0 && (
                            <div className="border-t border-gray-100 pt-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {profileData!.skills!.slice(0, 8).map((s) => (
                                        <span key={s.name} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5 font-medium">
                                            {s.name}
                                        </span>
                                    ))}
                                    {(profileData?.skills?.length ?? 0) > 8 && (
                                        <span className="text-xs text-gray-400 self-center">+{profileData!.skills!.length - 8} more</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Languages — schema: [{language: string, proficiency: string}] */}
                        {(profileData?.languages?.length ?? 0) > 0 && (
                            <div className="border-t border-gray-100 pt-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Languages</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {profileData!.languages!.map((l) => (
                                        <span key={l.language} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 font-medium">
                                            {l.language} · {l.proficiency}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Completion Card */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-lg font-bold text-gray-900">Profile Completion</h2>
                                <span className={`text-2xl font-extrabold ${colors.text}`}>
                                    {isLoading ? '...' : `${completion}%`}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">{scoreLabel(completion)}</p>
                            <Progress value={completion} className="h-3 rounded-full" />
                            <p className="text-xs text-gray-400 mt-2">A complete profile significantly increases your auto-apply success rate.</p>
                        </div>
                        <div className="p-6">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sections</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {sections.map(s => (
                                    <SectionRow key={s.label} icon={s.icon} label={s.label} done={s.done} />
                                ))}
                            </div>
                            {completion < 100 && (
                                <div className="mt-4 flex justify-end">
                                    <Link href="/tools/auto-job-apply">
                                        <button className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-semibold">
                                            Complete profile <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Quick Stats ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        {
                            label: 'Profile Score', icon: <Award className="w-5 h-5" />,
                            value: `${completion}%`, sub: 'Based on saved data', color: colors.text,
                        },
                        {
                            label: 'Resume', icon: <FileText className="w-5 h-5" />,
                            value: profileData?.resume ? '✓ Uploaded' : '✗ Missing',
                            sub: profileData?.resume ? 'Ready to apply' : 'Upload in profile',
                            color: profileData?.resume ? 'text-green-600' : 'text-red-500',
                        },
                        {
                            label: 'Skills', icon: <Code2 className="w-5 h-5" />,
                            value: `${profileData?.skills?.length ?? 0}`,
                            sub: 'Need at least 3 to score',
                            color: (profileData?.skills?.length ?? 0) >= 3 ? 'text-green-600' : 'text-amber-500',
                        },
                        {
                            label: 'Experience', icon: <Briefcase className="w-5 h-5" />,
                            value: `${profileData?.experiences?.length ?? 0}`,
                            sub: profileData?.totalExperience ? `${profileData.totalExperience} yrs total` : 'Entries added',
                            color: (profileData?.experiences?.length ?? 0) > 0 ? 'text-green-600' : 'text-gray-400',
                        },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600 shrink-0">{stat.icon}</div>
                            <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide truncate">{stat.label}</p>
                                <p className={`text-lg font-bold ${stat.color}`}>{isLoading ? '...' : stat.value}</p>
                                <p className="text-xs text-gray-400 truncate">{stat.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Platform Cards ── */}
                <div>
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Auto-Apply Platforms</h2>
                        <p className="text-sm text-gray-500 mt-1">Choose a platform and let AI apply to hundreds of jobs for you.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {platforms.map(p => (
                            <PlatformCard
                                key={p.name}
                                {...p}
                                onLaunch={handleLaunch}

                            />
                        ))}
                    </div>
                </div>

            </div>

            <LaunchFilterModal
                isOpen={isLaunchModalOpen}
                onClose={() => setIsLaunchModalOpen(false)}
                platformName={selectedPlatform}
                onProceed={handleProceedLaunch}

            />

            <InstallExtensionModal
                isOpen={isInstallModalOpen}
                onClose={() => setIsInstallModalOpen(false)}
            />
        </div>
    );
}
