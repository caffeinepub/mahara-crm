import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  Kanban,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", path: "/leads", icon: Users },
  { label: "Pipeline", path: "/pipeline", icon: Kanban },
  { label: "Follow-ups", path: "/followups", icon: CalendarClock },
  { label: "Settings", path: "/settings", icon: Settings },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { user, logout } = useAuth();

  return (
    <aside
      className="flex flex-col h-full"
      style={{ backgroundColor: "#0F2A3A" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-6 py-5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#14B8A6" }}
        >
          <Leaf className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-display font-bold text-lg tracking-tight">
          Mahara CRM
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active =
            currentPath === item.path ||
            currentPath.startsWith(`${item.path}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              data-ocid={`nav.${item.label.toLowerCase().replace("-", "")}.link`}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active ? "text-white" : "hover:bg-white/10"
              }`}
              style={
                active
                  ? { backgroundColor: "#14B8A6", color: "white" }
                  : { color: "#C7D2DE" }
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      {user && (
        <div
          className="px-3 py-4 border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback
                className="text-xs font-semibold"
                style={{ backgroundColor: "#14B8A6", color: "white" }}
              >
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user.name}
              </p>
              <p
                className="text-xs truncate capitalize"
                style={{ color: "#C7D2DE" }}
              >
                {user.role === "admin" ? "Admin" : "Sales Rep"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              data-ocid="nav.logout.button"
              className="text-white/50 hover:text-white transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const pageTitle =
    navItems.find((n) => currentPath.startsWith(n.path))?.label ?? "Dashboard";
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div
        className="hidden md:flex w-64 shrink-0 flex-col"
        style={{ backgroundColor: "#0F2A3A" }}
      >
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay backdrop */}
          <div
            role="presentation"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 flex flex-col z-10">
            <Sidebar onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-4 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            data-ocid="nav.menu.button"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1">
            <h1 className="font-display font-bold text-xl text-foreground">
              {pageTitle}
            </h1>
            <p className="text-xs text-muted-foreground">
              Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}! Here's
              your school overview.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 relative">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 w-48 h-8 text-sm bg-gray-50 border-gray-200"
              data-ocid="nav.search_input"
            />
          </div>

          <button
            type="button"
            className="relative text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="nav.bell.button"
          >
            <Bell className="w-5 h-5" />
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: "#14B8A6" }}
            />
          </button>

          {user && (
            <Avatar className="w-8 h-8 cursor-pointer">
              <AvatarFallback
                className="text-xs font-semibold"
                style={{ backgroundColor: "#0F2A3A", color: "white" }}
              >
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
