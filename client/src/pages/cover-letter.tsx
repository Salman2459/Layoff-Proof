import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Edit, Download, Copy, User, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import GlobalHeader from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/useAuth";

interface PersonalData {
  name: string;
  email: string;
  phone: string;
  degree: string;
  university: string;
  profession: string;
  yearsExperience: string;
  currentCompany: string;
  currentLocation: string;
  workArrangement: string;
  mainResponsibility: string;
  topDuty: string;
  skills: string;
  certifications: string;
  tools: string;
}

interface JobDetails {
  position: string;
  company: string;
  reason: string;
}

export default function CoverLetter() {
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadedResume, setUploadedResume] = useState<File | null>(null);
  const [parsedResumeData, setParsedResumeData] = useState<any>(null);
  const [fetchingDataFromFile, setFetchingDataFromFile] = useState<any>(false);
  const [jobDetails, setJobDetails] = useState<JobDetails>({ position: "", company: "", reason: "" });
  const user = useAuth();

  const [personalData, setPersonalData] = useState<PersonalData>({
    name: "", email: "", phone: "", degree: "", university: "", profession: "",
    yearsExperience: "", currentCompany: "", currentLocation: "", workArrangement: "",
    mainResponsibility: "", topDuty: "", skills: "", certifications: "", tools: ""
  });
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // NEW: State for the "Improve with AI" feature
  const [isImproving, setIsImproving] = useState(false);
  const [improvementInstructions, setImprovementInstructions] = useState("");
  const [isImprovingLoading, setIsImprovingLoading] = useState(false);


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedResume(file);
      setParsedResumeData(null);
      setGeneratedLetter("");

      try {
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('id', user?.user?.id);
        setFetchingDataFromFile(true)
        const response = await fetch('/api/upload-resume', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Failed to upload resume');
        }

        const data = await response.json();
        setParsedResumeData(data.parsedData);
        setFetchingDataFromFile(false)

        toast({
          title: "Resume Uploaded!",
          description: "Your resume has been processed and key information extracted.",
        });
      } catch (error) {
        toast({
          title: "Upload Error",
          description: "Failed to process your resume. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const generateCoverLetterFromResume = async () => {
    if (!parsedResumeData || !jobDetails.position || !jobDetails.company) {
      toast({
        title: "Missing Information",
        description: "Please upload a resume and provide all required job details.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log("Generating cover letter from resume...", parsedResumeData);
      const formattedParsedData = {
        name: parsedResumeData.name || "",
        email: parsedResumeData.email || "",
        phone: parsedResumeData.phone || "",
        degree: parsedResumeData.degree || "",
        university: parsedResumeData.university || "",
        profession: parsedResumeData.profession || "",
        yearsExperience: parsedResumeData.yearsExperience || "",
        currentCompany: parsedResumeData.currentCompany || "",
        currentLocation: parsedResumeData.currentLocation || "",
        workArrangement: parsedResumeData.workArrangement || "",
        mainResponsibility: parsedResumeData.mainResponsibility || "",
        topDuty: parsedResumeData.topDuty || "",
        skills: parsedResumeData.skills || "",
        certifications: parsedResumeData.certifications || "",
        tools: parsedResumeData.tools || ""
      };
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsedData: formattedParsedData,
          jobDetails,
          method: "resume",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText);
      }

      const data = await response.json();
      setGeneratedLetter(data.coverLetter);

      if (data.generatedBy === 'ai') {
        toast({
          title: "Success!",
          description: "Your cover letter has been generated using Claude AI.",
        });
      } else {
        toast({
          title: "Generated!",
          description: "Cover letter created using template (AI temporarily unavailable).",
        });
      }
    } catch (error: any) {
      console.error("Cover letter generation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate cover letter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCoverLetterManual = async () => {
    if (!personalData.name || !personalData.profession || !jobDetails.position || !jobDetails.company) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalData,
          jobDetails,
          method: "manual",
          id: user?.user?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText);
      }

      const data = await response.json();
      setGeneratedLetter(data.coverLetter);

      if (data.generatedBy === 'ai') {
        toast({
          title: "Success!",
          description: "Your cover letter has been generated using Claude AI.",
        });
      } else {
        toast({
          title: "Generated!",
          description: "Cover letter created using template (AI temporarily unavailable).",
        });
      }
    } catch (error: any) {
      console.error("Cover letter generation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate cover letter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // NEW: Function to handle the improvement request
  const handleImproveLetter = async () => {
    if (!improvementInstructions.trim()) {
      toast({
        title: "Instructions Required",
        description: "Please tell the AI how to improve your letter.",
        variant: "destructive",
      });
      return;
    }

    setIsImprovingLoading(true);
    try {
      const response = await fetch("/api/improve-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalLetter: generatedLetter,
          instructions: improvementInstructions,
          id: user?.user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to improve the cover letter.");
      }

      const data = await response.json();
      setGeneratedLetter(data.improvedLetter);
      toast({
        title: "Success!",
        description: "Your cover letter has been improved.",
      });
      setIsImproving(false);
      setImprovementInstructions("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not improve the letter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImprovingLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLetter);
    toast({ title: "Copied!", description: "Cover letter copied to clipboard." });
  };

  const downloadLetter = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedLetter], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "cover_letter.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({ title: "Downloaded!", description: "Cover letter downloaded successfully." });
  };

  return (
    // ... (rest of the JSX from <div className="min-h-screen..."> to <main...>)
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <GlobalHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Cover Letter Generator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create professional, personalized cover letters that stand out to employers and get you noticed.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Input Section */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload Resume</span>
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Fill Manually</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Upload Your Resume</span>
                    </CardTitle>
                    <CardDescription>
                      Upload your resume file to extract your information automatically.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        id="resume-upload"
                        accept=".txt,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                        <Upload className="w-12 h-12 text-gray-400" />
                        <span className="text-lg font-medium text-gray-900">Click to upload resume</span>
                        <span className="text-sm text-gray-500">Supports .txt, .pdf, .doc, .docx files</span>
                      </label>
                    </div>

                    {uploadedResume && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                        <p className="text-green-800 font-medium">✓ Resume uploaded: {uploadedResume.name}</p>
                        {parsedResumeData && (
                          <div className="text-sm text-green-700">
                            <p><span className="font-medium">Name:</span> {parsedResumeData.name || "Not detected"}</p>
                            <p><span className="font-medium">Email:</span> {parsedResumeData.email || "Not detected"}</p>
                            <p><span className="font-medium">Profession:</span> {parsedResumeData.profession || "Not detected"}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {fetchingDataFromFile && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                        <p className="text-blue-800 font-medium">Fetching data from file...</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="position">Job Position *</Label>
                        <Input id="position" placeholder="e.g., Software Engineer" value={jobDetails.position} onChange={(e) => setJobDetails({ ...jobDetails, position: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="company">Company Name *</Label>
                        <Input id="company" placeholder="e.g., Google" value={jobDetails.company} onChange={(e) => setJobDetails({ ...jobDetails, company: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="reason">Why this position?</Label>
                        <Input id="reason" placeholder="e.g., career growth, new challenges" value={jobDetails.reason} onChange={(e) => setJobDetails({ ...jobDetails, reason: e.target.value })} />
                      </div>
                    </div>

                    <Button onClick={generateCoverLetterFromResume} disabled={isGenerating || !parsedResumeData} className="w-full bg-blue-600 hover:bg-blue-700">
                      {isGenerating ? (<><Sparkles className="w-4 h-4 mr-2 animate-spin" />Generating with AI...</>) : (<><Sparkles className="w-4 h-4 mr-2" />Generate Cover Letter</>)}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manual" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2"><User className="w-5 h-5" /><span>Personal Information</span></CardTitle>
                    <CardDescription>Fill in your details to generate a professional cover letter.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label htmlFor="name">Full Name *</Label><Input id="name" placeholder="John Doe" value={personalData.name} onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })} /></div>
                      <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" placeholder="john@example.com" value={personalData.email} onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })} /></div>
                      <div><Label htmlFor="phone">Phone Number *</Label><Input id="phone" placeholder="+1 (555) 123-4567" value={personalData.phone} onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })} /></div>
                      <div><Label htmlFor="degree">Degree *</Label><Input id="degree" placeholder="Bachelor's in Computer Science" value={personalData.degree} onChange={(e) => setPersonalData({ ...personalData, degree: e.target.value })} /></div>
                      <div><Label htmlFor="university">University *</Label><Input id="university" placeholder="Stanford University" value={personalData.university} onChange={(e) => setPersonalData({ ...personalData, university: e.target.value })} /></div>
                      <div><Label htmlFor="profession">Profession *</Label><Input id="profession" placeholder="Software Development" value={personalData.profession} onChange={(e) => setPersonalData({ ...personalData, profession: e.target.value })} /></div>
                      <div><Label htmlFor="yearsExperience">Years of Experience *</Label><Input id="yearsExperience" placeholder="5" value={personalData.yearsExperience} onChange={(e) => setPersonalData({ ...personalData, yearsExperience: e.target.value })} /></div>
                      <div><Label htmlFor="currentCompany">Current Company</Label><Input id="currentCompany" placeholder="Tech Corp Inc." value={personalData.currentCompany} onChange={(e) => setPersonalData({ ...personalData, currentCompany: e.target.value })} /></div>
                      <div><Label htmlFor="currentLocation">Current Location</Label><Input id="currentLocation" placeholder="San Francisco, CA" value={personalData.currentLocation} onChange={(e) => setPersonalData({ ...personalData, currentLocation: e.target.value })} /></div>
                      <div><Label htmlFor="workArrangement">Work Arrangement</Label><Input id="workArrangement" placeholder="Remote/Hybrid/Onsite" value={personalData.workArrangement} onChange={(e) => setPersonalData({ ...personalData, workArrangement: e.target.value })} /></div>
                    </div>
                    <div><Label htmlFor="mainResponsibility">Main Responsibility</Label><Textarea id="mainResponsibility" placeholder="Describe your main job responsibility..." value={personalData.mainResponsibility} onChange={(e) => setPersonalData({ ...personalData, mainResponsibility: e.target.value })} /></div>
                    <div><Label htmlFor="topDuty">Top Duty/Achievement</Label><Textarea id="topDuty" placeholder="Describe your top duty or achievement..." value={personalData.topDuty} onChange={(e) => setPersonalData({ ...personalData, topDuty: e.target.value })} /></div>
                    <div><Label htmlFor="skills">Skills & Hard Skills</Label><Textarea id="skills" placeholder="List your relevant skills..." value={personalData.skills} onChange={(e) => setPersonalData({ ...personalData, skills: e.target.value })} /></div>
                    <div><Label htmlFor="certifications">Certifications</Label><Textarea id="certifications" placeholder="List your certifications..." value={personalData.certifications} onChange={(e) => setPersonalData({ ...personalData, certifications: e.target.value })} /></div>
                    <div><Label htmlFor="tools">Tools & Methods</Label><Textarea id="tools" placeholder="Tools and methods you use to stay organized..." value={personalData.tools} onChange={(e) => setPersonalData({ ...personalData, tools: e.target.value })} /></div>
                    <div className="border-t pt-4"><h3 className="font-semibold mb-4">Job Details</h3>
                      <div className="space-y-4">
                        <div><Label htmlFor="manual-position">Position Applied For *</Label><Input id="manual-position" placeholder="e.g., Software Engineer" value={jobDetails.position} onChange={(e) => setJobDetails({ ...jobDetails, position: e.target.value })} /></div>
                        <div><Label htmlFor="manual-company">Company Name *</Label><Input id="manual-company" placeholder="e.g., Google" value={jobDetails.company} onChange={(e) => setJobDetails({ ...jobDetails, company: e.target.value })} /></div>
                        <div><Label htmlFor="manual-reason">Reason for Interest *</Label><Input id="manual-reason" placeholder="e.g., career advancement, skill development" value={jobDetails.reason} onChange={(e) => setJobDetails({ ...jobDetails, reason: e.target.value })} /></div>
                      </div>
                    </div>
                    <Button onClick={generateCoverLetterManual} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-700">
                      {isGenerating ? (<><Sparkles className="w-4 h-4 mr-2 animate-spin" />Generating with AI...</>) : (<><Sparkles className="w-4 h-4 mr-2" />Generate Cover Letter</>)}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Output Section */}
          <div>
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Cover Letter</span>
                  {generatedLetter && (
                    <div className="flex space-x-2">
                      {/* NEW: Improve with AI button */}
                      {!isImproving && (
                        <Button variant="outline" size="sm" onClick={() => setIsImproving(true)}>
                          <Sparkles className="w-4 h-4 mr-1" />
                          Improve
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={copyToClipboard}><Copy className="w-4 h-4 mr-1" />Copy</Button>
                      <Button variant="outline" size="sm" onClick={downloadLetter}><Download className="w-4 h-4 mr-1" />Download</Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generatedLetter ? (
                  <div className="space-y-4">
                    <Textarea
                      value={generatedLetter}
                      onChange={(e) => setGeneratedLetter(e.target.value)}
                      className="min-h-[500px] font-mono text-sm"
                      placeholder="Your generated cover letter will appear here..."
                    />
                    {/* NEW: Improvement UI */}
                    {isImproving && (
                      <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
                        <Label htmlFor="improve-instructions" className="font-semibold text-gray-800">
                          How should we improve this letter?
                        </Label>
                        <Textarea
                          id="improve-instructions"
                          placeholder="e.g., Make it more formal, shorten the second paragraph, add a sentence about my passion for AI..."
                          value={improvementInstructions}
                          onChange={(e) => setImprovementInstructions(e.target.value)}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" onClick={() => setIsImproving(false)}>Cancel</Button>
                          <Button onClick={handleImproveLetter} disabled={isImprovingLoading}>
                            {isImprovingLoading ? (
                              <><Sparkles className="w-4 h-4 mr-2 animate-spin" />Improving...</>
                            ) : (
                              <><Sparkles className="w-4 h-4 mr-2" />Submit Improvement</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No cover letter generated yet</p>
                    <p className="text-sm">Upload your resume or fill the form to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}