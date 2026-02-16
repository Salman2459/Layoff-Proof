import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Header() {
  const { user } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-slate-900">LayoffTracker</h1>
            </div>
            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              {/* <Link href="/" className={`px-1 pb-4 text-sm font-medium ${
                isActive("/") 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-slate-500 hover:text-slate-700"
              }`}>
                Dashboard
              </Link> */}
              <Link href="/analytics" className={`px-1 pb-4 text-sm font-medium ${isActive("/analytics")
                  ? "text-primary border-b-2 border-primary"
                  : "text-slate-500 hover:text-slate-700"
                }`}>
                Analytics
              </Link>
              <Link href="/profile" className={`px-1 pb-4 text-sm font-medium ${isActive("/profile")
                  ? "text-primary border-b-2 border-primary"
                  : "text-slate-500 hover:text-slate-700"
                }`}>
                Profile
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-slate-400 hover:text-slate-500">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="User profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">
                    {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium text-slate-700">
                {user?.firstName || user?.email || 'User'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-500 hover:text-slate-700"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
