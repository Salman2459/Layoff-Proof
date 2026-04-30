import { Link } from "wouter";

export default function GlobalFooter() {
  return (
    <footer className="lp-footer">
      <div className="relative z-[2] container mx-auto px-4 py-12">
        <div className="grid place-items-center gap-8 md:grid-cols-4">
          <div className="text-center">
            <h3 className="lp-gradient-text mb-4 text-lg font-semibold">
              Layoff Proof
            </h3>
            <p className="mb-4 text-muted-foreground">
              Your comprehensive career advancement platform powered by AI.
            </p>
            <div className="flex justify-center space-x-4">
              <a
                href="#"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Career Tools
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link
                  href="/tools/resume-builder"
                  className="transition-colors hover:text-primary"
                >
                  Resume Builder
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/cover-letter"
                  className="transition-colors hover:text-primary"
                >
                  Cover Letter Generator
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/interview-preparation"
                  className="transition-colors hover:text-primary"
                >
                  Interview Prep
                </Link>
              </li>
              <li>
                <Link
                  href="/tools/linkedin-optimizer"
                  className="transition-colors hover:text-primary"
                >
                  LinkedIn Optimizer
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="transition-colors hover:text-primary"
                >
                  Layoff Tracker
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Company
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link
                  href="/subscribe"
                  className="transition-colors hover:text-primary"
                >
                  Subscribe
                </Link>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Support
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Layoff Proof. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
