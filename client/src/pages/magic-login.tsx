import { useState } from "react";
import { CheckCircle, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  AuthErrorAlert,
  AuthField,
  AuthInfoAlert,
  AuthInput,
  AuthPrimaryButton,
  AuthTextLink,
} from "@/components/auth/auth-ui";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function MagicLogin() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await apiRequest("POST", "/api/auth/magic-link/request", { email });
      setIsSubmitted(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email for the sign-in link.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send magic link. Please try again.";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setIsSubmitted(false);
    setError("");
    setEmail("");
  };

  return (
    <AuthLayout
      title={isSubmitted ? "Check your email" : "Sign in with magic link"}
      description={
        isSubmitted ? (
          <>
            We sent a secure sign-in link to <strong className="text-[#0f172a]">{email}</strong>.
            Click the link in your email to continue.
          </>
        ) : (
          "Enter your email to receive a secure, password-free sign-in link."
        )
      }
      footer={
        <p className="text-center text-[14px] text-[#64748b]">
          Prefer email and password? <AuthTextLink href="/login">Sign in</AuthTextLink>
          {" · "}
          <AuthTextLink href="/signup">Create account</AuthTextLink>
        </p>
      }
    >
      {!isSubmitted ? (
        <>
          <AuthErrorAlert errors={error ? [error] : []} />
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField id="email" label="Email">
              <AuthInput
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </AuthField>

            <AuthPrimaryButton loading={isLoading} loadingText="Sending magic link…">
              <Mail className="h-4 w-4" aria-hidden />
              Send magic link
            </AuthPrimaryButton>
          </form>

          <AuthInfoAlert>
            Don&apos;t have an account? No problem — we&apos;ll create one automatically when you
            use the link.
          </AuthInfoAlert>
        </>
      ) : (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-7 w-7 text-emerald-500" />
          </div>
          <AuthInfoAlert>
            The link expires in 15 minutes for security. If you don&apos;t see the email, check
            your spam folder.
          </AuthInfoAlert>
          <button
            type="button"
            onClick={handleTryAgain}
            className="h-11 w-full rounded-lg border border-[#e2e8f0] bg-white text-[14px] font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
          >
            Try a different email
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
