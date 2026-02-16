import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Building2, 
  Clock,
  ChevronDown,
  ExternalLink,
  Edit2,
  Trash2,
  Eye
} from "lucide-react";

interface JobApplication {
  id: string;
  jobTitle: string;
  company: string;
  location?: string;
  salaryRange?: string;
  jobUrl?: string;
  description?: string;
  status: string;
  priority: string;
  appliedDate: string;
  interviewDate?: string;
  followUpDate?: string;
  notes?: string;
  contactPerson?: string;
}

interface JobSearchProfile {
  id: string;
  targetRoles: string[];
  preferredLocations: string[];
  salaryRange?: { min: number; max: number };
  experienceLevel?: string;
  workType?: string;
  industries: string[];
  skills: string[];
  preferences?: any;
  isActive: boolean;
}

export default function JobSearchOptimizer() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [showAddJob, setShowAddJob] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);

  // Job Search Profile
  const [profileData, setProfileData] = useState({
    targetRoles: [""],
    preferredLocations: [""],
    salaryMin: "",
    salaryMax: "",
    experienceLevel: "",
    workType: "",
    industries: [""],
    skills: [""]
  });

  // New Job Application
  const [newJob, setNewJob] = useState({
    jobTitle: "",
    company: "",
    location: "",
    salaryRange: "",
    jobUrl: "",
    description: "",
    status: "applied",
    priority: "medium",
    notes: "",
    contactPerson: "",
    interviewDate: "",
    followUpDate: ""
  });

  // Fetch job search profile
  const { data: profile } = useQuery({
    queryKey: ["/api/job-search/profile"],
    enabled: isAuthenticated,
  });

  // Fetch job applications
  const { data: applications = [] } = useQuery({
    queryKey: ["/api/job-applications"],
    enabled: isAuthenticated,
  });

  // Create/Update profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        targetRoles: data.targetRoles.filter((r: string) => r.trim()),
        preferredLocations: data.preferredLocations.filter((l: string) => l.trim()),
        salaryRange: data.salaryMin && data.salaryMax ? {
          min: parseInt(data.salaryMin),
          max: parseInt(data.salaryMax)
        } : null,
        experienceLevel: data.experienceLevel,
        workType: data.workType,
        industries: data.industries.filter((i: string) => i.trim()),
        skills: data.skills.filter((s: string) => s.trim()),
        preferences: {}
      };
      
      return await apiRequest("POST", "/api/job-search/profile", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-search/profile"] });
      toast({
        title: "Profile Updated",
        description: "Your job search profile has been saved successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Add job application mutation
  const addJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        appliedDate: new Date().toISOString(),
        ...(data.interviewDate && { interviewDate: new Date(data.interviewDate).toISOString() }),
        ...(data.followUpDate && { followUpDate: new Date(data.followUpDate).toISOString() })
      };
      return await apiRequest("POST", "/api/job-applications", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      setShowAddJob(false);
      setNewJob({
        jobTitle: "",
        company: "",
        location: "",
        salaryRange: "",
        jobUrl: "",
        description: "",
        status: "applied",
        priority: "medium",
        notes: "",
        contactPerson: "",
        interviewDate: "",
        followUpDate: ""
      });
      toast({
        title: "Application Added",
        description: "Job application has been added to your tracker."
      });
    }
  });

  // Update job application mutation
  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/job-applications/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      setEditingJob(null);
      toast({
        title: "Application Updated",
        description: "Job application has been updated successfully."
      });
    }
  });

  // Delete job application mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/job-applications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-applications"] });
      toast({
        title: "Application Deleted",
        description: "Job application has been removed from your tracker."
      });
    }
  });

  const handleSaveProfile = () => {
    createProfileMutation.mutate(profileData);
  };

  const handleAddJob = () => {
    addJobMutation.mutate(newJob);
  };

  const handleUpdateJob = () => {
    if (editingJob) {
      updateJobMutation.mutate({ id: editingJob.id, data: editingJob });
    }
  };

  const addArrayField = (field: keyof typeof profileData, value: string = "") => {
    setProfileData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value]
    }));
  };

  const removeArrayField = (field: keyof typeof profileData, index: number) => {
    setProfileData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const updateArrayField = (field: keyof typeof profileData, index: number, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'interview': return 'bg-yellow-100 text-yellow-800';
      case 'offer': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'withdrawn': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
        <GlobalHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
        <GlobalHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Access Required</h1>
          <p className="text-xl text-gray-600 mb-8">Please log in to access the Job Search Optimizer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <GlobalHeader />

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">
                <Search className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold">Job Search Optimizer</h1>
            </div>
            <p className="text-xl text-teal-100 max-w-3xl mx-auto">
              Streamline your job search with advanced tracking, filtering, and optimization tools.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Search Profile</TabsTrigger>
            <TabsTrigger value="applications">Applications Tracker</TabsTrigger>
          </TabsList>

          {/* Search Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Job Search Profile</CardTitle>
                <CardDescription>
                  Define your job search criteria to get personalized recommendations and track your progress.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Target Roles */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Target Roles</Label>
                  {profileData.targetRoles.map((role, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={role}
                        onChange={(e) => updateArrayField('targetRoles', index, e.target.value)}
                        placeholder="e.g. Software Engineer, Product Manager"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayField('targetRoles', index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayField('targetRoles')}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Role
                  </Button>
                </div>

                {/* Preferred Locations */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Preferred Locations</Label>
                  {profileData.preferredLocations.map((location, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={location}
                        onChange={(e) => updateArrayField('preferredLocations', index, e.target.value)}
                        placeholder="e.g. San Francisco, Remote, New York"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayField('preferredLocations', index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayField('preferredLocations')}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                </div>

                {/* Salary Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salaryMin">Minimum Salary</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={profileData.salaryMin}
                      onChange={(e) => setProfileData(prev => ({ ...prev, salaryMin: e.target.value }))}
                      placeholder="70000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salaryMax">Maximum Salary</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={profileData.salaryMax}
                      onChange={(e) => setProfileData(prev => ({ ...prev, salaryMax: e.target.value }))}
                      placeholder="120000"
                    />
                  </div>
                </div>

                {/* Experience Level & Work Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <Select value={profileData.experienceLevel} onValueChange={(value) => setProfileData(prev => ({ ...prev, experienceLevel: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                        <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                        <SelectItem value="senior">Senior Level (6-10 years)</SelectItem>
                        <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="workType">Work Type Preference</Label>
                    <Select value={profileData.workType} onValueChange={(value) => setProfileData(prev => ({ ...prev, workType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">On-site</SelectItem>
                        <SelectItem value="any">Any</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Industries */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Target Industries</Label>
                  {profileData.industries.map((industry, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={industry}
                        onChange={(e) => updateArrayField('industries', index, e.target.value)}
                        placeholder="e.g. Technology, Healthcare, Finance"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayField('industries', index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayField('industries')}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Industry
                  </Button>
                </div>

                {/* Skills */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Key Skills</Label>
                  {profileData.skills.map((skill, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={skill}
                        onChange={(e) => updateArrayField('skills', index, e.target.value)}
                        placeholder="e.g. React, Python, Project Management"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayField('skills', index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayField('skills')}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Skill
                  </Button>
                </div>

                <Button 
                  onClick={handleSaveProfile}
                  disabled={createProfileMutation.isPending}
                  className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
                >
                  {createProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tracker Tab */}
          <TabsContent value="applications">
            <div className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Application Tracker</h2>
                  <p className="text-gray-600">Track and manage your job applications</p>
                </div>
                <Button
                  onClick={() => setShowAddJob(true)}
                  className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Application
                </Button>
              </div>

              {/* Add/Edit Job Form */}
              {(showAddJob || editingJob) && (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingJob ? "Edit Application" : "Add New Application"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="jobTitle">Job Title *</Label>
                        <Input
                          id="jobTitle"
                          value={editingJob ? editingJob.jobTitle : newJob.jobTitle}
                          onChange={(e) => editingJob 
                            ? setEditingJob({...editingJob, jobTitle: e.target.value})
                            : setNewJob({...newJob, jobTitle: e.target.value})
                          }
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company">Company *</Label>
                        <Input
                          id="company"
                          value={editingJob ? editingJob.company : newJob.company}
                          onChange={(e) => editingJob 
                            ? setEditingJob({...editingJob, company: e.target.value})
                            : setNewJob({...newJob, company: e.target.value})
                          }
                          placeholder="Google"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={editingJob ? editingJob.location || "" : newJob.location}
                          onChange={(e) => editingJob 
                            ? setEditingJob({...editingJob, location: e.target.value})
                            : setNewJob({...newJob, location: e.target.value})
                          }
                          placeholder="San Francisco, CA"
                        />
                      </div>
                      <div>
                        <Label htmlFor="salaryRange">Salary Range</Label>
                        <Input
                          id="salaryRange"
                          value={editingJob ? editingJob.salaryRange || "" : newJob.salaryRange}
                          onChange={(e) => editingJob 
                            ? setEditingJob({...editingJob, salaryRange: e.target.value})
                            : setNewJob({...newJob, salaryRange: e.target.value})
                          }
                          placeholder="$120k - $180k"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="jobUrl">Job URL</Label>
                      <Input
                        id="jobUrl"
                        value={editingJob ? editingJob.jobUrl || "" : newJob.jobUrl}
                        onChange={(e) => editingJob 
                          ? setEditingJob({...editingJob, jobUrl: e.target.value})
                          : setNewJob({...newJob, jobUrl: e.target.value})
                        }
                        placeholder="https://..."
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select 
                          value={editingJob ? editingJob.status : newJob.status} 
                          onValueChange={(value) => editingJob 
                            ? setEditingJob({...editingJob, status: value})
                            : setNewJob({...newJob, status: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="interview">Interview</SelectItem>
                            <SelectItem value="offer">Offer</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="withdrawn">Withdrawn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select 
                          value={editingJob ? editingJob.priority : newJob.priority} 
                          onValueChange={(value) => editingJob 
                            ? setEditingJob({...editingJob, priority: value})
                            : setNewJob({...newJob, priority: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="contactPerson">Contact Person</Label>
                        <Input
                          id="contactPerson"
                          value={editingJob ? editingJob.contactPerson || "" : newJob.contactPerson}
                          onChange={(e) => editingJob 
                            ? setEditingJob({...editingJob, contactPerson: e.target.value})
                            : setNewJob({...newJob, contactPerson: e.target.value})
                          }
                          placeholder="Recruiter name"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={editingJob ? editingJob.notes || "" : newJob.notes}
                        onChange={(e) => editingJob 
                          ? setEditingJob({...editingJob, notes: e.target.value})
                          : setNewJob({...newJob, notes: e.target.value})
                        }
                        placeholder="Additional notes about this application..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={editingJob ? handleUpdateJob : handleAddJob}
                        disabled={addJobMutation.isPending || updateJobMutation.isPending}
                        className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
                      >
                        {editingJob ? "Update Application" : "Add Application"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddJob(false);
                          setEditingJob(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Applications List */}
              <div className="grid gap-4">
                {applications.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
                      <p className="text-gray-600 mb-4">Start tracking your job applications to organize your search.</p>
                      <Button
                        onClick={() => setShowAddJob(true)}
                        className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700"
                      >
                        Add Your First Application
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  applications.map((app: JobApplication) => (
                    <Card key={app.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{app.jobTitle}</h3>
                              <Badge className={getStatusColor(app.status)}>
                                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                              </Badge>
                              <Badge className={getPriorityColor(app.priority)}>
                                {app.priority.charAt(0).toUpperCase() + app.priority.slice(1)} Priority
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center gap-1">
                                <Building2 className="w-4 h-4" />
                                {app.company}
                              </div>
                              {app.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {app.location}
                                </div>
                              )}
                              {app.salaryRange && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  {app.salaryRange}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              Applied: {new Date(app.appliedDate).toLocaleDateString()}
                            </div>
                            {app.notes && (
                              <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{app.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {app.jobUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={app.jobUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingJob(app)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteJobMutation.mutate(app.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}