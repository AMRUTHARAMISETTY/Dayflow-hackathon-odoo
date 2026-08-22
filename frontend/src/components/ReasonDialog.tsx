import { useState, type ReactNode } from "react";

/** Used for every sensitive action the spec requires a reason for (suspend, archive, job changes). */
export function ReasonDialog({ title, description, confirmLabel = "Confirm", tone = "primary", onConfirm, onCancel, children }: {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: (reason: string) => Promise<void> | void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) {
      setError("A reason is required for this change.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete this action.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="reason-dialog-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="reason-dialog-title">{title}</h2>
        <p className="modal-sub">{description}</p>
        {children}
        <label className="field">
          Reason
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} autoFocus placeholder="Explain why this change is being made" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button className={tone === "danger" ? "danger" : "primary"} onClick={submit} disabled={submitting}>
            {submitting ? "Saving…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
