import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { daysUntil, formatDate, formatCurrency } from "../utils/date";
import { getStageMeta, renewalTone } from "../utils/status";

const scopeOptions = [
  "DaaS (Fix)",
  "7/24 Support",
  "Outsource",
  "Man/Day (Fix)",
  "DaaS (T&M)",
  "Man/Day (T&M)",
  "Other",
];

const durationOptions = [
  { value: "6m", label: "6 Months", months: 6 },
  { value: "1y", label: "1 Year", months: 12 },
  { value: "3y", label: "3 Years", months: 36 },
];

function addDuration(startDate, durationType) {
  if (!startDate || !durationType) return "";
  const option = durationOptions.find((item) => item.value === durationType);
  if (!option) return "";
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return "";
  date.setMonth(date.getMonth() + option.months);
  return date.toISOString().slice(0, 10);
}

function inferDurationType(startDate, endDate) {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months === 6) return "6m";
  if (months === 12) return "1y";
  if (months === 36) return "3y";
  return "";
}

const emptyForm = {
  customerName: "",
  contractName: "",
  owner: "",
  team: "",
  durationType: "",
  startDate: "",
  endDate: "",
  stage: "Draft",
  renewalStatus: "On Track",
  value: "",
  currency: "USD",
  notes: "",
  scopes: [],
  otherScopeText: "",
};

export default function Customers({ contracts, setContracts, onNavigate, route }) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [sortDir, setSortDir] = useState("desc");
  const [formState, setFormState] = useState(emptyForm);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const teamOptions = ["Team A", "Team B", "Atlas", "Apex", "Solid", "Mando"];

  useEffect(() => {
    if (!isModalOpen) return;
    if (!formState.startDate || !formState.durationType) return;
    const nextEndDate = addDuration(formState.startDate, formState.durationType);
    if (nextEndDate && nextEndDate !== formState.endDate) {
      setFormState((prev) => ({ ...prev, endDate: nextEndDate }));
    }
  }, [formState.startDate, formState.durationType, formState.endDate, isModalOpen]);

  React.useEffect(() => {
    const editId = route?.query?.edit;
    if (!editId) return;
    const contract = contracts.find((item) => item.id === editId);
    if (contract) {
      openEdit(contract);
    }
  }, [route, contracts]);

  const filtered = useMemo(() => {
    const normalized = search.toLowerCase();
    const list = contracts.filter((contract) => {
      const matchesSearch =
        contract.customerName.toLowerCase().includes(normalized) ||
        contract.contractName.toLowerCase().includes(normalized) ||
        (contract.contractType || "").toLowerCase().includes(normalized) ||
        contract.owner.toLowerCase().includes(normalized);
      const matchesStage = stageFilter === "All" || contract.stage === stageFilter;
      return matchesSearch && matchesStage;
    });

    const sorted = [...list].sort((a, b) => {
      let valueA;
      let valueB;
      switch (sortBy) {
        case "recent":
          valueA = new Date(a.createdAt || 0).getTime() || 0;
          valueB = new Date(b.createdAt || 0).getTime() || 0;
          break;
        case "customer":
          valueA = a.customerName;
          valueB = b.customerName;
          break;
        case "endDate":
          valueA = new Date(a.endDate).getTime();
          valueB = new Date(b.endDate).getTime();
          break;
        case "status":
          valueA = a.stage;
          valueB = b.stage;
          break;
        default:
          valueA = daysUntil(a.endDate) ?? 99999;
          valueB = daysUntil(b.endDate) ?? 99999;
      }
      if (valueA < valueB) return sortDir === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [contracts, search, stageFilter, sortBy, sortDir]);

  const openNew = () => {
    setEditingId(null);
    setFormState(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (contract) => {
    setEditingId(contract.id);
    setFormState({
      ...contract,
      value: contract.value ?? "",
      currency: contract.currency || "USD",
      team: contract.team || "",
      durationType: contract.durationType || inferDurationType(contract.startDate, contract.endDate),
      scopes: contract.scopes || [],
      otherScopeText: contract.otherScopeText || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormState(emptyForm);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formState.customerName || !formState.contractName || !formState.startDate || !formState.endDate) {
      alert("Please complete all required fields.");
      return;
    }

    if (editingId) {
      setContracts((prev) =>
        prev.map((contract) =>
          contract.id === editingId
            ? { ...contract, ...formState, updatedAt: new Date().toISOString() }
            : contract
        )
      );
    } else {
      const newContract = {
        ...formState,
        id: `ct-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          { date: formState.startDate, label: "Draft created" },
          { date: formState.startDate, label: formState.stage },
        ],
      };
      setContracts((prev) => [newContract, ...prev]);
    }

    closeModal();
  };

  const handleDelete = (id) => {
    setContracts((prev) => prev.filter((contract) => contract.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div className="page">
      <Card title="Customers & contracts" subtitle="Track lifecycle status at a glance">
        <div className="filters">
          <div className="field">
            <label>Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Customer, contract, owner, or type"
            />
          </div>
          <div className="field">
            <label>Stage</label>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="All">All stages</option>
              <option value="Draft">Draft</option>
              <option value="Under Review">Under Review</option>
              <option value="Approval Pending">Approval Pending</option>
              <option value="Signed">Signed</option>
              <option value="Active">Active</option>
              <option value="Renewal Upcoming">Renewal Upcoming</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
          <div className="field">
            <label>Sort by</label>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="recent">Newest first</option>
              <option value="remaining">Remaining days</option>
              <option value="endDate">End date</option>
              <option value="customer">Customer name</option>
              <option value="status">Stage</option>
            </select>
          </div>
          <div className="field">
            <label>Order</label>
            <select value={sortDir} onChange={(event) => setSortDir(event.target.value)}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn btn-primary" onClick={openNew}>Add customer</button>
          </div>
        </div>

        <div className="table">
          <div className="table-head">
            <div>Customer</div>
            <div>Contract</div>
            <div>Team</div>
            <div>Start</div>
            <div>End</div>
            <div>Remaining days</div>
            <div>Value</div>
            <div>Scopes</div>
            <div>Stage</div>
            <div>Renewal</div>
            <div>Actions</div>
          </div>
          <div className="table-body">
            {filtered.length === 0 ? (
              <EmptyState
                title="No customer records"
                description="Create a contract to start tracking customers."
                action={<button className="btn btn-primary" onClick={openNew}>Create contract</button>}
              />
            ) : (
              filtered.map((contract) => {
                const meta = getStageMeta(contract.stage);
                const remaining = daysUntil(contract.endDate);
                return (
                  <div key={contract.id} className="table-row">
                    <div className="clickable" onClick={() => onNavigate(`/contracts/${contract.id}`)}>
                      <div className="primary-text">{contract.customerName}</div>
                      <div className="muted">Owner: {contract.owner}</div>
                    </div>
                    <div>{contract.contractName}</div>
                    <div>{contract.team || "-"}</div>
                    <div>{formatDate(contract.startDate)}</div>
                    <div>{formatDate(contract.endDate)}</div>
                    <div className={remaining < 0 ? "text-danger" : ""}>
                      {remaining < 0 ? "Expired" : `${remaining} days`}
                    </div>
                    <div className="muted">{formatCurrency(contract.value, contract.currency)}</div>
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
                    <div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <div>
                      <Badge tone={renewalTone[contract.renewalStatus] || "neutral"}>
                        {contract.renewalStatus}
                      </Badge>
                    </div>
                    <div className="row-actions">
                      <button className="btn btn-ghost" onClick={() => openEdit(contract)}>Edit</button>
                      <button className="btn btn-ghost danger" onClick={() => setConfirmDelete(contract)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      {isModalOpen && (
        <Modal
          title={editingId ? "Edit contract" : "Create contract"}
          description="Capture contract scope, team ownership, and duration in one place."
          onClose={closeModal}
          footer={
            <div className="modal-actions">
              <button className="btn btn-light" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingId ? "Save changes" : "Create contract"}
              </button>
            </div>
          }
        >
          <div className="form-grid">
            <div className="field">
              <label>Customer name *</label>
              <input
                value={formState.customerName}
                onChange={(event) => setFormState({ ...formState, customerName: event.target.value })}
              />
            </div>
            <div className="field">
              <label>Contract name *</label>
              <input
                value={formState.contractName}
                onChange={(event) => setFormState({ ...formState, contractName: event.target.value })}
              />
            </div>
            <div className="field">
              <label>Contract duration *</label>
              <select
                value={formState.durationType}
                onChange={(event) => setFormState({ ...formState, durationType: event.target.value })}
              >
                <option value="">Select duration</option>
                {durationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Owner</label>
              <input
                value={formState.owner}
                onChange={(event) => setFormState({ ...formState, owner: event.target.value })}
              />
            </div>
            <div className="field field-span-2">
              <label>Service scopes</label>
              <div className="scope-selector-grid">
                {scopeOptions.map((scope) => {
                  const on = formState.scopes.includes(scope);
                  return (
                    <label
                      key={scope}
                      className={`scope-option ${on ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          const nextScopes = on
                            ? formState.scopes.filter((item) => item !== scope)
                            : [...formState.scopes, scope];
                          setFormState({
                            ...formState,
                            scopes: nextScopes,
                            otherScopeText: scope === "Other" && on ? "" : formState.otherScopeText,
                          });
                        }}
                      />
                      <span>{scope}</span>
                    </label>
                  );
                })}
              </div>
              {formState.scopes.includes("Other") && (
                <input
                  value={formState.otherScopeText}
                  onChange={(event) => setFormState({ ...formState, otherScopeText: event.target.value })}
                  placeholder="Other scope details"
                />
              )}
            </div>
            <div className="field">
              <label>Team</label>
              <select
                value={formState.team}
                onChange={(event) => setFormState({ ...formState, team: event.target.value })}
              >
                <option value="">Select team</option>
                {teamOptions.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Start date *</label>
              <input
                type="date"
                value={formState.startDate}
                onChange={(event) => setFormState({ ...formState, startDate: event.target.value })}
              />
            </div>
            <div className="field">
              <label>End date (automatic) *</label>
              <input
                type="date"
                value={formState.endDate}
                onChange={(event) => setFormState({ ...formState, endDate: event.target.value })}
                readOnly={Boolean(formState.startDate && formState.durationType)}
              />
            </div>
            <div className="field">
              <label>Stage</label>
              <select
                value={formState.stage}
                onChange={(event) => setFormState({ ...formState, stage: event.target.value })}
              >
                <option>Draft</option>
                <option>Under Review</option>
                <option>Approval Pending</option>
                <option>Signed</option>
                <option>Active</option>
                <option>Renewal Upcoming</option>
                <option>Expired</option>
              </select>
            </div>
            <div className="field">
              <label>Renewal status</label>
              <select
                value={formState.renewalStatus}
                onChange={(event) => setFormState({ ...formState, renewalStatus: event.target.value })}
              >
                <option>On Track</option>
                <option>Negotiation</option>
                <option>Needs Attention</option>
                <option>Pending</option>
                <option>Lost</option>
              </select>
            </div>
            <div className="field">
              <label>Contract value</label>
              <input
                value={formState.value}
                onChange={(event) => setFormState({ ...formState, value: event.target.value })}
                placeholder="$"
              />
            </div>
            <div className="field">
              <label>Currency</label>
              <select
                value={formState.currency}
                onChange={(event) => setFormState({ ...formState, currency: event.target.value })}
              >
                <option value="USD">USD</option>
                <option value="TL">TL</option>
              </select>
            </div>
            <div className="field field-span-2">
              <label>Notes</label>
              <textarea
                rows="4"
                value={formState.notes}
                onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title="Delete contract"
          description="This action removes the contract and associated customer record."
          onClose={() => setConfirmDelete(null)}
          footer={
            <div className="modal-actions">
              <button className="btn btn-light" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDelete.id)}>
                Confirm delete
              </button>
            </div>
          }
        >
          <p>
            You are about to delete <strong>{confirmDelete.customerName}</strong> ({confirmDelete.contractName}).
            This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
