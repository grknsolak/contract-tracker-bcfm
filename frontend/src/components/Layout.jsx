import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children, route, onNavigate, contracts, theme, toggleTheme }) {
  return (
    <div className="app-shell">
      <Sidebar route={route} onNavigate={onNavigate} />
      <div className="app-main">
        <Topbar onNavigate={onNavigate} contracts={contracts} route={route} theme={theme} toggleTheme={toggleTheme} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
