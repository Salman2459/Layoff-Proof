import { Link } from "wouter";
import { Mail, Sparkles } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthDivider, AuthTextLink, GoogleAuthButton } from "@/components/auth/auth-ui";

export default function AuthEnhanced() {
  const handleGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <AuthLayout
      title="Sign in to Layoff Proof"
      description="Choose how you'd like to access your account."
      footer={
        <p className="text-center text-[14px] text-[#64748b]">
          New here? <AuthTextLink href="/signup">Create an account</AuthTextLink>
        </p>
      }
    >
      <GoogleAuthButton label="Continue with Google" onClick={handleGoogle} />
      <AuthDivider />

      <div className="space-y-3">
        <Link
          href="/login"
          className="flex h-11 w-full items-center justify-center rounded-lg bg-[#5D5FEF] text-[14px] font-semibold text-white no-underline shadow-md shadow-indigo-200/50 transition hover:bg-[#4F46E5]"
        >
          Sign in with email
        </Link>

        <Link
          href="/magic-login"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-white text-[14px] font-semibold text-[#334155] no-underline shadow-sm transition hover:border-[#c7d2fe] hover:bg-[#fafbff]"
        >
          <Mail className="h-4 w-4 text-[#5D5FEF]" />
          Sign in with magic link
        </Link>

        <Link
          href="/signup"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#fafbff] text-[14px] font-semibold text-[#5D5FEF] no-underline transition hover:border-[#c7d2fe]"
        >
          <Sparkles className="h-4 w-4" />
          Create new account
        </Link>
      </div>
    </AuthLayout>
  );
}
