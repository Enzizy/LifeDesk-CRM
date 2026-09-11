import { useState } from "react";
import { createEvent, deleteEvent, updateEvent } from "../../lib/records";
import type { EventDraft } from "../../lib/records";
import { Icon, Modal, Spinner } from "../../components/ui";
import type { Notify } from "../../components/ui";
import type { CalendarEvent, EventKind, Prospect } from "../../types";
import { EVENT_KINDS } from "../../types";

/** ISO → value for <input type="datetime-local"> in the viewer's zone. */
export function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : "");

const DURATIONS = [
  { minutes: 0, label: "No end time" },
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 45, label: "45 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 90, label: "1½ hours" },
  { minutes: 120, label: "2 hours" },
];

const minutesBetween = (start: string, end: string) =>
  start && end ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000) : 0;

export function EventForm({
  initial,
  prospects,
  defaultStart,
  defaultProspectId,
  notify,
  onClose,
  onSaved,
}: {
  /** Existing event to edit, or null to create. */
  initial: CalendarEvent | null;
  prospects: Prospect[];
  /** ISO; used when creating from a calendar day or a prospect. */
  defaultStart?: string;
  defaultProspectId?: number | null;
  notify: Notify;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [kind, setKind] = useState<EventKind>(initial?.kind ?? "meeting");
  const [start, setStart] = useState(toLocalInput(initial?.startsAt ?? defaultStart ?? ""));
  const [duration, setDuration] = useState(
    initial ? minutesBetween(initial.startsAt, initial.endsAt) : 60,
  );
  const [prospectId, setProspectId] = useState<string>(
    String(initial?.prospectId ?? defaultProspectId ?? ""),
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const linked = prospects.find((p) => String(p.id) === prospectId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError("Give the event a title.");
    if (!start) return setError("Pick a date and time.");
    setError("");
    setSaving(true);
    const startsAt = fromLocalInput(start);
    const draft: EventDraft = {
      title: title.trim(),
      kind,
      startsAt,
      endsAt: duration
        ? new Date(new Date(startsAt).getTime() + duration * 60_000).toISOString()
        : "",
      location: location.trim(),
      notes: notes.trim(),
      prospectId: prospectId ? Number(prospectId) : null,
    };
    try {
      if (initial) await updateEvent(initial.id, draft);
      else await createEvent(draft, linked?.name);
      onClose();
      await onSaved();
      notify(initial ? "Event updated" : "Added to your calendar");
    } catch (caught) {
      setSaving(false);
      setError(caught instanceof Error ? caught.message : "The event could not be saved.");
    }
  };

  const remove = async () => {
    if (!initial) return;
    setSaving(true);
    try {
      await deleteEvent(initial.id);
      onClose();
      await onSaved();
      notify("Event removed");
    } catch (caught) {
      setSaving(false);
      setError(caught instanceof Error ? caught.message : "The event could not be removed.");
    }
  };

  return (
    <Modal labelledBy="event-form-title" onClose={onClose}>
      <div className="drawer-head">
        <div>
          <p className="eyebrow">{initial ? "Edit event" : "Schedule"}</p>
          <h2 id="event-form-title">{initial ? "Update event" : "New event"}</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <form onSubmit={(event) => void submit(event)}>
        <label>
          Title *
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Intro call, site visit, send proposal…" />
        </label>

        <div className="form-grid">
          <label>
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
              {EVENT_KINDS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            With
            <select value={prospectId} onChange={(e) => setProspectId(e.target.value)}>
              <option value="">No prospect</option>
              {prospects.map((prospect) => (
                <option key={prospect.id} value={prospect.id}>
                  {prospect.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label>
            When *
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            Duration
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((option) => (
                <option key={option.minutes} value={option.minutes}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Location or link
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Their office, Google Meet link, phone…" />
        </label>

        <label>
          Notes
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What to cover, what to bring" />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          {initial && !confirmDelete && (
            <button type="button" className="button ghost" onClick={() => setConfirmDelete(true)} aria-label="Remove event">
              <Icon name="trash" size={15} />
            </button>
          )}
          {initial && confirmDelete && (
            <button type="button" className="button danger" onClick={() => void remove()} disabled={saving}>
              <Icon name="trash" size={15} /> Remove
            </button>
          )}
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit" disabled={saving}>
            {saving && <Spinner />}
            {initial ? "Save changes" : "Add to calendar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
