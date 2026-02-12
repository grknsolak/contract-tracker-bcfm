import React, { useEffect, useState } from "react";
import Login from "./Login";
import ContractApp from "./ContractApp";
import { me } from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const { data } = await me();
        if (on) setUser(data?.user ?? null);
      } catch {
        if (on) setUser(null);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  if (loading) {
    return <div className="screen center muted">Yükleniyor…</div>;
  }

  return user ? <ContractApp user={user} setUser={setUser} /> : <Login onLogin={setUser} />;
}