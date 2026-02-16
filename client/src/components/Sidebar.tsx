import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  Info, 
  TriangleAlert, 
  Download, 
  Bell, 
  TrendingUp 
} from "lucide-react";
import type { Notification } from "@shared/schema";

export default function Sidebar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
    retry: false,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest("POST", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
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
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <TriangleAlert className="w-4 h-4 text-warning" />;
      case "danger":
        return <TriangleAlert className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-primary" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-warning/10";
      case "danger":
        return "bg-destructive/10";
      default:
        return "bg-primary/10";
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  return (
    <div className="space-y-6">
      {/* Notifications Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-slate-500">Loading notifications...</p>
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.slice(0, 3).map((notification: Notification) => (
              <div
                key={notification.id}
                className={`flex items-start space-x-3 p-3 rounded-lg ${getNotificationBgColor(notification.type)} ${
                  !notification.isRead ? 'border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                  <p className="text-xs text-slate-600">{notification.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-500">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs h-6 px-2"
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-slate-500">
              <p className="text-sm">No notifications</p>
            </div>
          )}

          <Button variant="ghost" className="w-full text-sm text-primary hover:text-primary/80">
            View All Notifications
          </Button>
        </CardContent>
      </Card>

      {/* Industry Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Industry Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Technology</p>
              <p className="text-xs text-slate-500">23 companies affected</p>
            </div>
            <Badge className="bg-destructive/10 text-destructive">
              High Risk
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Healthcare</p>
              <p className="text-xs text-slate-500">5 companies affected</p>
            </div>
            <Badge className="bg-warning/10 text-warning">
              Medium Risk
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Finance</p>
              <p className="text-xs text-slate-500">2 companies affected</p>
            </div>
            <Badge className="bg-success/10 text-success">
              Low Risk
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => toast({ title: "Feature coming soon", description: "Export functionality will be available soon." })}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => toast({ title: "Feature coming soon", description: "Alert settings will be available soon." })}
          >
            <Bell className="w-4 h-4 mr-2" />
            Set Alerts
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => toast({ title: "Feature coming soon", description: "Analytics dashboard will be available soon." })}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
