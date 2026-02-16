import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Filter,
  ArrowUpDown,
  ExternalLink,
  MapPin,
  Calendar,
  TrendingDown,
  Building2,
  DollarSign
} from "lucide-react";

interface CompanyData {
  id: string;
  name: string;
  location: string;
  industry: string;
  layoffCount: number;
  layoffDate: string;
  percentage: string;
  stage: string;
  raised: string;
  country: string;
  dateAdded: string;
  source: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  companyType: 'Public' | 'Private' | 'Pre-IPO';
  headcount: number;
  previousHeadcount?: number;
  marketCap?: string;
  revenue?: string;
  founded?: string;
  ceo?: string;
  ticker?: string;
  exchange?: string;
}

interface CompanyTableProps {
  data?: CompanyData[];
  isLoading?: boolean;
}

export function CompanyTable({ data, isLoading }: CompanyTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [companyTypeFilter, setCompanyTypeFilter] = useState("all");
  const [headcountFilter, setHeadcountFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof CompanyData>("layoffDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Get company logos from a service or use fallback
  const getCompanyLogo = (companyName: string) => {
    const cleanName = companyName.toLowerCase().replace(/\s+/g, '');
    // Use Clearbit logo API or similar service
    return `https://logo.clearbit.com/${cleanName}.com`;
  };

  const getIndustryColor = (industry: string) => {
    const colors = {
      'Technology': 'bg-blue-100 text-blue-800',
      'Logistics': 'bg-green-100 text-green-800', 
      'Crypto': 'bg-purple-100 text-purple-800',
      'Consumer': 'bg-orange-100 text-orange-800',
      'Real Estate': 'bg-yellow-100 text-yellow-800',
      'Retail': 'bg-pink-100 text-pink-800',
      'Product': 'bg-indigo-100 text-indigo-800',
      'Data': 'bg-cyan-100 text-cyan-800',
      'Hardware': 'bg-amber-100 text-amber-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[industry as keyof typeof colors] || colors.Other;
  };

  const getStageColor = (stage: string) => {
    const colors = {
      'Post-IPO': 'bg-emerald-100 text-emerald-800',
      'Series E': 'bg-blue-100 text-blue-800',
      'Series D': 'bg-violet-100 text-violet-800',
      'Seed': 'bg-orange-100 text-orange-800',
      'Unknown': 'bg-gray-100 text-gray-800',
      'Acquired': 'bg-teal-100 text-teal-800'
    };
    return colors[stage as keyof typeof colors] || colors.Unknown;
  };

  const getCompanyTypeColor = (type: string) => {
    const colors = {
      'Public': 'bg-green-100 text-green-800',
      'Private': 'bg-blue-100 text-blue-800',
      'Pre-IPO': 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || colors.Private;
  };

  const getHeadcountRange = (headcount: number) => {
    if (headcount < 50) return 'Startup (1-49)';
    if (headcount < 200) return 'Small (50-199)';
    if (headcount < 1000) return 'Medium (200-999)';
    if (headcount < 5000) return 'Large (1K-5K)';
    return 'Enterprise (5K+)';
  };

  const formatCurrency = (amount: string) => {
    if (!amount || amount === '$0') return '-';
    return amount;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredAndSortedData = useMemo(() => {
    if (!data) return [];
    
    let filtered = data.filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           company.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           company.ceo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           company.ticker?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesIndustry = industryFilter === "all" || company.industry === industryFilter;
      const matchesCountry = countryFilter === "all" || company.country === countryFilter;
      const matchesStage = stageFilter === "all" || company.stage === stageFilter;
      const matchesCompanyType = companyTypeFilter === "all" || company.companyType === companyTypeFilter;
      const matchesHeadcount = headcountFilter === "all" || 
        (headcountFilter === "startup" && company.headcount < 50) ||
        (headcountFilter === "small" && company.headcount >= 50 && company.headcount < 200) ||
        (headcountFilter === "medium" && company.headcount >= 200 && company.headcount < 1000) ||
        (headcountFilter === "large" && company.headcount >= 1000 && company.headcount < 5000) ||
        (headcountFilter === "enterprise" && company.headcount >= 5000);
      
      return matchesSearch && matchesIndustry && matchesCountry && matchesStage && matchesCompanyType && matchesHeadcount;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue: string | number | undefined = a[sortField];
      let bValue: string | number | undefined = b[sortField];
      
      if (sortField === 'layoffDate' || sortField === 'dateAdded') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }
      
      if (sortField === 'layoffCount') {
        aValue = aValue ? parseInt(aValue.toString()) : 0;
        bValue = bValue ? parseInt(bValue.toString()) : 0;
      }
      
      if (aValue !== undefined && bValue !== undefined) {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [data, searchTerm, industryFilter, countryFilter, stageFilter, sortField, sortDirection]);

  const handleSort = (field: keyof CompanyData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Enhanced mock data with comprehensive information
  const mockData: CompanyData[] = [
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
      companyType: 'Public',
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
      companyType: 'Public',
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
      companyType: 'Public',
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
      companyType: 'Public',
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
      companyType: 'Public',
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
      companyType: 'Private',
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
      companyType: 'Private',
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
      companyType: 'Public',
      headcount: 22800,
      previousHeadcount: 29500,
      marketCap: '$142B',
      revenue: '$37.3B',
      founded: '2009',
      ceo: 'Dara Khosrowshahi',
      ticker: 'UBER',
      exchange: 'NYSE'
    },
    {
      id: '9',
      name: 'ByteDance',
      location: 'Beijing, China',
      industry: 'Social Media',
      layoffCount: 1200,
      layoffDate: '10/27/2024',
      percentage: '1%',
      stage: 'Pre-IPO',
      raised: '$9,400M',
      country: 'China',
      dateAdded: '10/27/2024',
      source: 'https://www.reuters.com',
      website: 'bytedance.com',
      companyType: 'Private',
      headcount: 150000,
      previousHeadcount: 151200,
      marketCap: '$268B',
      revenue: '$110B',
      founded: '2012',
      ceo: 'Shou Zi Chew'
    },
    {
      id: '10',
      name: 'SpaceX',
      location: 'Hawthorne, CA',
      industry: 'Aerospace',
      layoffCount: 600,
      layoffDate: '1/11/2024',
      percentage: '8%',
      stage: 'Pre-IPO',
      raised: '$9,800M',
      country: 'United States',
      dateAdded: '1/11/2024',
      source: 'https://www.cnbc.com',
      website: 'spacex.com',
      companyType: 'Private',
      headcount: 13000,
      previousHeadcount: 13600,
      marketCap: '$175B',
      revenue: '$8.7B',
      founded: '2002',
      ceo: 'Elon Musk'
    }
  ];

  const displayData = data || mockData;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading company data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Layoff Tracker
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {filteredAndSortedData.length} companies • Real-time layoff data
            </p>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Logistics">Logistics</SelectItem>
                <SelectItem value="Crypto">Crypto</SelectItem>
                <SelectItem value="Consumer">Consumer</SelectItem>
                <SelectItem value="Real Estate">Real Estate</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Data">Data</SelectItem>
                <SelectItem value="Hardware">Hardware</SelectItem>
              </SelectContent>
            </Select>

            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="China">China</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="India">India</SelectItem>
                <SelectItem value="Sweden">Sweden</SelectItem>
              </SelectContent>
            </Select>

            <Select value={companyTypeFilter} onValueChange={setCompanyTypeFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Public">Public</SelectItem>
                <SelectItem value="Private">Private</SelectItem>
                <SelectItem value="Pre-IPO">Pre-IPO</SelectItem>
              </SelectContent>
            </Select>

            <Select value={headcountFilter} onValueChange={setHeadcountFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                <SelectItem value="startup">Startup (1-49)</SelectItem>
                <SelectItem value="small">Small (50-199)</SelectItem>
                <SelectItem value="medium">Medium (200-999)</SelectItem>
                <SelectItem value="large">Large (1K-5K)</SelectItem>
                <SelectItem value="enterprise">Enterprise (5K+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[250px]">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('name')}
                    className="font-semibold hover:bg-transparent p-0 h-auto"
                  >
                    Company
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('location')}
                    className="font-semibold hover:bg-transparent p-0 h-auto"
                  >
                    Location
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('layoffCount')}
                    className="font-semibold hover:bg-transparent p-0 h-auto"
                  >
                    # Laid Off
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('layoffDate')}
                    className="font-semibold hover:bg-transparent p-0 h-auto"
                  >
                    Date
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">%</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-center">Headcount</TableHead>
                <TableHead className="text-right">$ Raised</TableHead>
                <TableHead className="text-right">Market Cap</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('dateAdded')}
                    className="font-semibold hover:bg-transparent p-0 h-auto"
                  >
                    Date Added
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((company) => (
                <TableRow key={company.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={getCompanyLogo(company.website || company.name)} 
                          alt={`${company.name} logo`}
                        />
                        <AvatarFallback className="text-xs">
                          {company.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{company.name}</div>
                        <div className="text-xs text-gray-500">
                          {company.founded && `Founded ${company.founded}`}
                          {company.ceo && ` • CEO: ${company.ceo}`}
                        </div>
                        {company.website && (
                          <div className="text-xs text-blue-600 flex items-center mt-1">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            {company.website}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                      {company.location}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      {company.layoffCount > 0 ? (
                        <div className="flex items-center text-red-600 font-medium">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          {company.layoffCount.toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center text-sm">
                      <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                      {formatDate(company.layoffDate)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {company.percentage !== '0%' ? (
                      <Badge variant="destructive" className="text-xs">
                        {company.percentage}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getIndustryColor(company.industry)}`}>
                      {company.industry}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <a 
                      href={company.source} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs flex items-center"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Source
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getCompanyTypeColor(company.companyType)}`}>
                      {company.companyType}
                      {company.ticker && (
                        <span className="ml-1 font-mono">({company.ticker})</span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getStageColor(company.stage)}`}>
                      {company.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm">
                      <div className="font-medium">{company.headcount.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{getHeadcountRange(company.headcount)}</div>
                      {company.previousHeadcount && company.previousHeadcount !== company.headcount && (
                        <div className="text-xs text-red-500">
                          ↓ from {company.previousHeadcount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end text-sm">
                      <DollarSign className="w-3 h-3 mr-1 text-gray-400" />
                      {formatCurrency(company.raised)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end text-sm">
                      <DollarSign className="w-3 h-3 mr-1 text-gray-400" />
                      {company.marketCap || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {company.country}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(company.dateAdded)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-8">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No companies found matching your filters.</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setIndustryFilter("all");
                setCountryFilter("all");
                setStageFilter("all");
                setCompanyTypeFilter("all");
                setHeadcountFilter("all");
              }}
              className="mt-2"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}