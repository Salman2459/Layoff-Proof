// Make sure this is at the top of the file if using Next.js App Router
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Sparkles, RefreshCw, CheckCircle, XCircle,
  AlertTriangle, UserCheck, Info, Briefcase, GraduationCap, Wrench, Lightbulb,
  ClipboardCopy // Import new icon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import GlobalHeader from "@/components/GlobalHeader";

// =================================================================
// TYPE DEFINITIONS (No changes)
// =================================================================
interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

interface Education {
  degree: string;
  school: string;
  duration: string;
}

interface ProfileData {
  name: string;
  profession: string;
  summary: string;
  location: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
}

interface FeedbackItem {
  text: string;
  status: 'positive' | 'negative';
  suggestion?: string;
}

interface AnalysisItem {
  id: string;
  title: string;
  content?: string;
  feedback: FeedbackItem[];
}

interface AnalysisCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  items: AnalysisItem[];
}

interface AnalysisReport {
  score: number;
  needsImprovement: number;
  wellDone: number;
  categories: AnalysisCategory[];
}

// =================================================================
// UI COMPONENTS (No changes in these)
// =================================================================
const CircularProgress = ({ value, size = 120, strokeWidth = 10 }: { value: number, size?: number, strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const colorClass = value >= 80 ? 'text-green-500' : value >= 50 ? 'text-yellow-500' : 'text-red-500';
  return (<div className="relative flex items-center justify-center" style={{ width: size, height: size }}><svg className="absolute" width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle className="text-slate-200" stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} /><circle className={`${colorClass} transition-all duration-500 ease-in-out`} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" fill="transparent" r={radius} cx={size / 2} cy={size / 2} style={{ strokeDasharray: circumference, strokeDashoffset: offset }} transform={`rotate(-90 ${size / 2} ${size / 2})`} /></svg><span className="text-3xl font-bold text-slate-800">{value}<span className="text-lg">%</span></span></div>);
};

const AnalysisReportHeader = ({ report, profileData, targetJobTitle }: { report: AnalysisReport, profileData: ProfileData, targetJobTitle: string }) => (
  <Card><CardContent className="p-6"><div className="flex flex-col md:flex-row items-center gap-6"><CircularProgress value={report.score} size={100} strokeWidth={8} /><div className="flex-1 text-center md:text-left"><h2 className="text-xl font-bold text-slate-900 break-words">{profileData.profession}</h2><p className="text-sm text-slate-500 mt-1">{targetJobTitle} - {profileData.location || "Location not found"}</p><div className="flex items-center justify-center md:justify-start gap-6 mt-4"><div className="flex items-center gap-2 text-red-600"><XCircle className="w-5 h-5" /><span className="font-medium">{report.needsImprovement} Needs improvement</span></div><div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-5 h-5" /><span className="font-medium">{report.wellDone} Well done</span></div></div></div></div></CardContent></Card>
);

const AnalysisDetailCard = ({ category }: { category: AnalysisCategory }) => (
  <Card>
    <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><category.icon className="w-5 h-5 text-indigo-500" />{category.title}</CardTitle></CardHeader>
    <CardContent className="space-y-4 pt-0">
      {category.items.map(item => (<div key={item.id} className="border-t pt-4 first:border-t-0 first:pt-0"><h4 className="font-semibold text-md text-slate-700 flex items-center gap-2">{item.title} <Info size={14} className="text-slate-400" /></h4>{item.content && <p className="text-sm text-slate-500 italic mt-1 mb-3">{item.content}</p>}<div className="space-y-3 mt-2">{item.feedback.map((fb, index) => (<div key={index} className="flex items-start gap-3">{fb.status === 'positive' ? (<CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />) : (<XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />)}<div className="flex-1"><p className="text-sm text-slate-800 font-medium">{fb.text}</p>{fb.suggestion && (<p className="text-xs text-slate-600 mt-1 flex items-start"><Lightbulb className="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0 text-yellow-500" /><span><span className="font-semibold">Suggestion:</span> {fb.suggestion}</span></p>)}</div></div>))}</div></div>))}
    </CardContent>
  </Card>
);


// =================================================================
// UPDATED COMPONENT: Now handles AI improvements, copying, and state updates
// =================================================================
const ProfileDataDisplay = ({ profileData, setProfileData }: { profileData: ProfileData, setProfileData: React.Dispatch<React.SetStateAction<ProfileData | null>> }) => {
  const { toast } = useToast();
  const [improvingField, setImprovingField] = useState<string | null>(null);

  const handleCopyClick = (textToCopy: string, fieldName: string) => {
    navigator.clipboard.writeText(textToCopy);
    toast({ title: "Copied!", description: `The content of "${fieldName}" has been copied to your clipboard.` });
  };

  const handleImproveClick = async (fieldName: string, existingText: string) => {
    setImprovingField(fieldName);
    try {
      const response = await fetch('/api/improve-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldName,
          existingText,
          resumeContext: profileData,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get AI suggestion.");
      }

      // Update the state immutably based on the field name
      setProfileData(currentData => {
        if (!currentData) return null;
        // Deep copy to avoid direct state mutation
        const newData = JSON.parse(JSON.stringify(currentData));

        if (fieldName.startsWith('experience-')) {
          const parts = fieldName.split('-'); // e.g., ['experience', '0', 'description']
          const index = parseInt(parts[1], 10);
          const prop = parts[2] as keyof Experience;
          if (newData.experience[index]) {
            newData.experience[index][prop] = data.suggestion;
          }
        } else {
          // For top-level properties like 'summary' or 'profession'
          newData[fieldName as keyof ProfileData] = data.suggestion;
        }
        return newData;
      });

      toast({ title: "Content Improved!", description: `AI has provided a new suggestion for "${fieldName}".` });

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setImprovingField(null);
    }
  };

  // Generic handler to update state when user types in an input/textarea
  const handleInputChange = (fieldName: string, value: string) => {
    setProfileData(currentData => {
      if (!currentData) return null;
      const newData = JSON.parse(JSON.stringify(currentData));
      if (fieldName.startsWith('experience-')) {
        const parts = fieldName.split('-');
        const index = parseInt(parts[1], 10);
        const prop = parts[2] as keyof Experience;
        if (newData.experience[index]) {
          newData.experience[index][prop] = value;
        }
      } else {
        newData[fieldName as keyof ProfileData] = value;
      }
      return newData;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Editable Profile Data</CardTitle>
        <p className="text-sm text-slate-500">
          Review, edit, and use AI to improve your profile information.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-slate-800">Professional Summary</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Professional Title</label>
              <div className="relative">
                <Input
                  value={profileData.profession}
                  onChange={(e) => handleInputChange('profession', e.target.value)}
                  className="pr-24"
                />
                <div className="absolute top-1/2 right-1 -translate-y-1/2 flex items-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-200" onClick={() => handleCopyClick(profileData.profession, 'Professional Title')} disabled={!!improvingField}><ClipboardCopy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-500 hover:bg-yellow-50" onClick={() => handleImproveClick('profession', profileData.profession)} disabled={!!improvingField}>{improvingField === 'profession' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}</Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Summary</label>
              <div className="relative">
                <Textarea
                  value={profileData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  className="min-h-[120px] pr-24"
                />
                <div className="absolute top-2 right-1 flex items-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-200" onClick={() => handleCopyClick(profileData.summary, 'Summary')} disabled={!!improvingField}><ClipboardCopy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-500 hover:bg-yellow-50" onClick={() => handleImproveClick('summary', profileData.summary)} disabled={!!improvingField}>{improvingField === 'summary' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}</Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {profileData.experience.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-slate-800">Experience</h3>
            <div className="space-y-6">
              {profileData.experience.map((exp, index) => {
                const titleFieldName = `experience-${index}-title`;
                const descFieldName = `experience-${index}-description`;
                return (
                  <div key={index} className="p-4 border rounded-lg space-y-4 bg-white">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Title</label>
                      <div className="relative">
                        <Input value={exp.title} onChange={(e) => handleInputChange(titleFieldName, e.target.value)} className="pr-24" />
                        <div className="absolute top-1/2 right-1 -translate-y-1/2 flex items-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-200" onClick={() => handleCopyClick(exp.title, `Experience ${index + 1} Title`)} disabled={!!improvingField}><ClipboardCopy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-500 hover:bg-yellow-50" onClick={() => handleImproveClick(titleFieldName, exp.title)} disabled={!!improvingField}>{improvingField === titleFieldName ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}</Button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Company</label>
                        <Input value={exp.company} readOnly className="bg-slate-100" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Duration</label>
                        <Input value={exp.duration} readOnly className="bg-slate-100" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Description</label>
                      <div className="relative">
                        <Textarea value={exp.description} onChange={(e) => handleInputChange(descFieldName, e.target.value)} className="min-h-[100px] pr-24" />
                        <div className="absolute top-2 right-1 flex items-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-200" onClick={() => handleCopyClick(exp.description, `Experience ${index + 1} Description`)} disabled={!!improvingField}><ClipboardCopy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-500 hover:bg-yellow-50" onClick={() => handleImproveClick(descFieldName, exp.description)} disabled={!!improvingField}>{improvingField === descFieldName ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


// =================================================================
// MAIN COMPONENT (Orchestrates the process and renders components)
// =================================================================
export default function LinkedInOptimizer() {
  const [profilePdf, setProfilePdf] = useState<File | null>(null);
  const [targetJobTitle, setTargetJobTitle] = useState("");
  const [analysisStep, setAnalysisStep] = useState("");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [apiError, setApiError] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const isAnalyzing = analysisStep !== "";

  const analyzeProfile = async () => {
    if (!profilePdf) {
      toast({ title: "Missing PDF", description: "Please upload your LinkedIn profile PDF.", variant: "destructive" });
      return;
    }
    if (!targetJobTitle) {
      toast({ title: "Missing Job Title", description: "Please enter your target job title for a better analysis.", variant: "destructive" });
      return;
    }

    setApiError("");
    setProfileData(null);
    setAnalysisReport(null);

    try {
      setAnalysisStep("Fetching profile data...");
      const form = new FormData();
      form.append("file", profilePdf);
      if (user?.id) form.append("id", String(user.id));

      const importResponse = await fetch(`/api/import-linkedin-resume-pdf`, {
        method: 'POST',
        body: form,
      });
      const importData = await importResponse.json();
      if (!importResponse.ok) {
        throw new Error(importData.error || 'Failed to fetch profile data.');
      }
      const fetchedProfileData: ProfileData = importData.resumeData;
      setProfileData(fetchedProfileData);

      setAnalysisStep("Analyzing profile with AI...");
      const analyzeResponse = await fetch(`/api/analyze-profile-with-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: fetchedProfileData, targetJobTitle })
      });
      const analysisData = await analyzeResponse.json();
      if (!analyzeResponse.ok) {
        throw new Error(analysisData.error || 'The AI analysis failed.');
      }
      setAnalysisReport(analysisData);
      toast({ title: "Analysis Complete!", description: `AI-powered feedback for ${fetchedProfileData.name} is ready.` });

    } catch (error: any) {
      setApiError(error.message);
      toast({ title: "An Error Occurred", description: error.message, variant: "destructive" });
    } finally {
      setAnalysisStep("");
    }
  };

  const renderAnalysisContent = () => {
    if (isAnalyzing) return <div className="space-y-6"><Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card><Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></CardContent></Card></div>;
    if (apiError) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"><AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" /><h3 className="font-semibold text-lg text-red-900">Analysis Failed</h3><p className="text-sm text-red-700 mt-2">{apiError}</p></div>;
    if (profileData && analysisReport) {
      const icons: { [key: string]: React.ElementType } = {
        basicInfo: UserCheck,
        highImpact: Sparkles,
        experience: Briefcase,
        skills: Wrench,
        education: GraduationCap,
        tips: Lightbulb
      };

      const categoriesWithIcons = analysisReport.categories.map(cat => ({
        ...cat,
        icon: icons[cat.id] || Info,
      }));

      return (
        <div className="space-y-6">
          <AnalysisReportHeader report={analysisReport} profileData={profileData} targetJobTitle={targetJobTitle} />
          {categoriesWithIcons.map(category => (
            <AnalysisDetailCard key={category.id} category={category} />
          ))}
          {/* RENDER THE EDITABLE DATA DISPLAY AT THE END */}
          <ProfileDataDisplay profileData={profileData} setProfileData={setProfileData} />
        </div>
      );
    }
    return <div className="text-center py-16 border-2 border-dashed rounded-lg"><UserCheck className="mx-auto h-12 w-12 text-slate-400" /><h3 className="mt-2 text-lg font-medium text-slate-900">Ready to Optimize?</h3><p className="mt-1 text-sm text-slate-500">Upload your LinkedIn profile PDF and enter your target job title to start.</p></div>;
  };

  return (
    <>
      <GlobalHeader />
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200"><div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-center"><h1 className="text-4xl font-bold tracking-tight text-slate-900">AI LinkedIn Optimizer</h1><p className="mt-4 text-lg text-slate-600">Get instant, actionable feedback to land your dream job.</p></div></header>
        <section className="py-8 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white/80">
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10">
              <div className="space-y-3 lg:pr-4">
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">Walkthrough</p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  See the LinkedIn optimizer in action
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                  A quick tour of how to upload your profile PDF, run the analysis, and apply AI suggestions.
                </p>
              </div>
              <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-black shadow-sm aspect-video dark:border-slate-700 sm:max-w-lg lg:mx-0 lg:max-w-none">
  <iframe
    width="560"
    height="315"
    src="https://www.youtube-nocookie.com/embed/mjJMwMZeu10?si=mIU_NP5v-ei24Gqw&controls=0&autoplay=1&mute=0"
    title="YouTube video player"
    frameBorder={0}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerPolicy="strict-origin-when-cross-origin"
    allowFullScreen
    className="absolute inset-0 h-full w-full border-0"
  />
</div>
            </div>
          </div>
        </section>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-xl">1. Start Your Analysis</CardTitle><p className="text-slate-500 text-sm">Upload your LinkedIn profile as a PDF and enter the job title you're targeting.</p></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setProfilePdf(e.target.files?.[0] ?? null)}
                    disabled={isAnalyzing}
                    className="md:col-span-2"
                  />
                  <Input placeholder="e.g., Website Developer" value={targetJobTitle} onChange={(e) => setTargetJobTitle(e.target.value)} disabled={isAnalyzing} />
                </div>
                <Button onClick={analyzeProfile} disabled={isAnalyzing || !profilePdf || !targetJobTitle} size="lg" className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-md hover:opacity-90 transition-opacity">
                  {isAnalyzing ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
                  {analysisStep || 'Analyze Profile'}
                </Button>
              </CardContent>
            </Card>
            {renderAnalysisContent()}
          </div>
        </main>
      </div>
    </>
  );
}