import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Bookmark, LifeBuoy, LogOut, Settings, UserRound } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "./app-sidebar";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { UserAvatar } from "./user-avatar";
import { meQuery } from "@/lib/me";
import { signOut } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";

export function AppShell() {
  const { data: me } = useSuspenseQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (!me?.profile) return null;

  async function handleSignOut() {
    await signOut(qc);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <AppSidebar me={me} />
      <SidebarInset className="min-w-0 bg-background bg-mesh">
        <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 sm:px-6">
          <SidebarTrigger className="rounded-lg" />
          <div className="flex flex-1 justify-center sm:justify-start">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell userId={me.userId} />
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 rounded-full outline-none ring-ring focus-visible:ring-2" aria-label="Open profile menu">
                <UserAvatar src={me.profile.avatar_url} name={me.profile.full_name} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl">
                <DropdownMenuLabel className="flex items-center gap-3 py-2">
                  <UserAvatar src={me.profile.avatar_url} name={me.profile.full_name} className="size-10" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{me.profile.full_name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{me.email}</p>
                    <Badge variant="soft" className="mt-1">{ROLE_LABEL[me.role]}</Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile"><UserRound /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/saved"><Bookmark /> Saved items</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings"><Settings /> Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/help"><LifeBuoy /> Help</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
