import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { askAssistant, escalateToTicket, fetchAssistantHistory } from "../lib/api";
import { useToast } from "../lib/toast-context";
import { ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { AssistantInteraction } from "../lib/types";

const SUGGESTIONS = ["How many leave days do I have left?", "What's my latest salary slip?", "What is the leave policy?", "Am I checked in today?"];
const ESCALATE_CATEGORIES = ["IT Support", "Payroll Query", "Leave & Attendance", "Facilities", "General Query"];

export function AssistantPage() {
  const notify = useToast();
  const [history, setHistory] = useState<AssistantInteraction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [escalateFor, setEscalateFor] = useState<AssistantInteraction | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = () => {
    fetchAssistantHistory()
      .then((items) => setHistory([...items].reverse()))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load your assistant history."));
  };
  useEffect(load, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!history) return <LoadingSkeleton rows={3} kind="card" />;

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setQuestion("");
    try {
      const interaction = await askAssistant(trimmed);
      setHistory((current) => [...(current ?? []), interaction]);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not reach the assistant.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="panel">
      <h3>Dayflow Assistant</h3>
      <p className="empty-inline" style={{ marginBottom: 12 }}>
        Ask about your leave balance, salary slip, attendance, or a company policy. Answers come from your real
        Dayflow data — this isn't a generative AI, so it only knows what's below.
      </p>

      {history.length === 0 && (
        <div className="radio-row" style={{ marginBottom: 12 }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="secondary" onClick={() => ask(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="chat-scroll">
        {history.map((interaction) => (
          <div key={interaction.id} className="chat-turn">
            <div className="chat-bubble question">{interaction.question}</div>
            <div className="chat-bubble answer">
              <span className="intent-tag">{interaction.intent.replace(/_/g, " ")}</span>
              {interaction.answer}
              {interaction.intent === "UNKNOWN" && (
                <div style={{ marginTop: 8 }}>
                  <button className="secondary" onClick={() => setEscalateFor(interaction)}>Raise an HR ticket instead</button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <input
          style={{ flex: 1 }}
          value={question}
          placeholder="Ask the assistant…"
          disabled={sending}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") ask(question); }}
        />
        <button className="primary" disabled={sending || !question.trim()} onClick={() => ask(question)}>
          <Send size={16} />
        </button>
      </div>

      {escalateFor && (
        <EscalateModal
          question={escalateFor.question}
          onClose={() => setEscalateFor(null)}
          onEscalated={(interaction) => { setEscalateFor(null); setHistory((current) => [...(current ?? []), interaction]); notify("success", "Ticket raised."); }}
        />
      )}
    </div>
  );
}

function EscalateModal({ question, onClose, onEscalated }: { question: string; onClose: () => void; onEscalated: (interaction: AssistantInteraction) => void }) {
  const [category, setCategory] = useState(ESCALATE_CATEGORIES[0]);
  const [confidential, setConfidential] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Raise an HR ticket</h2>
        <p className="modal-sub">"{question}"</p>
        <label className="field">Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {ESCALATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 13 }}>
          <input type="checkbox" checked={confidential} onChange={(event) => setConfidential(event.target.checked)} />
          Keep this confidential
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting} onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              const interaction = await escalateToTicket(question, category, confidential);
              onEscalated(interaction);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not raise this ticket.");
            } finally {
              setSubmitting(false);
            }
          }}>{submitting ? "Raising…" : "Raise ticket"}</button>
        </div>
      </div>
    </div>
  );
}
