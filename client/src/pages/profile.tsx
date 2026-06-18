import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getJobProfileCompletion,
  type JobProfileLike,
} from "@/lib/profileCompletion";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  User,
  Bell,
  Smartphone,
  Mail,
  MapPin,
  Building2,
  Link2,
  Linkedin,
  Lock,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Check,
  Shield,
  IdCard,
  Zap,
  Download,
  Crown,
  Loader2,
} from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import { LayoffProofLayout } from "@/components/layoffproof/LayoffProofLayout";
import { LayoffProofPageHeader } from "@/components/layoffproof/LayoffProofPageHeader";
import { ProfileCompletionLayoffProof } from "@/components/layoffproof/ProfileCompletionLayoffProof";
import {
  layoffproofInputClass,
  layoffproofLabelClass,
} from "@/components/layoffproof/resume-builder-ui";
import { cn } from "@/lib/utils";
import { hasActiveSubscription } from "@/lib/subscription";
import {
  coerceLinkedInProfileUrl,
  getLinkedInProfileUrlError,
  normalizeStoredLinkedInProfileUrl,
} from "@/lib/linkedinProfileUrl";

type ProfileFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: string;
  jobTitle: string;
  currentCompany: string;
  linkedin: string;
  website: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

function formatLocation(city?: string | null, country?: string | null): string {
  const parts = [city?.trim(), country?.trim()].filter(Boolean);
  return parts.join(", ");
}

function parseLocation(location: string): { city: string; country: string } {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { city: "", country: "" };
  if (parts.length === 1) return { city: parts[0], country: "" };
  return { city: parts[0], country: parts.slice(1).join(", ") };
}

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [personalOpen, setPersonalOpen] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    location: "",
    jobTitle: "",
    currentCompany: "",
    linkedin: "",
    website: "",
    emailNotifications: true,
    smsNotifications: false,
  });

  const { data: jobProfile, isLoading: jobProfileLoading } = useQuery({
    queryKey: ["/api/profile/jobprofile", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/profile/jobprofile/${user!.id}`, {
        credentials: "include",
      });
      const json = await res.json();
      return (json.data ?? null) as JobProfileLike | null;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user) return;
    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      location: formatLocation(jobProfile?.city, jobProfile?.country),
      jobTitle: user.jobTitle || jobProfile?.jobTitle || "",
      currentCompany: jobProfile?.experiences?.[0]?.company || "",
      linkedin: jobProfile?.linkedin
        ? normalizeStoredLinkedInProfileUrl(jobProfile.linkedin)
        : "",
      website: jobProfile?.website || "",
      emailNotifications: user.emailNotifications ?? true,
      smsNotifications: user.smsNotifications ?? false,
    });
  }, [user, jobProfile]);

  const completionResult = useMemo(() => {
    const { city, country } = parseLocation(formData.location);
    const merged: JobProfileLike = {
      ...(jobProfile ?? {}),
      firstName: formData.firstName || jobProfile?.firstName,
      lastName: formData.lastName || jobProfile?.lastName,
      email: formData.email || jobProfile?.email,
      phone: formData.phoneNumber || jobProfile?.phone,
      jobTitle: formData.jobTitle || jobProfile?.jobTitle,
      linkedin: formData.linkedin || jobProfile?.linkedin,
      website: formData.website || jobProfile?.website,
      city: city || jobProfile?.city,
      country: country || jobProfile?.country,
      experiences: formData.currentCompany
        ? [
            {
              ...(jobProfile?.experiences?.[0] ?? {}),
              company: formData.currentCompany,
              title: formData.jobTitle || jobProfile?.experiences?.[0]?.title,
            },
          ]
        : jobProfile?.experiences,
    };
    return getJobProfileCompletion(merged);
  }, [jobProfile, formData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PUT", "/api/user/profile", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        jobTitle: data.jobTitle,
        emailNotifications: data.emailNotifications,
        smsNotifications: data.smsNotifications,
        linkedin: data.linkedin,
        website: data.website,
        location: data.location,
        currentCompany: data.currentCompany,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], (old: unknown) => ({
        ...(typeof old === "object" && old ? old : {}),
        ...data,
      }));
      queryClient.invalidateQueries({
        queryKey: ["/api/profile/jobprofile", user?.id],
      });
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 3000);
      toast({
        title: "Saved",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: unknown) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        window.setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLinkedin = formData.linkedin.trim();
    const coercedLinkedin = trimmedLinkedin
      ? coerceLinkedInProfileUrl(trimmedLinkedin)
      : null;

    if (trimmedLinkedin && !coercedLinkedin) {
      const linkedinValidationError = getLinkedInProfileUrlError(trimmedLinkedin);
      setLinkedinError(linkedinValidationError);
      toast({
        title: "Invalid LinkedIn URL",
        description: linkedinValidationError ?? "Enter a valid LinkedIn profile URL.",
        variant: "destructive",
      });
      return;
    }

    const dataToSave = {
      ...formData,
      linkedin: coercedLinkedin ?? "",
    };
    setFormData(dataToSave);
    setLinkedinError(null);
    updateProfileMutation.mutate(dataToSave);
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "linkedin" && linkedinError) {
      setLinkedinError(null);
    }
  };

  const handleLinkedInBlur = () => {
    const trimmed = formData.linkedin.trim();
    if (!trimmed) {
      setLinkedinError(null);
      return;
    }

    const coerced = coerceLinkedInProfileUrl(trimmed);
    if (coerced) {
      setLinkedinError(null);
      if (coerced !== formData.linkedin) {
        setFormData((prev) => ({ ...prev, linkedin: coerced }));
      }
      return;
    }

    setLinkedinError(
      "Enter a valid LinkedIn profile URL (e.g. linkedin.com/in/your-name)",
    );
  };

  const handleNotificationChange = (field: "emailNotifications" | "smsNotifications", value: boolean) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    updateProfileMutation.mutate(next);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f6fb]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6366f1]" />
      </div>
    );
  }

  if (!user) {
    return (
      <LayoffProofLayout activeNavId="settings">
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">
          <h1 className="text-xl font-bold text-[#0f172a]">Please log in</h1>
          <Button asChild className="mt-4 bg-[#6366f1] hover:bg-[#4f46e5]">
            <a href="/login">Sign In</a>
          </Button>
        </div>
      </LayoffProofLayout>
    );
  }

  const isPremium = hasActiveSubscription(user);

  return (
    <LayoffProofLayout activeNavId="settings">
      <LayoffProofPageHeader
        title="Profile Settings"
        subtitle="Manage your account information and notification preferences"
      />

      <div className="px-8 py-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            <ProfileCompletionLayoffProof
              completion={completionResult}
              isLoading={jobProfileLoading}
            />

            <Collapsible open={personalOpen} onOpenChange={setPersonalOpen}>
              <div className="overflow-hidden rounded-2xl border border-[#e8ecf4] bg-white shadow-sm">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between border-b border-[#f1f5f9] px-5 py-4 text-left transition hover:bg-[#fafbfc]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef2ff] text-[#6366f1]">
                        <User className="h-[18px] w-[18px]" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-bold text-[#0f172a]">
                        Personal Information
                      </span>
                      {savedFlash ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <Check className="h-3 w-3" strokeWidth={3} />
                          Saved
                        </span>
                      ) : null}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-[#94a3b8] transition-transform",
                        personalOpen && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <form onSubmit={handleSubmit} className="p-5">
                    <p className="mb-5 text-xs text-[#64748b]">
                      Update your details for resumes, applications, and job matching.
                    </p>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="firstName" className={layoffproofLabelClass}>
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          className={cn("mt-1.5", layoffproofInputClass)}
                          value={formData.firstName}
                          onChange={(e) =>
                            handleInputChange("firstName", e.target.value)
                          }
                          placeholder="Shahab"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className={layoffproofLabelClass}>
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          className={cn("mt-1.5", layoffproofInputClass)}
                          value={formData.lastName}
                          onChange={(e) =>
                            handleInputChange("lastName", e.target.value)
                          }
                          placeholder="Khan"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="email" className={layoffproofLabelClass}>
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          className={cn("mt-1.5", layoffproofInputClass)}
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="you@email.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phoneNumber" className={layoffproofLabelClass}>
                          Phone Number
                        </Label>
                        <div className="mt-1.5 layoffproof-root">
                          <PhoneInput
                            country="us"
                            value={formData.phoneNumber.replace(/\D/g, "")}
                            onChange={(value) =>
                              handleInputChange("phoneNumber", value ? `+${value}` : "")
                            }
                            inputProps={{ id: "phoneNumber", autoComplete: "tel" }}
                            containerClass="w-full"
                            inputClass="!w-full !h-11 !rounded-lg !border-[#e2e8f0] !text-sm !shadow-sm"
                            dropdownClass="!z-[60]"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>
                      <div>
                        <Label
                          htmlFor="location"
                          className={cn("inline-flex items-center gap-1.5", layoffproofLabelClass)}
                        >
                          <MapPin className="h-3.5 w-3.5 text-[#64748b]" />
                          Location
                        </Label>
                        <Input
                          id="location"
                          className={cn("mt-1.5", layoffproofInputClass)}
                          value={formData.location}
                          onChange={(e) =>
                            handleInputChange("location", e.target.value)
                          }
                          placeholder="San Francisco, CA"
                        />
                      </div>
                      <div>
                        <Label htmlFor="jobTitle" className={layoffproofLabelClass}>
                          Current Job Title
                        </Label>
                        <Input
                          id="jobTitle"
                          className={cn("mt-1.5", layoffproofInputClass)}
                          value={formData.jobTitle}
                          onChange={(e) =>
                            handleInputChange("jobTitle", e.target.value)
                          }
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="currentCompany"
                          className={cn("inline-flex items-center gap-1.5", layoffproofLabelClass)}
                        >
                          <Building2 className="h-3.5 w-3.5 text-[#64748b]" />
                          Current Company
                        </Label>
                        <Input
                          id="currentCompany"
                          className={cn("mt-1.5", layoffproofInputClass)}
                          value={formData.currentCompany}
                          onChange={(e) =>
                            handleInputChange("currentCompany", e.target.value)
                          }
                          placeholder="Acme Inc."
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="linkedin"
                          className={cn("inline-flex items-center gap-1.5", layoffproofLabelClass)}
                        >
                          <SiLinkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                          LinkedIn Profile
                        </Label>
                        <Input
                          id="linkedin"
                          type="url"
                          className={cn(
                            "mt-1.5",
                            layoffproofInputClass,
                            linkedinError &&
                              "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-200",
                          )}
                          value={formData.linkedin}
                          onChange={(e) =>
                            handleInputChange("linkedin", e.target.value)
                          }
                          onBlur={handleLinkedInBlur}
                          placeholder="https://www.linkedin.com/in/your-name"
                          aria-invalid={!!linkedinError}
                          aria-describedby={
                            linkedinError ? "linkedin-error" : undefined
                          }
                        />
                        {linkedinError ? (
                          <p
                            id="linkedin-error"
                            className="mt-1 text-xs text-red-500"
                          >
                            {linkedinError}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-[#94a3b8]">
                            Use your full profile link or username (e.g.{" "}
                            <span className="font-medium">linkedin.com/in/your-name</span>
                            )
                          </p>
                        )}
                      </div>
                      <div>
                        <Label
                          htmlFor="website"
                          className={cn("inline-flex items-center gap-1.5", layoffproofLabelClass)}
                        >
                          <Link2 className="h-3.5 w-3.5 text-[#6366f1]" />
                          Portfolio / Website
                        </Label>
                        <Input
                          id="website"
                          className={cn("mt-1.5", layoffproofInputClass)}
                          value={formData.website}
                          onChange={(e) =>
                            handleInputChange("website", e.target.value)
                          }
                          placeholder="https://yoursite.com"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="h-11 rounded-lg bg-[#6366f1] px-6 text-sm font-semibold hover:bg-[#4f46e5]"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </form>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef2ff] text-[#6366f1]">
                  <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-[#0f172a]">Notification Preferences</h3>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4 border-b border-[#f1f5f9] pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#64748b]" />
                      <p className="text-sm font-semibold text-[#334155]">
                        Email Notifications
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-[#64748b]">
                      Job alerts, application updates, and career tips
                    </p>
                  </div>
                  <Switch
                    checked={formData.emailNotifications}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("emailNotifications", checked)
                    }
                    disabled={updateProfileMutation.isPending}
                    className="data-[state=checked]:bg-[#6366f1]"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-[#64748b]" />
                      <p className="text-sm font-semibold text-[#334155]">SMS Notifications</p>
                    </div>
                    <p className="mt-1 text-xs text-[#64748b]">
                      Critical alerts via text (requires phone number)
                    </p>
                  </div>
                  <Switch
                    checked={formData.smsNotifications}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("smsNotifications", checked)
                    }
                    disabled={!formData.phoneNumber || updateProfileMutation.isPending}
                    className="data-[state=checked]:bg-[#6366f1]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e8ecf4] bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#f1f5f9] px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef2ff] text-[#6366f1]">
                  <Lock className="h-[18px] w-[18px]" strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-[#0f172a]">Security</h3>
              </div>
              <Link
                href="/forgot-password"
                className="flex items-center justify-between px-5 py-4 no-underline transition hover:bg-[#fafbfc]"
              >
                <div className="flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-[#94a3b8]" />
                  <div>
                    <p className="text-sm font-semibold text-[#334155]">Change Password</p>
                    <p className="text-xs text-[#64748b]">
                      Update your password to keep your account secure
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#cbd5e1]" />
              </Link>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-[#c7d2fe] bg-[#eef2ff] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 shrink-0 text-[#6366f1]" />
                <p className="text-sm text-[#4338ca]">
                  <span className="font-semibold">Your data is safe with us.</span> We never
                  share your information without permission.
                </p>
              </div>
              <Link
                href="/privacy-policy"
                className="shrink-0 text-sm font-semibold text-[#6366f1] no-underline hover:text-[#4f46e5]"
              >
                Privacy Policy →
              </Link>
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <IdCard className="h-4 w-4 text-[#6366f1]" />
                <h3 className="text-sm font-bold text-[#0f172a]">Profile Overview</h3>
              </div>
              <dl className="space-y-3 text-sm">
                {[
                  { label: "Name", value: `${formData.firstName} ${formData.lastName}`.trim() },
                  { label: "Email", value: formData.email },
                  { label: "Phone", value: formData.phoneNumber || "—" },
                  { label: "Location", value: formData.location || "—" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-2">
                    <dt className="text-[#94a3b8]">{row.label}</dt>
                    <dd className="max-w-[58%] truncate text-right font-medium text-[#334155]">
                      {row.value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              <Link
                href="/resume-builder"
                className="mt-4 inline-flex text-sm font-semibold text-[#6366f1] no-underline hover:text-[#4f46e5]"
              >
                View Public Profile →
              </Link>
            </div>

            <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#6366f1]" />
                <h3 className="text-sm font-bold text-[#0f172a]">Quick Actions</h3>
              </div>
              <ul className="space-y-1">
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-[#334155] transition hover:bg-[#f8fafc]"
                    onClick={() =>
                      toast({
                        title: "Coming soon",
                        description: "Data export will be available shortly.",
                      })
                    }
                  >
                    <Download className="h-4 w-4 text-[#94a3b8]" />
                    Download My Data
                  </button>
                </li>
                <li>
                  <Link
                    href="/forgot-password"
                    className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-[#334155] no-underline transition hover:bg-[#f8fafc]"
                  >
                    <KeyRound className="h-4 w-4 text-[#94a3b8]" />
                    Change Password
                  </Link>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#e8ecf4] bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" fill="currentColor" />
                <h3 className="text-sm font-bold text-[#0f172a]">Account Plan</h3>
              </div>
              <p className="text-sm font-semibold text-[#334155]">
                {isPremium ? "Premium Plan" : "Free Plan"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#64748b]">
                {isPremium
                  ? "You have full access to AI tools and auto-apply."
                  : "Upgrade for unlimited AI tools, auto apply, and priority matching."}
              </p>
              {!isPremium ? (
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 w-full rounded-lg border-[#6366f1] text-sm font-semibold text-[#6366f1] hover:bg-[#eef2ff]"
                >
                  <Link href="/subscribe">Upgrade Now</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 w-full rounded-lg border-[#e2e8f0] text-sm font-semibold"
                >
                  <Link href="/manage-subscription">Manage Plan</Link>
                </Button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </LayoffProofLayout>
  );
}
