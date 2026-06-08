import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { hasActiveSubscription } from '@/lib/subscription';
import {
    getJobProfileCompletion,
    getProfileCompletionColors,
    type JobProfileLike,
} from '@/lib/profileCompletion';
import { LayoffProofLayout } from '@/components/layoffproof/LayoffProofLayout';
import { LayoffProofDashboardHeader } from '@/components/layoffproof/LayoffProofDashboardHeader';
import { ProfileCompletionLayoffProof } from '@/components/layoffproof/ProfileCompletionLayoffProof';
import { AutoJobApplyHero } from '@/components/layoffproof/AutoJobApplyHero';
import { AutoJobApplySectionTile } from '@/components/layoffproof/AutoJobApplySectionTile';
import {
    User, Briefcase, FileText, MapPin, GraduationCap,
    Code2, Globe, ChevronRight, Linkedin, Search, CheckCircle2,
    Clock, Award, ArrowLeft, Bell, TrendingUp, Eye, MessageSquare, Mail,
    X, Calendar, AlertCircle, Building2, Rocket, DownloadCloud, ExternalLink, Bot
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
        <div className={`relative bg-white rounded-2xl border border-[#e8ecf4] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${isAvailable ? 'cursor-pointer hover:-translate-y-1' : 'opacity-80'}`}>
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
                    <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#f8fafc] text-[#94a3b8] text-sm font-semibold cursor-not-allowed border border-[#e8ecf4]">
                        <Clock className="w-4 h-4" /> Notify Me
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

    const EXTENSION_URL = `https://chromewebstore.google.com/detail/${import.meta.env.VITE_EXTENSION_ID}?utm_source=item-share-cb`;

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





    // Extension Installation Check — runs once on mount and on window focus,
    // result is cached so Launch clicks open the correct modal instantly.
    //
    // Detection strategy (most → least reliable):
    //   1. chrome.runtime.sendMessage(extensionId, { action: "Check Extension" })
    //      — uses the extension's existing onMessageExternal handler. This is
    //      the most reliable path because `externally_connectable` in the
    //      manifest whitelists this origin, so it works even before the
    //      content script has injected.
    //   2. postMessage PING — falls back to the content script handshake
    //      (handled in content.ts) for browsers/contexts where chrome.runtime
    //      isn't exposed to web pages.
    const [isExtensionInstalled, setIsExtensionInstalled] = React.useState<boolean | null>(null);
    const checkExtensionInstalled = React.useCallback(() => {
        return new Promise<boolean>((resolve) => {
            const extensionId = import.meta.env.VITE_EXTENSION_ID;
            if (typeof window === "undefined" || !extensionId) {
                setIsExtensionInstalled(false);
                resolve(false);
                return;
            }

            let settled = false;
            const finish = (installed: boolean) => {
                if (settled) return;
                settled = true;
                window.removeEventListener("message", onPostMessage);
                clearTimeout(timer);
                setIsExtensionInstalled(installed);
                resolve(installed);
            };

            // ── Path 2 (concurrent backup): postMessage PING/PONG ─────────
            const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const onPostMessage = (event: MessageEvent) => {
                if (event.source !== window) return;
                const data = event.data;
                if (!data || typeof data !== "object") return;
                if (data?.source !== "LP_EXTENSION") return;
                if (data?.type !== "PONG") return;
                if (data?.nonce !== nonce) return;
                finish(true);
            };
            window.addEventListener("message", onPostMessage);
            window.postMessage(
                { source: "LP_WEBAPP", type: "PING", nonce, extensionId },
                window.location.origin,
            );

            // ── Path 1 (primary): chrome.runtime.sendMessage ──────────────
            const sendMessage = (window as any)?.chrome?.runtime?.sendMessage;
            if (typeof sendMessage === "function") {
                try {
                    sendMessage(extensionId, { action: "Check Extension" }, (response: any) => {
                        const lastError = (window as any)?.chrome?.runtime?.lastError;
                        if (lastError) {
                            // Don't finish(false) here — let postMessage / timer decide,
                            // because lastError can fire for benign reasons (e.g.
                            // origin not yet in externally_connectable cache after install).
                            return;
                        }
                        if (response?.installed === true) finish(true);
                    });
                } catch {
                    // ignore — postMessage path or timer will resolve.
                }
            }

            // Safety timeout — both paths usually respond in <50 ms when alive.
            const timer = window.setTimeout(() => finish(false), 500);
        });
    }, []);

    // Run extension probe once on mount and whenever tab regains focus
    // (so installing/uninstalling the extension updates UI without a refresh).
    React.useEffect(() => {
        checkExtensionInstalled();
        const onFocus = () => { checkExtensionInstalled(); };
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [checkExtensionInstalled]);

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

    const openLaunchOrInstall = (platform: string, installed: boolean) => {
        if (!installed) {
            setIsInstallModalOpen(true);
            return;
        }
        if (!hasActiveSubscription(user)) {
            toast({
                title: "Subscription Required",
                description: "Please upgrade to access this tool.",
                variant: "destructive"
            });
            window.location.href = '/subscribe';
            return;
        }
        setHasSubscription(true);
        setSelectedPlatform(platform);
        setIsLaunchModalOpen(true);
    };

    const handleLaunch = async (platform: string) => {
        // Fast path: probe already finished on mount → open modal instantly.
        if (isExtensionInstalled !== null) {
            openLaunchOrInstall(platform, isExtensionInstalled);
            return;
        }
        // First click before probe finishes — fall back to awaiting it once.
        const installed = await checkExtensionInstalled();
        openLaunchOrInstall(platform, installed);
    };

    const buildPlatformUrl = (platformName: string | null, filters: any): string => {
        const p = String(platformName || '').toLowerCase();
        const keywords = String(filters?.keywords ?? filters?.jobTitle ?? '').trim();
        const location = String(filters?.location ?? '').trim();

        if (p.includes('linkedin')) {
            const u = new URL('https://www.linkedin.com/jobs/search/');
            u.searchParams.set('f_AL', 'true'); // Easy Apply
            if (keywords) u.searchParams.set('keywords', keywords);
            if (location) u.searchParams.set('location', location);
            return u.toString();
        }

        if (p.includes('glassdoor')) {
            const u = new URL('https://www.glassdoor.com/Job/index.htm');
            u.searchParams.set('applicationType', '1'); // Easy Apply
            u.searchParams.set('fromAge', '3');
            if (keywords) u.searchParams.set('sc.keyword', keywords);
            if (location) u.searchParams.set('sc.location', location);
            return u.toString();
        }

        if (p.includes('indeed')) {
            const u = new URL('https://www.indeed.com/jobs');
            if (keywords) u.searchParams.set('q', keywords);
            if (location) u.searchParams.set('l', location);
            u.searchParams.set('radius', '35');
            return u.toString();
        }

        if (p.includes('wellfound')) return 'https://wellfound.com/jobs';
        if (p.includes('monster')) return 'https://www.monster.com/';

        // Safe fallback (won't break sendMessage)
        return '';
    };

    const handleProceedLaunch = async (filters: any) => {
        console.log(`Launching ${selectedPlatform} with filters:`, filters);

        const url = buildPlatformUrl(selectedPlatform, filters);

        // Send message to extension (recommended: postMessage → content script → background)
        const extensionId = import.meta.env.VITE_EXTENSION_ID;
        const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        if (typeof window !== 'undefined') {
            // This is handled by the extension content script via AutomationManager.
            window.postMessage(
                {
                    source: 'auto-job-apply-dashboard',
                    action: 'START_AUTO_APPLY',
                    platform: selectedPlatform,
                    url,
                    filters,
                    userId: id,
                    subscription: hasSubscription,
                    extensionId,
                    nonce
                },
                window.location.origin
            );

            // Fallback: if chrome.runtime is actually available on this page, also send directly.
            // @ts-ignore
            const sendMessage = (window as any)?.chrome?.runtime?.sendMessage;
            if (typeof sendMessage === 'function') {
                try {
                    sendMessage(
                        extensionId,
                        {
                            action: "START_AUTO_APPLY",
                            platform: selectedPlatform,
                            url,
                            filters,
                            userId: id,
                            subscription: hasSubscription
                        },
                        (response: any) => {
                            console.log("Extension response:", response);
                        }
                    );
                } catch (e) {
                    console.error("Failed to send message to extension via chrome.runtime:", e);
                }
            }
        }

        setIsLaunchModalOpen(false);
        // Toast to show it's proceeding
        toast({
            title: `Starting ${selectedPlatform} Apply`,
            description: "AI engine is starting with your selected filters.",
        });
    };

    const completionResult = useMemo(
        () => getJobProfileCompletion(profileData as JobProfileLike | null),
        [profileData]
    );
    const completion = completionResult.percent;
    const colors = getProfileCompletionColors(completion);

    const greeting =
        profileData?.firstName?.trim() ||
        user?.firstName?.trim() ||
        user?.lastName?.trim() ||
        (user as { email?: string })?.email?.split('@')[0] ||
        'there';

    const displayName = greeting;

    const overviewStats = [
        { label: 'Applications Sent', value: '0', sub: 'This Month', trend: '0%', icon: TrendingUp },
        { label: 'Profile Views', value: '0', sub: 'This Month', trend: '0%', icon: Eye },
        { label: 'Interviews', value: '0', sub: 'This Month', trend: '0%', icon: MessageSquare },
        { label: 'Response Rate', value: '0%', sub: 'This Month', trend: '0%', icon: Award },
    ];

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
        <LayoffProofLayout activeNavId="auto-apply">
            <LayoffProofDashboardHeader greeting={greeting} />

            <main className="flex-1 space-y-8 px-8 py-6">
                <AutoJobApplyHero displayName={displayName} />

                {/* Overview */}
                <section>
                    <h2 className="mb-4 text-base font-bold text-[#0f172a]">Overview</h2>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {overviewStats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={stat.label}
                                    className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm"
                                >
                                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#6366f1]">
                                        <Icon className="h-4 w-4" strokeWidth={2} />
                                    </div>
                                    <p className="text-2xl font-bold text-[#0f172a]">{stat.value}</p>
                                    <p className="mt-0.5 text-[13px] font-medium text-[#64748b]">{stat.label}</p>
                                    <p className="mt-1 text-[11px] text-[#94a3b8]">
                                        {stat.sub} · {stat.trend}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <ProfileCompletionLayoffProof
                    completion={completionResult}
                    isLoading={isLoading}
                    completeHref="/auto-job-apply"
                />

                {/* Sections grid */}
                <section>
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <h2 className="text-base font-bold text-[#0f172a]">Sections</h2>
                        <Link
                            href="/auto-job-apply"
                            className="text-[13px] font-semibold text-[#6366f1] no-underline hover:text-[#4f46e5]"
                        >
                            Go to profile →
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {sections.map((s) => (
                            <AutoJobApplySectionTile
                                key={s.label}
                                icon={s.icon}
                                label={s.label}
                                done={s.done}
                            />
                        ))}
                    </div>
                </section>

                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        {
                            label: 'Profile Score',
                            icon: <Award className="w-5 h-5" />,
                            value: `${completion}%`,
                            sub: 'Based on saved data',
                            color: colors.text,
                        },
                        {
                            label: 'Resume',
                            icon: <FileText className="w-5 h-5" />,
                            value: profileData?.resume ? 'Uploaded' : 'Missing',
                            sub: profileData?.resume ? 'Ready to apply' : 'Upload in profile',
                            color: profileData?.resume ? 'text-emerald-600' : 'text-red-500',
                        },
                        {
                            label: 'Skills',
                            icon: <Code2 className="w-5 h-5" />,
                            value: `${profileData?.skills?.length ?? 0}`,
                            sub: 'Need at least 3 to score',
                            color: (profileData?.skills?.length ?? 0) >= 3 ? 'text-emerald-600' : 'text-amber-500',
                        },
                        {
                            label: 'Experience',
                            icon: <Briefcase className="w-5 h-5" />,
                            value: `${profileData?.experiences?.length ?? 0}`,
                            sub: profileData?.totalExperience ? `${profileData.totalExperience} yrs total` : 'Entries added',
                            color: (profileData?.experiences?.length ?? 0) > 0 ? 'text-emerald-600' : 'text-[#94a3b8]',
                        },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="flex items-center gap-3 rounded-xl border border-[#e8ecf4] bg-white p-4 shadow-sm"
                        >
                            <div className="shrink-0 rounded-lg bg-[#f5f3ff] p-2 text-[#6366f1]">{stat.icon}</div>
                            <div className="min-w-0">
                                <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[#94a3b8]">
                                    {stat.label}
                                </p>
                                <p className={`text-lg font-bold ${stat.color}`}>
                                    {isLoading ? '...' : stat.value}
                                </p>
                                <p className="truncate text-[11px] text-[#94a3b8]">{stat.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Platform cards */}
                <section>
                    <div className="mb-5">
                        <h2 className="text-xl font-bold text-[#0f172a]">Auto-Apply Platforms</h2>
                        <p className="mt-1 text-sm text-[#64748b]">
                            Choose a platform and let AI apply to hundreds of jobs for you.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {platforms.map((p) => (
                            <PlatformCard key={p.name} {...p} onLaunch={handleLaunch} />
                        ))}
                    </div>
                </section>
            </main>

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
        </LayoffProofLayout>
    );
}
