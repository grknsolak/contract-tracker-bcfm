import React from "react";

export default function Card({ title, subtitle, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || subtitle) && (
        <header className="card-header">
          <div>
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
            {title && <h3 className="card-title">{title}</h3>}
          </div>
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}
