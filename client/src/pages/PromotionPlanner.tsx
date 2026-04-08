import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getApiErrorMessage } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import GlobalHeader from '@/components/GlobalHeader';
import GlobalFooter from '@/components/GlobalFooter';
import { Target, CheckCircle, Clock } from 'lucide-react';
import type { SelectPromotionPlan, InsertPromotionPlan } from '@shared/schema';

interface Strategy {
  id: number;
  title: string;
  timeline: string;
  description: string;
  completed: boolean;
}

export default function PromotionPlanner() {
  const [showForm, setShowForm] = useState(true);
  const [showStrategies, setShowStrategies] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SelectPromotionPlan | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<InsertPromotionPlan>({
    currentRole: '',
    companyType: '',
    yearsInRole: '',
    responsibilities: '',
    careerGoal: '',
    linkedinUrl: '',
  });

  // Check for existing promotion plan
  const { data: existingPlan, isLoading: planLoading } = useQuery({
    queryKey: ['/api/promotion-plans/current'],
    retry: false,
  });

  // Generate promotion plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: async (data: InsertPromotionPlan) => {
      return await apiRequest("POST", "/api/promotion-plans/generate", data);
    },
    onSuccess: (data) => {
      setCurrentPlan(data.plan);
      setShowForm(false);
      setShowStrategies(true);
      toast({
        title: "Success!",
        description: "Your personalized promotion strategies have been generated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/promotion-plans/current'] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to generate promotion plan"),
        variant: "destructive",
      });
    },
  });

  // Save progress mutation
  const saveProgressMutation = useMutation({
    mutationFn: async (strategies: Strategy[]) => {
      return await apiRequest(
        "PUT",
        `/api/promotion-plans/${currentPlan?.id}/progress`,
        { strategies }
      );
    },
    onSuccess: () => {
      toast({
        title: "Progress Saved!",
        description: "Your promotion plan progress has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/promotion-plans/current'] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to save progress"),
        variant: "destructive",
      });
    },
  });

  // Initialize with existing plan if available
  React.useEffect(() => {
    if (existingPlan && !currentPlan) {
      setCurrentPlan(existingPlan as SelectPromotionPlan);
      setShowForm(false);
      setShowStrategies(true);
    }
  }, [existingPlan, currentPlan]);

  const handleInputChange = (field: keyof InsertPromotionPlan, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGeneratePlan = () => {
    if (!formData.currentRole || !formData.companyType || !formData.yearsInRole || 
        !formData.responsibilities || !formData.careerGoal) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to generate your promotion plan.",
        variant: "destructive",
      });
      return;
    }
    generatePlanMutation.mutate(formData);
  };

  const handleCreateNewPlan = () => {
    // Reset all state to show the form again
    setCurrentPlan(null);
    setShowForm(true);
    setShowStrategies(false);
    // Clear form data for fresh start
    setFormData({
      currentRole: '',
      companyType: '',
      yearsInRole: '',
      responsibilities: '',
      careerGoal: '',
      linkedinUrl: '',
    });
  };

  const handleStrategyToggle = (strategyId: number) => {
    if (!currentPlan?.strategies) return;
    
    const updatedStrategies = currentPlan.strategies.map(strategy =>
      strategy.id === strategyId 
        ? { ...strategy, completed: !strategy.completed }
        : strategy
    );
    
    setCurrentPlan(prev => prev ? { ...prev, strategies: updatedStrategies } : null);
  };

  const handleSaveProgress = () => {
    if (currentPlan?.strategies) {
      saveProgressMutation.mutate(currentPlan.strategies);
    }
  };

  if (planLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <GlobalHeader />
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
        <GlobalFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <GlobalHeader />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Career Goals Form */}
          {showForm && (
            <Card className="shadow-xl border-blue-500 ring-2 ring-blue-500">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Target className="w-8 h-8 text-blue-600 mr-3" />
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    Tell Us About Your Career Goals
                  </CardTitle>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  Share your current situation and aspirations to get tailored advancement strategies
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentRole" className="text-sm font-medium">
                      Current Role/Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="currentRole"
                      placeholder="e.g., Software Engineer, Marketing Manager"
                      value={formData.currentRole}
                      onChange={(e) => handleInputChange('currentRole', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyType" className="text-sm font-medium">
                      Company/Industry Type <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="companyType"
                      placeholder="e.g., Tech Startup, Healthcare, Finance"
                      value={formData.companyType}
                      onChange={(e) => handleInputChange('companyType', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsInRole" className="text-sm font-medium">
                    Years in Current Role
                  </Label>
                  <Input
                    id="yearsInRole"
                    placeholder="e.g., 2.5 years"
                    value={formData.yearsInRole}
                    onChange={(e) => handleInputChange('yearsInRole', e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibilities" className="text-sm font-medium">
                    Current Responsibilities & Achievements
                  </Label>
                  <Textarea
                    id="responsibilities"
                    placeholder="Describe your key responsibilities and any notable achievements..."
                    value={formData.responsibilities}
                    onChange={(e) => handleInputChange('responsibilities', e.target.value)}
                    className="w-full min-h-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="careerGoal" className="text-sm font-medium">
                    Promotion/Career Goal <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="careerGoal"
                    placeholder="e.g., Senior Engineer, Team Lead, 25% salary increase"
                    value={formData.careerGoal}
                    onChange={(e) => handleInputChange('careerGoal', e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl" className="text-sm font-medium">
                    LinkedIn URL or Resume Link (Optional)
                  </Label>
                  <Input
                    id="linkedinUrl"
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={formData.linkedinUrl || ''}
                    onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                    className="w-full"
                  />
                </div>

                <Button
                  onClick={handleGeneratePlan}
                  disabled={generatePlanMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
                >
                  {generatePlanMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Generating Plan...</span>
                    </div>
                  ) : (
                    'Generate Promotion Plan'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Personalized Strategies */}
          {showStrategies && currentPlan && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Your Personalized Promotion Strategies
                </h1>
              </div>

              {currentPlan.strategies.map((strategy, index) => (
                <Card key={strategy.id} className="shadow-lg border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Checkbox
                        checked={strategy.completed}
                        onCheckedChange={() => handleStrategyToggle(strategy.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Strategy {index + 1}: {strategy.title}
                          </h3>
                          {strategy.completed && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-3">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-blue-600 font-medium">
                            Timeline: {strategy.timeline}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {strategy.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleSaveProgress}
                  disabled={saveProgressMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  {saveProgressMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Saving...</span>
                    </div>
                  ) : (
                    'Save Progress'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <GlobalFooter />
    </div>
  );
}