import { useState } from "react";
import { useSearchParams } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  AuthErrorAlert,
  AuthField,
  AuthInfoAlert,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthTextLink,
} from "@/components/auth/auth-ui";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ResetPasswordRequest } from "@shared/schema";

export default function ResetPassword() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordRequest) => {
      return apiRequest("POST", "/api/auth/reset-password", data);
    },
    onSuccess: (data: { message?: string }) => {
      toast({
        title: "Password updated",
        description: data?.message || "You can sign in with your new password.",
      });
      window.location.href = "/login";
    },
    onError: (error: Error) => {
      setErrors([error.message || "Could not reset password"]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    const validationErrors: string[] = [];
    if (!tokenFromUrl.trim()) {
      validationErrors.push("Missing reset token. Open the link from your email.");
    }
    if (password.length < 6) {
      validationErrors.push("Password must be at least 6 characters");
    }
    if (password !== confirm) {
      validationErrors.push("Passwords do not match");
    }
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    mutation.mutate({ token: tokenFromUrl, password });
  };

  return (
    <AuthLayout
      title="Set a new password"
      description="Choose a strong password for your Layoff Proof account."
      footer={
        <p className="text-center text-[14px] text-[#64748b]">
          <AuthTextLink href="/login">Back to sign in</AuthTextLink>
        </p>
      }
    >
      <AuthErrorAlert errors={errors} />

      {!tokenFromUrl.trim() && (
        <AuthInfoAlert>
          This page needs a valid reset link. Request a new one from the{" "}
          <AuthTextLink href="/forgot-password" className="text-[13px]">
            forgot password
          </AuthTextLink>{" "}
          page.
        </AuthInfoAlert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField id="password" label="New password">
          <AuthPasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
          />
        </AuthField>

        <AuthField id="confirm" label="Confirm password">
          <AuthPasswordInput
            id="confirm"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            required
          />
        </AuthField>

        <AuthPrimaryButton
          loading={mutation.isPending}
          loadingText="Updating…"
          disabled={!tokenFromUrl.trim()}
        >
          Update password
        </AuthPrimaryButton>
      </form>
    </AuthLayout>
  );
}
