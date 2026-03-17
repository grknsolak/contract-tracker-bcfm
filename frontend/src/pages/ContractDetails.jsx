import React from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import Timeline from "../components/Timeline";
import { daysUntil, formatDate, formatCurrency } from "../utils/date";
import { getStageMeta, renewalTone } from "../utils/status";

export default function ContractDetails({ contract, onNavigate }) {
  if (!contract) {
    return (
      <EmptyState
        title="Contract not found"
        description="Return to customers and select a contract to view details."
        action={<button className="btn btn-primary" onClick={() => onNavigate("/customers")}>Back to customers</button>}
      />
    );
  }

  const stageMeta = getStageMeta(contract.stage);
  const remaining = daysUntil(contract.endDate);

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
              {remaining < 0 ? "Expired" : `${remaining} days remaining`}
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
              {remaining < 0 ? "Expired" : `${remaining} days`}
            </strong>
          </div>
          <div className="detail-row">
            <span>Stage</span>
            <Badge tone={stageMeta.tone}>{stageMeta.label}</Badge>
          </div>
        </Card>

        <Card title="Service scopes" subtitle="Included coverage">
          <div className="scope-tags">
            {(contract.scopes || []).length === 0 ? (
              <span className="muted">No scopes selected.</span>
            ) : (
              (contract.scopes || []).map((scope) => (
                <span key={scope} className="tag">
                  {scope === "Other" && contract.otherScopeText ? contract.otherScopeText : scope}
                </span>
              ))
            )}
          </div>
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

      <div className="details-grid">
        <Card title="Status timeline" subtitle="History of key milestones">
          <Timeline items={contract.history || []} />
        </Card>
        <Card title="Stage progress" subtitle="Current phase visibility">
          <div className="stage-steps">
            {[
              "Draft",
              "Under Review",
              "Approval Pending",
              "Signed",
              "Active",
              "Renewal Upcoming",
              "Expired",
            ].map((stage) => {
              const meta = getStageMeta(stage);
              const isCurrent = stage === contract.stage;
              return (
                <div key={stage} className={`stage-step ${isCurrent ? "current" : ""}`}>
                  <div className={`stage-dot tone-${meta.tone}`} />
                  <div>
                    <div className="stage-title">{stage}</div>
                    <div className="stage-caption">{isCurrent ? "Current stage" : ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
