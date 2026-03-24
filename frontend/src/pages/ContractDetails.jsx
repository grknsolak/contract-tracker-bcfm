import React, { useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ProcessStepper from "../components/ProcessStepper";
import ContractGrowthChart from "../components/ContractGrowthChart";
import { daysUntil, formatDate, formatCurrency, formatDateTime, formatRemainingDays } from "../utils/date";
import { getContractOperationalMetrics } from "../utils/contractMetrics";
import { buildScopeBudgetRows, getContractBudgetSummary } from "../utils/pricing";
import { getStageMeta, normalizeStage, renewalTone } from "../utils/status";
import { buildPipelineSteps } from "../utils/pipelines";

export default function ContractDetails({ contract, setContracts, onNavigate }) {
  const [commentText, setCommentText] = useState("");
  if (!contract) {
    return (
      <EmptyState
        title="Contract not found"
        description="Return to customers and select a contract to view details."
        action={<button className="btn btn-primary" onClick={() => onNavigate("/customers")}>Back to customers</button>}
      />
    );
  }

  const stageFlow = useMemo(() => buildPipelineSteps(contract), [contract]);

  const currentStage = normalizeStage(contract.stage);
  const stageMeta = getStageMeta(currentStage);
  const remaining = daysUntil(contract.endDate);
  const operationalMetrics = getContractOperationalMetrics(contract);
  const scopeBudgetRows = useMemo(() => buildScopeBudgetRows(contract), [contract]);
  const budgetSummary = useMemo(() => getContractBudgetSummary(contract), [contract]);
  const comments = useMemo(
    () =>
      [...(contract.comments || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [contract.comments]
  );

  const handleAddComment = () => {
    const text = commentText.trim();
    if (!text) return;

    const newComment = {
      id: `cmt-${Date.now()}`,
      author: contract.owner || "Team",
      createdAt: new Date().toISOString(),
      text,
    };

    setContracts((prev) =>
      prev.map((item) =>
        item.id === contract.id
          ? {
              ...item,
              comments: [newComment, ...(item.comments || [])],
              history: [
                ...(item.history || []),
                { date: newComment.createdAt, label: "Comment added" },
              ],
            }
          : item
      )
    );
    setCommentText("");
  };

  return (
    <div className="page">
      <div className="details-header">
        <div>
          <div className="breadcrumb">Customers / {contract.customerName}</div>
          <h2>{contract.contractName}</h2>
          <div className="details-meta">
            <span className={remaining < 0 ? "text-danger" : "muted"}>
              {formatRemainingDays(remaining, { remainingSuffix: "days remaining", overdueSuffix: "days overdue" })}
            </span>
          </div>
        </div>
        <div className="details-actions">
          <button className="btn btn-light" onClick={() => onNavigate("/customers")}>Back</button>
          <button className="btn btn-primary" onClick={() => onNavigate(`/customers?edit=${contract.id}`)}>
            Edit contract
          </button>
        </div>
      </div>

      <div className="details-grid">
        <Card title="Customer information" subtitle="Key account details">
          <div className="detail-row">
            <span>Customer</span>
            <strong>{contract.customerName}</strong>
          </div>
          <div className="detail-row">
            <span>Team</span>
            <strong>{contract.team || "-"}</strong>
          </div>
          <div className="detail-row">
            <span>Owner</span>
            <strong>{contract.owner}</strong>
          </div>
          <div className="detail-row">
            <span>Contract type</span>
            <strong>{contract.contractType}</strong>
          </div>
          <div className="detail-row">
            <span>Contract value</span>
            <strong>{formatCurrency(contract.value, contract.currency)}</strong>
          </div>
          <div className="detail-row">
            <span>Renewed value</span>
            <strong>{formatCurrency(budgetSummary.renewedTotal, contract.currency)}</strong>
          </div>
        </Card>

        <Card title="Contract duration" subtitle="Lifecycle overview">
          <div className="detail-row">
            <span>Start date</span>
            <strong>{formatDate(contract.startDate)}</strong>
          </div>
          <div className="detail-row">
            <span>End date</span>
            <strong>{formatDate(contract.endDate)}</strong>
          </div>
          <div className="detail-row">
            <span>Remaining days</span>
            <strong className={remaining < 0 ? "text-danger" : ""}>
              {formatRemainingDays(remaining, { remainingSuffix: "days", overdueSuffix: "days overdue" })}
            </strong>
          </div>
          <div className="detail-row">
            <span>Stage</span>
            <Badge tone={stageMeta.tone}>{stageMeta.label}</Badge>
          </div>
        </Card>

        <Card title="Service scopes" subtitle="Included coverage and renewal impact">
          {(contract.scopes || []).length === 0 ? (
            <span className="muted">No scopes selected.</span>
          ) : (
            <div className="scope-breakdown-list">
              {scopeBudgetRows.map((row) => {
                const scopeLabel = row.scope === "Other" && contract.otherScopeText
                  ? contract.otherScopeText : row.scope;
                const trendColor = row.trend === "up"   ? "#4ade80"
                                 : row.trend === "down" ? "#f87171"
                                 : "var(--text-secondary)";
                const TrendIcon = () => {
                  if (row.trend === "up") return (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                    </svg>
                  );
                  if (row.trend === "down") return (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                    </svg>
                  );
                  return (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  );
                };
                return (
                  <div key={row.scope} className="scope-breakdown-item">
                    <div className="scope-breakdown-left">
                      <div className="primary-text">{scopeLabel}</div>
                      <div className="scope-year-values">
                        <span className="scope-year-prev">
                          {formatCurrency(row.prevYearAmount, contract.currency)}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                        </svg>
                        <span className="scope-year-curr" style={{ color: trendColor }}>
                          {formatCurrency(row.currYearAmount, contract.currency)}
                        </span>
                      </div>
                    </div>
                    <div className="scope-trend-badge" style={{ color: trendColor, borderColor: `${trendColor}35`, background: `${trendColor}12` }}>
                      <TrendIcon />
                      <span>{row.pctChange > 0 ? "+" : ""}{row.pctChange}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Notes" subtitle="Customer context">
          {contract.notes ? (
            <div className="contract-note-body">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2, opacity: 0.4 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p className="contract-note-text">{contract.notes}</p>
            </div>
          ) : (
            <div className="contract-note-empty">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>No notes added for this contract.</span>
              <button className="btn btn-sm btn-ghost" onClick={() => onNavigate(`/customers?edit=${contract.id}`)}>
                Add note →
              </button>
            </div>
          )}
        </Card>
      </div>

      <Card title="Stage progress" subtitle="Current phase visibility">
        <ProcessStepper currentStep={currentStage} steps={stageFlow} />
      </Card>

      <Card title="Contract growth" subtitle="Track contract value movement over time">
        <ContractGrowthChart contract={contract} />
      </Card>

      <div className="details-grid">
        <Card title="History & comments" subtitle="Track customer discussions and internal notes">
          <div className="comment-composer">
            <textarea
              rows={4}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Add a clear update, decision note, or customer meeting summary..."
            />
            <div className="comment-composer-actions">
              <span className="muted">Comments appear immediately in this customer history.</span>
              <button className="btn btn-primary" onClick={handleAddComment}>
                Add comment
              </button>
            </div>
          </div>

          {comments.length === 0 ? (
            <p className="muted">No comment history yet.</p>
          ) : (
            <div className="comment-feed">
              {comments.map((comment) => (
                <div key={comment.id} className="comment-card">
                  <div className="comment-card-head">
                    <div>
                      <div className="comment-author">{comment.author}</div>
                      <div className="comment-time">{formatDateTime(comment.createdAt)}</div>
                    </div>
                    <Badge tone="info">History</Badge>
                  </div>
                  <div className="comment-body">{comment.text}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Action tracker" subtitle="Outstanding contract actions">
          {operationalMetrics.overdueActions.length === 0 ? (
            <p className="muted">No delayed actions recorded.</p>
          ) : (
            <div className="action-list">
              {operationalMetrics.overdueActions.map((action) => (
                <div key={action.id} className="action-item">
                  <div>
                    <div className="primary-text">{action.title}</div>
                    <div className="muted">Due {formatDate(action.dueDate)}</div>
                  </div>
                  <Badge tone="danger">Delayed</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="details-grid">
        <Card title="Operational metrics" subtitle="Commercial efficiency view">
          <div className="detail-row">
            <span>Average renewal time</span>
            <strong>{operationalMetrics.renewalDays != null ? `${operationalMetrics.renewalDays} days` : "-"}</strong>
          </div>
          <div className="detail-row">
            <span>Sales cycle time</span>
            <strong>{operationalMetrics.salesCycleDays != null ? `${operationalMetrics.salesCycleDays} days` : "-"}</strong>
          </div>
          <div className="detail-row">
            <span>Contract closure time</span>
            <strong>{operationalMetrics.closureDays != null ? `${operationalMetrics.closureDays} days` : "-"}</strong>
          </div>
          <div className="detail-row">
            <span>Delayed actions</span>
            <strong className={operationalMetrics.overdueActions.length ? "text-danger" : ""}>
              {operationalMetrics.overdueActions.length}
            </strong>
          </div>
        </Card>
      </div>
    </div>
  );
}
