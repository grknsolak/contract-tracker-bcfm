import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children, route, onNavigate, contracts }) {
  return (
    <div className="app-shell">
      <Sidebar route={route} onNavigate={onNavigate} />
      <div className="app-main">
        <Topbar onNavigate={onNavigate} contracts={contracts} route={route} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
