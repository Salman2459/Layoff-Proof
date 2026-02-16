import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Edit, Shield } from "lucide-react";
import type { Company, CompanyActivity } from "@shared/schema";

export default function CompanyDashboard() {
  const { user } = useAuth();

  // Get selected company details
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["/api/companies", user?.selectedCompanyId],
    enabled: !!user?.selectedCompanyId,
    retry: false,
  });

  // Get company activities
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/companies", user?.selectedCompanyId, "activities"],
    enabled: !!user?.selectedCompanyId,
    retry: false,
  });

  if (!user?.selectedCompanyId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Company Selected
            </h3>
            <p className="text-slate-600">
              Search and select a company above to start tracking layoff activity.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (companyLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading company dashboard...</p>
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-slate-600">Company not found.</p>
        </CardContent>
      </Card>
    );
  }

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
        return "No Recent Layoffs";
      case "monitoring":
        return "Monitoring";
      case "active_layoffs":
        return "Active Layoffs";
      default:
        return "Unknown Status";
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case "layoff":
        return "bg-destructive";
      case "hiring":
        return "bg-success";
      case "earnings":
        return "bg-primary";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Your Company Dashboard</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
            <Edit className="w-4 h-4 mr-1" />
            Change Company
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 mb-6">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={`${company.name} logo`}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center">
              <span className="text-xl font-bold text-slate-600">
                {company.name[0]}
              </span>
            </div>
          )}
          <div>
            <h4 className="text-xl font-bold text-slate-900">{company.name}</h4>
            <p className="text-slate-600">{company.industry}</p>
            <div className="flex items-center mt-1">
              <Badge className={getStatusColor(company.status)}>
                <Shield className="w-3 h-3 mr-1" />
                {getStatusText(company.status)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-600">Last Update</p>
            <p className="text-lg font-semibold text-slate-900">
              {company.lastUpdate 
                ? new Date(company.lastUpdate).toLocaleDateString()
                : "No updates"
              }
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-600">Employee Count</p>
            <p className="text-lg font-semibold text-slate-900">
              {company.employeeCount || "Not available"}
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h5 className="text-md font-semibold text-slate-900 mb-3">Recent Activity</h5>
          <div className="space-y-3">
            {activitiesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Loading activities...</p>
              </div>
            ) : activities && activities.length > 0 ? (
              activities.map((activity: CompanyActivity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.activityType)}`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">{activity.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(activity.activityDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500">
                <p className="text-sm">No recent activity recorded</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
