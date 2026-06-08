import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Menu, LogOut, Settings, Briefcase, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearClientStorageOnLogout } from "@/lib/logoutStorage";

function GlobalHeader() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
      });

      clearClientStorageOnLogout();
      if (response.ok) {
        window.location.href = "/";
      } else {
        console.error("Logout failed");
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout error:", error);
      clearClientStorageOnLogout();
      window.location.href = "/";
    }
  };

  const navLink = (path: string) =>
    cn(
      "text-sm font-medium transition-colors hover:text-primary",
      location === path
        ? "text-primary"
        : "text-muted-foreground"
    );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg lp-gradient-fill shadow-sm">
              <span className="text-sm font-bold text-primary-foreground">LP</span>
            </div>
            <h1 className="lp-gradient-text text-xl font-bold">Layoff Proof</h1>
          </Link>

          <nav className="hidden items-center space-x-6 md:flex">
            <Link href="/" className={navLink("/")}>
              Home
            </Link>
            <Link href="/subscribe" className={navLink("/subscribe")}>
              Subscribe
            </Link>
          
          </nav>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="border-0 text-primary-foreground shadow-md lp-gradient-fill"
                  >
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">
                      {(user as { firstName?: string; email?: string })
                        ?.firstName ||
                        (user as { email?: string })?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="flex w-full items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/manage-subscription"
                      className="flex w-full items-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Manage Subscription
                    </Link>
                  </DropdownMenuItem>
                  {user &&  <DropdownMenuItem asChild>
                 <Link href="/job-board" className="flex w-full items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Job Board
                    </Link>
                  </DropdownMenuItem>
                  }
                
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/" className="w-full">
                      Home
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="w-full">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/lay-offs" className="w-full">
                      Layoff Tracker
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/subscribe" className="w-full">
                      Subscribe
                    </Link>
                  </DropdownMenuItem>
                  {isAuthenticated && (
                    <DropdownMenuItem asChild>
                      <Link href="/manage-subscription" className="w-full">
                        Manage Subscription
                      </Link>
                    </DropdownMenuItem>
                  )}
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
