"use client";

import { BarChart3, ChevronLeft, ChevronRight, FileText, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Finance", icon: BarChart3, active: false },
  { label: "Reports", icon: FileText, active: false },
  { label: "Settings", icon: Settings, active: false }
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "border-r bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        <span className={cn("font-semibold text-lg", collapsed && "sr-only")}>ExecSuite</span>
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>

      <nav className="p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item.active ? "bg-primary/10 text-primary" : "hover:bg-muted"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className={cn(collapsed && "sr-only")}>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
