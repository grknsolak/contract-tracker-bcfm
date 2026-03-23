import React from "react";

function getStepState(index, currentIndex) {
  if (currentIndex < 0) return "upcoming";
  if (index < currentIndex) return "completed";
  if (index === currentIndex) return "active";
  return "upcoming";
}

export default function ProcessStepper({ steps = [], currentStep, onStepClick, onStepConfirm }) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep || step.name === currentStep);

  return (
    <div className="process-stepper-wrap">
      <div className="process-stepper" role="list" aria-label="Process flow">
        {steps.map((step, index) => {
          const state = getStepState(index, currentIndex);
          const isClickable = typeof onStepClick === "function";
          const isConfirmable = state === "active" && typeof onStepConfirm === "function";
          const Component = isClickable ? "button" : "div";

          return (
            <React.Fragment key={step.id ?? step.name}>
              <Component
                type={isClickable ? "button" : undefined}
                className={`process-step process-step-${state} ${isClickable ? "is-clickable" : ""}`.trim()}
                onClick={isClickable ? () => onStepClick(step, index) : undefined}
                role="listitem"
              >
                {isConfirmable ? (
                  <button
                    type="button"
                    className="process-step-badge process-step-badge-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onStepConfirm(step, index);
                    }}
                    aria-label={`Confirm ${step.name}`}
                  >
                    <span>{index + 1}</span>
                  </button>
                ) : (
                  <div className="process-step-badge">
                    {state === "completed" ? <span className="process-check">✓</span> : <span>{index + 1}</span>}
                  </div>
                )}
                <div className="process-step-copy">
                  <div className="process-step-name">{step.name}</div>
                  <div className="process-step-caption">
                    {state === "completed" ? "Completed" : state === "active" ? "Current stage" : "Upcoming"}
                  </div>
                  {(step.date || step.updatedBy) ? (
                    <div className="process-step-meta">
                      {step.date ? <span>{step.date}</span> : null}
                      {step.updatedBy ? <span>{step.updatedBy}</span> : null}
                    </div>
                  ) : null}
                </div>
              </Component>

              {index < steps.length - 1 ? (
                <div className={`process-connector process-connector-${state}`} aria-hidden="true">
                  <span className="process-connector-line" />
                  <span className="process-connector-arrow">→</span>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
