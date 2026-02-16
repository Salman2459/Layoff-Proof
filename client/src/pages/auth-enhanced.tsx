import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Zap, 
  Building2, 
  Check, 
  ArrowRight, 
  Shield,
  BarChart3,
  Bell,
  Users,
  Star
} from "lucide-react";

const authPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started with layoff tracking",
    features: [
      "Track 1 company",
      "Basic layoff notifications", 
      "Limited historical data",
      "Email support"
    ],
    popular: false,
    plan: "free",
    gradient: "from-gray-400 to-gray-500"
  },
  {
    name: "Pro",
    price: "$9.99", 
    period: "month",
    description: "Enhanced tracking for serious professionals",
    features: [
      "Track up to 5 companies",
      "Email & SMS notifications",
      "Full historical analytics", 
      "Priority email alerts",
      "Advanced filtering",
      "Export data capabilities"
    ],
    popular: true,
    plan: "pro",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    name: "Premium",
    price: "$19.99",
    period: "month",
    description: "Complete solution for teams and enterprises", 
    features: [
      "Track unlimited companies",
      "Real-time notifications",
      "Advanced analytics & insights",
      "Custom notification settings",
      "Priority phone support",
      "Team collaboration features",
      "API access",
      "Custom reports"
    ],
    popular: false,
    plan: "premium",
    gradient: "from-orange-500 to-red-500"
  }
];

const authProviders = [
  {
    name: "Magic Link",
    description: "Sign in with Magic Link",
    url: "/magic-login",
    icon: "✨",
    color: "bg-gradient-to-r from-purple-500 to-pink-500"
  },
  {
    name: "Replit",
    description: "Continue with Replit",
    url: "/api/login",
    icon: "🚀",
    color: "bg-gradient-to-r from-blue-500 to-cyan-500"
  },
  {
    name: "Google",
    description: "Continue with Google",
    url: "/api/auth/google",
    icon: "🌟",
    color: "bg-gradient-to-r from-red-500 to-pink-500",
    disabled: true
  },
  {
    name: "LinkedIn",
    description: "Continue with LinkedIn", 
    url: "/api/auth/linkedin",
    icon: "💼",
    color: "bg-gradient-to-r from-blue-600 to-indigo-600",
    disabled: true
  }
];

export default function AuthEnhanced() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/">
              <h1 className="text-2xl font-bold text-gray-900 cursor-pointer">Layoff Proof</h1>
            </Link>
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-6">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-4">
            Protect Your Career
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Get real-time layoff alerts, track companies, and receive AI-powered career insights to stay ahead of workforce changes.
          </p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">70+</div>
              <div className="text-sm text-gray-600">Fortune 500 Companies</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">15M+</div>
              <div className="text-sm text-gray-600">Employees Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">24/7</div>
              <div className="text-sm text-gray-600">Real-time Monitoring</div>
            </div>
          </div>
        </div>

        {/* Authentication Options */}
        <div className="max-w-md mx-auto mb-16">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
              <CardTitle className="text-xl">Choose Your Sign-In Method</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {authProviders.map((provider) => (
                <Button
                  key={provider.name}
                  className={`w-full justify-start gap-3 h-12 ${provider.color} ${
                    provider.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                  } text-white transition-all duration-200`}
                  disabled={provider.disabled}
                  onClick={() => {
                    if (!provider.disabled) {
                      if (provider.url.startsWith('/')) {
                        // Internal route, use router navigation
                        window.location.href = provider.url;
                      } else {
                        // External API route
                        window.location.href = provider.url;
                      }
                    }
                  }}
                >
                  <span className="text-xl">{provider.icon}</span>
                  <span>{provider.description}</span>
                  {provider.disabled && <span className="text-xs ml-auto">(Coming Soon)</span>}
                  {!provider.disabled && <ArrowRight className="w-4 h-4 ml-auto" />}
                </Button>
              ))}
              
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  By signing in, you agree to our{" "}
                  <Link href="/terms" className="text-purple-600 hover:underline">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Plans */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade anytime for enhanced features and unlimited tracking.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {authPlans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative transform transition-all duration-200 hover:scale-105 border-0 shadow-xl ${
                plan.popular 
                  ? 'bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 shadow-2xl scale-105' 
                  : 'bg-white hover:shadow-2xl'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
                  <Crown className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}

              <CardHeader className="text-center pb-8">
                <div className="mb-4">
                  <div className={`w-12 h-12 mx-auto bg-gradient-to-r ${plan.gradient} rounded-full flex items-center justify-center`}>
                    {plan.name === "Free" && <Building2 className="w-6 h-6 text-white" />}
                    {plan.name === "Pro" && <Zap className="w-6 h-6 text-white" />}
                    {plan.name === "Premium" && <Crown className="w-6 h-6 text-white" />}
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">/{plan.period}</span>
                </div>
                <p className="text-gray-600 mt-2">{plan.description}</p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">What's included:</h4>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className={`w-full mt-8 transition-all duration-200 ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg transform hover:scale-105' 
                      : 'border-2 border-gray-300 text-gray-700 hover:border-purple-400 hover:text-purple-600'
                  }`}
                  onClick={() => window.location.href = "/api/login"}
                >
                  Get Started with {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Alerts</h3>
              <p className="text-gray-600">Get instant notifications when layoffs are announced at your tracked companies.</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Insights</h3>
              <p className="text-gray-600">Comprehensive data visualization and trends analysis across industries.</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Risk Scanner</h3>
              <p className="text-gray-600">AI-powered job security analysis and personalized career recommendations.</p>
            </CardContent>
          </Card>
        </div>

        {/* Social Proof */}
        <div className="text-center mt-16">
          <div className="flex justify-center items-center space-x-2 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
            ))}
          </div>
          <p className="text-lg text-gray-600 mb-2">Trusted by thousands of professionals</p>
          <p className="text-sm text-gray-500">Join the community protecting their careers with real-time layoff intelligence</p>
        </div>
      </div>
    </div>
  );
}