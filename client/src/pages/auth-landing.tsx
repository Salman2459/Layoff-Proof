import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingDown,
  Bell,
  BarChart3,
  Shield,
  Check,
  Star,
  Zap,
  Crown,
  Building,
  Users,
  Globe,
  ArrowRight,
  ChevronRight,
  AlertTriangle
} from "lucide-react";

export default function AuthLanding() {
  const [selectedPlan, setSelectedPlan] = useState("pro");

  const pricingPlans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for individuals getting started",
      icon: <Star className="w-6 h-6" />,
      features: [
        "Track 1 company",
        "Basic layoff notifications",
        "Weekly email updates",
        "Public data access",
        "Basic analytics dashboard"
      ],
      limitations: [
        "Limited to 1 company",
        "Basic notifications only",
        "No SMS alerts"
      ],
      cta: "Get Started",
      popular: false,
      color: "border-gray-200"
    },
    {
      id: "pro",
      name: "Pro",
      price: "$9.99",
      period: "/month",
      description: "Ideal for professionals and job seekers",
      icon: <Zap className="w-6 h-6" />,
      features: [
        "Track up to 5 companies",
        "Real-time layoff alerts",
        "Email + SMS notifications",
        "Advanced analytics & trends",
        "Company comparison tools",
        "Industry insights",
        "Priority support"
      ],
      limitations: [],
      cta: "Start Pro Trial",
      popular: true,
      color: "border-blue-500"
    },
    {
      id: "premium",
      name: "Premium",
      price: "$19.99",
      period: "/month",
      description: "For professionals and teams requiring comprehensive tracking",
      icon: <Crown className="w-6 h-6" />,
      features: [
        "Unlimited company tracking",
        "Instant layoff notifications",
        "Multi-channel alerts (Email, SMS, Slack)",
        "Advanced predictive analytics",
        "Custom dashboard & reports",
        "API access for integrations",
        "Team collaboration features",
        "Dedicated account manager"
      ],
      limitations: [],
      cta: "Go Premium",
      popular: false,
      color: "border-purple-500"
    }
  ];

  const dataSources = [
    {
      name: "layoffs.fyi",
      logo: "🚀",
      coverage: "759K+ employees, 2,813 companies",
      description: "Real-time tech industry layoff tracker"
    },
    {
      name: "WARN Tracker",
      logo: "🏛️",
      coverage: "7.1M+ employees, 36,237 companies",
      description: "Government WARN Act filings since 1988"
    },
    {
      name: "LayoffData",
      logo: "📊",
      coverage: "78K+ notices, 8.5M+ workers",
      description: "Comprehensive government layoff data"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="relative z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Layoff Proof
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <a href="/enhanced">Browse Data</a>
              </Button>
              <Button asChild>
                <a href="/api/login">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200">
              <AlertTriangle className="w-4 h-4 mr-2" />
              15.5M+ employees tracked across 42K+ companies
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Stay Ahead of
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block">
                Industry Changes
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Track layoffs in real-time across thousands of companies. Get instant notifications,
              analyze trends, and make informed career decisions with comprehensive data from
              layoffs.fyi, WARN Act filings, and government sources.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" asChild>
                <a href="/api/login">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/enhanced">
                  Explore Data
                  <ChevronRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
            </div>
          </div>

          {/* Data Sources */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {dataSources.map((source, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-4xl mb-2">{source.logo}</div>
                  <CardTitle className="text-lg">{source.name}</CardTitle>
                  <CardDescription className="font-semibold text-blue-600">
                    {source.coverage}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{source.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free and upgrade as your tracking needs grow. All plans include access to
              our comprehensive layoff database.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative hover:shadow-xl transition-all cursor-pointer ${plan.color} ${plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                  }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600">
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <Button
                    className={`w-full mb-6 ${plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                      : ''
                      }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    asChild
                  >
                    <a href="/api/login">{plan.cta}</a>
                  </Button>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      Features included:
                    </h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <Check className="w-4 h-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Need a custom solution for your organization?
            </p>
            <Button variant="outline" size="lg">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose LayoffTracker?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive layoff tracking with real-time data from multiple authoritative sources
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Alerts</h3>
              <p className="text-gray-600">
                Get instant notifications when companies you track announce layoffs
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">
                Analyze trends, compare companies, and understand industry patterns
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Comprehensive Coverage</h3>
              <p className="text-gray-600">
                Track layoffs across all industries with data from multiple sources
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Trusted Data</h3>
              <p className="text-gray-600">
                Verified information from layoffs.fyi, WARN Act, and government sources
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-4">Ready to Take Control of Your Career?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who stay informed about industry changes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <a href="/api/login">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600" asChild>
              <a href="/enhanced">View Sample Data</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">LayoffTracker</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Stay informed about layoffs across industries with comprehensive real-time tracking.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/enhanced" className="text-gray-400 hover:text-white">Browse Data</a></li>
                <li><a href="/pricing" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="/api/login" className="text-gray-400 hover:text-white">Sign Up</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Data Sources</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-400">layoffs.fyi</span></li>
                <li><span className="text-gray-400">WARN Tracker</span></li>
                <li><span className="text-gray-400">LayoffData.com</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-400">Help Center</span></li>
                <li><span className="text-gray-400">Contact Us</span></li>
                <li><span className="text-gray-400">Privacy Policy</span></li>
              </ul>
            </div>
          </div>

          <Separator className="my-8 bg-gray-800" />

          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 LayoffTracker. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm">
              Data from layoffs.fyi, WARN Act, and government sources
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}