import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Compass, ArrowLeft } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import GlobalFooter from "@/components/GlobalFooter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <GlobalHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          <p className="text-sm font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-4">
            Error 404
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Page not found
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
            The page you are looking for does not exist or may have been moved. Try
            starting from the home page or browse our career tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link href="/">
                <Home className="mr-2 h-5 w-5" />
                Back to home
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/">
                <Compass className="mr-2 h-5 w-5" />
                Career tools
              </Link>
            </Button>
          </div>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Return to homepage
            </Link>
          </div>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
