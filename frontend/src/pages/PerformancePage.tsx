import { useEffect, useState } from "react";
import { acknowledgeReview, createGoal, fetchGoals, fetchReviews, startReview, submitReview, updateGoalProgress } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../lib/toast-context";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StateViews";
import type { Goal, PerformanceReview } from "../lib/types";

const GOAL_STATUSES: Goal["status"][] = ["IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED"];

export function PerformancePage() {
  const { can, user } = useAuth();
  const canManageAny = can("performance:manage") || can("performance:manage:reports");
  const [employeeId, setEmployeeId] = useState<number>(user!.employeeId);
  const [employeeIdInput, setEmployeeIdInput] = useState(String(user!.employeeId));

  return (
    <>
      {canManageAny && (
        <div className="toolbar">
          <label className="field" style={{ maxWidth: 180 }}>Employee ID
            <input value={employeeIdInput} onChange={(event) => setEmployeeIdInput(event.target.value)} />
          </label>
          <button className="secondary" onClick={() => setEmployeeId(Number(employeeIdInput) || user!.employeeId)}>Load</button>
          <div className="spacer" />
          <button className="secondary" onClick={() => { setEmployeeIdInput(String(user!.employeeId)); setEmployeeId(user!.employeeId); }}>My own</button>
        </div>
      )}
      <div className="grid-two">
        <GoalsPanel employeeId={employeeId} />
        <ReviewsPanel employeeId={employeeId} />
      </div>
    </>
  );
}

function GoalsPanel({ employeeId }: { employeeId: number }) {
  const { can, user } = useAuth();
  const notify = useToast();
  const canManage = can("performance:manage") || can("performance:manage:reports");
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setError(null);
    fetchGoals(employeeId).then(setGoals).catch((err) => setError(err instanceof Error ? err.message : "Could not load goals."));
  };
  useEffect(load, [employeeId]);

  const canEdit = canManage || user?.employeeId === employeeId;

  return (
    <div className="panel">
      <h3>Goals</h3>
      {canManage && <button className="secondary" style={{ marginBottom: 12 }} onClick={() => setShowCreate(true)}>New goal</button>}
      {error ? <ErrorState message={error} onRetry={load} /> : !goals ? <LoadingSkeleton rows={3} /> : goals.length === 0 ? (
        <EmptyState title="No goals set" />
      ) : (
        <div className="department-bars">
          {goals.map((goal) => (
            <div key={goal.id} className="department-bar">
              <div className="bar-label"><span>{goal.title}</span><span>{goal.progressPercent}%</span></div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${goal.progressPercent}%` }} /></div>
              <p className="empty-inline">{goal.category} &middot; {goal.status.replace(/_/g, " ")}{goal.dueDate ? ` · due ${new Date(goal.dueDate).toLocaleDateString()}` : ""}</p>
              {canEdit && (
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <input type="number" min={0} max={100} defaultValue={goal.progressPercent} style={{ width: 70 }}
                    onBlur={async (event) => {
                      const value = Math.min(100, Math.max(0, Number(event.target.value)));
                      try {
                        await updateGoalProgress(goal.id, value, value === 100 ? "COMPLETED" : goal.status === "COMPLETED" ? "IN_PROGRESS" : goal.status);
                        load();
                      } catch (err) {
                        notify("error", err instanceof Error ? err.message : "Could not update progress.");
                      }
                    }} />
                  <select defaultValue={goal.status} onChange={async (event) => {
                    try {
                      await updateGoalProgress(goal.id, goal.progressPercent, event.target.value);
                      load();
                    } catch (err) {
                      notify("error", err instanceof Error ? err.message : "Could not update status.");
                    }
                  }}>
                    {GOAL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGoalModal employeeId={employeeId} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); notify("success", "Goal created."); load(); }} />
      )}
    </div>
  );
}

function CreateGoalModal({ employeeId, onClose, onCreated }: { employeeId: number; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Individual");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>New goal</h2>
        <div className="form-grid">
          <label className="field">Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="field">Category<input value={category} onChange={(event) => setCategory(event.target.value)} /></label>
          <label className="field">Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        </div>
        <label className="field" style={{ marginTop: 10 }}>Description<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting || !title.trim()} onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              await createGoal({ employeeId, title, description: description || undefined, category, dueDate: dueDate || undefined });
              onCreated();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not create this goal.");
            } finally {
              setSubmitting(false);
            }
          }}>{submitting ? "Creating…" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}

function ReviewsPanel({ employeeId }: { employeeId: number }) {
  const { can, user } = useAuth();
  const notify = useToast();
  const canManage = can("performance:manage") || can("performance:manage:reports");
  const [reviews, setReviews] = useState<PerformanceReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const load = () => {
    setError(null);
    fetchReviews(employeeId).then(setReviews).catch((err) => setError(err instanceof Error ? err.message : "Could not load reviews."));
  };
  useEffect(load, [employeeId]);

  return (
    <div className="panel">
      <h3>Performance reviews</h3>
      {canManage && <button className="secondary" style={{ marginBottom: 12 }} onClick={() => setShowStart(true)}>Start review</button>}
      {error ? <ErrorState message={error} onRetry={load} /> : !reviews ? <LoadingSkeleton rows={3} /> : reviews.length === 0 ? (
        <EmptyState title="No reviews yet" />
      ) : (
        <div className="thread">
          {reviews.map((review) => (
            <div key={review.id} className="thread-message">
              <div className="thread-meta">
                <strong>{review.cycle}{review.rating ? ` — ${review.rating}/5` : ""}</strong>
                <span className={`status-pill ${review.status === "ACKNOWLEDGED" ? "active" : "pending"}`}>{review.status}</span>
              </div>
              <p className="empty-inline">Reviewer: {review.reviewerName}</p>
              {review.status !== "DRAFT" && (
                <>
                  {review.strengths && <p style={{ margin: "4px 0" }}><strong>Strengths:</strong> {review.strengths}</p>}
                  {review.improvements && <p style={{ margin: "4px 0" }}><strong>Improvements:</strong> {review.improvements}</p>}
                  {review.managerComments && <p style={{ margin: "4px 0" }}><strong>Comments:</strong> {review.managerComments}</p>}
                </>
              )}
              {review.status === "DRAFT" && review.reviewerUserId === user?.id && (
                submittingId === review.id ? (
                  <SubmitReviewForm reviewId={review.id} onDone={() => { setSubmittingId(null); load(); notify("success", "Review submitted."); }} onCancel={() => setSubmittingId(null)} />
                ) : (
                  <button className="secondary" style={{ marginTop: 6 }} onClick={() => setSubmittingId(review.id)}>Submit review</button>
                )
              )}
              {review.status === "SUBMITTED" && employeeId === user?.employeeId && (
                <button className="primary" style={{ marginTop: 6 }} onClick={async () => {
                  try {
                    await acknowledgeReview(review.id);
                    load();
                    notify("success", "Review acknowledged.");
                  } catch (err) {
                    notify("error", err instanceof Error ? err.message : "Could not acknowledge.");
                  }
                }}>Acknowledge</button>
              )}
            </div>
          ))}
        </div>
      )}

      {showStart && (
        <StartReviewModal employeeId={employeeId} onClose={() => setShowStart(false)} onStarted={() => { setShowStart(false); load(); notify("success", "Review started."); }} />
      )}
    </div>
  );
}

function StartReviewModal({ employeeId, onClose, onStarted }: { employeeId: number; onClose: () => void; onStarted: () => void }) {
  const [cycle, setCycle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>Start a review cycle</h2>
        <label className="field">Cycle<input value={cycle} onChange={(event) => setCycle(event.target.value)} placeholder="2026-Q1" /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="primary" disabled={submitting || !cycle.trim()} onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              await startReview(employeeId, cycle.trim());
              onStarted();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not start this review.");
            } finally {
              setSubmitting(false);
            }
          }}>{submitting ? "Starting…" : "Start"}</button>
        </div>
      </div>
    </div>
  );
}

function SubmitReviewForm({ reviewId, onDone, onCancel }: { reviewId: number; onDone: () => void; onCancel: () => void }) {
  const [rating, setRating] = useState(4);
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [managerComments, setManagerComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ marginTop: 8 }}>
      <label className="field">Rating
        <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
        </select>
      </label>
      <label className="field" style={{ marginTop: 8 }}>Strengths<textarea rows={2} value={strengths} onChange={(event) => setStrengths(event.target.value)} /></label>
      <label className="field" style={{ marginTop: 8 }}>Improvements<textarea rows={2} value={improvements} onChange={(event) => setImprovements(event.target.value)} /></label>
      <label className="field" style={{ marginTop: 8 }}>Manager comments<textarea rows={2} value={managerComments} onChange={(event) => setManagerComments(event.target.value)} /></label>
      {error && <p className="form-error">{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button className="primary" disabled={submitting} onClick={async () => {
          setSubmitting(true);
          setError(null);
          try {
            await submitReview(reviewId, { rating, strengths: strengths || undefined, improvements: improvements || undefined, managerComments: managerComments || undefined });
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not submit this review.");
          } finally {
            setSubmitting(false);
          }
        }}>{submitting ? "Submitting…" : "Submit"}</button>
      </div>
    </div>
  );
}
