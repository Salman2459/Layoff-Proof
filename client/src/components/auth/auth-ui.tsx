import type { InputHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { Link } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const AUTH_INPUT_CLASS =
  "h-11 rounded-lg border-[#e2e8f0] bg-white text-[#0f172a] shadow-sm placeholder:text-[#94a3b8] focus-visible:border-[#5D5FEF] focus-visible:ring-[#5D5FEF]/20";

export const AUTH_LABEL_CLASS = "text-[13px] font-medium text-[#334155]";

export function AuthErrorAlert({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
    >
      {errors.map((error) => (
        <div key={error}>{error}</div>
      ))}
    </div>
  );
}

export function AuthInfoAlert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[13px] leading-relaxed text-[#64748b]">
      {children}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-[#e8ecf4]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
          or
        </span>
      </div>
    </div>
  );
}

export function GoogleAuthButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[14px] font-semibold text-[#334155] shadow-sm transition hover:border-[#c7d2fe] hover:bg-[#fafbff]"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {label}
    </button>
  );
}

export function AuthPrimaryButton({
  children,
  loading,
  loadingText,
  disabled,
  type = "submit",
}: {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5D5FEF] text-[14px] font-semibold text-white shadow-md shadow-indigo-200/50 transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {loadingText ?? "Please wait…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function AuthTextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-semibold text-[#5D5FEF] no-underline transition hover:text-[#4F46E5] hover:underline",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function AuthField({
  id,
  label,
  children,
  action,
}: {
  id: string;
  label: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className={AUTH_LABEL_CLASS}>
          {label}
        </Label>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AuthInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} className={cn(AUTH_INPUT_CLASS, props.className)} />;
}

export function AuthPasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <AuthInput
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#94a3b8] transition hover:text-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D5FEF]/30"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
