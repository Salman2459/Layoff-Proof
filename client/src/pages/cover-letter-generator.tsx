import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mail,
  Sparkles,
  Copy,
  Download,
  RefreshCw,
  Star,
  Target,
  FileText,
  Wand2
} from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";

export default function CoverLetterGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingJob, setIsExtractingJob] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [extractedJobData, setExtractedJobData] = useState<any>(null);
  const [tone, setTone] = useState("professional");
  const [experience, setExperience] = useState("");

  const extractJobData = async () => {
    if (!jobUrl.trim()) return;

    setIsExtractingJob(true);
    try {
      const response = await fetch('/api/extract-job-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobUrl: jobUrl.trim() }),
      });

      if (response.ok) {
        const jobData = await response.json();
        setExtractedJobData(jobData);
        setJobTitle(jobData.title || "");
        setCompanyName(jobData.company || "");
        setJobDescription(jobData.description || "");
      } else {
        console.error('Failed to extract job data');
      }
    } catch (error) {
      console.error('Error extracting job data:', error);
    } finally {
      setIsExtractingJob(false);
    }
  };

  const generateCoverLetter = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobTitle,
          companyName,
          jobDescription,
          extractedJobData,
          experience,
          tone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedLetter(data.coverLetter);
      } else {
        // Fallback to sample generation
        const sampleLetter = `Dear Hiring Manager,

I am excited to apply for the ${jobTitle || "[Position]"} role at ${companyName || "[Company]"}. With my background in ${experience || "relevant field"}, I am confident that I can contribute meaningfully to your team.

${jobDescription ? `Having reviewed the job description, I am particularly drawn to the opportunity to ${jobDescription.slice(0, 100)}...` : "I am impressed by your company's commitment to innovation and excellence."}

${extractedJobData?.requirements ? `I believe my experience aligns well with your requirements, particularly:
${extractedJobData.requirements.slice(0, 3).map((req: string) => `• ${req}`).join('\n')}` : `In my previous roles, I have developed strong skills in:
• Problem-solving and analytical thinking
• Team collaboration and communication
• ${experience || "Technical expertise"}`}

I am eager to bring my passion and expertise to ${companyName || "your organization"} and would welcome the opportunity to discuss how my background aligns with your needs.

Thank you for your consideration.

Best regards,
[Your Name]`;

        setGeneratedLetter(sampleLetter);
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLetter);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <GlobalHeader />

      {/* Tool Description */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 border-b bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Generate Personalized Cover Letters
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Create compelling cover letters that perfectly match job descriptions and company culture using AI.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Target className="w-3 h-3 mr-1" />
              Job Matching
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
              <Wand2 className="w-3 h-3 mr-1" />
              Personalized
            </Badge>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wand2 className="w-5 h-5 mr-2 text-blue-500" />
                  Job URL (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Job Posting URL</label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      placeholder="https://jobs.example.com/software-engineer"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                    />
                    <Button
                      onClick={extractJobData}
                      disabled={isExtractingJob || !jobUrl.trim()}
                      variant="outline"
                    >
                      {isExtractingJob ? "Extracting..." : "Extract"}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    We'll automatically extract job details from LinkedIn, Indeed, and other job sites
                  </p>
                </div>

                {extractedJobData && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800">Job data extracted successfully!</span>
                    </div>
                    <div className="text-xs text-green-700">
                      Found: {extractedJobData.title} at {extractedJobData.company}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wand2 className="w-5 h-5 mr-2 text-purple-500" />
                  Job Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Job Title</label>
                  <Input
                    placeholder="e.g., Software Engineer, Marketing Manager"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <Input
                    placeholder="e.g., Google, Microsoft, Startup Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Your Relevant Experience</label>
                  <Input
                    placeholder="e.g., 5 years in software development"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Description {extractedJobData ? "(Auto-filled)" : "(Optional)"}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={extractedJobData ? "Job description extracted from URL..." : "Paste the job description here to generate a more targeted cover letter..."}
                  rows={6}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className={extractedJobData ? "bg-blue-50" : ""}
                />
                {extractedJobData && (
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Description was automatically extracted from the job URL. You can edit it above.
                  </p>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={generateCoverLetter}
              disabled={isGenerating || !jobTitle || !companyName}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg py-6"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Generating Your Cover Letter...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Cover Letter
                </>
              )}
            </Button>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Generated Cover Letter</CardTitle>
                  {generatedLetter && (
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={copyToClipboard}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {generatedLetter ? (
                  <div className="bg-white border rounded-lg p-6 min-h-[500px] font-mono text-sm whitespace-pre-wrap">
                    {generatedLetter}
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center min-h-[500px] flex items-center justify-center">
                    <div>
                      <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Your cover letter will appear here</p>
                      <p className="text-sm text-gray-500">Fill in the job information and click generate</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {generatedLetter && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate with Different Tone
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Make it More Specific
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Use Different Template
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Job Data Preview */}
            {extractedJobData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-green-600" />
                    Extracted Job Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Position & Company</h4>
                    <p className="text-sm">{extractedJobData.title} at {extractedJobData.company}</p>
                    <p className="text-xs text-gray-500">{extractedJobData.location} • {extractedJobData.type}</p>
                  </div>

                  {extractedJobData.salary && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700">Salary Range</h4>
                      <p className="text-sm">{extractedJobData.salary}</p>
                    </div>
                  )}

                  {extractedJobData.requirements && (
                    <div>
                      <h4 className="font-semibold text-sm text-gray-700">Key Requirements</h4>
                      <ul className="text-sm space-y-1">
                        {extractedJobData.requirements.slice(0, 3).map((req: string, index: number) => (
                          <li key={index} className="text-xs text-gray-600">• {req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Cover Letter Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-green-600">Personalization</h3>
                <p className="text-sm text-gray-600">
                  Always customize your cover letter for each job application. Mention specific company details and job requirements.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-teal-600">Keep it Concise</h3>
                <p className="text-sm text-gray-600">
                  Aim for 3-4 paragraphs maximum. Hiring managers spend only seconds scanning cover letters.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-blue-600">Show Value</h3>
                <p className="text-sm text-gray-600">
                  Focus on what you can do for the company, not what the company can do for you. Highlight relevant achievements.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}