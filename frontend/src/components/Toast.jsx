import React, { useEffect, useState } from "react";

const ICONS = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div className={`toast-item toast-${toast.type} ${exiting ? "toast-exit" : "toast-enter"}`}>
      <span className="toast-icon">{ICONS[toast.type] || ICONS.info}</span>
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={() => { setExiting(true); setTimeout(() => onRemove(toast.id), 300); }}>×</button>
    </div>
  );
}

let toastIdCounter = 0;
let addToastGlobal = null;

export function toast(type, message, title, duration) {
  if (addToastGlobal) {
    addToastGlobal({ id: ++toastIdCounter, type, message, title, duration });
  }
}

export function toastSuccess(message, title) { toast("success", message, title); }
export function toastError(message, title) { toast("error", message, title, 5000); }
export function toastWarning(message, title) { toast("warning", message, title); }
export function toastInfo(message, title) { toast("info", message, title); }

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    addToastGlobal = (t) => setToasts((prev) => [...prev, t]);
    return () => { addToastGlobal = null; };
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>
  );
}
