import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

interface MagicLinkButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg";
}

export function MagicLinkButton({ className = "", variant = "default", size = "default" }: MagicLinkButtonProps) {
  return (
    <Link href="/magic-login">
      <Button 
        className={`bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white ${className}`}
        variant={variant}
        size={size}
      >
        <Mail className="w-4 h-4 mr-2" />
        Magic Link Sign In
      </Button>
    </Link>
  );
}