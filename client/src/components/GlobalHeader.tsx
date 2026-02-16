import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Menu, LogOut, Settings } from "lucide-react";

function GlobalHeader() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Redirect to home page after successful logout
        window.location.href = '/';
      } else {
        console.error('Logout failed');
        // Fallback redirect to home page
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback redirect to home page
      window.location.href = '/';
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LP</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Layoff Proof
            </h1>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-blue-600 ${location?.startsWith('/tools') ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'
                }`}
            >
              Home
            </Link>
            {/* <Link 
              href="/tools/layoff-tracker" 
              className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                location === '/tools/layoff-tracker' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Layoff Tracker
            </Link> */}
            <Link
              href="/pricing"
              className={`text-sm font-medium transition-colors hover:text-blue-600 ${location === '/pricing' ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'
                }`}
            >
              Pricing
            </Link>
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="hidden md:inline">
                      {(user as any)?.firstName || (user as any)?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 w-full">
                      <Settings className="w-4 h-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2 w-full">
                      <User className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem> */}
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/tools" className="w-full">Career Tools</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/tools/layoff-tracker" className="w-full">Layoff Tracker</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/pricing" className="w-full">Pricing</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default GlobalHeader;