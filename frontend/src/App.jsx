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
import { contractsSeed, activitySeed } from "./data/sampleData";
import { useHashRoute } from "./hooks/useHashRoute";

export default function App() {
  const { route, navigate } = useHashRoute();
  const [contracts, setContracts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setContracts(contractsSeed);
      setActivity(activitySeed);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="screen">
        <LoadingState label="Preparing contract workspace" />
      </div>
    );
  }

  let content = null;

  if (route.name === "customers") {
    content = <Customers contracts={contracts} setContracts={setContracts} onNavigate={navigate} route={route} />;
  } else if (route.name === "revenue") {
    content = <RevenueDashboard contracts={contracts} />;
  } else if (route.name === "segmentation") {
    content = <Segmentation contracts={contracts} onNavigate={navigate} />;
  } else if (route.name === "pipelines") {
    content = <Pipelines contracts={contracts} onNavigate={navigate} />;
  } else if (route.name === "alerts") {
    content = <Alerts contracts={contracts} onNavigate={navigate} />;
  } else if (route.name === "contracts") {
    const contract = contracts.find((item) => item.id === route.id);
    content = <ContractDetails contract={contract} setContracts={setContracts} onNavigate={navigate} />;
  } else {
    content = <Dashboard contracts={contracts} activity={activity} onNavigate={navigate} />;
  }

  return (
    <>
      <ToastContainer />
      <Layout route={route} onNavigate={navigate} contracts={contracts}>
        {content}
      </Layout>
    </>
  );
}
