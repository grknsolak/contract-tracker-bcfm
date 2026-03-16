import React from "react";

export default function LoadingState({ label = "Loading data" }) {
  return (
    <div className="loading-state">
      <div className="loading-bar" />
      <span>{label}</span>
    </div>
  );
}
