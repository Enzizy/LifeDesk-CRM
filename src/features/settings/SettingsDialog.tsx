import { useState } from "react";
import { importLegacyWorkspace, saveSettings } from "../../lib/records";
import { loadWorkspace, STORAGE_KEY } from "../../storage";
import { MAX_RESULT_LIMIT } from "../../lib/discovery";
import { Icon, Modal, Spinner } from "../../components/ui";
import type { Notify } from "../../components/ui";
import type { Settings } from "../../types";

const browserStorage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export function SettingsDialog({
  settings,
  email,
  notify,
  onClose,
  onSaved,
  onImported,
}: {
  settings: Settings;
  email: string;
  notify: Notify;
  onClose: () => void;
  onSaved: (settings: Settings) => void;
  onImported: () => Promise<void>;
}) {
  const [form, setForm] = useState<Settings>(settings);
  const [offers, setOffers] = useState(settings.serviceOffers.join(", "));
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // Only offer the import when there is genuinely something to move.
  const legacy = loadWorkspace(browserStorage());
  const legacyCount =
    legacy.status === "valid"
      ? legacy.value.prospects.length + legacy.value.tasks.length
      : 0;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const next = await saveSettings({
        ...form,
        serviceOffers: offers
          .split(",")
          .map((offer) => offer.trim())
          .filter(Boolean),
      });
      onSaved(next);
      onClose();
      notify("Settings saved");
    } catch (error) {
      setSaving(false);
      notify(
        error instanceof Error ? error.message : "Settings could not be saved.",
        undefined,
        "error",
      );
    }
  };

  const runImport = async () => {
    if (legacy.status !== "valid") return;
    setImporting(true);
    try {
      const summary = await importLegacyWorkspace(legacy.value);
      await onImported();
      notify(
        `Imported ${summary.prospects} prospects and ${summary.tasks} tasks. Your browser copy was left untouched.`,
      );
      onClose();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "The import failed.",
        undefined,
        "error",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal labelledBy="settings-title" onClose={onClose}>
      <div className="drawer-head">
        <div>
          <p className="eyebrow">Signed in as {email}</p>
          <h2 id="settings-title">Workspace settings</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <form onSubmit={(event) => void save(event)}>
        <label>
          Default location
          <input
            value={form.defaultLocation}
            onChange={(event) =>
              setForm({ ...form, defaultLocation: event.target.value })
            }
            placeholder="Bukit Timah, Singapore"
          />
        </label>
        <p className="form-note">
          Used when a discovery command does not name a place, so you can just say
          "find 5 cafes".
        </p>

        <label>
          Services you offer
          <input
            value={offers}
            onChange={(event) => setOffers(event.target.value)}
            placeholder="Website build, Social media management"
          />
        </label>

        <div className="form-grid">
        <label>
          Currency
          <input
            value={form.currencyCode}
            onChange={(event) =>
              setForm({ ...form, currencyCode: event.target.value.toUpperCase().slice(0, 3) })
            }
            placeholder="PHP"
            maxLength={3}
            pattern="[A-Za-z]{3}"
            title="Three-letter currency code, e.g. PHP, USD, SGD"
          />
        </label>
        <label>
          Default number of results
          <input
            type="number"
            min="1"
            max={MAX_RESULT_LIMIT}
            value={form.discoveryLimit}
            onChange={(event) =>
              setForm({
                ...form,
                discoveryLimit: Number(event.target.value) || 5,
              })
            }
          />
        </label>
        </div>

        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit" disabled={saving}>
            {saving && <Spinner />}
            Save settings
          </button>
        </div>
      </form>

      {legacyCount > 0 && (
        <div className="drawer-block import-block">
          <label>Import from browser storage</label>
          <p>
            An older LifeDesk workspace is still saved in this browser
            ({legacyCount} {legacyCount === 1 ? "record" : "records"}). Importing
            copies it into your account. Your browser copy is kept, and importing
            twice will create duplicates.
          </p>
          <button
            className="button secondary"
            onClick={() => void runImport()}
            disabled={importing}
          >
            {importing ? <Spinner /> : <Icon name="download" size={15} />}
            Import {legacyCount} {legacyCount === 1 ? "record" : "records"}
          </button>
          <small className="source-line">Reading {STORAGE_KEY}</small>
        </div>
      )}
    </Modal>
  );
}
