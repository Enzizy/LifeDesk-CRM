import { useState } from "react";
import { approveCandidate, archiveCandidate, restoreCandidate } from "../../lib/records";
import { Avatar, Badge, Icon, Modal, Spinner } from "../../components/ui";
import type { Notify } from "../../components/ui";
import type { Candidate, Prospect } from "../../types";
import { SOCIAL_LABELS, SOCIAL_NETWORKS, initialsFor, toneFor } from "../../types";
import { categoryLabel } from "../../lib/discovery";

export function CandidateDrawer({
  candidate,
  notify,
  onClose,
  onApproved,
  onChanged,
}: {
  candidate: Candidate;
  notify: Notify;
  onClose: () => void;
  /** Called with the new prospect so the caller can open it and qualify. */
  onApproved: (prospect: Prospect) => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const socials = SOCIAL_NETWORKS.filter((network) => candidate.socials[network]);
  const hasContact = Boolean(candidate.email || candidate.phone || candidate.website || socials.length);
  const contact = candidate.email || candidate.phone || candidate.website || "";

  const approve = async () => {
    setBusy(true);
    try {
      const prospect = await approveCandidate(candidate, contact);
      await onChanged();
      onApproved(prospect);
    } catch (error) {
      notify(error instanceof Error ? error.message : "The candidate could not be saved.", undefined, "error");
      setBusy(false);
    }
  };

  const archive = async () => {
    setBusy(true);
    try {
      await archiveCandidate(candidate.id);
      onClose();
      await onChanged();
      notify(`${candidate.name} archived`, {
        label: "Undo",
        onClick: () => {
          void restoreCandidate(candidate.id)
            .then(onChanged)
            .catch(() => notify("That change could not be undone.", undefined, "error"));
        },
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "The candidate could not be archived.", undefined, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal labelledBy="candidate-title" onClose={onClose} className="drawer">
      <div className="drawer-head">
        <div>
          <p className="eyebrow">Candidate review</p>
          <h2 id="candidate-title">{candidate.name}</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <div className="drawer-company">
        <Avatar initials={initialsFor(candidate.name)} tone={toneFor(candidate.name)} />
        <div>
          <strong>{categoryLabel(candidate.category)}</strong>
          <span>{candidate.location || "No address returned"}</span>
        </div>
        <span className="drawer-record-kind">To review</span>
      </div>

      <div className="drawer-block">
        <label>What's publicly listed</label>
        <div className="contact-grid">
          <Row label="Phone" value={candidate.phone} href={candidate.phone ? `tel:${candidate.phone}` : ""} />
          <Row label="Email" value={candidate.email} href={candidate.email ? `mailto:${candidate.email}` : ""} />
          <Row label="Website" value={candidate.website} href={candidate.website} />
          {socials.length ? (
            socials.map((network) => (
              <Row
                key={network}
                label={SOCIAL_LABELS[network]}
                value={candidate.socials[network] ?? ""}
                href={candidate.socials[network] ?? ""}
              />
            ))
          ) : (
            <Row label="Socials" value="" href="" />
          )}
        </div>
        <Badge tone={hasContact ? "green" : "amber"}>
          {hasContact
            ? `From ${candidate.provider} · verify before use`
            : "Nothing listed — a likely gap in their web presence"}
        </Badge>
      </div>

      <div className="drawer-block insight">
        <div className="insight-heading">
          <span className="insight-icon">
            <Icon name="spark" size={14} />
          </span>
          <label>What happens on approve</label>
        </div>
        <p>
          The business is saved as a prospect, LifeDesk works out what they're missing from the
          facts above, and writes a first message tailored to them for you to review. One Gemini
          call; nothing is sent.
        </p>
      </div>

      <div className="drawer-block">
        <label>Source</label>
        <p className="source-line">
          {candidate.provider} discovery · {new Date(candidate.createdAt).toLocaleDateString()} ·
          public map data, not verified
        </p>
      </div>

      <div className="drawer-actions">
        <button className="button secondary" onClick={() => void archive()} disabled={busy}>
          Archive
        </button>
        <button className="button primary" onClick={() => void approve()} disabled={busy}>
          {busy ? <Spinner /> : <Icon name="check" size={15} />}
          {busy ? "Saving…" : "Approve & draft outreach"}
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div className={`contact-row ${value ? "" : "missing"}`}>
      <span className="contact-label">{label}</span>
      {value ? (
        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener">
          {value}
        </a>
      ) : (
        <span className="contact-missing">Not listed</span>
      )}
    </div>
  );
}
