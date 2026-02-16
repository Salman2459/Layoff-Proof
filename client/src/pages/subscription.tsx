import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "../components/ui/header";
import { Building2, Mail, Phone, Bell, CheckCircle } from "lucide-react";
import type { Company } from "@shared/schema";

export default function Subscription() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [contactInfo, setContactInfo] = useState({
    email: "",
    phoneNumber: "",
    emailNotifications: true,
    smsNotifications: true,
  });

  // Fetch available companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ["/api/companies"],
    enabled: !authLoading && !!user,
  });

  // Fetch user's current subscriptions
  const { data: userSubscriptions = [], isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["/api/user/subscriptions"],
    enabled: !authLoading && !!user,
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setContactInfo({
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        emailNotifications: user.emailNotifications ?? true,
        smsNotifications: user.smsNotifications ?? false,
      });
    }
  }, [user]);

  // Initialize selected companies from user subscriptions
  useEffect(() => {
    if (userSubscriptions.length > 0) {
      setSelectedCompanies(userSubscriptions.map((sub: any) => sub.companyId));
    }
  }, [userSubscriptions]);

  // Update subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: {
      companies: string[];
      email: string;
      phoneNumber: string;
      emailNotifications: boolean;
      smsNotifications: boolean;
    }) => {
      return await apiRequest("POST", "/api/subscription/update", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your subscription preferences have been updated!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCompanyToggle = (companyId: string) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!contactInfo.email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address for notifications.",
        variant: "destructive",
      });
      return;
    }

    if (contactInfo.smsNotifications && !contactInfo.phoneNumber.trim()) {
      toast({
        title: "Phone Number Required", 
        description: "Please enter your phone number for SMS notifications.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCompanies.length === 0) {
      toast({
        title: "Select Companies",
        description: "Please select at least one company to monitor.",
        variant: "destructive",
      });
      return;
    }

    updateSubscriptionMutation.mutate({
      companies: selectedCompanies,
      email: contactInfo.email,
      phoneNumber: contactInfo.phoneNumber,
      emailNotifications: contactInfo.emailNotifications,
      smsNotifications: contactInfo.smsNotifications,
    });
  };

  if (authLoading || companiesLoading || subscriptionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscription settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-muted-foreground mb-4">Please sign in to manage your subscriptions.</p>
            <Button onClick={() => window.location.href = "/api/login"}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userPlan = user.subscriptionPlan || "free";
  const maxCompanies = userPlan === "free" ? 1 : userPlan === "pro" ? 5 : 999;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Subscription Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your company tracking and notification preferences
          </p>
          <div className="mt-4">
            <Badge 
              variant={userPlan === "free" ? "secondary" : "default"}
              className={userPlan !== "free" ? "gradient-bg" : ""}
            >
              {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} Plan
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={contactInfo.phoneNumber}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emailNotifications"
                  checked={contactInfo.emailNotifications}
                  onCheckedChange={(checked) => 
                    setContactInfo(prev => ({ ...prev, emailNotifications: !!checked }))
                  }
                />
                <Label htmlFor="emailNotifications">Email notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="smsNotifications"
                  checked={contactInfo.smsNotifications}
                  onCheckedChange={(checked) => 
                    setContactInfo(prev => ({ ...prev, smsNotifications: !!checked }))
                  }
                  disabled={userPlan === "free"}
                />
                <Label htmlFor="smsNotifications" className={userPlan === "free" ? "text-muted-foreground" : ""}>
                  SMS notifications {userPlan === "free" && "(Pro+ only)"}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Company Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Select Companies to Track</span>
                </div>
                <Badge variant="outline">
                  {selectedCompanies.length} / {maxCompanies === 999 ? "∞" : maxCompanies}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company: Company) => (
                  <div
                    key={company.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedCompanies.includes(company.id)
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => {
                      if (selectedCompanies.includes(company.id) || selectedCompanies.length < maxCompanies) {
                        handleCompanyToggle(company.id);
                      } else {
                        toast({
                          title: "Plan Limit Reached",
                          description: `Your ${userPlan} plan allows tracking up to ${maxCompanies} companies. Upgrade for more.`,
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{company.name}</h4>
                        <p className="text-sm text-muted-foreground">{company.industry}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge 
                            variant={
                              company.status === "safe" ? "secondary" :
                              company.status === "monitoring" ? "outline" : "destructive"
                            }
                            className="text-xs"
                          >
                            {company.status}
                          </Badge>
                        </div>
                      </div>
                      {selectedCompanies.includes(company.id) && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {userPlan === "free" && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Free plan allows tracking 1 company. 
                    <Button variant="link" className="p-0 h-auto ml-1" onClick={() => window.location.href = '/pricing'}>
                      Upgrade to Pro
                    </Button> 
                    to track up to 5 companies with SMS notifications.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateSubscriptionMutation.isPending}
              className="w-full md:w-auto"
            >
              {updateSubscriptionMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                "Update Subscription"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}