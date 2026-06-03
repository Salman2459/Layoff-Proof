import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Copy,
  Send,
  Sparkles,
  Mail,
  Linkedin,
  Users,
  Target,
  RefreshCw,
  CheckCircle,
  Clock
} from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/useAuth";

const messageTypes = [
  { id: "linkedin-dm", name: "LinkedIn DM", icon: Linkedin },
  { id: "email", name: "Cold Email", icon: Mail },
  { id: "referral", name: "Referral Request", icon: Users }
];

const industries = [
  "Technology", "Finance", "Healthcare", "Marketing", "Sales",
  "Consulting", "Education", "Manufacturing", "Retail", "Media"
];

const experienceLevels = [
  "Entry Level (0-2 years)",
  "Mid Level (3-5 years)",
  "Senior Level (6-10 years)",
  "Lead/Manager (10+ years)",
  "Executive (15+ years)"
];

export default function RecruiterOutreach() {
  const [activeTab, setActiveTab] = useState("linkedin-dm");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");

  // Form fields state
  const [recruiterName, setRecruiterName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [yourName, setYourName] = useState("");
  const [yourRole, setYourRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [experience, setExperience] = useState("");
  const [tone, setTone] = useState("professional");
  const { user } = useAuth()

  /**
   * NEW: generateMessage function
   * This function now sends all form data to the AI backend endpoint
   * to generate a message dynamically for any selected type.
   */
  const generateMessage = async () => {
    setIsGenerating(true);
    setGeneratedMessage(""); // Clear previous message

    try {
      const response = await fetch("/api/generate-outreach-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageType: activeTab,
          recruiterName,
          companyName,
          jobTitle,
          yourName,
          yourRole,
          industry,
          experience,
          tone,
          id: user?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate message from server");
      }

      const data = await response.json();
      setGeneratedMessage(data.generatedMessage);

    } catch (error) {
      console.error("Error generating message:", error);
      setGeneratedMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}. Please check the console and try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    // You could add a toast notification here to confirm copying
  };

  const MessageTypeIcon = messageTypes.find(type => type.id === activeTab)?.icon || MessageSquare;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <GlobalHeader />

      {/* Tool Description */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 border-b bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Generate Personalized Outreach Scripts
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Create compelling LinkedIn DMs, cold emails, and referral requests that get noticed by recruiters.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">
                <Target className="w-3 h-3 mr-1" />
                Personalized
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Powered
              </Badge>
              <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                <MessageSquare className="w-3 h-3 mr-1" />
                Multi-platform
              </Badge>
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10 mt-8">
            <div className="space-y-3 lg:pr-4 text-left">
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                Walkthrough
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                See recruiter outreach in action
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-md">
                A quick tour of how to generate scripts and tailor them before you reach out.
              </p>
            </div>
            <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-black shadow-sm aspect-video dark:border-gray-700 sm:max-w-lg lg:mx-0 lg:max-w-none">
  <iframe
    width="560"
    height="315"
    src="https://www.youtube-nocookie.com/embed/HdGQ1lClP3E?si=3YVDf6AiestQJl0Z&controls=0&autoplay=1&mute=0"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Message Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>1. Select Message Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    {messageTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <TabsTrigger key={type.id} value={type.id} className="flex items-center space-x-2">
                          <IconComponent className="w-4 h-4" />
                          <span className="hidden sm:inline">{type.name}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Form Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageTypeIcon className="w-5 h-5 mr-2" />
                  2. Provide Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Your Name</label>
                    <Input
                      placeholder="John Doe"
                      value={yourName}
                      onChange={(e) => setYourName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Your Current Role</label>
                    <Input
                      placeholder="Software Engineer"
                      value={yourRole}
                      onChange={(e) => setYourRole(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Recipient's Name</label>
                    <Input
                      placeholder="Jane Smith"
                      value={recruiterName}
                      onChange={(e) => setRecruiterName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company Name</label>
                    <Input
                      placeholder="Google, Microsoft, etc."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Target Job Title</label>
                  <Input
                    placeholder="Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((ind) => (
                          <SelectItem key={ind} value={ind.toLowerCase()}>
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Experience Level</label>
                    <Select value={experience} onValueChange={setExperience}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience" />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={generateMessage}
                  disabled={isGenerating || !yourName}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg py-6"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Generating Message...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate {messageTypes.find(type => type.id === activeTab)?.name}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Generated Message</CardTitle>
                  {generatedMessage && !generatedMessage.startsWith("Error:") && (
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={copyToClipboard}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500">
                        <Send className="w-4 h-4 mr-2" />
                        Use
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
                    <div>
                      <RefreshCw className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600 mb-2">AI is crafting your message...</p>
                      <p className="text-sm text-gray-500">This may take a few seconds</p>
                    </div>
                  </div>
                ) : generatedMessage ? (
                  <div className={`bg-white border rounded-lg p-6 min-h-[400px] font-mono text-sm whitespace-pre-wrap ${generatedMessage.startsWith("Error:") ? 'text-red-600' : ''}`}>
                    {generatedMessage}
                  </div>
                ) : (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
                    <div>
                      <MessageTypeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Your personalized message will appear here</p>
                      <p className="text-sm text-gray-500">Fill in the details and click generate</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {generatedMessage && !generatedMessage.startsWith("Error:") && (
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Suggestions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Personalization: High</p>
                      <p className="text-xs text-gray-600">Includes placeholders for you to add specific skills or reasons for interest.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Target className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Next Step: Finalize</p>
                      <p className="text-xs text-gray-600">Fill in the bracketed `[...]` information for maximum impact.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={generateMessage} disabled={isGenerating || !yourName}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Alternative Version
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Make it More Personal (Coming Soon)
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Clock className="w-4 h-4 mr-2" />
                  Create Follow-up Message (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tips Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Outreach Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-indigo-600">Research First</h3>
                <p className="text-sm text-gray-600">
                  Always research the recipient and company before reaching out. Mention specific details to show genuine interest.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-purple-600">Be Concise</h3>
                <p className="text-sm text-gray-600">
                  Keep messages short and focused. Recruiters are busy - make your value proposition clear quickly.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-pink-600">Follow Up</h3>
                <p className="text-sm text-gray-600">
                  If you don't hear back in a week, send a polite follow-up. Persistence shows genuine interest.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}