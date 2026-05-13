import { useState } from "react";
import { Link } from "wouter";
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
import type { ForgotPasswordRequest } from "@shared/schema";
import { Loader2 } from "lucide-react";

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
          data?.message ||
          "If an account exists for that address, we sent reset instructions.",
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
    <div className="flex min-h-screen items-center justify-center p-4 lp-page-mesh">
      <Card className="w-full max-w-md border-border/80 shadow-lg shadow-teal-900/5">
        <CardHeader className="text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg lp-gradient-fill">
              <span className="text-sm font-bold text-primary-foreground">LP</span>
            </div>
            <h1 className="lp-gradient-text text-xl font-bold">Layoff Proof</h1>
          </div>
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Works for accounts that use an email and password. If you only use
            &quot;Sign in with Google&quot;, use Google to sign in instead. Check spam
            if you don&apos;t see the message within a few minutes.
          </CardDescription>
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

          {submitted ? (
            <p className="text-center text-sm text-muted-foreground">
              If an account exists for that email, you will receive password reset
              instructions shortly. You can close this page.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}

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
