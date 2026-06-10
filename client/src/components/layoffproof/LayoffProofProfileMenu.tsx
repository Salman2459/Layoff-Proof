import { Link } from "wouter";
import { ChevronDown, Settings, CreditCard, Briefcase, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriberAccess } from "@/hooks/useSubscriberAccess";
import { clearClientStorageOnLogout } from "@/lib/logoutStorage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function displayName(first?: string | null, last?: string | null): string {
  const f = first?.trim();
  const l = last?.trim();
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  return "User";
}

function initials(first?: string | null, last?: string | null): string {
  const a = first?.trim()?.[0] ?? "";
  const b = last?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "U";
}

async function handleLogout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
    });
    clearClientStorageOnLogout();
    window.location.href = response.ok ? "/" : "/";
  } catch {
    clearClientStorageOnLogout();
    window.location.href = "/";
  }
}

const menuItemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#334155] outline-none transition focus:bg-[#f8fafc] data-[highlighted]:bg-[#f8fafc]";

type LayoffProofProfileMenuProps = {
  className?: string;
};

export function LayoffProofProfileMenu({ className }: LayoffProofProfileMenuProps) {
  const { user } = useAuth();
  const { hasAccess } = useSubscriberAccess();
  const name = displayName(user?.firstName, user?.lastName);
  const avatarLetter = initials(user?.firstName, user?.lastName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition outline-none hover:bg-[#f8fafc] focus-visible:ring-2 focus-visible:ring-[#c7d2fe]/60 data-[state=open]:bg-[#f8fafc]",
            className
          )}
          aria-label="Account menu"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#818cf8] to-[#6366f1] text-sm font-semibold text-white">
            {avatarLetter}
          </div>
          <div className="hidden flex-col items-start sm:flex">
            <p className="text-sm font-semibold leading-tight text-[#1e293b]">{name}</p>
            {hasAccess ? (
              <span className="mt-0.5 rounded-md bg-[#ede9fe] px-1.5 py-0.5 text-[10px] font-bold text-[#7c3aed]">
                Premium
              </span>
            ) : (
              <span className="mt-0.5 text-[11px] text-[#94a3b8]">Free Plan</span>
            )}
          </div>
          <ChevronDown className="hidden h-4 w-4 text-[#94a3b8] sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-52 rounded-xl border border-[#e8ecf4] bg-white p-1.5 shadow-lg"
      >
        <DropdownMenuItem asChild className={menuItemClass}>
          <Link href="/profile" className="flex w-full items-center gap-3 no-underline">
            <Settings className="h-4 w-4 shrink-0 text-[#64748b]" strokeWidth={1.75} />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={menuItemClass}>
          <Link
            href="/manage-subscription"
            className="flex w-full items-center gap-3 no-underline"
          >
            <CreditCard className="h-4 w-4 shrink-0 text-[#64748b]" strokeWidth={1.75} />
            Manage Subscription
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={menuItemClass}>
          <Link href="/job-board" className="flex w-full items-center gap-3 no-underline">
            <Briefcase className="h-4 w-4 shrink-0 text-[#64748b]" strokeWidth={1.75} />
            Job Board
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={cn(menuItemClass, "text-[#334155]")}
          onSelect={(e) => {
            e.preventDefault();
            void handleLogout();
          }}
        >
          <LogOut className="h-4 w-4 shrink-0 text-[#64748b]" strokeWidth={1.75} />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
