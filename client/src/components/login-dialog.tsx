import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Check, 
  Star, 
  Zap, 
  Crown,
  ArrowRight,
  TrendingDown,
  Shield,
  Users,
  Bell,
  Mail
} from "lucide-react";

interface LoginDialogProps {
  children: React.ReactNode;
}

export function LoginDialog({ children }: LoginDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState("pro");

  const pricingPlans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for getting started",
      icon: <Star className="w-5 h-5" />,
      features: [
        "Track 1 company",
        "Basic layoff notifications",
        "Weekly email updates",
        "Public data access"
      ],
      cta: "Start Free",
      popular: false,
      color: "border-gray-200"
    },
    {
      id: "pro",
      name: "Pro",
      price: "$9.99",
      period: "/month",
      description: "Ideal for professionals",
      icon: <Zap className="w-5 h-5" />,
      features: [
        "Track up to 5 companies",
        "Real-time alerts",
        "Email + SMS notifications",
        "Advanced analytics",
        "Priority support"
      ],
      cta: "Start Pro Trial",
      popular: true,
      color: "border-blue-500"
    },
    {
      id: "premium",
      name: "Premium",
      price: "$19.99", 
      period: "/month",
      description: "For comprehensive tracking",
      icon: <Crown className="w-5 h-5" />,
      features: [
        "Unlimited company tracking",
        "Instant notifications",
        "Multi-channel alerts",
        "API access",
        "Team features"
      ],
      cta: "Go Premium",
      popular: false,
      color: "border-purple-500"
    }
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome to LayoffTracker
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Choose your plan and start tracking layoffs across 42K+ companies with real-time data from layoffs.fyi, WARN Act, and government sources.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">Choose Plan</TabsTrigger>
            <TabsTrigger value="features">Why LayoffTracker?</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pricingPlans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative cursor-pointer transition-all hover:shadow-lg ${plan.color} ${
                    plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                  } ${selectedPlan === plan.id ? 'ring-2 ring-blue-400' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white text-xs">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-blue-600">
                      {plan.icon}
                    </div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription className="text-xs">{plan.description}</CardDescription>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-500 text-sm">{plan.period}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2">
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center pt-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8"
                asChild
              >
                <a href="/api/login">
                  {pricingPlans.find(p => p.id === selectedPlan)?.cta || "Get Started"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Sign in with Replit • No credit card required for free plan
              </p>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Real-time Alerts</h3>
                    <p className="text-sm text-gray-600">
                      Get instant notifications when companies announce layoffs, with customizable alert preferences.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Trusted Data Sources</h3>
                    <p className="text-sm text-gray-600">
                      Comprehensive data from layoffs.fyi, WARN Act filings, and government sources covering 15.5M+ employees.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Industry Coverage</h3>
                    <p className="text-sm text-gray-600">
                      Track layoffs across all industries and geographic regions with detailed analytics and trends.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Employees Tracked:</span>
                    <span className="font-semibold">15.5M+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Companies Monitored:</span>
                    <span className="font-semibold">42K+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data Sources:</span>
                    <span className="font-semibold">3 Major</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Historical Coverage:</span>
                    <span className="font-semibold">Since 1988</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8"
                asChild
              >
                <a href="/api/login">
                  Start Tracking Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}