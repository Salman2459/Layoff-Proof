import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  ArrowRight,
  CheckCircle,
  Users,
  Award,
  TrendingUp,
  FileText,
  Mail,
  Linkedin,
  MessageSquare,
  Target,
  TrendingDown,
  Globe,
  Briefcase,
  BarChart3,
  Lock,
  Bot
} from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function ElevateLanding() {
  const { isAuthenticated } = useAuth();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleToolAccess = (toolPath: string) => {
    console.log("Accessing tool:", user);
    // Trial users: expired OR used all trial messages
    // console.log(user?.subscriptionEndDate)

    if (!user?.subscriptionEndDate) {
      toast({
        title: "Subscription Required",
        description: " Please upgrade to access this tool.",
        variant: "destructive"
      });
      window.location.href = '/pricing';
      return;
    }


    if (user?.subscriptionEndDate && new Date(user?.subscriptionEndDate) < new Date()) {
      toast({
        title: "Subscription Ended",
        description: "Your subscription has ended. Please upgrade to access this tool.",
        variant: "destructive"
      });
      window.location.href = '/pricing';
      return;
    }


    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = '/signup';
      return;
    }
    // If authenticated, navigate to tool
    window.location.href = toolPath;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <GlobalHeader />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24" style={{ display: !isAuthenticated ? 'block' : 'none' }}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                ✨ AI-Powered Career Platform
              </Badge>

              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Elevate Your{" "}
                <span className="text-blue-600">Career</span>
                <br />
                <span className="text-blue-600">Journey</span>
              </h1>

              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                Transform your job search & job security with our AI that helps you land your dream job faster & keep it!
              </p>
            </div>

            {/* Feature Benefits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">AI-powered career tools</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">ATS-optimized content</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Layoff tracker -  Interview practice & prep </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">AI generated resume & cover letter</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Recruiter outreach generator</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Expert guidance</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center space-x-4 pt-4">
              <div className="flex items-center space-x-1">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className="font-semibold text-gray-900">4.9/5 rating</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Users className="w-5 h-5" />
                <span>50,000+ successful job placements</span>
              </div>
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-1">
              <div className="bg-white rounded-xl p-8">
                <div className="space-y-6">
                  {/* Mock Dashboard Preview */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Career Dashboard</h3>
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-blue-600">85%</p>
                          <p className="text-sm text-gray-600">Profile Score</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-purple-600">12</p>
                          <p className="text-sm text-gray-600">Applications</p>
                        </div>
                        <Award className="w-8 h-8 text-purple-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Resume Score</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full w-20"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">LinkedIn Optimization</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full w-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Interview Readiness</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full w-16"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Tools Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful AI Tools for Every{" "}
              <span className="text-blue-600">Career Stage</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From resume building to interview preparation, our comprehensive toolkit has everything you need to succeed in your career journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Resume Builder */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs text-white bg-purple-600 px-2 py-1 rounded">Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Resume Builder</h3>
              <p className="text-sm text-gray-600 mb-4">
                Create ATS-optimized resumes with AI assistance. Stand out from the crowd with professionally designed templates.
              </p>
              <Button
                onClick={() => handleToolAccess('/tools/resume-builder')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                {!isAuthenticated ? 'Sign Up to Access' : 'Try Now'}
              </Button>
            </div>

            {/* Cover Letter Generator */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Mail className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cover Letter Generator</h3>
              <p className="text-sm text-gray-600 mb-4">
                Generate personalized cover letters that perfectly match job descriptions and company culture.
              </p>
              <Button
                onClick={() => handleToolAccess('/tools/cover-letter')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                {!isAuthenticated ? 'Sign Up to Access' : 'Try Now'}
              </Button>
            </div>

            {/* Interview Preparation */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Interview Preparation</h3>
              <p className="text-sm text-gray-600 mb-4">
                Practice with AI-powered mock interviews. Get real-time feedback and improve your confidence.
              </p>
              <Button
                onClick={() => handleToolAccess('/tools/interview-preparation')}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                {!isAuthenticated ? 'Sign Up to Access' : 'Try Now'}
              </Button>
            </div>

            {/* LinkedIn Optimizer */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Linkedin className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">LinkedIn Optimizer</h3>
              <p className="text-sm text-gray-600 mb-4">
                Optimize your LinkedIn profile for maximum visibility and professional networking opportunities.
              </p>
              <Button
                onClick={() => handleToolAccess('/tools/linkedin-optimizer')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                {!isAuthenticated ? 'Sign Up to Access' : 'Try Now'}
              </Button>
            </div>

            {/* Recruiter Outreach Script Generator */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recruiter Outreach Script Generator</h3>
              <p className="text-sm text-gray-600 mb-4">
                Generate personalized outreach messages for recruiters and hiring managers that get responses.
              </p>
              <Button
                onClick={() => handleToolAccess('/tools/recruiter-outreach')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                {!isAuthenticated ? 'Sign Up to Access' : 'Try Now'}
              </Button>
            </div>


            {/* Layoff Tracker */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Layoff Tracker</h3>
              <p className="text-sm text-gray-600 mb-4">
                Real-time layoff tracking and job security insights to help you stay informed about market changes.
              </p>
              <Button
                onClick={() => handleToolAccess('/dashboard')}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                {!isAuthenticated ? 'Sign Up to Access' : 'Try Now'}
              </Button>
              {/* <Button
                className="w-full bg-gray-400 hover:bg-gray-700 text-white"
              >
                Coming Soon
              </Button> */}
            </div>

            {/* Salary Negotiator */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Briefcase className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Salary Negotiator</h3>
              <p className="text-sm text-gray-600 mb-4">
                Get data-driven insights and proven strategies for successful salary negotiations and raises.
              </p>
              {/* <Button
                onClick={() => handleToolAccess('/tools/salary-negotiator')}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                {!isAuthenticated ? 'Sign Up to Access' : 'Try Now'}
              </Button> */}
              <Button
                className="w-full bg-gray-400 hover:bg-gray-700 text-white"
              >
                Coming Soon
              </Button>
            </div>

            {/* Skills Assessment */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills Assessment</h3>
              <p className="text-sm text-gray-600 mb-4">
                Evaluate and improve your professional skills with comprehensive assessments and learning paths.
              </p>
              {/* <Button
                onClick={() => handleToolAccess('/tools/skills-assessment')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                {!isAuthenticated ? 'Sign Up to Access' : 'Try Now'}
              </Button> */}
              <Button
                className="w-full bg-gray-400 hover:bg-gray-700 text-white"
              >
                Coming Soon
              </Button>
            </div>


            {/* Networking Assistant */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-violet-100 rounded-lg">
                  <Users className="w-6 h-6 text-violet-600" />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Networking Assistant</h3>
              <p className="text-sm text-gray-600 mb-4">
                Build meaningful professional connections with AI-powered networking strategies and templates.
              </p>
              {/* <Button
                onClick={() => handleToolAccess('/tools/networking-assistant')}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                {!isAuthenticated ? 'Sign Up to Access' : 'Try Now'}
              </Button> */}
              <Button
                className="w-full bg-gray-400 hover:bg-gray-700 text-white"
              >
                Coming Soon
              </Button>
            </div>


            {/* Auto JOB Apply */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-violet-100 rounded-lg">
                  <Bot className="w-6 h-6 text-violet-600" />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Premium</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Apply Engine</h3>
              <p className="text-sm text-gray-600 mb-4">
                Automate your job applications with AI-powered precision and smart optimization.
              </p>
              <Button
                onClick={() => handleToolAccess('/tools/auto-job-apply-dashboard')}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
                {!isAuthenticated ? 'Sign Up to Access' : 'Try Now'}
              </Button>
              {/* <Button
                className="w-full bg-gray-400 hover:bg-gray-700 text-white"
              >
                Coming Soon
              </Button> */}
            </div>
          </div>
        </div>




      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16" style={{ display: !isAuthenticated ? "block" : "none" }}>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Career?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who have already elevated their careers with our AI-powered platform.
          </p>
          <Link href="/magic-login">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold">
              Start Your Journey
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-lg font-bold text-gray-900">ElevateJobs</span>
              </div>
              <p className="text-sm text-gray-600">
                Empowering careers with AI-powered tools and insights.
              </p>
            </div>

            {/* Tools */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Tools</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/tools/resume-builder" className="hover:text-blue-600">Resume Builder</Link></li>
                <li><Link href="/tools/cover-letter-generator" className="hover:text-blue-600">Cover Letter Generator</Link></li>
                <li><Link href="/tools/interview-preparation" className="hover:text-blue-600">Interview Prep</Link></li>
                <li><Link href="/tools/linkedin-optimizer" className="hover:text-blue-600">LinkedIn Optimizer</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">About</a></li>
                <li><Link href="/pricing" className="hover:text-blue-600">Pricing</Link></li>
                <li><a href="#" className="hover:text-blue-600">Contact</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">Help Center</a></li>
                <li><a href="#" className="hover:text-blue-600">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-600">Contact Support</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              © 2024 ElevateJobs. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}