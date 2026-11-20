import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Bookmark,
  CalendarRange,
  FileStack,
  History,
  LayoutGrid,
  LifeBuoy,
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
  { to: "/papers", label: "Previous Year Papers", icon: FileStack },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/calendar", label: "Calendar", icon: CalendarRange },
  { to: "/lost-found", label: "Lost & Found", icon: PackageSearch },
] as const;

const LIBRARY = [
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/saved", label: "Saved Items", icon: Bookmark },
  { to: "/downloads", label: "Download History", icon: History },
] as const;

const FACULTY = [{ to: "/manage", label: "Faculty Dashboard", icon: LayoutGrid }] as const;

const ACCOUNT = [
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help Center", icon: LifeBuoy },
] as const;

const ADMIN = [
  { to: "/admin/analytics", label: "Admin Dashboard", icon: BarChart3 },
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
        <SidebarMenuButton asChild isActive={isActive(to)} tooltip={label} className="relative h-9 rounded-lg transition-all duration-200 hover:translate-x-0.5 data-[active=true]:bg-transparent">
          <Link to={to} onClick={() => setOpenMobile(false)}>
            {isActive(to) && <motion.span layoutId="sidebar-active" className="absolute inset-0 -z-0 rounded-lg bg-sidebar-accent shadow-soft" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            {isActive(to) && <motion.span layoutId="sidebar-bar" className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-primary" />}
            <Icon className="relative" />
            <span className="relative">{label}</span>
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
        <SidebarGroup>
          <SidebarGroupLabel>My stuff</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(LIBRARY)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {(me.role === "faculty" || me.role === "admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Teaching</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(FACULTY)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
