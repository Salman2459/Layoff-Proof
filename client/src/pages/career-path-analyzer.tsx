import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Map, 
  Compass,
  Plus,
  Trash2,
  ChevronRight,
  ArrowRight,
  CheckCircle,
  Clock,
  Star,
  Users
} from "lucide-react";

interface CareerPathData {
  currentRole: string;
  experienceYears: number;
  skills: string[];
  interests: string[];
  goals: string[];
}

export default function CareerPathAnalyzer() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CareerPathData>({
    currentRole: "",
    experienceYears: 0,
    skills: [""],
    interests: [""],
    goals: [""]
  });
  const [analysis, setAnalysis] = useState<any>(null);

  // Fetch existing career paths
  const { data: existingPaths } = useQuery({
    queryKey: ["/api/career-paths"],
    enabled: isAuthenticated,
  });

  // Generate career path analysis mutation
  const generateAnalysisMutation = useMutation({
    mutationFn: async (data: CareerPathData) => {
      const payload = {
        currentRole: data.currentRole,
        experienceYears: data.experienceYears,
        skills: data.skills.filter(s => s.trim()),
        interests: data.interests.filter(i => i.trim()),
        goals: data.goals.filter(g => g.trim())
      };
      
      return await apiRequest("POST", "/api/career-paths", payload);
    },
    onSuccess: (response) => {
      setAnalysis(response);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ["/api/career-paths"] });
      toast({
        title: "Analysis Complete",
        description: "Your personalized career path analysis is ready!"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate analysis. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.currentRole || formData.experienceYears <= 0) {
        toast({
          title: "Missing Information",
          description: "Please provide your current role and experience level.",
          variant: "destructive"
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.skills.filter(s => s.trim()).length === 0) {
        toast({
          title: "Missing Information",
          description: "Please add at least one skill.",
          variant: "destructive"
        });
        return;
      }
      generateAnalysisMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    setStep(Math.max(1, step - 1));
  };

  const addArrayField = (field: 'skills' | 'interests' | 'goals') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ""]
    }));
  };

  const removeArrayField = (field: 'skills' | 'interests' | 'goals', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayField = (field: 'skills' | 'interests' | 'goals', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const startNewAnalysis = () => {
    setFormData({
      currentRole: "",
      experienceYears: 0,
      skills: [""],
      interests: [""],
      goals: [""]
    });
    setAnalysis(null);
    setStep(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <GlobalHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <GlobalHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Access Required</h1>
          <p className="text-xl text-gray-600 mb-8">Please log in to access the Career Path Analyzer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <GlobalHeader />

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold">Career Path Analyzer</h1>
            </div>
            <p className="text-xl text-pink-100 max-w-3xl mx-auto">
              Discover your ideal career trajectory with AI-powered analysis and personalized recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? 'text-pink-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-pink-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Current Situation</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className={`flex items-center ${step >= 2 ? 'text-pink-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-pink-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Skills & Interests</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className={`flex items-center ${step >= 3 ? 'text-pink-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-pink-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Career Paths</span>
            </div>
          </div>
        </div>

        {/* Step 1: Current Situation */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="w-5 h-5" />
                Current Career Situation
              </CardTitle>
              <CardDescription>
                Tell us about your current role and experience level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="currentRole">Current Role *</Label>
                <Input
                  id="currentRole"
                  value={formData.currentRole}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentRole: e.target.value }))}
                  placeholder="e.g. Software Engineer, Marketing Manager, Data Analyst"
                />
              </div>

              <div>
                <Label htmlFor="experienceYears">Years of Experience *</Label>
                <Select 
                  value={formData.experienceYears.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, experienceYears: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">0-1 years (Entry Level)</SelectItem>
                    <SelectItem value="3">2-3 years</SelectItem>
                    <SelectItem value="5">4-5 years</SelectItem>
                    <SelectItem value="7">6-7 years</SelectItem>
                    <SelectItem value="10">8-10 years</SelectItem>
                    <SelectItem value="15">11-15 years</SelectItem>
                    <SelectItem value="20">16+ years (Senior/Executive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNext} className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700">
                  Next Step
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Skills & Interests */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Skills, Interests & Goals
              </CardTitle>
              <CardDescription>
                Help us understand your strengths and career aspirations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">Your Skills *</Label>
                <p className="text-sm text-gray-600 mb-3">What are you good at? Include both technical and soft skills.</p>
                {formData.skills.map((skill, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={skill}
                      onChange={(e) => updateArrayField('skills', index, e.target.value)}
                      placeholder="e.g. JavaScript, Leadership, Data Analysis, Communication"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayField('skills', index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayField('skills')}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Skill
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Your Interests</Label>
                <p className="text-sm text-gray-600 mb-3">What aspects of work do you enjoy most?</p>
                {formData.interests.map((interest, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={interest}
                      onChange={(e) => updateArrayField('interests', index, e.target.value)}
                      placeholder="e.g. Problem solving, Team collaboration, Creative design, Strategy"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayField('interests', index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayField('interests')}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Interest
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Career Goals</Label>
                <p className="text-sm text-gray-600 mb-3">Where do you want to be in 3-5 years?</p>
                {formData.goals.map((goal, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={goal}
                      onChange={(e) => updateArrayField('goals', index, e.target.value)}
                      placeholder="e.g. Lead a team, Start my own company, Become a senior architect"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayField('goals', index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayField('goals')}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Goal
                </Button>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={generateAnalysisMutation.isPending}
                  className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                >
                  {generateAnalysisMutation.isPending ? "Analyzing Career Paths..." : "Analyze Career Paths"}
                  <TrendingUp className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Career Path Results */}
        {step === 3 && analysis && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5" />
                  Your Career Path Analysis
                </CardTitle>
                <CardDescription>
                  AI-generated recommendations based on your profile and market trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="w-6 h-6 text-pink-600" />
                      </div>
                      <p className="text-sm text-gray-600">Current Role</p>
                      <p className="font-semibold text-gray-900">{formData.currentRole}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-6 h-6 text-purple-600" />
                      </div>
                      <p className="text-sm text-gray-600">Experience</p>
                      <p className="font-semibold text-gray-900">{formData.experienceYears} years</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Star className="w-6 h-6 text-indigo-600" />
                      </div>
                      <p className="text-sm text-gray-600">Key Skills</p>
                      <p className="font-semibold text-gray-900">{formData.skills.filter(s => s.trim()).length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Career Pathways */}
            {analysis.pathways && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Recommended Career Pathways
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {analysis.pathways.map((pathway: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{pathway.title}</h4>
                            <p className="text-sm text-gray-600">{pathway.description}</p>
                          </div>
                          <Badge className={`${
                            pathway.difficulty === 'Low' ? 'bg-green-100 text-green-800' :
                            pathway.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {pathway.difficulty} Difficulty
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Timeline</h5>
                            <p className="text-sm text-gray-600">{pathway.timeline}</p>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Salary Range</h5>
                            <p className="text-sm text-gray-600">{pathway.salaryRange}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h5 className="font-medium text-gray-900 mb-2">Required Skills</h5>
                          <div className="flex flex-wrap gap-2">
                            {pathway.requiredSkills?.map((skill: string, skillIndex: number) => (
                              <Badge key={skillIndex} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Next Steps</h5>
                          <ul className="space-y-1">
                            {pathway.nextSteps?.map((step: string, stepIndex: number) => (
                              <li key={stepIndex} className="flex items-start gap-2 text-sm text-gray-600">
                                <ArrowRight className="w-4 h-4 text-pink-600 mt-0.5 flex-shrink-0" />
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            {analysis.nextSteps && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Immediate Action Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {analysis.nextSteps.map((step: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-pink-600">{index + 1}</span>
                        </div>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={startNewAnalysis}
                variant="outline"
              >
                Create New Analysis
              </Button>
            </div>
          </div>
        )}

        {/* Previous Analyses */}
        {existingPaths && existingPaths.length > 0 && step === 1 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                Previous Analyses
              </CardTitle>
              <CardDescription>
                Your past career path explorations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {existingPaths.map((path: any) => (
                  <div key={path.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{path.currentRole}</h4>
                        <p className="text-sm text-gray-600">{path.experienceYears} years experience</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {path.skills?.slice(0, 3).map((skill: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {path.skills?.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{path.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(path.createdAt).toLocaleDateString()}
                      </Badge>
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