import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout({ children, route, onNavigate }) {
  return (
    <div className="app-shell">
      <Sidebar route={route} onNavigate={onNavigate} />
      <div className="app-main">
        <Topbar onNavigate={onNavigate} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
