import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  AuthErrorAlert,
  AuthField,
  AuthInfoAlert,
  AuthInput,
  AuthPrimaryButton,
  AuthTextLink,
} from "@/components/auth/auth-ui";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ForgotPasswordRequest } from "@shared/schema";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordRequest) => {
      return apiRequest("POST", "/api/auth/forgot-password", data);
    },
    onSuccess: (data: { message?: string }) => {
      setSubmitted(true);
      toast({
        title: "Check your email",
        description:
          data?.message || "If an account exists for that address, we sent reset instructions.",
      });
    },
    onError: (error: Error) => {
      setErrors([error.message || "Something went wrong"]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    const validationErrors: string[] = [];
    if (!email.trim()) validationErrors.push("Email is required");
    if (!email.includes("@")) validationErrors.push("Valid email is required");
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    mutation.mutate({ email: email.trim() });
  };

  return (
    <AuthLayout
      title="Forgot password"
      description={
        <>
          Enter your email and we&apos;ll send reset instructions. If you only use Google sign-in,
          use that instead. Check spam if you don&apos;t see the email within a few minutes.
        </>
      }
      footer={
        <p className="text-center text-[14px] text-[#64748b]">
          <AuthTextLink href="/login">Back to sign in</AuthTextLink>
        </p>
      }
    >
      <AuthErrorAlert errors={errors} />

      {submitted ? (
        <AuthInfoAlert>
          If an account exists for that email, you will receive password reset instructions
          shortly. You can close this page.
        </AuthInfoAlert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField id="email" label="Email">
            <AuthInput
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </AuthField>

          <AuthPrimaryButton loading={mutation.isPending} loadingText="Sending…">
            Send reset link
          </AuthPrimaryButton>
        </form>
      )}
    </AuthLayout>
  );
}
