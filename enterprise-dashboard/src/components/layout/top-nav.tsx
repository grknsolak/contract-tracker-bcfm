"use client";

import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TopNav() {
  return (
    <header className="h-16 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="h-full flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Contract Tracker</h1>
          <p className="text-xs text-muted-foreground">Lifecycle monitoring for customer agreements</p>
        </div>
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search customers, contracts, or scopes" aria-label="Search" />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>
          <Button variant="outline" className="h-9">
            Ops Team
          </Button>
        </div>
      </div>
    </header>
  );
}
