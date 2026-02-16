import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { 
  Shield, 
  Users, 
  Building, 
  TrendingDown, 
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  Eye,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  RefreshCw,
  BarChart3,
  Mail,
  Database
} from "lucide-react";

// Form schemas
const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  location: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  size: z.string().optional(),
  employeeCount: z.string().optional(),
  headquarters: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("United States"),
  status: z.enum(["safe", "monitoring", "active_layoffs"]).default("safe")
});

const layoffEventSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  affectedEmployees: z.number().min(1, "Affected employees must be at least 1"),
  percentageOfWorkforce: z.string().optional(),
  affectedJobTitles: z.array(z.string()).optional(),
  eventDate: z.string().min(1, "Event date is required"),
  source: z.string().optional(),
  sourceType: z.enum(["layoffs_fyi", "layoffdata", "warntracker", "manual"]).default("manual"),
  severity: z.enum(["minor", "moderate", "major", "severe"]).default("moderate")
});

const userUpdateSchema = z.object({
  role: z.enum(["user", "admin"]),
  subscriptionPlan: z.enum(["free", "pro", "premium"])
});

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [editingLayoff, setEditingLayoff] = useState<any>(null);

  // Admin authorization check
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/';
    }
  }, [user, isLoading]);

  // Data queries
  const { data: adminStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: user?.role === 'admin'
  });

  const { data: companies } = useQuery({
    queryKey: ["/api/admin/companies"],
    enabled: user?.role === 'admin'
  });

  const { data: layoffs } = useQuery({
    queryKey: ["/api/admin/layoffs"],
    enabled: user?.role === 'admin'
  });

  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === 'admin'
  });

  // Forms
  const companyForm = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      industry: "",
      location: "",
      description: "",
      website: "",
      size: "",
      employeeCount: "",
      headquarters: "",
      state: "",
      country: "United States",
      status: "safe" as const
    }
  });

  const layoffForm = useForm({
    resolver: zodResolver(layoffEventSchema),
    defaultValues: {
      companyId: "",
      title: "",
      description: "",
      affectedEmployees: 0,
      percentageOfWorkforce: "",
      affectedJobTitles: [],
      eventDate: "",
      source: "",
      sourceType: "manual" as const,
      severity: "moderate" as const
    }
  });

  // Mutations
  const createCompanyMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/companies", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Company created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      companyForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/admin/companies/${id}`, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Company updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      setEditingCompany(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/companies/${id}`),
    onSuccess: () => {
      toast({ title: "Success", description: "Company deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const createLayoffMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/layoffs", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Layoff event created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/layoffs"] });
      layoffForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest("PUT", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      toast({ title: "Success", description: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <Link href="/">
                <h1 className="text-2xl font-bold text-gray-900 cursor-pointer">Layoff Proof Admin</h1>
              </Link>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Shield className="w-3 h-3 mr-1" />
                Admin Dashboard
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                ← Back to Site
              </Link>
              <Link href="/api/logout" className="text-gray-600 hover:text-gray-900">
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="layoffs">Layoffs</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats?.totalCompanies || 0}</div>
                  <p className="text-xs text-muted-foreground">+{adminStats?.newCompaniesThisMonth || 0} this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">+{adminStats?.newUsersThisMonth || 0} this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Layoff Events</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats?.totalLayoffs || 0}</div>
                  <p className="text-xs text-muted-foreground">+{adminStats?.newLayoffsThisMonth || 0} this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Monitoring</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adminStats?.activeMonitoring || 0}</div>
                  <p className="text-xs text-muted-foreground">Companies being monitored</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {adminStats?.recentActivity?.map((activity: any, index: number) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'layoff' ? 'bg-red-400' :
                          activity.type === 'company' ? 'bg-blue-400' : 'bg-green-400'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.timestamp}</p>
                        </div>
                      </div>
                    )) || <p className="text-sm text-gray-500">No recent activity</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" onClick={() => setActiveTab("companies")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Company
                  </Button>
                  <Button className="w-full justify-start" onClick={() => setActiveTab("layoffs")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Report Layoff Event
                  </Button>
                  <Button className="w-full justify-start" onClick={() => setActiveTab("users")}>
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button className="w-full justify-start" onClick={() => setActiveTab("content")}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Website Content
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Company Management</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Company
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Company</DialogTitle>
                  </DialogHeader>
                  <Form {...companyForm}>
                    <form onSubmit={companyForm.handleSubmit((data) => createCompanyMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={companyForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={companyForm.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={companyForm.control}
                          name="headquarters"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Headquarters</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="City, State" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={companyForm.control}
                          name="employeeCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Employee Count</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., 10,000" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={companyForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://company.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={companyForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={companyForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="safe">Safe</SelectItem>
                                <SelectItem value="monitoring">Monitoring</SelectItem>
                                <SelectItem value="active_layoffs">Active Layoffs</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createCompanyMutation.isPending} className="w-full">
                        {createCompanyMutation.isPending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Create Company
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies?.map((company: any) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.industry}</TableCell>
                        <TableCell>{company.headquarters || company.location}</TableCell>
                        <TableCell>{company.employeeCount || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            company.status === 'safe' ? 'default' :
                            company.status === 'monitoring' ? 'secondary' : 'destructive'
                          }>
                            {company.status === 'safe' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : company.status === 'monitoring' ? (
                              <Eye className="w-3 h-3 mr-1" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {company.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingCompany(company)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => deleteCompanyMutation.mutate(company.id)}
                              disabled={deleteCompanyMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would continue here... */}
          <TabsContent value="layoffs">
            <Card>
              <CardHeader>
                <CardTitle>Layoff Event Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Layoff management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">User management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle>Website Content Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Content management interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Settings interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}