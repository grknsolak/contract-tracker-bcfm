import React, { useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ProcessStepper from "../components/ProcessStepper";
import ContractGrowthChart from "../components/ContractGrowthChart";
import { daysUntil, formatDate, formatCurrency, formatDateTime } from "../utils/date";
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
            <Badge tone={stageMeta.tone}>{stageMeta.label}</Badge>
            <Badge tone={renewalTone[contract.renewalStatus] || "neutral"}>{contract.renewalStatus}</Badge>
            <span className={remaining < 0 ? "text-danger" : "muted"}>
              {remaining < 0 ? "Churn" : `${remaining} days remaining`}
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
              {remaining < 0 ? "Churn" : `${remaining} days`}
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
              {scopeBudgetRows.map((row) => (
                <div key={row.scope} className="scope-breakdown-item">
                  <div>
                    <div className="primary-text">
                      {row.scope === "Other" && contract.otherScopeText ? contract.otherScopeText : row.scope}
                    </div>
                    <div className="muted">
                      {formatCurrency(row.baseAmount, contract.currency)} {"->"} {formatCurrency(row.renewedAmount, contract.currency)}
                    </div>
                  </div>
                  <Badge tone={row.renewalRate >= 0 ? "success" : "danger"}>
                    {row.renewalRate > 0 ? "+" : ""}
                    {row.renewalRate}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Notes" subtitle="Customer context">
          <p className="muted">{contract.notes || "No notes recorded."}</p>
          <div className="note-tags">
            <span className="tag">Quarterly review</span>
            <span className="tag">Renewal prep</span>
            <span className="tag">Executive sponsor</span>
          </div>
        </Card>
      </div>

      <Card title="Stage progress" subtitle="Current phase visibility">
        <ProcessStepper currentStep={currentStage} steps={stageFlow} />
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

      <Card title="Contract growth" subtitle="Track contract value movement over time">
        <ContractGrowthChart contract={contract} />
      </Card>

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
