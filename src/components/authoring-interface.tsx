import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { IHurricaneAuthoredState } from "../types/interactive-state";
import {
  parseAuthoredUrlParams,
  validateUrlParams,
  KNOWN_PARAMETERS
} from "../utils/parse-authored-params";
import * as css from "./authoring-interface.scss";

interface IProps {
  authoredState: IHurricaneAuthoredState | null;
  setAuthoredState: (state: IHurricaneAuthoredState) => void;
}

type ValidationResultType = "success" | "error" | "info";
interface IValidationResult {
  type: ValidationResultType;
  message: string;
}

export const AuthoringInterface: React.FC<IProps> = ({ authoredState, setAuthoredState }) => {
  const [urlParams, setUrlParams] = useState(authoredState?.urlParams ?? "");
  const [validationResult, setValidationResult] = useState<IValidationResult | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const saveTimeoutRef = useRef<number | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleValidate = useCallback(() => {
    const result = validateUrlParams(urlParams);
    if (result.valid) {
      const paramCount = Object.keys(result.params).length;
      const paramsJson = JSON.stringify(result.params, null, 2);
      setValidationResult({
        type: "success",
        message: `Valid configuration with ${paramCount} parameter(s):\n${paramsJson}`
      });
    } else {
      setValidationResult({
        type: "error",
        message: result.errors.join("\n")
      });
    }
  }, [urlParams]);

  const handleSave = useCallback(() => {
    // Normalize to query string format before saving
    const { params } = parseAuthoredUrlParams(urlParams);
    const normalizedUrlParams = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");

    setAuthoredState({
      version: 1,
      urlParams: normalizedUrlParams || undefined
    });

    setSaveStatus("saved");
    setValidationResult({
      type: "info",
      message: "Configuration saved successfully!"
    });

    // Reset save status after 3 seconds
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => setSaveStatus("idle"), 3000);
  }, [urlParams, setAuthoredState]);

  const validationClass = validationResult
    ? `${css.validationResult} ${css[`validation-${validationResult.type}`] || ""}`
    : "";

  const saveButtonClass = saveStatus === "saved"
    ? `${css.saveButton} ${css.saved}`
    : css.saveButton;

  return (
    <div className={css.authoringInterface} role="main" aria-labelledby="authoring-title">
      <h2 id="authoring-title">Hurricane Model Configuration</h2>
      <p id="authoring-description" className={css.description}>
        Enter URL parameters to configure the simulation. Use query string format
        (key=value&amp;key2=value2) or newline-separated key=value pairs.
      </p>

      {/* Collapsible Parameter Documentation */}
      <details
        open={showDocs}
        onToggle={(e) => setShowDocs((e.target as HTMLDetailsElement).open)}
      >
        <summary className={css.docsSummary}>
          Available Parameters Reference
        </summary>
        <div className={css.parameterDocs}>
          <table role="table" aria-label="Available configuration parameters">
            <thead>
              <tr>
                <th scope="col">Parameter</th>
                <th scope="col">Type</th>
                <th scope="col">Valid Values</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {KNOWN_PARAMETERS.map(param => (
                <tr key={param.name}>
                  <td><code>{param.name}</code></td>
                  <td>{param.type}</td>
                  <td className={css.validValues}>{param.validValues || "-"}</td>
                  <td>{param.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <label htmlFor="params-input" className={css.inputLabel}>
        Configuration Parameters
      </label>
      <textarea
        id="params-input"
        className={css.paramsInput}
        aria-describedby="authoring-description"
        value={urlParams}
        onChange={(e) => {
          setUrlParams(e.target.value);
          setSaveStatus("idle");
          setValidationResult(null);
        }}
        placeholder={"season=fall\nstartLocation=atlantic\nwindArrows=true"}
        rows={10}
      />

      <div className={css.buttonRow}>
        <button
          className={css.validateButton}
          onClick={handleValidate}
          aria-label="Validate parameters"
        >
          Validate
        </button>
        <button
          className={saveButtonClass}
          onClick={handleSave}
          aria-label="Save configuration"
        >
          {saveStatus === "saved" ? "Saved" : "Save"}
        </button>
      </div>

      {validationResult && (
        <div
          role={validationResult.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={validationClass}
        >
          {validationResult.message}
        </div>
      )}
    </div>
  );
};
