import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  Megaphone,
  PackageSearch,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo, LogoMark } from "./logo";
import type { Me } from "@/lib/me";
import { ROLE_LABEL } from "@/lib/constants";

const MAIN = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/notices", label: "Digital Notice Board", icon: Megaphone },
  { to: "/notes", label: "Notes", icon: FileText },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/lost-found", label: "Lost & Found", icon: PackageSearch },
] as const;

const ACCOUNT = [
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const ADMIN = [
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/users", label: "Manage users", icon: Users },
  { to: "/admin/claims", label: "Claim requests", icon: Inbox },
] as const;

export function AppSidebar({ me }: { me: Me }) {
  const { pathname } = useLocation();
  const { setOpenMobile, state } = useSidebar();
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  const renderItems = (items: readonly { to: string; label: string; icon: typeof Megaphone }[]) =>
    items.map(({ to, label, icon: Icon }) => (
      <SidebarMenuItem key={to}>
        <SidebarMenuButton asChild isActive={isActive(to)} tooltip={label} className="h-9 rounded-lg data-[active=true]:shadow-soft">
          <Link to={to} onClick={() => setOpenMobile(false)}>
            <Icon />
            <span>{label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="glass border-r">
      <SidebarHeader className="px-3 py-4">
        <Link to="/dashboard" className="flex items-center">
          {state === "collapsed" ? <LogoMark className="size-8" /> : <Logo />}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(MAIN)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {me.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(ADMIN)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(ACCOUNT)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <div className="rounded-xl bg-gradient-ink p-4 text-ink-foreground dark:text-foreground">
          <p className="text-xs font-medium uppercase tracking-wider opacity-60">Signed in as</p>
          <p className="mt-1 font-display font-semibold">{ROLE_LABEL[me.role]}</p>
          <p className="mt-0.5 truncate text-xs opacity-70">{me.profile?.college_name ?? "JECRC University"}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
