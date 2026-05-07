import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginDialog } from "@/components/login-dialog";
import { CompanyTable } from "@/components/company-table";
import { Link } from "wouter";
import { logoutViaFullPageNavigate } from "@/lib/logoutStorage";
import {
  TrendingDown,
  Building,
  Users,
  Calendar,
  MapPin,
  Search,
  Filter,
  ArrowUpRight,
  AlertTriangle,
  Globe,
  Briefcase,
  ChevronRight,
  Shield
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface LayoffEvent {
  id: string;
  title: string;
  companyName: string;
  affectedEmployees: number;
  layoffDate: string;
  city?: string;
  state?: string;
  industry?: string;
  severity: string;
  sourceType: string;
}

interface Company {
  id: string;
  name: string;
  industry: string;
  status: string;
  totalLayoffs?: number;
  lastUpdate: string;
}

function Header({ user }: { user: any }) {

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-gray-900">Layoff Proof</h1>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/" className="text-blue-600 font-medium">Home</a>
              <a href="/risk-scanner" className="text-gray-600 hover:text-gray-900">Risk Scanner</a>
              {user ? (
                <>
                  <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                  <a href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</a>
                </>
              ) : null}
              <a href="/subscribe" className="text-gray-600 hover:text-gray-900">Subscribe</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <a href="/profile" className="text-gray-600 hover:text-gray-900">Profile</a>
                <a
                  href="/api/logout"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={(e) => {
                    e.preventDefault();
                    logoutViaFullPageNavigate();
                  }}
                >
                  Sign Out
                </a>
              </>
            ) : (
              <>
                <a href="/magic-login" className="text-purple-600 hover:text-purple-800 font-medium">Magic Link Sign In</a>
                <a href="/auth" className="text-gray-600 hover:text-gray-900">Other Options</a>
                <LoginDialog>
                  <Button>Get Started</Button>
                </LoginDialog>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default function EnhancedHomepage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [selectedTab, setSelectedTab] = useState("recent");

  // Fetch recent layoffs data - available to all users
  const { data: recentLayoffs, isLoading: layoffsLoading } = useQuery({
    queryKey: ["/api/layoffs/recent"],
    retry: false,
  });

  // Fetch dashboard stats - available to all users  
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  // Fetch companies data - available to all users
  const { data: companies } = useQuery({
    queryKey: ["/api/companies"],
    retry: false,
  });

  // Mock data for charts (would come from external APIs in real implementation)
  const monthlyTrends = [
    { month: "Jan", layoffs: 15420 },
    { month: "Feb", layoffs: 18250 },
    { month: "Mar", layoffs: 22100 },
    { month: "Apr", layoffs: 19800 },
    { month: "May", layoffs: 16500 },
    { month: "Jun", layoffs: 14200 },
  ];

  const industryData = [
    { name: "Technology", value: 45, employees: 89450 },
    { name: "Finance", value: 20, employees: 42300 },
    { name: "Retail", value: 15, employees: 28900 },
    { name: "Healthcare", value: 12, employees: 18600 },
    { name: "Other", value: 8, employees: 15750 },
  ];

  const colors = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'];

  // Mock company data to pass to CompanyTable
  const mockCompanyData = [
    {
      id: '1',
      name: 'Meta',
      location: 'Menlo Park, CA',
      industry: 'Technology',
      layoffCount: 11000,
      layoffDate: '1/25/2025',
      percentage: '13%',
      stage: 'Post-IPO',
      raised: '$16,000M',
      country: 'United States',
      dateAdded: '1/25/2025',
      source: 'https://www.reuters.com',
      website: 'meta.com',
      companyType: 'Public' as const,
      headcount: 77800,
      previousHeadcount: 88800,
      marketCap: '$762B',
      revenue: '$134.9B',
      founded: '2004',
      ceo: 'Mark Zuckerberg',
      ticker: 'META',
      exchange: 'NASDAQ'
    },
    {
      id: '2',
      name: 'Amazon',
      location: 'Seattle, WA',
      industry: 'Technology',
      layoffCount: 18000,
      layoffDate: '1/18/2025',
      percentage: '1.2%',
      stage: 'Post-IPO',
      raised: '$54,000M',
      country: 'United States',
      dateAdded: '1/18/2025',
      source: 'https://www.bloomberg.com',
      website: 'amazon.com',
      companyType: 'Public' as const,
      headcount: 1500000,
      previousHeadcount: 1518000,
      marketCap: '$1.78T',
      revenue: '$574.8B',
      founded: '1994',
      ceo: 'Andy Jassy',
      ticker: 'AMZN',
      exchange: 'NASDAQ'
    },
    {
      id: '3',
      name: 'Microsoft',
      location: 'Redmond, WA',
      industry: 'Technology',
      layoffCount: 10000,
      layoffDate: '1/18/2025',
      percentage: '4.5%',
      stage: 'Post-IPO',
      raised: '$61,000M',
      country: 'United States',
      dateAdded: '1/18/2025',
      source: 'https://www.businessinsider.com',
      website: 'microsoft.com',
      companyType: 'Public' as const,
      headcount: 221000,
      previousHeadcount: 231000,
      marketCap: '$3.18T',
      revenue: '$211.9B',
      founded: '1975',
      ceo: 'Satya Nadella',
      ticker: 'MSFT',
      exchange: 'NASDAQ'
    },
    {
      id: '4',
      name: 'Salesforce',
      location: 'San Francisco, CA',
      industry: 'Technology',
      layoffCount: 8000,
      layoffDate: '1/4/2025',
      percentage: '8%',
      stage: 'Post-IPO',
      raised: '$7,200M',
      country: 'United States',
      dateAdded: '1/4/2025',
      source: 'https://www.cnbc.com',
      website: 'salesforce.com',
      companyType: 'Public' as const,
      headcount: 73000,
      previousHeadcount: 81000,
      marketCap: '$248B',
      revenue: '$34.9B',
      founded: '1999',
      ceo: 'Marc Benioff',
      ticker: 'CRM',
      exchange: 'NYSE'
    },
    {
      id: '5',
      name: 'Netflix',
      location: 'Los Gatos, CA',
      industry: 'Media',
      layoffCount: 450,
      layoffDate: '5/17/2024',
      percentage: '4%',
      stage: 'Post-IPO',
      raised: '$8,100M',
      country: 'United States',
      dateAdded: '5/17/2024',
      source: 'https://variety.com',
      website: 'netflix.com',
      companyType: 'Public' as const,
      headcount: 11300,
      previousHeadcount: 11750,
      marketCap: '$245B',
      revenue: '$33.7B',
      founded: '1997',
      ceo: 'Ted Sarandos',
      ticker: 'NFLX',
      exchange: 'NASDAQ'
    },
    {
      id: '6',
      name: 'Stripe',
      location: 'San Francisco, CA',
      industry: 'Fintech',
      layoffCount: 1120,
      layoffDate: '11/3/2024',
      percentage: '14%',
      stage: 'Pre-IPO',
      raised: '$6,500M',
      country: 'United States',
      dateAdded: '11/3/2024',
      source: 'https://techcrunch.com',
      website: 'stripe.com',
      companyType: 'Private' as const,
      headcount: 7000,
      previousHeadcount: 8120,
      marketCap: '$95B',
      revenue: '$14.4B',
      founded: '2010',
      ceo: 'Patrick Collison'
    },
    {
      id: '7',
      name: 'OpenAI',
      location: 'San Francisco, CA',
      industry: 'AI',
      layoffCount: 0,
      layoffDate: '12/1/2024',
      percentage: '0%',
      stage: 'Pre-IPO',
      raised: '$13,000M',
      country: 'United States',
      dateAdded: '12/1/2024',
      source: 'https://techcrunch.com',
      website: 'openai.com',
      companyType: 'Private' as const,
      headcount: 1700,
      previousHeadcount: 1700,
      marketCap: '$157B',
      revenue: '$3.4B',
      founded: '2015',
      ceo: 'Sam Altman'
    },
    {
      id: '8',
      name: 'Uber',
      location: 'San Francisco, CA',
      industry: 'Transportation',
      layoffCount: 6700,
      layoffDate: '5/6/2024',
      percentage: '25%',
      stage: 'Post-IPO',
      raised: '$25,200M',
      country: 'United States',
      dateAdded: '5/6/2024',
      source: 'https://www.bloomberg.com',
      website: 'uber.com',
      companyType: 'Public' as const,
      headcount: 22800,
      previousHeadcount: 29500,
      marketCap: '$142B',
      revenue: '$37.3B',
      founded: '2009',
      ceo: 'Dara Khosrowshahi',
      ticker: 'UBER',
      exchange: 'NYSE'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getSourceBadge = (sourceType: string) => {
    switch (sourceType) {
      case 'layoffs_fyi': return <Badge variant="outline" className="text-blue-600">layoffs.fyi</Badge>;
      case 'warntracker': return <Badge variant="outline" className="text-green-600">WARN</Badge>;
      case 'layoffdata': return <Badge variant="outline" className="text-purple-600">LayoffData</Badge>;
      default: return <Badge variant="outline">Manual</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      {/* Hero Stats Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              LayoffTracker
            </h1>
            <p className="text-xl text-blue-100 mb-6 max-w-3xl mx-auto">
              Comprehensive tracking of layoffs from major sources including layoffs.fyi, WARN Act data, and government reports.
              Stay informed with real-time updates across all industries. {!user ? "Sign up for personalized tracking and notifications." : ""}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/risk-scanner">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white shadow-xl transform hover:scale-105 transition-all duration-200 px-8 py-3">
                  <Shield className="mr-2 h-5 w-5" />
                  Analyze Job Security Risk
                </Button>
              </Link>
              {!user && (
                <LoginDialog>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 shadow-lg">
                    Start Tracking Free
                  </Button>
                </LoginDialog>
              )}
            </div>
          </div>

          {/* Key Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">185K+</div>
              <div className="text-blue-100">Total Employees Affected</div>
              <div className="text-sm text-blue-200">Since 2020</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">2,813</div>
              <div className="text-blue-100">Companies Tracked</div>
              <div className="text-sm text-blue-200">Tech & Beyond</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">78K+</div>
              <div className="text-blue-100">WARN Notices</div>
              <div className="text-sm text-blue-200">Government Data</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2">Live</div>
              <div className="text-blue-100">Real-time Updates</div>
              <div className="text-sm text-blue-200">Multiple Sources</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Database CTA */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-xl p-6 mb-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Building className="h-6 w-6" />
                Company Layoffs Database
              </h2>
              <p className="text-purple-100">Browse comprehensive layoff data with company logos, financials, headcount, and real-time updates from major corporations like Meta, Amazon, Microsoft, and more.</p>
              {!user && (
                <p className="text-purple-200 text-sm mt-2 flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Sign up for personalized tracking, notifications, and advanced analytics
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="bg-gradient-to-r from-white to-purple-50 text-purple-700 hover:from-purple-50 hover:to-white shadow-lg transform hover:scale-105 transition-all duration-200"
                onClick={() => setSelectedTab("companies")}
              >
                <Building className="w-5 h-5 mr-2" />
                View Companies
              </Button>
              {!user && (
                <LoginDialog>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent border-white text-white hover:bg-white hover:text-purple-600 shadow-md transition-all duration-200"
                  >
                    Get Started
                  </Button>
                </LoginDialog>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search companies, industries, or states..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterState} onValueChange={setFilterState}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    <SelectItem value="CA">California</SelectItem>
                    <SelectItem value="NY">New York</SelectItem>
                    <SelectItem value="WA">Washington</SelectItem>
                    <SelectItem value="TX">Texas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recent">📈 Recent Layoffs</TabsTrigger>
            <TabsTrigger value="companies" className="bg-blue-50 border-blue-200 font-bold text-blue-700">
              🏢 Company Database
            </TabsTrigger>
            <TabsTrigger value="trends">📊 Trends</TabsTrigger>
            <TabsTrigger value="map">🗺️ Geographic</TabsTrigger>
          </TabsList>

          {/* Recent Layoffs Tab */}
          <TabsContent value="recent" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Layoff Events List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-red-500" />
                        Latest Layoff Events
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTab("companies")}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Building className="w-4 h-4 mr-1" />
                        View Companies
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {layoffsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : (
                        Array.isArray(recentLayoffs) ? recentLayoffs.slice(0, 10).map((layoff: LayoffEvent) => (
                          <div key={layoff.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-semibold text-lg">{layoff.companyName}</h3>
                                <p className="text-gray-600">{layoff.title}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-red-600">
                                  {layoff.affectedEmployees?.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">employees</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(layoff.layoffDate)}
                              </div>
                              {layoff.city && layoff.state && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {layoff.city}, {layoff.state}
                                </div>
                              )}
                              <Badge className={getSeverityColor(layoff.severity)}>
                                {layoff.severity}
                              </Badge>
                              {getSourceBadge(layoff.sourceType)}
                            </div>
                          </div>
                        )) : []
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Industry Breakdown */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Industry Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={industryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {industryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-4">
                      {industryData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: colors[index % colors.length] }}
                            />
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium">{item.employees.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Company Layoffs Database</h2>
                  <p className="text-gray-600">Comprehensive layoff data with company logos, financials, and real-time updates</p>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {mockCompanyData.length} Companies
                </Badge>
              </div>
            </div>
            <CompanyTable data={mockCompanyData} />
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Layoff Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [value.toLocaleString(), 'Layoffs']} />
                      <Line type="monotone" dataKey="layoffs" stroke="#3B82F6" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Industry Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={industryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [value.toLocaleString(), 'Employees']} />
                      <Bar dataKey="employees" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Geographic Tab */}
          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Layoffs by State
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Interactive Map Coming Soon</h3>
                  <p className="text-gray-600">
                    Visualize layoff data across states with our interactive map feature.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Ahead of Industry Changes</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Get real-time notifications, track multiple companies, and access detailed analytics
            to make informed career decisions.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" variant="secondary">
              <a href="/subscribe">View Plans</a>
            </Button>
            <LoginDialog>
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
                Get Started
              </Button>
            </LoginDialog>
          </div>
        </div>
      </div>
    </div>
  );
}