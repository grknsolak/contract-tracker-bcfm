import React, { useEffect, useState } from "react";
import Layout from "./components/Layout";
import LoadingState from "./components/LoadingState";
import ToastContainer from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import ContractDetails from "./pages/ContractDetails";
import Alerts from "./pages/Alerts";
import Segmentation from "./pages/Segmentation";
import RevenueDashboard from "./pages/RevenueDashboard";
import Pipelines from "./pages/Pipelines";
import Settings from "./pages/Settings";
import Login from "./Login";
import { contractsSeed, activitySeed } from "./data/sampleData";
import { useHashRoute } from "./hooks/useHashRoute";
import { getAuthUser, logoutUser } from "./utils/auth";
import { loadSettings } from "./utils/appSettings";

export default function App() {
  const { route, navigate } = useHashRoute();
  const [contracts, setContracts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Auth ────────────────────────────────────────────
  const [user, setUser] = useState(() => getAuthUser());

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  // ── Settings ────────────────────────────────────────
  const [settings, setSettings] = useState(() => loadSettings());

  // ── Theme ──────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  // ── Global USD Rate ─────────────────────────────────
  const [usdRate, setUsdRate] = useState(() => parseFloat(localStorage.getItem("usdRate")) || 32);
  const [usdRateUpdatedAt, setUsdRateUpdatedAt] = useState(() => localStorage.getItem("usdRateUpdatedAt") || null);
  const [usdRateFetching, setUsdRateFetching] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Fetch live USD/TRY from Frankfurter API (free, no key)
  useEffect(() => {
    const cachedAt = localStorage.getItem("usdRateUpdatedAt");
    const isStale = !cachedAt || Date.now() - new Date(cachedAt).getTime() > 1000 * 60 * 60 * 8; // 8 saatte bir

    if (!isStale) return;

    setUsdRateFetching(true);
    fetch("https://api.frankfurter.app/latest?from=USD&to=TRY")
      .then((r) => r.json())
      .then((data) => {
        const rate = data?.rates?.TRY;
        if (rate && rate > 0) {
          const now = new Date().toISOString();
          setUsdRate(rate);
          setUsdRateUpdatedAt(now);
          localStorage.setItem("usdRate", rate);
          localStorage.setItem("usdRateUpdatedAt", now);
        }
      })
      .catch(() => { /* API failed — cached/default rate kullanılır */ })
      .finally(() => setUsdRateFetching(false));
  }, []);

  const updateUsdRate = (rate) => {
    const parsed = parseFloat(rate);
    if (!isNaN(parsed) && parsed > 0) {
      setUsdRate(parsed);
      localStorage.setItem("usdRate", parsed);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setContracts(contractsSeed);
      setActivity(activitySeed);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ── Auth gate ───────────────────────────────────────
  if (!user) {
    return (
      <>
        <ToastContainer />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  if (loading) {
    return (
      <div className="screen">
        <LoadingState label="Preparing contract workspace" />
      </div>
    );
  }

  let content = null;

  if (route.name === "customers") {
    content = <Customers contracts={contracts} setContracts={setContracts} onNavigate={navigate} route={route} usdRate={usdRate} onUsdRateChange={updateUsdRate} usdRateUpdatedAt={usdRateUpdatedAt} usdRateFetching={usdRateFetching} />;
  } else if (route.name === "revenue") {
    content = <RevenueDashboard contracts={contracts} />;
  } else if (route.name === "segmentation") {
    content = <Segmentation contracts={contracts} onNavigate={navigate} />;
  } else if (route.name === "pipelines") {
    content = <Pipelines contracts={contracts} setContracts={setContracts} onNavigate={navigate} />;
  } else if (route.name === "alerts") {
    content = <Alerts contracts={contracts} onNavigate={navigate} />;
  } else if (route.name === "contracts") {
    const contract = contracts.find((item) => item.id === route.id);
    content = <ContractDetails contract={contract} contracts={contracts} setContracts={setContracts} onNavigate={navigate} />;
  } else if (route.name === "settings") {
    content = <Settings settings={settings} onSettingsChange={setSettings} theme={theme} toggleTheme={toggleTheme} currentUser={user} initialSection={route.query?.section} />;
  } else {
    content = <Dashboard contracts={contracts} activity={activity} onNavigate={navigate} />;
  }

  return (
    <>
      <ToastContainer />
      <Layout route={route} onNavigate={navigate} contracts={contracts} theme={theme} toggleTheme={toggleTheme} user={user} onLogout={handleLogout}>
        {content}
      </Layout>
    </>
  );
}
