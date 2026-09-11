import { useState } from "react";
import { createTask } from "../../lib/records";
import { Icon, Modal, Spinner } from "../../components/ui";
import type { Notify } from "../../components/ui";
import type { Prospect } from "../../types";

export function TaskForm({
  prospects,
  notify,
  onClose,
  onSaved,
}: {
  prospects: Prospect[];
  notify: Notify;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [details, setDetails] = useState("");
  const [prospectId, setProspectId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError("Task title is required.");
    setError("");
    setSaving(true);
    try {
      await createTask({
        title: title.trim(),
        details: details.trim(),
        due,
        prospectId: prospectId ? Number(prospectId) : null,
      });
      onClose();
      await onSaved();
      notify("Task added");
    } catch (caught) {
      setSaving(false);
      setError(caught instanceof Error ? caught.message : "The task could not be saved.");
    }
  };

  return (
    <Modal labelledBy="task-form-title" onClose={onClose}>
      <div className="drawer-head">
        <div>
          <p className="eyebrow">Personal workspace</p>
          <h2 id="task-form-title">Add task</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <form onSubmit={(event) => void submit(event)}>
        <label>
          Task title *
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
          />
        </label>
        <div className="form-grid">
          <label>
            Due date
            <input
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </label>
          <label>
            Linked prospect
            <select
              value={prospectId}
              onChange={(event) => setProspectId(event.target.value)}
            >
              <option value="">None</option>
              {prospects.map((prospect) => (
                <option key={prospect.id} value={prospect.id}>
                  {prospect.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Details
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={2}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit" disabled={saving}>
            {saving && <Spinner />}
            Save task
          </button>
        </div>
      </form>
    </Modal>
  );
}
