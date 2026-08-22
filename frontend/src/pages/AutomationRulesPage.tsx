import { useEffect, useState } from "react";
import { FlaskConical, History, Play } from "lucide-react";
import {
  fetchAutomationHistory, fetchAutomationRules, runAutomationRule, setAutomationActive, setAutomationTestMode,
  updateAutomationConfig
} from "../lib/api";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { AutomationExecution, AutomationRule } from "../lib/types";

/** No-code automation management (spec section 17.3): toggle active/test-mode, run or dry-run
 * on demand, and inspect execution history — all built on handlers that only ever send
 * reminders/notifications, never mutate core HR state, so nothing here can silently break
 * balances or approvals if misconfigured. */
export function AutomationRulesPage() {
  const notify = useToast();
  const [rules, setRules] = useState<AutomationRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [running, setRunning] = useState<number | null>(null);

  const load = () => {
    setError(null);
    fetchAutomationRules().then(setRules).catch((err) => setError(err instanceof Error ? err.message : "Could not load automation rules."));
  };

  useEffect(load, []);

  if (error && !rules) return <ErrorState message={error} onRetry={load} />;
  if (!rules) return <LoadingSkeleton rows={4} kind="card" />;
  if (rules.length === 0) return <EmptyState title="No automation rules configured yet" />;

  const run = async (rule: AutomationRule, dryRun: boolean) => {
    setRunning(rule.id);
    try {
      const execution = await runAutomationRule(rule.id, dryRun);
      notify("success", `${dryRun ? "Dry run" : "Run"} complete: ${execution.detail ?? execution.status}`);
      load();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not run this automation.");
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="card-grid" style={{ gridTemplateColumns: "1fr" }}>
      {rules.map((rule) => (
        <div className="panel" key={rule.id}>
          <div className="toolbar" style={{ marginBottom: 4 }}>
            <div>
              <h3 style={{ margin: 0 }}>{rule.name}</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{rule.description}</p>
            </div>
            <div className="spacer" />
            <span className={`status-pill ${rule.active ? "active" : "suspended"}`}>{rule.active ? "Active" : "Disabled"}</span>
            {rule.testMode && <span className="status-pill pending">Test mode</span>}
            {rule.highRisk && <span className="status-pill suspended">High risk</span>}
          </div>

          <div className="profile-meta" style={{ margin: "12px 0" }}>
            <div><span>Trigger</span>{rule.triggerType}</div>
            <div><span>Owner</span>{rule.ownerName ?? "—"}</div>
            <div><span>Last run</span>{rule.lastRunAt ? `${new Date(rule.lastRunAt).toLocaleString()} (${rule.lastRunStatus})` : "Never"}</div>
            <div><span>Success rate</span>{rule.runCount === 0 ? "No runs yet" : `${rule.successRatePercent.toFixed(0)}% of ${rule.runCount}`}</div>
          </div>

          <RuleConfigEditor rule={rule} onSaved={load} />

          <div className="toolbar" style={{ marginTop: 14 }}>
            <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={rule.active} onChange={async (event) => {
                try {
                  await setAutomationActive(rule.id, event.target.checked);
                  load();
                } catch (err) {
                  notify("error", err instanceof Error ? err.message : "Could not update this rule.");
                }
              }} />
              Active
            </label>
            <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={rule.testMode} onChange={async (event) => {
                try {
                  await setAutomationTestMode(rule.id, event.target.checked);
                  load();
                } catch (err) {
                  notify("error", err instanceof Error ? err.message : "Could not update this rule.");
                }
              }} />
              Test mode (runs never notify anyone or count toward stats)
            </label>
            <div className="spacer" />
            <button className="secondary" disabled={running === rule.id} onClick={() => run(rule, true)}>
              <FlaskConical size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />Dry run
            </button>
            <button className="secondary" disabled={running === rule.id} onClick={() => run(rule, false)}>
              <Play size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />Run now
            </button>
            <button className="secondary" onClick={() => setExpanded(expanded === rule.id ? null : rule.id)}>
              <History size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />History
            </button>
          </div>

          {expanded === rule.id && <ExecutionHistory ruleId={rule.id} />}
        </div>
      ))}
    </div>
  );
}

function RuleConfigEditor({ rule, onSaved }: { rule: AutomationRule; onSaved: () => void }) {
  const notify = useToast();
  let parsed: { reminderAfterHours?: number; escalateAfterHours?: number } = {};
  try {
    parsed = JSON.parse(rule.config);
  } catch {
    // fall through to defaults
  }
  const [reminderHours, setReminderHours] = useState(parsed.reminderAfterHours ?? 24);
  const [escalateHours, setEscalateHours] = useState(parsed.escalateAfterHours ?? 48);

  if (rule.code !== "LEAVE_PENDING_REMINDER") {
    return <p style={{ fontSize: 12, color: "var(--text-faint)" }}>No configuration needed for this rule.</p>;
  }

  return (
    <div className="form-grid">
      <label className="field">
        Remind approver after (hours)
        <input type="number" min={1} value={reminderHours} onChange={(event) => setReminderHours(Number(event.target.value))} />
      </label>
      <label className="field">
        Escalate to HR after (hours)
        <input type="number" min={1} value={escalateHours} onChange={(event) => setEscalateHours(Number(event.target.value))} />
      </label>
      <div style={{ gridColumn: "1 / -1" }}>
        <button className="secondary" onClick={async () => {
          try {
            await updateAutomationConfig(rule.id, JSON.stringify({ reminderAfterHours: reminderHours, escalateAfterHours: escalateHours }));
            notify("success", "Configuration saved.");
            onSaved();
          } catch (err) {
            notify("error", err instanceof Error ? err.message : "Could not save configuration.");
          }
        }}>Save thresholds</button>
      </div>
    </div>
  );
}

function ExecutionHistory({ ruleId }: { ruleId: number }) {
  const [executions, setExecutions] = useState<AutomationExecution[] | null>(null);

  useEffect(() => {
    fetchAutomationHistory(ruleId, 10).then(setExecutions).catch(() => setExecutions([]));
  }, [ruleId]);

  if (!executions) return <LoadingSkeleton rows={2} />;
  if (executions.length === 0) return <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>No executions yet.</p>;

  return (
    <div className="table-scroll" style={{ marginTop: 14 }}>
      <table className="data-table">
        <thead><tr><th>When</th><th>Status</th><th>Matched</th><th>Actioned</th><th>Detail</th></tr></thead>
        <tbody>
          {executions.map((execution) => (
            <tr key={execution.id}>
              <td data-label="When">{new Date(execution.startedAt).toLocaleString()}</td>
              <td data-label="Status"><span className={`status-pill ${execution.status === "FAILURE" ? "suspended" : execution.status === "DRY_RUN" ? "pending" : "active"}`}>{execution.status}</span></td>
              <td data-label="Matched">{execution.matchedCount}</td>
              <td data-label="Actioned">{execution.actionCount}</td>
              <td data-label="Detail">{execution.errorMessage ?? execution.detail ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
