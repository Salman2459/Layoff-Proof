import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Mail,
  Users,
  Linkedin,
  MessageSquare,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Star,
  Crown,
  Shield,
  Target
} from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: any;
  route: string;
  popular: boolean;
  status?: string;
  gradient: string;
  features: string[];
}

const tools: Tool[] = [
  {
    id: "layoff-tracker",
    title: "Layoff Tracker",
    description: "Monitor layoff activities at companies with real-time tracking, notifications, and comprehensive analytics.",
    icon: TrendingDown,
    route: "/tools/layoff-tracker",
    popular: true,
    gradient: "from-blue-400 to-blue-600",
    features: ["Real-time monitoring", "Company analytics", "Notification alerts", "Historical data"],
    status: "coming soon"
  },
  {
    id: "resume-builder",
    title: "Resume Builder",
    description: "Create ATS-optimized resumes with AI assistance that get you noticed by recruiters and hiring managers.",
    icon: FileText,
    route: "/tools/resume-builder",
    popular: true,
    status: "Premium",
    gradient: "from-purple-400 to-purple-600",
    features: ["ATS optimization", "AI assistance", "Professional templates", "Export options"]
  },
  {
    id: "cover-letter-generator",
    title: "Cover Letter Generator",
    description: "Generate personalized, compelling cover letters that perfectly match job descriptions and company culture.",
    icon: Mail,
    route: "/tools/cover-letter",
    popular: true,
    gradient: "from-indigo-400 to-indigo-600",
    features: ["Personalized content", "Job matching", "Company research", "Multiple formats"]
  },
  {
    id: "interview-preparation",
    title: "Interview Preparation",
    description: "Practice with AI-powered mock interviews tailored to your industry and specific job roles.",
    icon: Users,
    route: "/tools/interview-preparation",
    popular: false,
    gradient: "from-blue-500 to-purple-500",
    features: ["Mock interviews", "Industry-specific", "Performance feedback", "Question bank"]
  },
  {
    id: "linkedin-optimizer",
    title: "LinkedIn Optimizer",
    description: "Optimize your LinkedIn profile for maximum visibility and professional networking success.",
    icon: Linkedin,
    route: "/tools/linkedin-optimizer",
    popular: false,
    gradient: "from-blue-500 to-indigo-500",
    features: ["Profile optimization", "SEO enhancement", "Network analysis", "Content suggestions"]
  },
  {
    id: "recruiter-outreach",
    title: "Recruiter Outreach Script Generator",
    description: "Generate personalized LinkedIn DMs, cold emails, and referral requests to get noticed by recruiters.",
    icon: MessageSquare,
    route: "/tools/recruiter-outreach",
    popular: false,
    gradient: "from-indigo-500 to-purple-500",
    features: ["Personalized scripts", "Multi-platform", "Follow-up templates", "Success tracking"],
    // status: "coming soon"
  }
];

export default function CareerToolsHub() {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <GlobalHeader />

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 text-sm">
              <Shield className="w-4 h-4 mr-2" />
              6 Powerful Career Protection Tools
            </Badge>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Stay
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}Layoff Proof
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Protect your career with AI-powered tools that help you stay ahead of layoffs,
            build stronger applications, and land your next opportunity faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/Login">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-8 py-6">
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-gray-200 hover:bg-gray-50">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Choose Your Tool
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Each tool is designed to tackle a specific aspect of your career journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tools.map((tool: Tool) => {
              const IconComponent = tool.icon;
              return (
                <Card
                  key={tool.id}
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 cursor-pointer border-0 bg-white/80 backdrop-blur-sm ${hoveredTool === tool.id ? 'scale-105' : ''
                    }`}
                  onMouseEnter={() => setHoveredTool(tool.id)}
                  onMouseLeave={() => setHoveredTool(null)}
                >
                  <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                    {tool.popular && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                    {tool.status && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        {tool.status}
                      </Badge>
                    )}
                  </div>

                  <div className={`h-2 bg-gradient-to-r ${tool.gradient}`} />

                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${tool.gradient} text-white`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">
                          {tool.title}
                        </CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-gray-600 text-sm leading-relaxed">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-3 mb-6">
                      {tool.features.map((feature, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${tool.gradient} mr-3`} />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {tool.status == "coming soon" ? <Button
                      className={`w-full bg-gray-500 hover:opacity-90 transition-all duration-300 text-white shadow-md`}
                      size="lg"
                    >
                      Comming soon
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button> : <Link href={tool.route}>
                      <Button
                        className={`w-full bg-gradient-to-r ${tool.gradient} hover:opacity-90 transition-all duration-300 text-white shadow-md`}
                        size="lg"
                      >
                        Try Now
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <Shield className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6">
            Ready to Protect Your Career?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of professionals who are already using LayOff Proof to secure their career future
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/magic-login">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-6">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                LayOff Proof
              </h3>
              <p className="text-gray-400">
                Your complete career protection platform with AI-powered tools to secure your professional future.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Tools</h4>
              <ul className="space-y-2">
                {tools.map((tool) => (
                  <li key={tool.id}>
                    <Link href={tool.route} className="text-gray-400 hover:text-white transition-colors">
                      {tool.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/profile" className="hover:text-white transition-colors">Profile</Link></li>
                <li><Link href="/admin" className="hover:text-white transition-colors">Admin</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 LayOff Proof. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}