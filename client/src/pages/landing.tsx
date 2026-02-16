import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Building, Clock, TrendingUp } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-slate-900">Layoff Proof</h1>
            <Button onClick={handleLogin} className="bg-primary hover:bg-primary/90">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Stay Informed About Company Layoffs
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Monitor layoff activities at your company and across the industry.
            Get real-time updates and stay ahead of potential changes.
          </p>
          <Button
            onClick={handleLogin}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
          >
            Get Started
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Shield className="w-8 h-8 text-success mb-2" />
              <CardTitle className="text-lg">Real-time Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Track layoff activities and company status updates in real-time.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Building className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Company Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Get detailed information about companies and their recent activities.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="w-8 h-8 text-warning mb-2" />
              <CardTitle className="text-lg">Early Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Receive notifications about potential layoffs before they happen.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="w-8 h-8 text-slate-500 mb-2" />
              <CardTitle className="text-lg">Industry Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Analyze industry-wide layoff trends and patterns.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Ready to Stay Informed?
          </h3>
          <p className="text-slate-600 mb-6">
            Join thousands of professionals who trust LayoffTracker to keep them updated.
          </p>
          <Button
            onClick={handleLogin}
            size="lg"
            className="bg-primary hover:bg-primary/90"
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
