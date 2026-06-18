import type { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

/** Prime auth state after login so protected routes accept client-side navigation. */
export function seedAuthCacheAndRefresh(user?: Partial<User> | null): void {
  if (user) {
    queryClient.setQueryData(["/api/auth/user"], user);
  }
  void queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
}
