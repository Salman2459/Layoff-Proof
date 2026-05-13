import { useState } from "react";
import { Link, useSearchParams } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { ResetPasswordRequest } from "@shared/schema";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex min-h-screen items-center justify-center p-4 lp-page-mesh">
      <Card className="w-full max-w-md border-border/80 shadow-lg shadow-teal-900/5">
        <CardHeader className="text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg lp-gradient-fill">
              <span className="text-sm font-bold text-primary-foreground">LP</span>
            </div>
            <h1 className="lp-gradient-text text-xl font-bold">Layoff Proof</h1>
          </div>
          <CardTitle className="text-2xl">Set a new password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                {errors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {!tokenFromUrl.trim() && (
            <Alert>
              <AlertDescription>
                This page needs a valid reset link. Request a new reset from the forgot
                password page.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={mutation.isPending || !tokenFromUrl.trim()}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Updating…
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
