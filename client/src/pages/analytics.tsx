import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, BarChart3, PieChart as PieIcon, MapPin, Briefcase, Calendar, Building } from "lucide-react";
import Header from "@/components/Header";

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];

export default function Analytics() {
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  // Fetch historical data
  const { data: historicalData, isLoading: historicalLoading } = useQuery({
    queryKey: ["/api/analytics/historical"],
    retry: false,
  });

  // Fetch trends data
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ["/api/analytics/trends", { timeframe }],
    retry: false,
  });

  const isLoading = historicalLoading || trendsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Layoff Analytics</h2>
          <p className="text-slate-600">
            Historical data and trends about layoffs across industries, states, and job titles
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Companies</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {historicalData?.byIndustry?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-destructive" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Layoff Events</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {historicalData?.byYear?.reduce((sum, item) => sum + item.count, 0) || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-warning" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Employees Affected</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {historicalData?.byYear?.reduce((sum, item) => sum + item.employees, 0)?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-success" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">States Affected</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {historicalData?.byState?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trends Chart */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Layoff Trends
              </CardTitle>
              <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {trendsData && trendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="employees" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-slate-500">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* By Year Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Layoffs by Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historicalData?.byYear && historicalData.byYear.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={historicalData.byYear}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-300 flex items-center justify-center text-slate-500">
                  No historical data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* By Industry Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieIcon className="w-5 h-5" />
                Layoffs by Industry
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historicalData?.byIndustry && historicalData.byIndustry.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={historicalData.byIndustry.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {historicalData.byIndustry.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-300 flex items-center justify-center text-slate-500">
                  No industry data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Affected States */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Top Affected States
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historicalData?.byState && historicalData.byState.length > 0 ? (
                <div className="space-y-4">
                  {historicalData.byState.slice(0, 10).map((item, index) => (
                    <div key={item.state} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{item.state}</p>
                          <p className="text-sm text-slate-500">{item.employees.toLocaleString()} employees affected</p>
                        </div>
                      </div>
                      <Badge variant="outline">{item.count} events</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No state data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Affected Job Titles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Most Affected Job Titles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historicalData?.byJobTitle && historicalData.byJobTitle.length > 0 ? (
                <div className="space-y-4">
                  {historicalData.byJobTitle.slice(0, 10).map((item, index) => (
                    <div key={item.jobTitle} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-warning">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{item.jobTitle}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{item.count} mentions</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No job title data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}