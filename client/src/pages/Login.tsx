import { useState } from "react";
import { Redirect, useSearchParams } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { getSafeRedirectPath } from "@/components/ProtectedRoute";
import { AuthLayout, AuthLoadingScreen } from "@/components/auth/AuthLayout";
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
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoginRequest } from "@shared/schema";
import { persistAuthLogin } from "@/lib/logoutStorage";
import { getPostAuthRedirectPath } from "@/lib/subscription";

export default function Login() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<string[]>([]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: (response: { user?: { subscriptionStatus?: string }; token?: string }) => {
      toast({
        title: "Welcome Back",
        description: "Successfully signed in to your account.",
      });

      persistAuthLogin({ user: response.user, token: response.token });
      const dest = getPostAuthRedirectPath(
        { subscriptionStatus: response.user?.subscriptionStatus },
        searchParams.get("redirect")
      );
      window.location.href = dest;
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to sign in";
      if (errorMessage.includes("Invalid email or password")) {
        setErrors(["Invalid email or password"]);
      } else {
        setErrors([errorMessage]);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors: string[] = [];
    if (!formData.email.trim()) validationErrors.push("Email is required");
    if (!formData.email.includes("@")) validationErrors.push("Valid email is required");
    if (!formData.password.trim()) validationErrors.push("Password is required");

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    loginMutation.mutate({
      email: formData.email,
      password: formData.password,
    });
  };

  const handleGoogleLogin = () => {
    const redirect = searchParams.get("redirect");
    const qs =
      redirect && getSafeRedirectPath(redirect)
        ? `?redirect=${encodeURIComponent(getSafeRedirectPath(redirect)!)}`
        : "";
    window.location.href = `/api/auth/google${qs}`;
  };

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect to={getPostAuthRedirectPath(user, searchParams.get("redirect"))} />;
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to access your career tools and dashboard."
      footer={
        <p className="text-center text-[14px] text-[#64748b]">
          Don&apos;t have an account? <AuthTextLink href="/signup">Create an account</AuthTextLink>
        </p>
      }
    >
      <AuthErrorAlert errors={errors} />

      <GoogleAuthButton label="Sign in with Google" onClick={handleGoogleLogin} />
      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <AuthField
          id="password"
          label="Password"
          action={
            <AuthTextLink href="/forgot-password" className="text-[12px]">
              Forgot password?
            </AuthTextLink>
          }
        >
          <AuthPasswordInput
            id="password"
            value={formData.password}
            onChange={(password) => setFormData({ ...formData, password })}
            autoComplete="current-password"
            required
          />
        </AuthField>

        <AuthPrimaryButton loading={loginMutation.isPending} loadingText="Signing in…">
          Sign In
        </AuthPrimaryButton>
      </form>
    </AuthLayout>
  );
}
