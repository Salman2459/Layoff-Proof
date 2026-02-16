import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Smartphone, Mail } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";

function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">LayoffTracker</h1>
          </div>
          <nav className="flex items-center space-x-6">
            <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
            <a href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</a>
            <a href="/profile" className="text-gray-600 hover:text-gray-900">Profile</a>
            {user ? (
              <a href="/api/logout" className="text-gray-600 hover:text-gray-900">Sign Out</a>
            ) : (
              <a href="/api/login" className="text-gray-600 hover:text-gray-900">Sign In</a>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    jobTitle: "",
    emailNotifications: true,
    smsNotifications: false,
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        jobTitle: user.jobTitle || "",
        emailNotifications: user.emailNotifications ?? true,
        smsNotifications: user.smsNotifications ?? false,
      });
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('Sending update request with data:', data);
      try {
        const response = await apiRequest("PUT", "/api/user/profile", data);
        console.log('Update response:', response);
        return response;
      } catch (error) {
        console.error('Update error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update the cache with the new data
      queryClient.setQueryData(["/api/auth/user"], (oldData: any) => {
        return { ...oldData, ...data };
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);

      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      // Show more specific error message
      const errorMessage = error?.message || error?.response?.data?.message || "Failed to update profile";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Auto-save notification preferences
  const handleNotificationChange = (field: string, value: boolean) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    updateProfileMutation.mutate(newData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GlobalHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please log in to view your profile</h1>
            <Button asChild>
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
            <p className="text-gray-600">
              Manage your account information and notification preferences
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Enter your first name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                      placeholder="Enter your job title"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <Label className="text-base font-medium">Email Notifications</Label>
                    </div>
                    <p className="text-sm text-gray-500">
                      Receive email alerts when layoffs occur at your tracked companies
                    </p>
                  </div>
                  <Switch
                    checked={formData.emailNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                    disabled={updateProfileMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gray-500" />
                      <Label className="text-base font-medium">SMS Notifications</Label>
                    </div>
                    <p className="text-sm text-gray-500">
                      Get text message alerts for critical layoff events (requires phone number)
                    </p>
                  </div>
                  <Switch
                    checked={formData.smsNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('smsNotifications', checked)}
                    disabled={!formData.phoneNumber || updateProfileMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}