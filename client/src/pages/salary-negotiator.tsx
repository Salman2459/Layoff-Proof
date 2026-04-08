import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, getApiErrorMessage, queryClient } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  Award, 
  Briefcase,
  Plus,
  Trash2,
  Loader2,
  ChevronRight,
  FileText,
  BarChart3
} from "lucide-react";

interface SalaryData {
  jobTitle: string;
  location: string;
  experienceLevel: string;
  currentSalary: string;
  targetSalary: string;
  strengths: string[];
  achievements: string[];
  companySize: string;
  industry: string;
}

export default function SalaryNegotiator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [deletingResearchId, setDeletingResearchId] = useState<string | null>(
    null,
  );
  const [formData, setFormData] = useState<SalaryData>({
    jobTitle: "",
    location: "",
    experienceLevel: "",
    currentSalary: "",
    targetSalary: "",
    strengths: [""],
    achievements: [""],
    companySize: "",
    industry: ""
  });
  const [strategy, setStrategy] = useState<any>(null);
  const cleanedStrategyText = String(strategy?.negotiationStrategy || "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}#{1,6}\s*$/gm, "")
    .trim();

  // Fetch existing salary research
  const { data: existingResearch } = useQuery({
    queryKey: ["/api/salary-research"],
    enabled: isAuthenticated,
  });

  // Generate negotiation strategy mutation
  const generateStrategyMutation = useMutation({
    mutationFn: async (data: SalaryData) => {
      const payload = {
        jobTitle: data.jobTitle,
        location: data.location,
        experienceLevel: data.experienceLevel,
        currentSalary: parseInt(data.currentSalary),
        targetSalary: parseInt(data.targetSalary),
        strengths: data.strengths.filter(s => s.trim()),
        achievements: data.achievements.filter(a => a.trim()),
        companySize: data.companySize,
        industry: data.industry
      };
      
      return await apiRequest("POST", "/api/salary-research", payload);
    },
    onSuccess: (response) => {
      setStrategy(response);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ["/api/salary-research"] });
      toast({
        title: "Strategy Generated",
        description: "Your personalized salary negotiation strategy is ready!"
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(
          error,
          "Failed to generate strategy. Please try again."
        ),
        variant: "destructive",
      });
    },
  });

  const deleteResearchMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/salary-research/${id}`);
    },
    onMutate: async (id: string) => {
      setDeletingResearchId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-research"] });
      toast({
        title: "Deleted",
        description: "Previous research removed.",
      });
    },
    onSettled: () => {
      setDeletingResearchId(null);
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to delete research."),
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1) {
      // Validate basic information
      if (!formData.jobTitle || !formData.location || !formData.experienceLevel) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate salary and background info
      if (!formData.currentSalary || !formData.targetSalary || formData.strengths.filter(s => s.trim()).length === 0) {
        toast({
          title: "Missing Information",
          description: "Please provide salary information and at least one strength.",
          variant: "destructive"
        });
        return;
      }
      generateStrategyMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    setStep(Math.max(1, step - 1));
  };

  const addArrayField = (field: 'strengths' | 'achievements') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ""]
    }));
  };

  const removeArrayField = (field: 'strengths' | 'achievements', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayField = (field: 'strengths' | 'achievements', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const startNewResearch = () => {
    setFormData({
      jobTitle: "",
      location: "",
      experienceLevel: "",
      currentSalary: "",
      targetSalary: "",
      strengths: [""],
      achievements: [""],
      companySize: "",
      industry: ""
    });
    setStrategy(null);
    setStep(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50">
        <GlobalHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-yellow-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50">
        <GlobalHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Access Required</h1>
          <p className="text-xl text-gray-600 mb-8">Please log in to access the Salary Negotiator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lp-page-mesh">
      <GlobalHeader />

      {/* Header */}
      <div className="lp-gradient-fill text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">
                <DollarSign className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold">Salary Negotiator</h1>
            </div>
            <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
              Get data-driven insights and proven strategies for successful salary negotiations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Job Details</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Background & Goals</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className={`flex items-center ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Strategy</span>
            </div>
          </div>
        </div>

        {/* Step 1: Job Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Job Information
              </CardTitle>
              <CardDescription>
                Tell us about the role you're negotiating for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  placeholder="e.g. Software Engineer, Product Manager"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
                <div>
                  <Label htmlFor="experienceLevel">Experience Level *</Label>
                  <Select value={formData.experienceLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, experienceLevel: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                      <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                      <SelectItem value="senior">Senior Level (6-10 years)</SelectItem>
                      <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g. Technology, Healthcare"
                  />
                </div>
                <div>
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select value={formData.companySize} onValueChange={(value) => setFormData(prev => ({ ...prev, companySize: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">Startup (1-50)</SelectItem>
                      <SelectItem value="small">Small (51-200)</SelectItem>
                      <SelectItem value="medium">Medium (201-1000)</SelectItem>
                      <SelectItem value="large">Large (1000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNext} className="lp-gradient-fill text-primary-foreground border-0">
                  Next Step
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Background & Goals */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Salary Information & Background
              </CardTitle>
              <CardDescription>
                Provide your current situation and negotiation goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentSalary">Current Salary *</Label>
                  <Input
                    id="currentSalary"
                    type="number"
                    value={formData.currentSalary}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentSalary: e.target.value }))}
                    placeholder="75000"
                  />
                </div>
                <div>
                  <Label htmlFor="targetSalary">Target Salary *</Label>
                  <Input
                    id="targetSalary"
                    type="number"
                    value={formData.targetSalary}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetSalary: e.target.value }))}
                    placeholder="95000"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Your Key Strengths *</Label>
                <p className="text-sm text-gray-600 mb-3">What makes you valuable? (skills, experience, unique qualities)</p>
                {formData.strengths.map((strength, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={strength}
                      onChange={(e) => updateArrayField('strengths', index, e.target.value)}
                      placeholder="e.g. Expert in React and Node.js, 5+ years leadership experience"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayField('strengths', index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayField('strengths')}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Strength
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Key Achievements</Label>
                <p className="text-sm text-gray-600 mb-3">Quantifiable accomplishments that demonstrate your impact</p>
                {formData.achievements.map((achievement, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={achievement}
                      onChange={(e) => updateArrayField('achievements', index, e.target.value)}
                      placeholder="e.g. Increased team productivity by 30%, Led $2M project to completion"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayField('achievements', index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayField('achievements')}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Achievement
                </Button>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={generateStrategyMutation.isPending}
                  className="lp-gradient-fill text-primary-foreground border-0"
                >
                  {generateStrategyMutation.isPending ? "Generating Strategy..." : "Generate Strategy"}
                  <TrendingUp className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Strategy Results */}
        {step === 3 && strategy && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 uppercase font-extrabold tracking-[0.16em]">
                  <Award className="w-5 h-5" />
                  Your Personalized Negotiation Strategy
                </CardTitle>
                <CardDescription>
                  AI-generated strategy based on your background and market data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Salary Range Analysis</h3>
                    <Badge className="bg-green-100 text-green-800">
                      {((parseInt(formData.targetSalary) - parseInt(formData.currentSalary)) / parseInt(formData.currentSalary) * 100).toFixed(1)}% Increase
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Current</p>
                      <p className="text-xl font-bold text-gray-900">${parseInt(formData.currentSalary).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Target</p>
                      <p className="text-xl font-bold text-primary">${parseInt(formData.targetSalary).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Market Average</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${strategy.marketData?.averageSalary ? parseInt(strategy.marketData.averageSalary).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {strategy.negotiationStrategy && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 uppercase font-extrabold tracking-[0.16em]">
                    <FileText className="w-5 h-5" />
                    Negotiation Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {cleanedStrategyText}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Your Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {formData.strengths.filter(s => s.trim()).map((strength, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Key Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {formData.achievements.filter(a => a.trim()).map((achievement, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-gray-700">{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={startNewResearch}
                variant="outline"
                className="mr-4"
              >
                Create New Research
              </Button>
            </div>
          </div>
        )}

        {/* Existing Research */}
        {existingResearch && existingResearch.length > 0 && step === 1 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Previous Research
              </CardTitle>
              <CardDescription>
                Your past salary research and strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {existingResearch.map((research: any) => (
                  <div key={research.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{research.jobTitle}</h4>
                        <p className="text-sm text-gray-600">{research.location} • {research.experienceLevel}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>Current: ${parseInt(research.currentSalary).toLocaleString()}</span>
                          <span>Target: ${parseInt(research.targetSalary).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {new Date(research.createdAt).toLocaleDateString()}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => deleteResearchMutation.mutate(research.id)}
                          disabled={deleteResearchMutation.isPending}
                          aria-label="Delete previous research"
                        >
                          {deletingResearchId === research.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}