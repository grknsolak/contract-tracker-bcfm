"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, LayoutDashboard, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Alerts", icon: Bell, href: "/alerts" },
  { label: "Renewal Calendar", icon: CalendarDays, href: "/alerts" }
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "border-r bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        <span className={cn("font-semibold text-lg", collapsed && "sr-only")}>ContractOps</span>
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>

      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className={cn(collapsed && "sr-only")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
