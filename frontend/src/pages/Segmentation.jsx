import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import PieChart from "../components/PieChart";
import BarChart from "../components/BarChart";
import { formatCurrency, daysUntil } from "../utils/date";
import { getFxLatest } from "../api";

const SEGMENT_COLORS = {
  Enterprise: "#0f766e",
  "Mid-Market": "#2563eb",
  SMB: "#f59e0b",
};

const RISK_META = {
  critical: { label: "Critical", tone: "danger" },
  high: { label: "High Risk", tone: "danger" },
  attention: { label: "Needs Attention", tone: "warning" },
  healthy: { label: "Healthy", tone: "success" },
};

function classifyRisk(days) {
  if (days == null) return "healthy";
  if (days < 0) return "critical";
  if (days <= 30) return "high";
  if (days <= 60) return "attention";
  return "healthy";
}

export default function Segmentation({ contracts }) {
  const [fx, setFx] = useState({ rate: null, date: null, loading: true, error: null });
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("All");
  const [segmentFilter, setSegmentFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [sortBy, setSortBy] = useState("revenue");
  const [smbMax, setSmbMax] = useState(10000);
  const [midMax, setMidMax] = useState(50000);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const { data } = await getFxLatest("USD", "TRY");
        const rate = data?.rates?.TRY;
        if (on) {
          setFx({ rate: typeof rate === "number" ? rate : null, date: data?.date, loading: false, error: null });
        }
      } catch (error) {
        if (on) {
          setFx({ rate: null, date: null, loading: false, error: "FX rate unavailable" });
        }
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const segments = useMemo(() => {
    return [
      { id: "Enterprise", label: "Enterprise", min: midMax, max: Infinity },
      { id: "Mid-Market", label: "Mid-Market", min: smbMax, max: midMax },
      { id: "SMB", label: "SMB", min: 0, max: smbMax },
    ];
  }, [smbMax, midMax]);

  const normalized = useMemo(() => {
    return contracts.map((contract) => {
      const rawValue = Number(contract.value || 0);
      const usdValue = contract.currency === "TL" ? (fx.rate ? rawValue / fx.rate : null) : rawValue;
      const segment = segments.find((seg) => usdValue != null && usdValue >= seg.min && usdValue < seg.max) || null;
      const remaining = daysUntil(contract.endDate);
      const risk = classifyRisk(remaining);
      return {
        ...contract,
        rawValue,
        usdValue,
        segment,
        remaining,
        risk,
      };
    });
  }, [contracts, fx.rate, segments]);

  const filtered = useMemo(() => {
    return normalized
      .filter((contract) => {
        const matchesSearch =
          contract.customerName.toLowerCase().includes(search.toLowerCase()) ||
          contract.contractName.toLowerCase().includes(search.toLowerCase());
        const matchesScope = scopeFilter === "All" || (contract.scopes || []).includes(scopeFilter);
        const matchesSegment = segmentFilter === "All" || contract.segment?.id === segmentFilter;
        const matchesRisk = riskFilter === "All" || contract.risk === riskFilter;
        return matchesSearch && matchesScope && matchesSegment && matchesRisk;
      })
      .sort((a, b) => {
        if (sortBy === "expiry") {
          return (a.remaining ?? 99999) - (b.remaining ?? 99999);
        }
        return (b.usdValue || 0) - (a.usdValue || 0);
      });
  }, [normalized, search, scopeFilter, segmentFilter, riskFilter, sortBy]);

  const totalUsd = useMemo(() => normalized.reduce((sum, item) => sum + (item.usdValue || 0), 0), [normalized]);

  const totalCustomers = normalized.length;
  const avgRevenue = totalCustomers ? totalUsd / totalCustomers : 0;

  const segmentSummary = useMemo(() => {
    return segments.map((seg) => {
      const items = normalized.filter((item) => item.segment?.id === seg.id);
      const revenue = items.reduce((sum, item) => sum + (item.usdValue || 0), 0);
      const percent = totalUsd ? Math.round((revenue / totalUsd) * 100) : 0;
      return { ...seg, count: items.length, revenue, percent };
    });
  }, [segments, normalized, totalUsd]);

  const expiring30 = normalized.filter((item) => item.remaining != null && item.remaining >= 0 && item.remaining <= 30);
  const expiring60 = normalized.filter((item) => item.remaining != null && item.remaining >= 31 && item.remaining <= 60);

  const enterpriseRevenue = segmentSummary.find((s) => s.id === "Enterprise")?.revenue || 0;
  const enterpriseShare = totalUsd ? Math.round((enterpriseRevenue / totalUsd) * 100) : 0;

  const pieData = segmentSummary.map((seg) => ({
    label: seg.label,
    value: seg.revenue || 0,
    color: SEGMENT_COLORS[seg.id],
  }));

  const barData = segmentSummary.map((seg) => ({ label: seg.label, value: seg.count }));
  const maxCount = Math.max(1, ...barData.map((item) => item.value));

  const topCustomers = [...normalized]
    .filter((item) => item.usdValue != null)
    .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
    .slice(0, 10);

  const highValueAtRisk = topCustomers.filter((item) => item.remaining != null && item.remaining <= 30);

  const serviceRevenue = useMemo(() => {
    const totals = {};
    normalized.forEach((item) => {
      (item.scopes || []).forEach((scope) => {
        totals[scope] = (totals[scope] || 0) + (item.usdValue || 0);
      });
    });
    return Object.entries(totals)
      .map(([scope, value]) => ({ scope, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [normalized]);

  const insights = useMemo(() => {
    const top3 = topCustomers.slice(0, 3);
    const top3Share = totalUsd
      ? Math.round((top3.reduce((sum, item) => sum + (item.usdValue || 0), 0) / totalUsd) * 100)
      : 0;
    const expiringHigh = highValueAtRisk.length;
    return [
      `Top 3 customers generate ${top3Share}% of total revenue.`,
      `Enterprise segment contributes ${enterpriseShare}% of MRR.`,
      `${expiringHigh} high-value contracts are expiring within 30 days.`,
    ];
  }, [topCustomers, totalUsd, enterpriseShare, highValueAtRisk.length]);

  return (
    <div className="page">
      <div className="details-header">
        <div>
          <div className="breadcrumb">Analytics / Customer Segmentation</div>
          <h2>Customer Segmentation & Revenue Intelligence</h2>
          <p className="muted">Executive control center for revenue, risk, and growth focus.</p>
        </div>
        <div className="details-meta">
          {fx.loading ? (
            <Badge tone="neutral">Loading FX rate</Badge>
          ) : fx.error ? (
            <Badge tone="danger">FX rate unavailable</Badge>
          ) : (
            <Badge tone="success">USD/TRY: {fx.rate?.toFixed(2)} ({fx.date})</Badge>
          )}
        </div>
      </div>

      <div className="page-grid">
        <Card className="stat-card">
          <div className="stat-label">Total MRR (USD)</div>
          <div className="stat-value">{formatCurrency(totalUsd, "USD")}</div>
          <div className="stat-meta">Converted from TL and USD contracts</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Total customers</div>
          <div className="stat-value">{totalCustomers}</div>
          <div className="stat-meta">Active customer base</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Avg revenue / customer</div>
          <div className="stat-value">{formatCurrency(avgRevenue, "USD")}</div>
          <div className="stat-meta">Monthly average</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Enterprise revenue %</div>
          <div className="stat-value">{enterpriseShare}%</div>
          <div className="stat-meta">Share of total MRR</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Expiring in 30 days</div>
          <div className="stat-value emphasis">{expiring30.length}</div>
          <div className="stat-meta">Immediate renewals</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-label">Expiring in 60 days</div>
          <div className="stat-value">{expiring60.length}</div>
          <div className="stat-meta">Upcoming attention</div>
        </Card>
      </div>

      <Card title="Segmentation thresholds" subtitle="Configurable revenue bands">
        <div className="filters">
          <div className="field">
            <label>SMB max (USD)</label>
            <input type="number" value={smbMax} onChange={(e) => setSmbMax(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Mid-market max (USD)</label>
            <input type="number" value={midMax} onChange={(e) => setMidMax(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Sort by</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="revenue">Revenue</option>
              <option value="expiry">Expiry date</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="split-grid">
        <Card title="Revenue distribution" subtitle="Segment share of MRR">
          <div className="pie-layout">
            <PieChart data={pieData} size={220} innerRadius={70} />
            <div className="pie-legend">
              {segmentSummary.map((seg) => (
                <div key={seg.id} className="legend-item">
                  <span className="legend-dot" style={{ background: SEGMENT_COLORS[seg.id] }} />
                  <div>
                    <div className="legend-label">{seg.label}</div>
                    <div className="legend-meta">
                      {seg.count} customers • {formatCurrency(seg.revenue, "USD")} ({seg.percent}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Customer count per segment" subtitle="Volume view">
          <BarChart data={barData} max={maxCount} />
        </Card>
      </div>

      <Card title="Top customers" subtitle="Highest monthly revenue">
        {topCustomers.length === 0 ? (
          <EmptyState title="No customers" description="Add contracts to see top accounts." />
        ) : (
          <div className="table segmentation-table">
            <div className="table-head">
              <div>Customer</div>
              <div>Revenue</div>
              <div>Segment</div>
              <div>Remaining days</div>
              <div>Risk</div>
              <div>Badges</div>
              <div>Scopes</div>
            </div>
            <div className="table-body">
              {topCustomers.map((contract, index) => {
                const riskMeta = RISK_META[contract.risk];
                return (
                  <div key={contract.id} className={`table-row ${index < 3 ? "top-tier" : ""}`}>
                    <div>
                      <div className="primary-text">{contract.customerName}</div>
                      <div className="muted">{contract.contractName}</div>
                    </div>
                    <div>{formatCurrency(contract.usdValue, "USD")}</div>
                    <div>
                      <Badge tone="primary">{contract.segment?.label}</Badge>
                    </div>
                    <div className={contract.remaining != null && contract.remaining < 0 ? "text-danger" : ""}>
                      {contract.remaining == null ? "-" : contract.remaining < 0 ? "Expired" : `${contract.remaining} days`}
                    </div>
                    <div>
                      <Badge tone={riskMeta.tone}>{riskMeta.label}</Badge>
                    </div>
                    <div className="scope-tags">
                      <span className="tag">Top Revenue</span>
                      {contract.remaining != null && contract.remaining <= 30 && <span className="tag risk">At Risk</span>}
                    </div>
                    <div className="scope-tags">
                      {(contract.scopes || []).length === 0 ? (
                        <span className="muted">-</span>
                      ) : (
                        (contract.scopes || []).map((scope) => (
                          <span key={scope} className="tag">
                            {scope === "Other" && contract.otherScopeText ? contract.otherScopeText : scope}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <div className="split-grid">
        <Card title="Risk & opportunity" subtitle="Immediate actions">
          <div className="alert-list">
            {highValueAtRisk.length === 0 ? (
              <EmptyState title="No high-value risks" description="All top customers are outside the 30-day window." />
            ) : (
              highValueAtRisk.map((contract) => (
                <div key={contract.id} className="alert-item">
                  <div>
                    <div className="primary-text">{contract.customerName}</div>
                    <div className="muted">{contract.contractName}</div>
                  </div>
                  <div className="alert-meta">
                    <div>{contract.endDate}</div>
                    <div className="text-danger">{contract.remaining} days left</div>
                  </div>
                  <Badge tone="danger">High Risk</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Revenue insights" subtitle="AI-like signals">
          <div className="activity-list">
            {insights.map((insight, idx) => (
              <div key={idx} className="activity-item">
                <div>
                  <div className="activity-title">{insight}</div>
                  <div className="activity-meta">Insight generated from live segmentation</div>
                </div>
                <div className="activity-time">Auto</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Service-based revenue" subtitle="Which services drive revenue">
        {serviceRevenue.length === 0 ? (
          <EmptyState title="No service data" description="Service scopes will appear here once selected." />
        ) : (
          <div className="bar-chart">
            {serviceRevenue.map((item) => {
              const width = totalUsd ? Math.round((item.value / totalUsd) * 100) : 0;
              return (
                <div key={item.scope} className="bar-row">
                  <div className="bar-label">{item.scope}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${width}%` }} />
                  </div>
                  <div className="bar-value">{formatCurrency(item.value, "USD")}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Filters" subtitle="Focus your view">
        <div className="filters">
          <div className="field">
            <label>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer or contract" />
          </div>
          <div className="field">
            <label>Segment</label>
            <select value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)}>
              <option value="All">All segments</option>
              {segments.map((seg) => (
                <option key={seg.id} value={seg.id}>
                  {seg.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Service</label>
            <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
              <option value="All">All services</option>
              {Array.from(new Set(contracts.flatMap((c) => c.scopes || []))).map((scope) => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Risk</label>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
              <option value="All">All levels</option>
              <option value="critical">Critical</option>
              <option value="high">High Risk</option>
              <option value="attention">Needs Attention</option>
              <option value="healthy">Healthy</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="Segmented customers" subtitle="Monthly contract value converted to USD">
        {filtered.length === 0 ? (
          <EmptyState title="No customers" description="Adjust filters to see results." />
        ) : (
          <div className="table segmentation-table">
            <div className="table-head">
              <div>Customer</div>
              <div>Contract</div>
              <div>Currency</div>
              <div>Monthly value</div>
              <div>USD value</div>
              <div>Segment</div>
              <div>Scopes</div>
            </div>
            <div className="table-body">
              {filtered.map((contract) => (
                <div key={contract.id} className="table-row">
                  <div>
                    <div className="primary-text">{contract.customerName}</div>
                    <div className="muted">Owner: {contract.owner}</div>
                  </div>
                  <div>{contract.contractName}</div>
                  <div>{contract.currency || "USD"}</div>
                  <div>{formatCurrency(contract.rawValue, contract.currency)}</div>
                  <div>{contract.usdValue == null ? "-" : formatCurrency(contract.usdValue, "USD")}</div>
                  <div>
                    {contract.segment ? (
                      <Badge tone="primary">{contract.segment.label}</Badge>
                    ) : (
                      <Badge tone="neutral">Pending</Badge>
                    )}
                  </div>
                  <div className="scope-tags">
                    {(contract.scopes || []).length === 0 ? (
                      <span className="muted">-</span>
                    ) : (
                      (contract.scopes || []).map((scope) => (
                        <span key={scope} className="tag">
                          {scope === "Other" && contract.otherScopeText ? contract.otherScopeText : scope}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
