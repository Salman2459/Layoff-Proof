import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Company } from "@shared/schema";

export default function CompanySearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search companies query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/companies/search", { q: searchQuery }],
    enabled: searchQuery.length >= 2,
    retry: false,
  });

  // Select company mutation
  const selectCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await apiRequest("POST", "/api/user/select-company", { companyId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Company selected successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to select company",
        variant: "destructive",
      });
    },
  });

  const handleSelectCompany = (companyId: string) => {
    selectCompanyMutation.mutate(companyId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe":
        return "bg-success/10 text-success";
      case "monitoring":
        return "bg-warning/10 text-warning";
      case "active_layoffs":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-slate/10 text-slate-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "safe":
        return "Safe";
      case "monitoring":
        return "Monitoring";
      case "active_layoffs":
        return "Active Layoffs";
      default:
        return "Unknown";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Track a New Company</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <Input
            type="text"
            placeholder="Search for companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-60 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center text-slate-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                Searching...
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((company: Company) => (
                <div
                  key={company.id}
                  className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                  onClick={() => handleSelectCompany(company.id)}
                >
                  <div className="flex items-center space-x-3">
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={`${company.name} logo`}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-600">
                          {company.name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{company.name}</p>
                      <p className="text-sm text-slate-500">{company.industry}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(company.status)}>
                    {getStatusText(company.status)}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500">
                No companies found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
