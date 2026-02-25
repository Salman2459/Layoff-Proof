import { toast } from '@/hooks/use-toast';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from '@/hooks/useAuth';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Bot } from 'lucide-react';


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
    recommendationLetters: FileList | null;
    certificates: FileList | null;
}

const AutoJobApply: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({
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
            country: '',
            city: '',
            zip: '',
            authorizedCountries: [],
            sponsorship: 'NOT_REQUIRED',
            relocate: 'NO',
        },
        experience: {
            totalExperience: '0',
            experiences: [],
        },
        education: {
            education: [],
        },
        skillAndLanguages: {
            languages: [],
            skills: [].map(name => ({ name })),
        },
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
        achievements: {
            achievements: '',
        },
        resume: null,
        recommendationLetters: null
    });
    const [section, setSection] = useState<string | null>(null)
    const [errors, setErrors] = useState<string[]>([])
    const [isExtracting, setIsExtracting] = useState(false);
    const [hasUploadedResume, setHasUploadedResume] = useState(false);
    const { user, isAuthenticated, isLoading } = useAuth()

    const id = (user as any)?.id;

    // Redirect if not authenticated or no active subscription
    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                toast({
                    title: "Unauthorized",
                    description: "Please log in to continue",
                    variant: "destructive",
                });
                setTimeout(() => window.location.href = "/login", 500);
            } else {
                const subscriptionEndDate = (user as any)?.subscriptionEndDate;
                const hasActiveSubscription = subscriptionEndDate && new Date(subscriptionEndDate) >= new Date();
                if (!hasActiveSubscription) {
                    toast({
                        title: "Subscription Required",
                        description: "Please upgrade to access the Auto applied AI Engine tool.",
                        variant: "destructive",
                    });
                    setTimeout(() => window.location.href = "/pricing", 500);
                }
            }
        }
    }, [isAuthenticated, isLoading, user, toast]);

    // Fetch existing profile from DB
    const { data: profileData } = useQuery({
        queryKey: ['userJobProfile', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await fetch(`/api/profile/jobprofile/${id}`);
            const json = await res.json();
            return json.data;
        },
        enabled: !!id,
    });

    useEffect(() => {
        if (profileData) {
            if (profileData.resume) {
                setHasUploadedResume(true);
            }

            // Only update if we have meaningful data to prevent overwriting initialized empty state unnecessarily
            if (profileData.firstName || profileData.experiences || profileData.skills) {
                setFormData(prev => ({
                    ...prev,
                    personal: profileData.firstName ? {
                        ...prev.personal,
                        firstName: profileData.firstName || '',
                        lastName: profileData.lastName || '',
                        email: profileData.email || '',
                        phone: profileData.phone || '',
                        linkedin: profileData.linkedin || '',
                        twitter: profileData.twitter || '',
                        website: profileData.website || '',
                        github: profileData.github || ''
                    } : prev.personal,
                    residency: profileData.city || profileData.country ? {
                        ...prev.residency,
                        street: profileData.street || '',
                        buildingNo: profileData.buildingNo || '',
                        apartmentNo: profileData.apartmentNo || '',
                        country: profileData.country || '',
                        city: profileData.city || '',
                        zip: profileData.zip || '',
                        sponsorship: profileData.sponsorship || 'NOT_REQUIRED',
                        relocate: profileData.relocate || 'NO'
                    } : prev.residency,
                    experience: profileData.experiences ? {
                        totalExperience: profileData.totalExperience || '0',
                        experiences: profileData.experiences
                    } : prev.experience,
                    education: profileData.education ? {
                        education: profileData.education
                    } : prev.education,
                    skillAndLanguages: profileData.skills || profileData.languages ? {
                        skills: profileData.skills || [],
                        languages: profileData.languages || []
                    } : prev.skillAndLanguages,
                    general: profileData.expectedSalary ? {
                        ...prev.general,
                        expectedSalary: profileData.expectedSalary,
                        noticePeriod: profileData.noticePeriod || '',
                        currentSalary: profileData.currentSalary || ''
                    } : prev.general
                }));
            }
        }
    }, [profileData]);

    // Calculate profile completion percentage
    const profileCompletion = useMemo(() => {
        let score = 0;

        // Personal Details (20 pts)
        const p = formData.personal;
        if (p.firstName && p.lastName && p.email && p.phone) score += 20;
        else if (p.firstName || p.lastName || p.email || p.phone) score += 10;

        // Residency (10 pts)
        const r = formData.residency;
        if (r.country && r.city) score += 10;
        else if (r.country || r.city) score += 5;

        // Experience (15 pts)
        if (formData.experience.experiences.length > 0) score += 15;

        // Education (15 pts)
        if (formData.education.education.length > 0) score += 15;

        // Skills & Languages (15 pts)
        const hasSkills = formData.skillAndLanguages.skills.length >= 3;
        const hasLanguage = formData.skillAndLanguages.languages.length > 0;
        if (hasSkills && hasLanguage) score += 15;
        else if (hasSkills || hasLanguage) score += 7;

        // Resume (10 pts)
        if (formData.resume) score += 10;

        // Achievements, Recommendation Letters, Certificates (5 pts each)
        if (formData.achievements.achievements) score += 5;
        if (formData.recommendationLetters && formData.recommendationLetters.length > 0) score += 5;
        if (formData.certificates && formData.certificates.length > 0) score += 5;

        // General (10 pts)
        const g = formData.general;
        if (g.expectedSalary && g.noticePeriod) score += 10;
        else if (g.expectedSalary || g.noticePeriod) score += 5;

        return score;
    }, [formData]);

    const resumeFileRef = useRef<HTMLInputElement | null>(null);
    const recommendationFileRef = useRef<HTMLInputElement | null>(null);
    const certificatesFileRef = useRef<HTMLInputElement | null>(null);

    const handleBrowseClick = (ref: React.RefObject<HTMLInputElement>) => {
        ref.current?.click();
    };
    console.log("section ", section)
    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest('POST', `/api/profile/${section}/${id}`, data);
        },
        onSuccess: () => {
            toast({
                title: "Profile Updated",
                description: "Successfully updated your profile."
            });
        },
        onError: (error: any) => {
            const errorMessage = error.message || "Failed to update";
            if (errorMessage.includes("Something went wrong")) {
                setErrors(["Something went wrong"]);
            } else {
                setErrors([errorMessage]);
            }
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("form data for submition...", formData)

        updateMutation.mutate(formData);

    }
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'recommendationLetters' | 'certificates') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (type === 'resume') {
            setFormData(prev => ({ ...prev, resume: files[0] }));
        } else if (type === 'recommendationLetters') {
            // Append new files to existing ones
            setFormData(prev => {
                const existingFiles = prev.recommendationLetters ? Array.from(prev.recommendationLetters) : [];
                const newFiles = Array.from(files);
                const combinedFiles = [...existingFiles, ...newFiles];

                // Convert array back to FileList-like object
                const dataTransfer = new DataTransfer();
                combinedFiles.forEach(file => dataTransfer.items.add(file));

                return { ...prev, recommendationLetters: dataTransfer.files };
            });
        } else if (type === 'certificates') {
            // Append new files to existing ones
            setFormData(prev => {
                const existingFiles = prev.certificates ? Array.from(prev.certificates) : [];
                const newFiles = Array.from(files);
                const combinedFiles = [...existingFiles, ...newFiles];

                // Convert array back to FileList-like object
                const dataTransfer = new DataTransfer();
                combinedFiles.forEach(file => dataTransfer.items.add(file));

                return { ...prev, certificates: dataTransfer.files };
            });
        }
    };

    // Remove individual file from recommendation letters or certificates
    const removeFile = (type: 'recommendationLetters' | 'certificates', indexToRemove: number) => {
        setFormData(prev => {
            const fileList = type === 'recommendationLetters' ? prev.recommendationLetters : prev.certificates;
            if (!fileList) return prev;

            const filesArray = Array.from(fileList);
            const filteredFiles = filesArray.filter((_, index) => index !== indexToRemove);

            // If no files left, set to null
            if (filteredFiles.length === 0) {
                return {
                    ...prev,
                    [type]: null
                };
            }

            // Convert array back to FileList
            const dataTransfer = new DataTransfer();
            filteredFiles.forEach(file => dataTransfer.items.add(file));

            return {
                ...prev,
                [type]: dataTransfer.files
            };
        });
    };

    // Remove resume file
    const removeResume = () => {
        setFormData(prev => ({ ...prev, resume: null }));
    };

    // Unified handler for nested state updates
    const handleUpdate = (section: keyof FormData, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...(prev[section] as any),
                [field]: value
            }
        }));
    };



    const addLanguage = () => {
        setFormData(prev => ({
            ...prev,
            skillAndLanguages: {
                ...prev.skillAndLanguages,
                languages: [...prev.skillAndLanguages.languages, { language: '', proficiency: '' }],
            }
        }));
    };

    const updateLanguage = (index: number, field: keyof LanguageItem, value: string) => {
        const newLanguages = [...formData.skillAndLanguages.languages];
        newLanguages[index][field] = value;
        setFormData(prev => ({
            ...prev,
            skillAndLanguages: {
                ...prev.skillAndLanguages,
                languages: newLanguages
            }
        }));
    };

    const removeLanguage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            skillAndLanguages: {
                ...prev.skillAndLanguages,
                languages: prev.skillAndLanguages.languages.filter((_, i) => i !== index),
            }
        }));
    };

    const addSkill = (skillName: string) => {
        if (!formData.skillAndLanguages.skills.find(s => s.name === skillName)) {
            setFormData(prev => ({
                ...prev,
                skillAndLanguages: {
                    ...prev.skillAndLanguages,
                    skills: [...prev.skillAndLanguages.skills, { name: skillName }],
                }
            }));
        }
    };

    const removeSkill = (skillName: string) => {
        setFormData(prev => ({
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

    const saveExperience = () => {
        if (!experienceForm.company || !experienceForm.title || !experienceForm.fromMonth || !experienceForm.fromYear) return;
        setFormData(prev => {
            const updated = [...prev.experience.experiences];
            if (editingExperienceIndex !== null) {
                updated[editingExperienceIndex] = experienceForm;
            } else {
                updated.push(experienceForm);
            }
            return {
                ...prev,
                experience: {
                    ...prev.experience,
                    experiences: updated
                }
            };
        });
        resetExperienceForm();
    };

    const saveAndAddMoreExperience = () => {
        if (!experienceForm.company || !experienceForm.title || !experienceForm.fromMonth || !experienceForm.fromYear) return;
        setFormData(prev => {
            const updated = [...prev.experience.experiences];
            if (editingExperienceIndex !== null) {
                updated[editingExperienceIndex] = experienceForm;
            } else {
                updated.push(experienceForm);
            }
            return {
                ...prev,
                experience: {
                    ...prev.experience,
                    experiences: updated
                }
            };
        });
        setExperienceForm({ company: '', title: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', currentlyWorking: false, description: '' });
        setEditingExperienceIndex(null);
    };

    const editExperience = (index: number) => {
        setExperienceForm(formData.experience.experiences[index]);
        setEditingExperienceIndex(index);
        setIsAddingExperience(true);
    };

    const deleteExperience = (index: number) => {
        setFormData(prev => ({
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

    const saveEducation = () => {
        if (!educationForm.school || !educationForm.degree || !educationForm.fromMonth || !educationForm.fromYear) return;
        setFormData(prev => {
            const updated = [...prev.education.education];
            if (editingEducationIndex !== null) {
                updated[editingEducationIndex] = educationForm;
            } else {
                updated.push(educationForm);
            }
            return {
                ...prev,
                education: {
                    ...prev.education,
                    education: updated
                }
            };
        });
        resetEducationForm();
    };

    const saveAndAddMoreEducation = () => {
        if (!educationForm.school || !educationForm.degree || !educationForm.fromMonth || !educationForm.fromYear) return;
        setFormData(prev => {
            const updated = [...prev.education.education];
            if (editingEducationIndex !== null) {
                updated[editingEducationIndex] = educationForm;
            } else {
                updated.push(educationForm);
            }
            return {
                ...prev,
                education: {
                    ...prev.education,
                    education: updated
                }
            };
        });
        setEducationForm({ school: '', degree: '', fieldOfStudy: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', isCurrentlyStudying: false, description: '' });
        setEditingEducationIndex(null);
    };

    const editEducation = (index: number) => {
        setEducationForm(formData.education.education[index]);
        setEditingEducationIndex(index);
        setIsAddingEducation(true);
    };

    const deleteEducation = (index: number) => {
        setFormData(prev => ({
            ...prev,
            education: {
                ...prev.education,
                education: prev.education.education.filter((_, i) => i !== index),
            }
        }));
    };



    if (isLoading || (!isAuthenticated && !isLoading) || (user && (!(user as any).subscriptionEndDate || new Date((user as any).subscriptionEndDate) < new Date()))) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Verifying access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-gray-50">
            {/* Sticky Profile Progress Bar */}
            <div className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 relative overflow-hidden group">
                    {/* Background accent */}
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


            {/* Resume Upload */}
            <form onSubmit={handleSubmit}>

                <input
                    type="file"
                    id="resume"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    ref={resumeFileRef}
                    required
                    onChange={(e) => handleFileChange(e, 'resume')}
                />
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className='flex justify-between items-center mb-2'>
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Resume</h4>
                        <button type="button" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50" onClick={async () => {
                            if (!formData.resume) {
                                toast({
                                    title: "No file selected",
                                    description: "Please select a resume to upload.",
                                    variant: "destructive"
                                });
                                return;
                            }
                            setIsExtracting(true);
                            try {
                                setSection("documentupdate");
                                const file = formData.resume;
                                const fd = new FormData();
                                fd.append('file', file);

                                const reqResp = await apiRequest('POST', `/api/profile/documentupdate/${id}?documentType=resume`, fd);
                                const jsonResp = await reqResp.json();

                                if (jsonResp.extractedData) {
                                    const profileData = jsonResp.extractedData;
                                    setFormData(prev => ({
                                        ...prev,
                                        personal: profileData.personal ? { ...prev.personal, ...profileData.personal } : prev.personal,
                                        residency: profileData.residency ? { ...prev.residency, ...profileData.residency } : prev.residency,
                                        experience: profileData.experience ? { ...prev.experience, ...profileData.experience } : prev.experience,
                                        education: profileData.education ? { ...prev.education, ...profileData.education } : prev.education,
                                        skillAndLanguages: profileData.skillAndLanguages ? { ...prev.skillAndLanguages, ...profileData.skillAndLanguages } : prev.skillAndLanguages
                                    }));
                                    toast({
                                        title: "Success",
                                        description: "Resume uploaded and data extracted successfully."
                                    });
                                } else {
                                    toast({
                                        title: "Success",
                                        description: "Resume uploaded successfully."
                                    });
                                }
                                setHasUploadedResume(true);
                            } catch (e) {
                                toast({
                                    title: "Error",
                                    description: "Failed to upload resume.",
                                    variant: "destructive"
                                });
                            } finally {
                                setIsExtracting(false);
                            }
                        }}
                            disabled={isExtracting}
                        >
                            {isExtracting ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Extracting...
                                </span>
                            ) : 'Upload'}
                        </button>
                    </div>
                    {formData.resume ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-purple-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm text-gray-700">{formData.resume.name} ({(formData.resume.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeResume();
                                    }}
                                    className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                        </div>
                    ) : (
                        <div onClick={() => handleBrowseClick(resumeFileRef)} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
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
            </form>

            {/* Personal Details */}

            {!hasUploadedResume && (
                <div className="text-center py-10">
                    <h3 className="text-xl font-medium text-gray-500">Please upload your resume to autofill the form or continue</h3>
                    <button
                        className="mt-4 px-6 py-2 bg-white border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                        onClick={() => setHasUploadedResume(true)}
                    >
                        Skip & Fill Manually
                    </button>
                </div>
            )}

            {hasUploadedResume && (
                <>
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h4>
                        <p className="text-sm text-gray-600 mb-4">Manually fill out all details to auto-populate job applications and generate a professional cover letter based on your information.</p>
                        <div className="text-sm text-gray-500 mb-4">Required fields are marked <span className="text-red-500">*</span></div>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.personal.firstName}
                                        onChange={(e) => handleUpdate('personal', 'firstName', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Enter your first name..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.personal.lastName}
                                        onChange={(e) => handleUpdate('personal', 'lastName', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Enter your last name..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        value={formData.personal.email}
                                        onChange={(e) => handleUpdate('personal', 'email', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Enter your email..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                                    <div className="flex">
                                        <select
                                            value={formData.personal.phoneCode}
                                            onChange={(e) => handleUpdate('personal', 'phoneCode', e.target.value)}
                                            className="w-20 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option>+92</option>
                                            <option>+1</option>
                                            <option>+44</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={formData.personal.phone}
                                            onChange={(e) => handleUpdate('personal', 'phone', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="Enter your phone..."
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                                    <input
                                        type="text"
                                        value={formData.personal.linkedin}
                                        onChange={(e) => handleUpdate('personal', 'linkedin', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Enter your LinkedIn URL..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">X/Twitter URL</label>
                                    <input
                                        type="text"
                                        value={formData.personal.twitter}
                                        onChange={(e) => handleUpdate('personal', 'twitter', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Enter your X/Twitter URL..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                                    <input
                                        type="text"
                                        value={formData.personal.website}
                                        onChange={(e) => handleUpdate('personal', 'website', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Enter your Website URL..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                                    <input
                                        type="text"
                                        value={formData.personal.github}
                                        onChange={(e) => handleUpdate('personal', 'github', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Enter your GitHub URL..."
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button type='submit' onClick={() => { setSection("personal") }} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500">Save</button>
                            </div>
                        </form>
                    </div>

                    {/* Residency */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Residency</h4>
                        <div className="space-y-4">
                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                                        <input
                                            type="text"
                                            value={formData.residency.street}
                                            onChange={(e) => handleUpdate('residency', 'street', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="Street"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Building No</label>
                                        <input
                                            type="text"
                                            value={formData.residency.buildingNo}
                                            onChange={(e) => handleUpdate('residency', 'buildingNo', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="Building No"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Apartment No</label>
                                        <input
                                            type="text"
                                            value={formData.residency.apartmentNo}
                                            onChange={(e) => handleUpdate('residency', 'apartmentNo', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="Apartment No"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
                                        <select
                                            value={formData.residency.country}
                                            required
                                            onChange={(e) => handleUpdate('residency', 'country', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option>Pakistan</option>
                                            <option>USA</option>
                                            <option>UK</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                                        <select
                                            value={formData.residency.city}
                                            required
                                            onChange={(e) => handleUpdate('residency', 'city', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option>Faisalabad</option>
                                            <option>Lahore</option>
                                            <option>Karachi</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                                        <input
                                            type="text"
                                            value={formData.residency.zip}
                                            onChange={(e) => handleUpdate('residency', 'zip', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="ZIP"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">I legally authorized to work in</label>
                                    <div className="border border-gray-300 rounded-md p-2 flex flex-wrap gap-2">
                                        {formData.residency.authorizedCountries.map((country, idx) => (
                                            <span key={idx} className="inline-flex items-center bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">
                                                {country}
                                                <button onClick={() => handleUpdate('residency', 'authorizedCountries', formData.residency.authorizedCountries.filter(c => c !== country))} className="ml-1 text-purple-600 hover:text-purple-800">×</button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            placeholder="Add country..."
                                            className="flex-1 outline-none text-sm"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                    e.preventDefault();
                                                    handleUpdate('residency', 'authorizedCountries', [...formData.residency.authorizedCountries, e.currentTarget.value.trim()]);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Will you now or in the future require sponsorship for employment visa status?</h5>
                                        <div className="flex gap-4">
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="radio"
                                                    name="sponsorship"
                                                    value="REQUIRED"
                                                    checked={formData.residency.sponsorship === 'REQUIRED'}
                                                    onChange={(e) => handleUpdate('residency', 'sponsorship', e.target.value as any)}
                                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Yes</span>
                                            </label>
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="radio"
                                                    name="sponsorship"
                                                    value="NOT_REQUIRED"
                                                    checked={formData.residency.sponsorship === 'NOT_REQUIRED'}
                                                    onChange={(e) => handleUpdate('residency', 'sponsorship', e.target.value as any)}
                                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">No</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Are you willing to relocate</h5>
                                        <div className="flex gap-4">
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="radio"
                                                    name="relocate"
                                                    value="YES"
                                                    checked={formData.residency.relocate === 'YES'}
                                                    onChange={(e) => handleUpdate('residency', 'relocate', e.target.value as any)}
                                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Yes</span>
                                            </label>
                                            <label className="inline-flex items-center">
                                                <input
                                                    type="radio"
                                                    name="relocate"
                                                    value="NO"
                                                    checked={formData.residency.relocate === 'NO'}
                                                    onChange={(e) => handleUpdate('residency', 'relocate', e.target.value as any)}
                                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">No</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button type='submit' onClick={() => { setSection("residency") }} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Working Experience */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Working Experience</h4>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total year(s) of experience <span className="text-red-500">*</span></label>
                                    <select
                                        value={formData.experience.totalExperience}
                                        onChange={(e) => handleUpdate('experience', 'totalExperience', e.target.value)}
                                        className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        {Array.from({ length: 31 }, (_, i) => (
                                            <option key={i} value={String(i)}>{i}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Saved experience entries */}
                                {formData.experience.experiences.length > 0 && (
                                    <div className="space-y-3">
                                        {formData.experience.experiences.map((exp, idx) => (
                                            <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:shadow-sm transition-shadow">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h5 className="font-semibold text-gray-900">{exp.title}</h5>
                                                        <p className="text-sm text-gray-600">{exp.company}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {exp.fromMonth} {exp.fromYear} – {exp.currentlyWorking ? 'Present' : `${exp.toMonth} ${exp.toYear}`}
                                                        </p>
                                                        {exp.description && <p className="text-sm text-gray-600 mt-2">{exp.description}</p>}
                                                    </div>
                                                    <div className="flex space-x-2 text-sm shrink-0 ml-4">
                                                        <button onClick={() => editExperience(idx)} className="text-purple-600 hover:text-purple-800 hover:underline">Edit</button>
                                                        <button onClick={() => deleteExperience(idx)} className="text-red-500 hover:text-red-700 hover:underline">Delete</button>
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
                                            <button
                                                type="button"
                                                onClick={resetExperienceForm}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={saveAndAddMoreExperience}
                                                className="px-4 py-2 border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 transition-colors"
                                            >
                                                Save & Add More
                                            </button>
                                            <button
                                                type="button"
                                                onClick={saveExperience}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={formData.experience.experiences.length === 0 ? 'text-center py-8' : ''}>
                                        {formData.experience.experiences.length === 0 && (
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
                                <div className="mt-4 flex justify-end">
                                    <button type='submit' onClick={(e) => {
                                        setSection("experience");
                                    }} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium">Save All Experience</button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Education */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Education</h4>
                        <div className="space-y-4">
                            {/* Saved education entries */}
                            {formData.education.education.length > 0 && (
                                <div className="space-y-3">
                                    {formData.education.education.map((edu, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:shadow-sm transition-shadow">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h5 className="font-semibold text-gray-900">{edu.degree}</h5>
                                                    <p className="text-sm text-gray-600">{edu.school}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {edu.fromMonth} {edu.fromYear} – {edu.isCurrentlyStudying ? 'Present' : `${edu.toMonth} ${edu.toYear}`}
                                                    </p>
                                                    {edu.fieldOfStudy && <p className="text-sm text-gray-600 mt-2">Field of Study: {edu.fieldOfStudy}</p>}
                                                    {edu.description && <p className="text-sm text-gray-600 mt-2">{edu.description}</p>}
                                                </div>
                                                <div className="flex space-x-2 text-sm shrink-0 ml-4">
                                                    <button onClick={() => editEducation(idx)} className="text-purple-600 hover:text-purple-800 hover:underline">Edit</button>
                                                    <button onClick={() => deleteEducation(idx)} className="text-red-500 hover:text-red-700 hover:underline">Delete</button>
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
                                        <button
                                            type="button"
                                            onClick={resetEducationForm}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={saveAndAddMoreEducation}
                                            className="px-4 py-2 border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 transition-colors"
                                        >
                                            Save & Add More
                                        </button>
                                        <button
                                            type="button"
                                            onClick={saveEducation}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={formData.education.education.length === 0 ? 'text-center py-8' : ''}>
                                    {formData.education.education.length === 0 && (
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
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingEducation(true)}
                                        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                        Add Education {formData.education.education.length > 0 ? 'Another' : ''}
                                    </button>
                                </div>
                            )}
                            <div className="mt-4 flex justify-end">
                                <button type='button' onClick={(e) => {
                                    e.preventDefault();
                                    setSection("education");
                                    handleSubmit(e);
                                }} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium">Save All Education</button>
                            </div>
                        </div>
                    </div>

                    {/* Courses & Certificates */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-semibold text-gray-900">Courses & certificates</h4>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!formData.certificates || formData.certificates.length === 0) {
                                        toast({
                                            title: "No file selected",
                                            description: "Please select a certificate to upload.",
                                            variant: "destructive"
                                        });
                                        return;
                                    }
                                    setSection("documentupdate");
                                    const file = formData.certificates[0];
                                    const fd = new FormData();
                                    fd.append('file', file);
                                    // Set query param for document type (certificates is default)
                                    await apiRequest('POST', `/api/profile/documentupdate/${id}?documentType=certificate`, fd);
                                    toast({
                                        title: "Success",
                                        description: "Certificate uploaded successfully."
                                    });
                                }}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                            >
                                Upload Certificate
                            </button>
                        </div>
                        <div onClick={() => handleBrowseClick(certificatesFileRef)} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                            <div className="flex flex-col items-center space-y-2">
                                <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                {formData.certificates && formData.certificates.length > 0 ? (
                                    <h5 className="text-md font-medium text-purple-600">
                                        {formData.certificates.length} file(s) selected
                                    </h5>
                                ) : (
                                    <h5 className="text-md font-medium text-gray-900">Drag–n–Drop certificates here</h5>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className="w-12 h-px bg-gray-300"></span>
                                    <span>or</span>
                                    <span className="w-12 h-px bg-gray-300"></span>
                                </div>
                                <span className="text-purple-600 font-medium">Browse</span>
                                <p className="text-xs text-gray-500">(File types: pdf, doc, docx, jpg, png)</p>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                multiple
                                ref={certificatesFileRef}
                                onChange={(e) => handleFileChange(e, 'certificates')}
                            />
                        </div>
                        {
                            formData.certificates && formData.certificates.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {Array.from(formData.certificates).map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex items-center">
                                                <svg className="w-5 h-5 text-purple-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-sm text-gray-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFile('certificates', index);
                                                }}
                                                className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div >

                    {/* Skills & Languages */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Skills & Languages</h4>
                        <div className="space-y-6">
                            <form onSubmit={handleSubmit}>
                                {/* Languages */}
                                <div className="space-y-4">
                                    <h5 className="text-sm font-medium text-gray-700 mb-2">Languages</h5>
                                    {formData.skillAndLanguages.languages.map((lang, idx) => (
                                        <div key={idx} className="flex items-start gap-4 border-b pb-4 last:border-0 border-gray-100">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                                                <select
                                                    value={lang.language}
                                                    onChange={(e) => updateLanguage(idx, 'language', e.target.value)}
                                                    required
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                                >
                                                    <option>Urdu</option>
                                                    <option>English</option>
                                                    <option>Punjabi</option>
                                                    <option>Arabic</option>
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Proficiency</label>
                                                <select
                                                    value={lang.proficiency}
                                                    onChange={(e) => updateLanguage(idx, 'proficiency', e.target.value)}
                                                    required
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                                >
                                                    <option value="">Select...</option>
                                                    <option>Beginner</option>
                                                    <option>Intermediate</option>
                                                    <option>Fluent</option>
                                                    <option>Native</option>
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeLanguage(idx)}
                                                className="mt-8 text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                                                title="Remove Language"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex justify-end">
                                        <button type="button" onClick={addLanguage} className="text-purple-600 hover:text-purple-800 text-sm font-medium inline-flex items-center">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add more languages
                                        </button>
                                    </div>
                                </div>

                                <hr className="border-gray-100" />

                                {/* Skills */}
                                <div>
                                    <h5 className="text-sm font-medium text-gray-700 mb-2">Skills</h5>
                                    <p className="text-xs text-gray-500 mb-3">Add skills that highlight your expertise (Maximum 100)</p>
                                    <div className="border border-gray-300 rounded-md p-2 mb-2">
                                        <div className="flex flex-wrap gap-2">
                                            {formData.skillAndLanguages.skills.map((skill, idx) => (
                                                <span key={idx} className="inline-flex items-center bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-sm">
                                                    {skill.name}
                                                    <button type="button" onClick={() => removeSkill(skill.name)} className="ml-1 text-purple-600 hover:text-purple-800">×</button>
                                                </span>
                                            ))}
                                            <input
                                                type="text"
                                                placeholder="Add skill..."
                                                required
                                                className="flex-1 outline-none text-sm min-w-[120px]"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                        e.preventDefault();
                                                        addSkill(e.currentTarget.value.trim());
                                                        e.currentTarget.value = '';
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button type='submit' onClick={() => {
                                        setSection("skillAndLanguages");
                                    }} className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium transition-colors">
                                        Save Skills & Languages
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* General */}
                    < div className="bg-white rounded-lg shadow-sm p-6 mb-6" >
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">General</h4>
                        <div className="space-y-4">
                            <form onSubmit={handleSubmit}>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected annual salary</label>
                                    <div className="flex">
                                        <select
                                            value={formData.general.expectedSalaryCurrency}
                                            onChange={(e) => handleUpdate('general', 'expectedSalaryCurrency', e.target.value)}
                                            className="w-20 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option>USD</option>
                                            <option>EUR</option>
                                            <option>GBP</option>
                                            <option>PKR</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={formData.general.expectedSalary}
                                            onChange={(e) => handleUpdate('general', 'expectedSalary', e.target.value ? parseInt(e.target.value) : '')}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="Enter salary"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current annual salary</label>
                                    <div className="flex">
                                        <select
                                            value={formData.general.currentSalaryCurrency}
                                            onChange={(e) => handleUpdate('general', 'currentSalaryCurrency', e.target.value)}
                                            className="w-20 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 focus:ring-purple-500 focus:border-purple-500"
                                        >
                                            <option>USD</option>
                                            <option>EUR</option>
                                            <option>GBP</option>
                                            <option>PKR</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={formData.general.currentSalary}
                                            onChange={(e) => handleUpdate('general', 'currentSalary', e.target.value ? parseInt(e.target.value) : '')}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            placeholder="Enter salary"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notice period (days)</label>
                                    <input
                                        type="number"
                                        value={formData.general.noticePeriod}
                                        onChange={(e) => handleUpdate('general', 'noticePeriod', e.target.value ? parseInt(e.target.value) : '')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Enter notice period"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected date to start</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={formData.general.startDate ? formData.general.startDate.toISOString().split('T')[0] : ''}
                                            onChange={(e) => handleUpdate('general', 'startDate', e.target.value ? new Date(e.target.value) : null)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Race/ethnicity</label>
                                    <select
                                        value={formData.general.race}
                                        required
                                        onChange={(e) => handleUpdate('general', 'race', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="">Select...</option>
                                        <option>Asian</option>
                                        <option>Black</option>
                                        <option>Hispanic</option>
                                        <option>White</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Disability</label>
                                    <select
                                        value={formData.general.disability}
                                        required
                                        onChange={(e) => handleUpdate('general', 'disability', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="">Select...</option>
                                        <option>Yes</option>
                                        <option>No</option>
                                        <option>Prefer not to say</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Veteran status</label>
                                    <select
                                        value={formData.general.veteran}
                                        required
                                        onChange={(e) => handleUpdate('general', 'veteran', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="">Select...</option>
                                        <option>Veteran</option>
                                        <option>Not a veteran</option>
                                        <option>Prefer not to say</option>
                                    </select>
                                </div>
                                <div className="flex justify-end">
                                    <button type='submit' onClick={() => { setSection("general") }} className="px-4 py-2 mt-5 bg-purple-600 text-white rounded-md hover:bg-purple-700">Save</button>
                                </div>
                            </form>
                        </div>
                    </div >

                    {/* Achievements */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h4>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            setSection("achievements");
                            handleSubmit(e);
                        }}>
                            <textarea
                                required
                                rows={6}
                                value={formData.achievements.achievements}
                                onChange={(e) => handleUpdate('achievements', 'achievements', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                                placeholder="Enter your achievements or let AI generate them for you..."
                            />
                            <div className="flex justify-end items-center  mt-4">
                                <button type='submit' className="px-4 py-2  bg-purple-600 text-white rounded-md hover:bg-purple-700">Save</button>
                            </div>
                        </form>
                    </div>

                    {/* Recommendation Letters */}
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                        <div className="flex justify-between items-center">
                            <h4 className="text-lg font-semibold text-gray-900">Recommendation letters</h4>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!formData.recommendationLetters || formData.recommendationLetters.length === 0) {
                                        toast({
                                            title: "No file selected",
                                            description: "Please select a recommendation letter to upload.",
                                            variant: "destructive"
                                        });
                                        return;
                                    }
                                    setSection("documentupdate");
                                    const file = formData.recommendationLetters[0];
                                    const fd = new FormData();
                                    fd.append('file', file);
                                    // Set query param for document type
                                    await apiRequest('POST', `/api/profile/documentupdate/${id}?documentType=recommendation_letter`, fd);
                                    toast({
                                        title: "Success",
                                        description: "Recommendation letter uploaded successfully."
                                    });
                                }}
                                className="px-4 py-2 mb-4 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                            >
                                Upload Letter
                            </button>
                        </div>
                        <div onClick={() => handleBrowseClick(recommendationFileRef)} className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer">
                            <div className="flex flex-col items-center space-y-2">
                                <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                {formData.recommendationLetters && formData.recommendationLetters.length > 0 ? (
                                    <h5 className="text-md font-medium text-purple-600">
                                        {formData.recommendationLetters.length} file(s) selected
                                    </h5>
                                ) : (
                                    <h5 className="text-md font-medium text-gray-900">Drag–n–Drop recommendation letter here</h5>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className="w-12 h-px bg-gray-300"></span>
                                    <span>or</span>
                                    <span className="w-12 h-px bg-gray-300"></span>
                                </div>
                                <span className="text-purple-600 font-medium">Browse</span>
                                <p className="text-xs text-gray-500">(File types: pdf, doc, docx, txt, rtf)</p>
                            </div>
                            <input
                                required
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.txt,.rtf"
                                multiple
                                ref={recommendationFileRef}
                                onChange={(e) => handleFileChange(e, 'recommendationLetters')}
                            />
                        </div>
                        {
                            formData.recommendationLetters && formData.recommendationLetters.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {Array.from(formData.recommendationLetters).map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex items-center">
                                                <svg className="w-5 h-5 text-purple-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm1 2h6v1H7V6zm0 2h6v1H7V8zm0 2h6v1H7v-1zm0 2h6v1H7v-1zm3-6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                </svg>
                                                <span className="text-sm text-gray-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFile('recommendationLetters', index);
                                                }}
                                                className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div >
                </>
            )}
        </div >
    );
};

export default AutoJobApply;