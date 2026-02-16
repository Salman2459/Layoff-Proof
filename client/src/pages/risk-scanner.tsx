import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, TrendingDown, TrendingUp, Lightbulb, Target, Users, DollarSign } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RiskAnalysis {
  riskLevel: "low" | "medium" | "high" | "critical";
  riskScore: number;
  summary: string;
  companyHealth: {
    score: number;
    factors: string[];
  };
  jobTitleRisk: {
    score: number;
    trends: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  skillGaps: string[];
  marketOutlook: string;
}

const jobTitles = [
  "Software Engineer",
  "Product Manager",
  "Data Scientist", 
  "Marketing Manager",
  "Sales Representative",
  "Customer Success Manager",
  "Human Resources",
  "Operations Manager",
  "Business Analyst",
  "UX/UI Designer",
  "DevOps Engineer",
  "Quality Assurance",
  "Content Marketing",
  "Financial Analyst",
  "Project Manager",
  "Customer Support",
  "Administrative Assistant",
  "Recruiter",
  "Account Manager",
  "Research Scientist"
];

export default function RiskScanner() {
  const [formData, setFormData] = useState({
    jobTitle: "",
    companyName: "",
    yearsExperience: "",
    currentSkills: "",
    industry: ""
  });

  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
  const { toast } = useToast();

  const analyzeRiskMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/risk-analysis", data);
      if (!response.ok) {
        throw new Error("Failed to analyze risk");
      }
      return response.json();
    },
    onSuccess: (result: RiskAnalysis) => {
      setAnalysis(result);
      toast({
        title: "Analysis Complete",
        description: "Your job security risk analysis is ready",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jobTitle || !formData.companyName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    analyzeRiskMutation.mutate(formData);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-lg";
      case "medium": return "text-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-lg";
      case "high": return "text-orange-700 bg-gradient-to-r from-orange-50 to-red-50 border-orange-300 shadow-lg";
      case "critical": return "text-red-700 bg-gradient-to-r from-red-50 to-pink-50 border-red-300 shadow-lg";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "low": return <Shield className="h-5 w-5" />;
      case "medium": return <TrendingUp className="h-5 w-5" />;
      case "high": return <AlertTriangle className="h-5 w-5" />;
      case "critical": return <TrendingDown className="h-5 w-5" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-4">
            AI Job Security Risk Scanner
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get personalized insights about your job security and actionable recommendations to protect your career
          </p>
        </div>

        <Card className="mb-8 border-0 shadow-2xl bg-gradient-to-r from-white to-purple-50 dark:from-gray-800 dark:to-gray-700">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Risk Analysis Form
            </CardTitle>
            <CardDescription className="text-purple-100">
              Provide your job details for a comprehensive security analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Select value={formData.jobTitle} onValueChange={(value) => setFormData({...formData, jobTitle: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your job title" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobTitles.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="Enter your company name"
                  />
                </div>

                <div>
                  <Label htmlFor="yearsExperience">Years of Experience</Label>
                  <Input
                    id="yearsExperience"
                    type="number"
                    value={formData.yearsExperience}
                    onChange={(e) => setFormData({...formData, yearsExperience: e.target.value})}
                    placeholder="e.g., 3"
                  />
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    placeholder="e.g., Technology, Finance, Healthcare"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="currentSkills">Current Skills & Technologies</Label>
                <Textarea
                  id="currentSkills"
                  value={formData.currentSkills}
                  onChange={(e) => setFormData({...formData, currentSkills: e.target.value})}
                  placeholder="List your key skills, technologies, and certifications..."
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200" 
                disabled={analyzeRiskMutation.isPending}
              >
                {analyzeRiskMutation.isPending ? "Analyzing..." : "Analyze Job Security Risk"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {analysis && (
          <div className="space-y-6">
            {/* Risk Overview */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700">
              <CardHeader className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  {getRiskIcon(analysis.riskLevel)}
                  Risk Assessment Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={`px-3 py-1 ${getRiskColor(analysis.riskLevel)}`}>
                      {analysis.riskLevel.toUpperCase()} RISK
                    </Badge>
                    <span className="text-2xl font-bold">{analysis.riskScore}/100</span>
                  </div>
                  <Progress value={analysis.riskScore} className="w-full" />
                  <p className="text-gray-700 dark:text-gray-300">{analysis.summary}</p>
                </div>
              </CardContent>
            </Card>

            {/* Company & Job Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Company Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Health Score</span>
                      <span className="font-bold">{analysis.companyHealth.score}/100</span>
                    </div>
                    <Progress value={analysis.companyHealth.score} />
                    <div className="space-y-2">
                      {analysis.companyHealth.factors.map((factor, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          • {factor}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Job Title Risk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Role Security</span>
                      <span className="font-bold">{analysis.jobTitleRisk.score}/100</span>
                    </div>
                    <Progress value={analysis.jobTitleRisk.score} />
                    <div className="space-y-2">
                      {analysis.jobTitleRisk.trends.map((trend, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          • {trend}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Market Outlook */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-700">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Market Outlook
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300">{analysis.marketOutlook}</p>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-800 dark:to-gray-700">
              <CardHeader className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Personalized Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Immediate Actions
                    </h4>
                    <ul className="space-y-2">
                      {analysis.recommendations.immediate.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="text-red-500">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-lg border border-amber-200">
                    <h4 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Short-term (1-6 months)
                    </h4>
                    <ul className="space-y-2">
                      {analysis.recommendations.shortTerm.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
                    <h4 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Long-term (6+ months)
                    </h4>
                    <ul className="space-y-2">
                      {analysis.recommendations.longTerm.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="text-emerald-500">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skill Gaps */}
            {analysis.skillGaps.length > 0 && (
              <Card className="border-0 shadow-xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-800 dark:to-gray-700">
                <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Skill Development Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {analysis.skillGaps.map((skill, index) => (
                      <Badge 
                        key={index} 
                        className="bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-700 border-teal-300 hover:from-teal-200 hover:to-cyan-200 transition-all duration-200 shadow-sm"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}