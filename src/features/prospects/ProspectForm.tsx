import { useState } from "react";
import { createProspect, updateProspect } from "../../lib/records";
import type { ProspectDraft } from "../../lib/records";
import { Icon, Modal, Spinner } from "../../components/ui";
import type { Notify } from "../../components/ui";
import type { Prospect } from "../../types";

export function ProspectForm({
  initial,
  notify,
  onClose,
  onSaved,
}: {
  initial: Prospect | null;
  notify: Notify;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<ProspectDraft>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    service: initial?.service ?? "",
    category: initial?.category ?? "",
    location: initial?.location ?? "",
    value: initial?.value ?? 0,
    next: initial?.next ?? "",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (key: keyof ProspectDraft, value: string) =>
    setForm((current) => ({
      ...current,
      [key]: key === "value" ? Number(value) || 0 : value,
    }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError("Business name is required.");
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
      return setError("Enter a valid email address.");
    if (!Number.isFinite(form.value) || form.value < 0)
      return setError("Value cannot be negative.");

    setError("");
    setSaving(true);
    const draft: ProspectDraft = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      category: form.category.trim(),
      location: form.location.trim(),
      service: form.service.trim(),
    };
    try {
      if (initial) await updateProspect(initial.id, draft);
      else await createProspect(draft);
      onClose();
      await onSaved();
      notify(initial ? "Prospect updated" : "Prospect added");
    } catch (caught) {
      setSaving(false);
      setError(
        caught instanceof Error ? caught.message : "The prospect could not be saved.",
      );
    }
  };

  return (
    <Modal labelledBy="prospect-form-title" onClose={onClose}>
      <div className="drawer-head">
        <div>
          <p className="eyebrow">{initial ? "Edit prospect" : "New manual record"}</p>
          <h2 id="prospect-form-title">
            {initial ? "Update prospect" : "Add prospect"}
          </h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <p className="form-note">
        Manual records are labeled as manually added and do not claim verified
        contact information.
      </p>

      <form onSubmit={(event) => void submit(event)}>
        <label>
          Business name *
          <input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            autoFocus
          />
        </label>
        <div className="form-grid">
          <label>
            Category
            <input
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
            />
          </label>
          <label>
            Location
            <input
              value={form.location}
              onChange={(event) => update("location", event.target.value)}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Service
            <input
              value={form.service}
              onChange={(event) => update("service", event.target.value)}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Estimated value
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.value || ""}
              onChange={(event) => update("value", event.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            Next action
            <input
              value={form.next}
              onChange={(event) => update("next", event.target.value)}
            />
          </label>
        </div>
        <label>
          Notes
          <textarea
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            rows={3}
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
            Save prospect
          </button>
        </div>
      </form>
    </Modal>
  );
}
