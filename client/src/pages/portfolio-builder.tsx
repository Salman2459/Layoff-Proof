import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, getApiErrorMessage, queryClient } from "@/lib/queryClient";
import GlobalHeader from "@/components/GlobalHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, 
  Plus, 
  Edit3, 
  Trash2, 
  Globe, 
  Github, 
  Linkedin, 
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Eye,
  Settings,
  User,
  FolderOpen,
  Star
} from "lucide-react";

interface Portfolio {
  id: string;
  title: string;
  tagline?: string;
  description?: string;
  template: string;
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    github?: string;
  };
  projects: Array<{
    id: string;
    title: string;
    description: string;
    technologies: string[];
    liveUrl?: string;
    githubUrl?: string;
    imageUrl?: string;
    featured: boolean;
  }>;
  skills: string[];
  bio?: string;
  experience?: any;
  education?: any;
  isPublic: boolean;
  customDomain?: string;
}

interface ProjectFormData {
  title: string;
  description: string;
  technologies: string[];
  liveUrl: string;
  githubUrl: string;
  imageUrl: string;
  featured: boolean;
}

export default function PortfolioBuilder() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [editingProject, setEditingProject] = useState<any>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);

  // Portfolio data state
  const [portfolioData, setPortfolioData] = useState({
    title: "",
    tagline: "",
    description: "",
    template: "modern",
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedin: "",
      github: ""
    },
    skills: [""],
    bio: "",
    isPublic: false,
    customDomain: ""
  });

  // Project form state
  const [projectForm, setProjectForm] = useState<ProjectFormData>({
    title: "",
    description: "",
    technologies: [""],
    liveUrl: "",
    githubUrl: "",
    imageUrl: "",
    featured: false
  });

  // Fetch portfolio
  const { data: portfolio } = useQuery({
    queryKey: ["/api/portfolios/current"],
    enabled: isAuthenticated,
  });

  // Create/Update portfolio mutation
  const savePortfolioMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        skills: data.skills.filter((s: string) => s.trim()),
        personalInfo: data.personalInfo
      };
      
      if (portfolio?.id) {
        return await apiRequest("PUT", `/api/portfolios/${portfolio.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/portfolios", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios/current"] });
      toast({
        title: "Portfolio Saved",
        description: "Your portfolio has been updated successfully."
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(
          error,
          "Failed to save portfolio. Please try again."
        ),
        variant: "destructive",
      });
    },
  });

  // Add/Update project mutation
  const saveProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const currentProjects = portfolio?.projects || [];
      let updatedProjects;
      
      if (editingProject) {
        updatedProjects = currentProjects.map((p: any) => 
          p.id === editingProject.id ? { ...p, ...projectData } : p
        );
      } else {
        const newProject = {
          id: Date.now().toString(),
          ...projectData,
          technologies: projectData.technologies.filter((t: string) => t.trim())
        };
        updatedProjects = [...currentProjects, newProject];
      }

      const payload = {
        projects: updatedProjects
      };

      if (portfolio?.id) {
        return await apiRequest("PUT", `/api/portfolios/${portfolio.id}`, payload);
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios/current"] });
      setShowProjectForm(false);
      setEditingProject(null);
      setProjectForm({
        title: "",
        description: "",
        technologies: [""],
        liveUrl: "",
        githubUrl: "",
        imageUrl: "",
        featured: false
      });
      toast({
        title: "Project Saved",
        description: "Project has been added to your portfolio.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(
          error,
          "Failed to save project. Please try again."
        ),
        variant: "destructive",
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const currentProjects = portfolio?.projects || [];
      const updatedProjects = currentProjects.filter((p: any) => p.id !== projectId);
      
      const payload = { projects: updatedProjects };
      return await apiRequest("PUT", `/api/portfolios/${portfolio.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios/current"] });
      toast({
        title: "Project Deleted",
        description: "Project has been removed from your portfolio.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(
          error,
          "Failed to delete project. Please try again."
        ),
        variant: "destructive",
      });
    },
  });

  const handleSavePortfolio = () => {
    savePortfolioMutation.mutate(portfolioData);
  };

  const handleSaveProject = () => {
    saveProjectMutation.mutate(projectForm);
  };

  const addSkill = () => {
    setPortfolioData(prev => ({
      ...prev,
      skills: [...prev.skills, ""]
    }));
  };

  const removeSkill = (index: number) => {
    setPortfolioData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const updateSkill = (index: number, value: string) => {
    setPortfolioData(prev => ({
      ...prev,
      skills: prev.skills.map((skill, i) => i === index ? value : skill)
    }));
  };

  const addTechnology = () => {
    setProjectForm(prev => ({
      ...prev,
      technologies: [...prev.technologies, ""]
    }));
  };

  const removeTechnology = (index: number) => {
    setProjectForm(prev => ({
      ...prev,
      technologies: prev.technologies.filter((_, i) => i !== index)
    }));
  };

  const updateTechnology = (index: number, value: string) => {
    setProjectForm(prev => ({
      ...prev,
      technologies: prev.technologies.map((tech, i) => i === index ? value : tech)
    }));
  };

  const startEditProject = (project: any) => {
    setEditingProject(project);
    setProjectForm({
      title: project.title,
      description: project.description,
      technologies: project.technologies || [""],
      liveUrl: project.liveUrl || "",
      githubUrl: project.githubUrl || "",
      imageUrl: project.imageUrl || "",
      featured: project.featured || false
    });
    setShowProjectForm(true);
  };

  // Load existing portfolio data when it's fetched
  if (portfolio && portfolioData.title === "") {
    setPortfolioData({
      title: portfolio.title || "",
      tagline: portfolio.tagline || "",
      description: portfolio.description || "",
      template: portfolio.template || "modern",
      personalInfo: portfolio.personalInfo || {
        name: "",
        email: "",
        phone: "",
        location: "",
        website: "",
        linkedin: "",
        github: ""
      },
      skills: portfolio.skills || [""],
      bio: portfolio.bio || "",
      isPublic: portfolio.isPublic || false,
      customDomain: portfolio.customDomain || ""
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
        <GlobalHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
        <GlobalHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Access Required</h1>
          <p className="text-xl text-gray-600 mb-8">Please log in to access the Portfolio Builder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <GlobalHeader />

      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">
                <Briefcase className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold">Portfolio Builder</h1>
            </div>
            <p className="text-xl text-cyan-100 max-w-3xl mx-auto">
              Create stunning professional portfolios that showcase your work and achievements effectively.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Personal Info</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="skills">Skills & Bio</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Basic information that will appear on your portfolio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title">Portfolio Title *</Label>
                  <Input
                    id="title"
                    value={portfolioData.title}
                    onChange={(e) => setPortfolioData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="John Doe - Full Stack Developer"
                  />
                </div>

                <div>
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={portfolioData.tagline}
                    onChange={(e) => setPortfolioData(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="Passionate developer building amazing web experiences"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={portfolioData.description}
                    onChange={(e) => setPortfolioData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of your work and expertise..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={portfolioData.personalInfo.name}
                      onChange={(e) => setPortfolioData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, name: e.target.value }
                      }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={portfolioData.personalInfo.email}
                      onChange={(e) => setPortfolioData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, email: e.target.value }
                      }))}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={portfolioData.personalInfo.phone}
                      onChange={(e) => setPortfolioData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, phone: e.target.value }
                      }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={portfolioData.personalInfo.location}
                      onChange={(e) => setPortfolioData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, location: e.target.value }
                      }))}
                      placeholder="San Francisco, CA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={portfolioData.personalInfo.website}
                      onChange={(e) => setPortfolioData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, website: e.target.value }
                      }))}
                      placeholder="https://johndoe.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={portfolioData.personalInfo.linkedin}
                      onChange={(e) => setPortfolioData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, linkedin: e.target.value }
                      }))}
                      placeholder="https://linkedin.com/in/johndoe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="github">GitHub</Label>
                    <Input
                      id="github"
                      value={portfolioData.personalInfo.github}
                      onChange={(e) => setPortfolioData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, github: e.target.value }
                      }))}
                      placeholder="https://github.com/johndoe"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSavePortfolio}
                  disabled={savePortfolioMutation.isPending}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                >
                  {savePortfolioMutation.isPending ? "Saving..." : "Save Personal Info"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <div className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
                  <p className="text-gray-600">Showcase your work and achievements</p>
                </div>
                <Button
                  onClick={() => setShowProjectForm(true)}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </Button>
              </div>

              {/* Add/Edit Project Form */}
              {showProjectForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingProject ? "Edit Project" : "Add New Project"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="projectTitle">Project Title *</Label>
                        <Input
                          id="projectTitle"
                          value={projectForm.title}
                          onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="My Awesome Project"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="featured"
                          checked={projectForm.featured}
                          onCheckedChange={(checked) => setProjectForm(prev => ({ ...prev, featured: checked }))}
                        />
                        <Label htmlFor="featured">Featured Project</Label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="projectDescription">Description *</Label>
                      <Textarea
                        id="projectDescription"
                        value={projectForm.description}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this project does and your role in it..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Technologies Used</Label>
                      {projectForm.technologies.map((tech, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={tech}
                            onChange={(e) => updateTechnology(index, e.target.value)}
                            placeholder="e.g. React, Node.js, MongoDB"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTechnology(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addTechnology}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Technology
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="liveUrl">Live URL</Label>
                        <Input
                          id="liveUrl"
                          value={projectForm.liveUrl}
                          onChange={(e) => setProjectForm(prev => ({ ...prev, liveUrl: e.target.value }))}
                          placeholder="https://myproject.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="githubUrl">GitHub URL</Label>
                        <Input
                          id="githubUrl"
                          value={projectForm.githubUrl}
                          onChange={(e) => setProjectForm(prev => ({ ...prev, githubUrl: e.target.value }))}
                          placeholder="https://github.com/user/project"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="imageUrl">Project Image URL</Label>
                      <Input
                        id="imageUrl"
                        value={projectForm.imageUrl}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                        placeholder="https://example.com/project-screenshot.jpg"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveProject}
                        disabled={saveProjectMutation.isPending}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                      >
                        {editingProject ? "Update Project" : "Add Project"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowProjectForm(false);
                          setEditingProject(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Projects List */}
              <div className="grid gap-4">
                {portfolio?.projects?.length === 0 || !portfolio?.projects ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Yet</h3>
                      <p className="text-gray-600 mb-4">Start building your portfolio by adding your first project.</p>
                      <Button
                        onClick={() => setShowProjectForm(true)}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                      >
                        Add Your First Project
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  portfolio.projects.map((project: any) => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                              {project.featured && (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  <Star className="w-3 h-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 mb-3">{project.description}</p>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {project.technologies?.map((tech: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tech}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {project.liveUrl && (
                                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700">
                                  <ExternalLink className="w-4 h-4" />
                                  Live Demo
                                </a>
                              )}
                              {project.githubUrl && (
                                <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-600 hover:text-gray-700">
                                  <Github className="w-4 h-4" />
                                  Code
                                </a>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditProject(project)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteProjectMutation.mutate(project.id)}
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

          {/* Skills & Bio Tab */}
          <TabsContent value="skills">
            <Card>
              <CardHeader>
                <CardTitle>Skills & Biography</CardTitle>
                <CardDescription>
                  Add your skills and write a compelling bio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Skills</Label>
                  {portfolioData.skills.map((skill, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={skill}
                        onChange={(e) => updateSkill(index, e.target.value)}
                        placeholder="e.g. JavaScript, React, Node.js"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSkill(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSkill}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Skill
                  </Button>
                </div>

                <div>
                  <Label htmlFor="bio">Biography</Label>
                  <Textarea
                    id="bio"
                    value={portfolioData.bio}
                    onChange={(e) => setPortfolioData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell visitors about yourself, your background, and what drives you..."
                    rows={6}
                  />
                </div>

                <Button 
                  onClick={handleSavePortfolio}
                  disabled={savePortfolioMutation.isPending}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                >
                  {savePortfolioMutation.isPending ? "Saving..." : "Save Skills & Bio"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Portfolio Settings
                </CardTitle>
                <CardDescription>
                  Configure your portfolio appearance and visibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="template">Template</Label>
                  <Select 
                    value={portfolioData.template} 
                    onValueChange={(value) => setPortfolioData(prev => ({ ...prev, template: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic">Make Portfolio Public</Label>
                    <p className="text-sm text-gray-600">Allow others to view your portfolio</p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={portfolioData.isPublic}
                    onCheckedChange={(checked) => setPortfolioData(prev => ({ ...prev, isPublic: checked }))}
                  />
                </div>

                <div>
                  <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
                  <Input
                    id="customDomain"
                    value={portfolioData.customDomain}
                    onChange={(e) => setPortfolioData(prev => ({ ...prev, customDomain: e.target.value }))}
                    placeholder="myportfolio.com"
                  />
                  <p className="text-sm text-gray-600 mt-1">Use your own domain for your portfolio</p>
                </div>

                <Button 
                  onClick={handleSavePortfolio}
                  disabled={savePortfolioMutation.isPending}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                >
                  {savePortfolioMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>

                {portfolio?.isPublic && (
                  <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-5 h-5 text-green-600" />
                      <h4 className="font-medium text-green-900">Portfolio is Live!</h4>
                    </div>
                    <p className="text-sm text-green-700 mb-3">Your portfolio is publicly accessible at:</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-2 py-1 rounded text-sm">
                        {portfolio.customDomain ? `https://${portfolio.customDomain}` : `https://portfolio.layoffproof.com/${portfolio.id}`}
                      </code>
                      <Button variant="outline" size="sm" asChild>
                        <a href={portfolio.customDomain ? `https://${portfolio.customDomain}` : `https://portfolio.layoffproof.com/${portfolio.id}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}