import * as React from "react";
import { useEffect } from "react";

interface IProps {
  message?: string;
}

// Inject keyframes once on first render
let keyframesInjected = false;
function injectKeyframes() {
  if (keyframesInjected) return;
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
  keyframesInjected = true;
}

export const LoadingIndicator: React.FC<IProps> = ({ message = "Loading..." }) => {
  useEffect(() => {
    injectKeyframes();
  }, []);

  return (
    <div
      className="loading-indicator"
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "200px",
        fontFamily: "sans-serif"
      }}
    >
      <div className="spinner" aria-hidden="true" style={{
        width: "32px",
        height: "32px",
        border: "3px solid #e0e0e0",
        borderTopColor: "#3498db",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <p style={{ marginTop: "12px", color: "#666" }}>{message}</p>
    </div>
  );
};
