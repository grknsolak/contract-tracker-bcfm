import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children, route, onNavigate, contracts, theme, toggleTheme, user, onLogout }) {
  return (
    <div className="app-shell">
      <Sidebar route={route} onNavigate={onNavigate} user={user} onLogout={onLogout} />
      <div className="app-main">
        <Topbar onNavigate={onNavigate} contracts={contracts} route={route} theme={theme} toggleTheme={toggleTheme} user={user} onLogout={onLogout} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
