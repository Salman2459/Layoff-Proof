import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  AuthDivider,
  AuthErrorAlert,
  AuthField,
  AuthInput,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthTextLink,
  GoogleAuthButton,
} from "@/components/auth/auth-ui";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SignupRequest } from "@shared/schema";

export default function Signup() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<string[]>([]);

  const signupMutation = useMutation({
    mutationFn: async (data: SignupRequest) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Account Created",
        description: "Choose a plan on the next screen to unlock all career tools.",
      });
      window.location.href = "/subscribe";
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to create account";
      if (errorMessage.includes("already exists")) {
        setErrors(["An account with this email already exists"]);
      } else {
        setErrors([errorMessage]);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors: string[] = [];
    if (!formData.firstName.trim()) validationErrors.push("First name is required");
    if (!formData.lastName.trim()) validationErrors.push("Last name is required");
    if (!formData.email.trim()) validationErrors.push("Email is required");
    if (!formData.email.includes("@")) validationErrors.push("Valid email is required");
    if (formData.password.length < 6) validationErrors.push("Password must be at least 6 characters");
    if (formData.password !== formData.confirmPassword) {
      validationErrors.push("Passwords do not match");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    signupMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
    });
  };

  const handleGoogleSignup = () => {
    window.location.href = "/api/auth/google?redirect=%2Fsubscribe";
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Join thousands of professionals using Layoff Proof to land their next role."
      footer={
        <p className="text-center text-[14px] text-[#64748b]">
          Already have an account? <AuthTextLink href="/login">Sign in</AuthTextLink>
        </p>
      }
    >
      <AuthErrorAlert errors={errors} />

      <GoogleAuthButton label="Sign up with Google" onClick={handleGoogleSignup} />
      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AuthField id="firstName" label="First name">
            <AuthInput
              id="firstName"
              type="text"
              autoComplete="given-name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </AuthField>
          <AuthField id="lastName" label="Last name">
            <AuthInput
              id="lastName"
              type="text"
              autoComplete="family-name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </AuthField>
        </div>

        <AuthField id="email" label="Email">
          <AuthInput
            id="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </AuthField>

        <AuthField id="password" label="Password">
          <AuthPasswordInput
            id="password"
            value={formData.password}
            onChange={(password) => setFormData({ ...formData, password })}
            autoComplete="new-password"
            required
          />
        </AuthField>

        <AuthField id="confirmPassword" label="Confirm password">
          <AuthPasswordInput
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={(confirmPassword) => setFormData({ ...formData, confirmPassword })}
            autoComplete="new-password"
            required
          />
        </AuthField>

        <AuthPrimaryButton loading={signupMutation.isPending} loadingText="Creating account…">
          Create Account
        </AuthPrimaryButton>
      </form>
    </AuthLayout>
  );
}
