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
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  Mail, 
  Linkedin,
  Building2,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle,
  Filter,
  Search,
  UserPlus,
  MessageSquare
} from "lucide-react";

interface NetworkConnection {
  id: string;
  contactName: string;
  contactEmail?: string;
  contactLinkedIn?: string;
  company?: string;
  role?: string;
  relationship: string;
  connectionSource: string;
  notes?: string;
  tags: string[];
  lastContact?: string;
  followUpDate?: string;
  connectionStrength: string;
  status: string;
  createdAt: string;
}

export default function NetworkingAssistant() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("connections");
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [editingConnection, setEditingConnection] = useState<NetworkConnection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRelationship, setFilterRelationship] = useState("all");

  // New connection form state
  const [newConnection, setNewConnection] = useState({
    contactName: "",
    contactEmail: "",
    contactLinkedIn: "",
    company: "",
    role: "",
    relationship: "colleague",
    connectionSource: "linkedin",
    notes: "",
    tags: [""],
    lastContact: "",
    followUpDate: "",
    connectionStrength: "weak",
    status: "active"
  });

  // Fetch network connections
  const { data: connections = [] } = useQuery({
    queryKey: ["/api/network-connections"],
    enabled: isAuthenticated,
  });

  // Add connection mutation
  const addConnectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        tags: data.tags.filter((t: string) => t.trim()),
        ...(data.lastContact && { lastContact: new Date(data.lastContact).toISOString() }),
        ...(data.followUpDate && { followUpDate: new Date(data.followUpDate).toISOString() })
      };
      return await apiRequest("POST", "/api/network-connections", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network-connections"] });
      setShowAddConnection(false);
      setNewConnection({
        contactName: "",
        contactEmail: "",
        contactLinkedIn: "",
        company: "",
        role: "",
        relationship: "colleague",
        connectionSource: "linkedin",
        notes: "",
        tags: [""],
        lastContact: "",
        followUpDate: "",
        connectionStrength: "weak",
        status: "active"
      });
      toast({
        title: "Connection Added",
        description: "New connection has been added to your network."
      });
    }
  });

  // Update connection mutation
  const updateConnectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/network-connections/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network-connections"] });
      setEditingConnection(null);
      toast({
        title: "Connection Updated",
        description: "Connection has been updated successfully."
      });
    }
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/network-connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/network-connections"] });
      toast({
        title: "Connection Deleted",
        description: "Connection has been removed from your network."
      });
    }
  });

  const handleAddConnection = () => {
    addConnectionMutation.mutate(newConnection);
  };

  const handleUpdateConnection = () => {
    if (editingConnection) {
      updateConnectionMutation.mutate({ id: editingConnection.id, data: editingConnection });
    }
  };

  const addTag = (isEditing = false) => {
    if (isEditing && editingConnection) {
      setEditingConnection({
        ...editingConnection,
        tags: [...editingConnection.tags, ""]
      });
    } else {
      setNewConnection(prev => ({
        ...prev,
        tags: [...prev.tags, ""]
      }));
    }
  };

  const removeTag = (index: number, isEditing = false) => {
    if (isEditing && editingConnection) {
      setEditingConnection({
        ...editingConnection,
        tags: editingConnection.tags.filter((_, i) => i !== index)
      });
    } else {
      setNewConnection(prev => ({
        ...prev,
        tags: prev.tags.filter((_, i) => i !== index)
      }));
    }
  };

  const updateTag = (index: number, value: string, isEditing = false) => {
    if (isEditing && editingConnection) {
      setEditingConnection({
        ...editingConnection,
        tags: editingConnection.tags.map((tag, i) => i === index ? value : tag)
      });
    } else {
      setNewConnection(prev => ({
        ...prev,
        tags: prev.tags.map((tag, i) => i === index ? value : tag)
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'dormant': return 'bg-yellow-100 text-yellow-800';
      case 'lost-touch': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'weak': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'mentor': return '👨‍🏫';
      case 'recruiter': return '🔍';
      case 'colleague': return '👥';
      case 'industry-contact': return '🏢';
      default: return '👤';
    }
  };

  // Filter connections
  const filteredConnections = connections.filter((connection: NetworkConnection) => {
    const matchesSearch = connection.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         connection.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         connection.role?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || connection.status === filterStatus;
    const matchesRelationship = filterRelationship === "all" || connection.relationship === filterRelationship;
    
    return matchesSearch && matchesStatus && matchesRelationship;
  });

  // Get connections needing follow-up
  const followUpConnections = connections.filter((connection: NetworkConnection) => 
    connection.followUpDate && new Date(connection.followUpDate) <= new Date()
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
        <GlobalHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
        <GlobalHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Access Required</h1>
          <p className="text-xl text-gray-600 mb-8">Please log in to access the Networking Assistant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <GlobalHeader />

      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-lg mr-4">
                <Users className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold">Networking Assistant</h1>
            </div>
            <p className="text-xl text-violet-100 max-w-3xl mx-auto">
              Build meaningful professional connections with AI-powered networking strategies and templates.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections">My Network</TabsTrigger>
            <TabsTrigger value="follow-ups">
              Follow-ups
              {followUpConnections.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">
                  {followUpConnections.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Connections Tab */}
          <TabsContent value="connections">
            <div className="space-y-6">
              {/* Header with Search and Add Button */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search connections..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="dormant">Dormant</SelectItem>
                      <SelectItem value="lost-touch">Lost Touch</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterRelationship} onValueChange={setFilterRelationship}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="recruiter">Recruiter</SelectItem>
                      <SelectItem value="industry-contact">Industry Contact</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={() => setShowAddConnection(true)}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Connection
                  </Button>
                </div>
              </div>

              {/* Add/Edit Connection Form */}
              {(showAddConnection || editingConnection) && (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingConnection ? "Edit Connection" : "Add New Connection"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactName">Contact Name *</Label>
                        <Input
                          id="contactName"
                          value={editingConnection ? editingConnection.contactName : newConnection.contactName}
                          onChange={(e) => editingConnection 
                            ? setEditingConnection({...editingConnection, contactName: e.target.value})
                            : setNewConnection({...newConnection, contactName: e.target.value})
                          }
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactEmail">Email</Label>
                        <Input
                          id="contactEmail"
                          value={editingConnection ? editingConnection.contactEmail || "" : newConnection.contactEmail}
                          onChange={(e) => editingConnection 
                            ? setEditingConnection({...editingConnection, contactEmail: e.target.value})
                            : setNewConnection({...newConnection, contactEmail: e.target.value})
                          }
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          value={editingConnection ? editingConnection.company || "" : newConnection.company}
                          onChange={(e) => editingConnection 
                            ? setEditingConnection({...editingConnection, company: e.target.value})
                            : setNewConnection({...newConnection, company: e.target.value})
                          }
                          placeholder="Google"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role/Title</Label>
                        <Input
                          id="role"
                          value={editingConnection ? editingConnection.role || "" : newConnection.role}
                          onChange={(e) => editingConnection 
                            ? setEditingConnection({...editingConnection, role: e.target.value})
                            : setNewConnection({...newConnection, role: e.target.value})
                          }
                          placeholder="Software Engineer"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contactLinkedIn">LinkedIn Profile</Label>
                      <Input
                        id="contactLinkedIn"
                        value={editingConnection ? editingConnection.contactLinkedIn || "" : newConnection.contactLinkedIn}
                        onChange={(e) => editingConnection 
                          ? setEditingConnection({...editingConnection, contactLinkedIn: e.target.value})
                          : setNewConnection({...newConnection, contactLinkedIn: e.target.value})
                        }
                        placeholder="https://linkedin.com/in/johnsmith"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="relationship">Relationship</Label>
                        <Select 
                          value={editingConnection ? editingConnection.relationship : newConnection.relationship} 
                          onValueChange={(value) => editingConnection 
                            ? setEditingConnection({...editingConnection, relationship: value})
                            : setNewConnection({...newConnection, relationship: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="colleague">Colleague</SelectItem>
                            <SelectItem value="mentor">Mentor</SelectItem>
                            <SelectItem value="recruiter">Recruiter</SelectItem>
                            <SelectItem value="industry-contact">Industry Contact</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="connectionSource">How You Met</Label>
                        <Select 
                          value={editingConnection ? editingConnection.connectionSource : newConnection.connectionSource} 
                          onValueChange={(value) => editingConnection 
                            ? setEditingConnection({...editingConnection, connectionSource: value})
                            : setNewConnection({...newConnection, connectionSource: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                            <SelectItem value="event">Conference/Event</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="cold-outreach">Cold Outreach</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="connectionStrength">Connection Strength</Label>
                        <Select 
                          value={editingConnection ? editingConnection.connectionStrength : newConnection.connectionStrength} 
                          onValueChange={(value) => editingConnection 
                            ? setEditingConnection({...editingConnection, connectionStrength: value})
                            : setNewConnection({...newConnection, connectionStrength: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weak">Weak</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="strong">Strong</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Tags</Label>
                      {(editingConnection ? editingConnection.tags : newConnection.tags).map((tag, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input
                            value={tag}
                            onChange={(e) => updateTag(index, e.target.value, !!editingConnection)}
                            placeholder="e.g. React Expert, Hiring Manager, Mentor"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTag(index, !!editingConnection)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTag(!!editingConnection)}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Tag
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="lastContact">Last Contact Date</Label>
                        <Input
                          id="lastContact"
                          type="date"
                          value={editingConnection ? 
                            (editingConnection.lastContact ? new Date(editingConnection.lastContact).toISOString().split('T')[0] : "") 
                            : newConnection.lastContact
                          }
                          onChange={(e) => editingConnection 
                            ? setEditingConnection({...editingConnection, lastContact: e.target.value})
                            : setNewConnection({...newConnection, lastContact: e.target.value})
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="followUpDate">Follow-up Date</Label>
                        <Input
                          id="followUpDate"
                          type="date"
                          value={editingConnection ? 
                            (editingConnection.followUpDate ? new Date(editingConnection.followUpDate).toISOString().split('T')[0] : "") 
                            : newConnection.followUpDate
                          }
                          onChange={(e) => editingConnection 
                            ? setEditingConnection({...editingConnection, followUpDate: e.target.value})
                            : setNewConnection({...newConnection, followUpDate: e.target.value})
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={editingConnection ? editingConnection.notes || "" : newConnection.notes}
                        onChange={(e) => editingConnection 
                          ? setEditingConnection({...editingConnection, notes: e.target.value})
                          : setNewConnection({...newConnection, notes: e.target.value})
                        }
                        placeholder="Notes about this connection, conversation topics, etc..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={editingConnection ? handleUpdateConnection : handleAddConnection}
                        disabled={addConnectionMutation.isPending || updateConnectionMutation.isPending}
                        className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                      >
                        {editingConnection ? "Update Connection" : "Add Connection"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddConnection(false);
                          setEditingConnection(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Connections List */}
              <div className="grid gap-4">
                {filteredConnections.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Connections Found</h3>
                      <p className="text-gray-600 mb-4">
                        {connections.length === 0 
                          ? "Start building your professional network by adding your first connection."
                          : "No connections match your current filters. Try adjusting your search criteria."
                        }
                      </p>
                      {connections.length === 0 && (
                        <Button
                          onClick={() => setShowAddConnection(true)}
                          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        >
                          Add Your First Connection
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  filteredConnections.map((connection: NetworkConnection) => (
                    <Card key={connection.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xl">{getRelationshipIcon(connection.relationship)}</span>
                              <h3 className="text-lg font-semibold text-gray-900">{connection.contactName}</h3>
                              <Badge className={getStatusColor(connection.status)}>
                                {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                              </Badge>
                              <Badge className={getConnectionStrengthColor(connection.connectionStrength)}>
                                {connection.connectionStrength.charAt(0).toUpperCase() + connection.connectionStrength.slice(1)}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              {connection.company && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  {connection.company}
                                </div>
                              )}
                              {connection.role && (
                                <span>{connection.role}</span>
                              )}
                            </div>

                            {connection.tags && connection.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {connection.tags.map((tag: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {connection.notes && (
                              <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">{connection.notes}</p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {connection.lastContact && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  Last contact: {new Date(connection.lastContact).toLocaleDateString()}
                                </div>
                              )}
                              {connection.followUpDate && (
                                <div className={`flex items-center gap-1 ${
                                  new Date(connection.followUpDate) <= new Date() ? 'text-red-600' : 'text-gray-500'
                                }`}>
                                  <Calendar className="w-4 h-4" />
                                  Follow-up: {new Date(connection.followUpDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {connection.contactEmail && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={`mailto:${connection.contactEmail}`}>
                                  <Mail className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                            {connection.contactLinkedIn && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={connection.contactLinkedIn} target="_blank" rel="noopener noreferrer">
                                  <Linkedin className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingConnection(connection)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteConnectionMutation.mutate(connection.id)}
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

          {/* Follow-ups Tab */}
          <TabsContent value="follow-ups">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Pending Follow-ups
                </CardTitle>
                <CardDescription>
                  Connections that need your attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {followUpConnections.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No pending follow-ups at the moment.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {followUpConnections.map((connection: NetworkConnection) => (
                      <div key={connection.id} className="border border-red-200 bg-red-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{connection.contactName}</h4>
                            <p className="text-sm text-gray-600">{connection.company} • {connection.role}</p>
                            <p className="text-sm text-red-700 mt-1">
                              Follow-up due: {new Date(connection.followUpDate!).toLocaleDateString()}
                            </p>
                            {connection.notes && (
                              <p className="text-sm text-gray-600 mt-2">{connection.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {connection.contactEmail && (
                              <Button size="sm" asChild>
                                <a href={`mailto:${connection.contactEmail}`}>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Email
                                </a>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingConnection(connection)}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Update
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    LinkedIn Connection Request
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">
                      "Hi [Name], I came across your profile and was impressed by your work at [Company]. I'm currently [your role/situation] and would love to connect and learn from your experience in [their field/expertise]. Thanks!"
                    </p>
                  </div>
                  <Button variant="outline" className="mt-4 w-full">
                    Copy Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Follow-up Email
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">
                      "Hi [Name], I hope you're doing well! I wanted to follow up on our conversation about [topic]. I've been thinking about what you said regarding [specific point], and I'd love to continue our discussion. Are you available for a coffee chat sometime next week?"
                    </p>
                  </div>
                  <Button variant="outline" className="mt-4 w-full">
                    Copy Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Informational Interview Request
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">
                      "Hi [Name], I'm [your name] and I'm exploring opportunities in [field/industry]. I came across your background and was really impressed by your journey from [previous role] to [current role]. Would you be open to a brief 15-20 minute conversation about your experience and any insights you might have for someone looking to transition into this space?"
                    </p>
                  </div>
                  <Button variant="outline" className="mt-4 w-full">
                    Copy Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Thank You After Meeting
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">
                      "Hi [Name], Thank you so much for taking the time to meet with me today. I really enjoyed our conversation about [specific topic discussed] and found your insights about [specific insight] particularly valuable. I'll definitely [action you mentioned you'd take]. Looking forward to staying in touch!"
                    </p>
                  </div>
                  <Button variant="outline" className="mt-4 w-full">
                    Copy Template
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}