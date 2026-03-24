import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children, route, onNavigate, contracts, theme, toggleTheme, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "1"
  );

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className={`app-shell${collapsed ? " app-shell--collapsed" : ""}`}>
      <Sidebar
        route={route}
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        collapsed={collapsed}
        onToggle={toggleSidebar}
      />
      <div className="app-main">
        <Topbar onNavigate={onNavigate} contracts={contracts} route={route} theme={theme} toggleTheme={toggleTheme} user={user} onLogout={onLogout} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
