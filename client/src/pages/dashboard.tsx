import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, AlertTriangle, Calendar, MapPin,
  ChevronLeft, ChevronRight, ExternalLink,
  Building2, ShoppingCart, DollarSign,
  Activity, Factory, Loader2, Search, Car, Newspaper, Clock
} from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";

const CATEGORIES = [
  { id: "all", label: "All Industries", icon: Building2, color: "blue" },
  { id: "upcoming", label: "Upcoming", icon: Clock, color: "orange" },
  { id: "tech", label: "Technology", icon: Activity, color: "purple" },
  { id: "retail", label: "Retail", icon: ShoppingCart, color: "green" },
  { id: "finance", label: "Finance", icon: DollarSign, color: "yellow" },
  { id: "healthcare", label: "Healthcare", icon: Activity, color: "red" },
  { id: "manufacturing", label: "Manufactur", icon: Factory, color: "orange" },
  { id: "automotive", label: "Automotive", icon: Car, color: "indigo" },
  { id: "media", label: "Media", icon: Newspaper, color: "pink" },
  { id: "other", label: "Other", icon: Building2, color: "gray" }
];

interface Layoff {
  id: string;
  company: string | null;
  date: Date | null;
  employeesLaidOff: number | null;
  source: string | null;
  location: string | null;
  industry: string | null;
  details: string | null;
}

interface Stats {
  total: number;
  by_year: {
    2024: number;
    2025: number;
    2026: number;
  };
  by_industry: Record<string, number>;
  total_employees: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [layoffs, setLayoffs] = useState<Layoff[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const itemsPerPage = 15;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please log in to continue",
        variant: "destructive",
      });
      setTimeout(() => window.location.href = "/login", 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch layoffs from backend with pagination
  const fetchLayoffs = async (page: number, category: string, search?: string) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        category: category,
      });
      console.log(user)

      if (user?.id) {
        params.append("id", user.id);
      }

      // Add search only if exists
      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/layoffs?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch layoffs');
      }

      const result = await response.json();

      if (result.success) {
        setLayoffs(result.data.layoffs);
        setStats(result.data.stats);
        setPagination(result.data.pagination);
      } else {
        throw new Error(result.error || 'Failed to fetch layoffs');
      }

    } catch (error: any) {
      console.error("Error fetching layoffs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch layoff data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch layoffs when category or page changes
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchLayoffs(currentPage, selectedCategory, searchQuery);
  }, [currentPage, selectedCategory, searchQuery, isAuthenticated]);

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page
  };

  // Handle search
  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1); // Reset to first page
  };

  // Handle pagination
  const goToPage = (page: number) => {
    if (page >= 1 && pagination && page <= pagination.totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Check if a layoff is upcoming
  const isUpcoming = (date: Date | null) => {
    if (!date) return false;
    return new Date(date) > new Date();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <GlobalHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-2xl">
            <h2 className="text-4xl font-bold mb-2">
              Welcome back, {user?.firstName || 'User'}! 👋
            </h2>
            <p className="text-blue-100 text-lg">
              Real-time layoff tracking across industries • Updated hourly with AI-powered data extraction
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by company name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 h-12 text-base border-2 border-slate-200 focus:border-blue-500"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="h-12 px-8 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </Button>
            {searchQuery && (
              <Button
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                variant="outline"
                className="h-12 px-6"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Category Selector */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Select Industry</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  disabled={loading}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-200 
                    ${isSelected
                      ? `border-blue-500 bg-blue-50 shadow-lg scale-105`
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  <p className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                    {cat.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Total Layoffs</p>
                    <p className="text-3xl font-bold text-blue-800">{stats.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-1">2024 Layoffs</p>
                    <p className="text-3xl font-bold text-green-800">{stats.by_year[2024] || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 mb-1">2025 Layoffs</p>
                    <p className="text-3xl font-bold text-purple-800">{stats.by_year[2025] || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-1">Employees Affected</p>
                    <p className="text-2xl font-bold text-red-800">
                      {stats.total_employees.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Layoffs Table */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-xl">
                {selectedCategory === 'upcoming' ? (
                  <Clock className="w-5 h-5 mr-2 text-orange-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                )}
                {selectedCategory === 'upcoming' ? 'Upcoming Layoffs' : 'Recent Layoffs'} ({selectedCategory === 'all' ? 'All Industries' : CATEGORIES.find(c => c.id === selectedCategory)?.label})
                {loading && (
                  <Badge variant="secondary" className="ml-3 animate-pulse">
                    Loading...
                  </Badge>
                )}
              </CardTitle>
              {pagination && (
                <Badge variant="secondary" className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-slate-200 rounded-xl mb-3"></div>
                  </div>
                ))}
              </div>
            ) : layoffs.length === 0 ? (
              <div className="text-center py-16">
                {selectedCategory === 'upcoming' ? (
                  <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                ) : (
                  <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                )}
                <p className="text-slate-500 text-lg">
                  {selectedCategory === 'upcoming' ? 'No upcoming layoffs found' : 'No layoffs found'}
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  {searchQuery ? "Try a different search term" : "Try selecting a different industry"}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {layoffs.map((layoff, index) => {
                    const upcoming = isUpcoming(layoff.date);

                    return (
                      <div
                        key={layoff.id}
                        className={`border-l-4 ${upcoming ? 'border-orange-400' : 'border-red-400'} pl-6 py-4 bg-gradient-to-r ${upcoming ? 'from-orange-50' : 'from-red-50'} via-white to-transparent rounded-r-xl hover:shadow-lg transition-all duration-200 animate-slide-in`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-4 mb-3">
                              {/* Company Logo */}
                              <div className="flex-shrink-0">
                                <img
                                  src={`https://logo.clearbit.com/${layoff.company?.toLowerCase().replace(/\s+/g, '')}.com`}
                                  alt={`${layoff.company} logo`}
                                  className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200 p-1"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.nextElementSibling as HTMLDivElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                                <div
                                  className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white font-bold text-lg hidden"
                                  style={{ display: 'none' }}
                                >
                                  {layoff.company?.charAt(0).toUpperCase()}
                                </div>
                              </div>

                              {/* Company Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h4 className="font-bold text-xl text-slate-900">{layoff.company}</h4>
                                  {upcoming && (
                                    <Badge className="text-xs font-semibold bg-orange-500 text-white">
                                      Upcoming
                                    </Badge>
                                  )}
                                  {layoff.date && (
                                    <Badge variant="outline" className="text-xs font-semibold">
                                      {new Date(layoff.date).getFullYear()}
                                    </Badge>
                                  )}
                                  {layoff.industry && (
                                    <Badge variant="secondary" className="text-xs">
                                      {layoff.industry}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {layoff.details && (
                              <p className="text-sm text-slate-700 mb-4 leading-relaxed">{layoff.details}</p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                              {layoff.employeesLaidOff && (
                                <span className="flex items-center">
                                  <Users className={`w-4 h-4 mr-2 ${upcoming ? 'text-orange-500' : 'text-red-500'}`} />
                                  <strong className="text-slate-900">{layoff.employeesLaidOff.toLocaleString()}</strong>
                                  <span className="ml-1">{upcoming ? 'affected' : 'laid off'}</span>
                                </span>
                              )}
                              {layoff.date && (
                                <span className="flex items-center">
                                  <Calendar className={`w-4 h-4 mr-2 ${upcoming ? 'text-orange-500' : 'text-blue-500'}`} />
                                  {new Date(layoff.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              )}
                              {layoff.location && (
                                <span className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-2 text-green-500" />
                                  {layoff.location}
                                </span>
                              )}
                            </div>
                          </div>

                          {layoff.source && (
                            <a
                              href={layoff.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-4 p-3 hover:bg-slate-100 rounded-xl transition-colors"
                              title="View source"
                            >
                              <ExternalLink className="w-5 h-5 text-slate-400 hover:text-blue-600" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6 border-t">
                    <div className="text-sm text-slate-600">
                      Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} layoffs
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={!pagination.hasPreviousPage || loading}
                        className="flex items-center"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(pageNum)}
                              disabled={loading}
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={!pagination.hasNextPage || loading}
                        className="flex items-center"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slide-in {
          animation: slideIn 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}