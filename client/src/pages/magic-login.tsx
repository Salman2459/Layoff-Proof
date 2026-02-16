import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

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
    } catch (error: any) {
      setError(error.message || "Failed to send magic link. Please try again.");
      toast({
        title: "Error",
        description: error.message || "Failed to send magic link",
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
            Magic Link Sign In
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Enter your email to receive a secure sign-in link
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
            <CardTitle className="text-center">
              {isSubmitted ? "Check Your Email" : "Sign In with Magic Link"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full"
                    disabled={isLoading}
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Magic Link...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Magic Link
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Magic Link Sent!</h3>
                <p className="text-gray-600 mb-6">
                  We've sent a secure sign-in link to <strong>{email}</strong>. 
                  Click the link in your email to sign in.
                </p>
                
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    The link will expire in 15 minutes for security. If you don't see the email, check your spam folder.
                  </AlertDescription>
                </Alert>

                <div className="pt-4 space-y-3">
                  <Button 
                    onClick={handleTryAgain}
                    variant="outline"
                    className="w-full"
                  >
                    Try Different Email
                  </Button>
                  
                  <div className="text-center">
                    <Link href="/auth" className="text-sm text-purple-600 hover:underline">
                      Choose Different Sign-In Method
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {!isSubmitted && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-600">
                    Don't have an account? No problem! We'll create one for you automatically.
                  </p>
                  <div className="text-center">
                    <Link href="/auth" className="text-sm text-purple-600 hover:underline">
                      Other Sign-In Options
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="text-center">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs text-gray-600">No password required</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs text-gray-600">Secure authentication</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs text-gray-600">Quick access</p>
          </div>
        </div>
      </div>
    </div>
  );
}