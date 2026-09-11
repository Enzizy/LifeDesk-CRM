import { useEffect, useRef, useState } from "react";
import {
  deleteProspect,
  listActivities,
  listDrafts,
  logActivity,
  markDraftSent,
  setProspectStage,
} from "../../lib/records";
import { qualifyProspect } from "../../lib/cloud";
import { Avatar, Badge, Icon, Modal, Spinner } from "../../components/ui";
import type { Notify } from "../../components/ui";
import type { Activity, CalendarEvent, MessageDraft, Prospect, Stage } from "../../types";
import { SOCIAL_LABELS, SOCIAL_NETWORKS, STAGES, eventKindLabel, formatValue } from "../../types";
import { categoryLabel } from "../../lib/discovery";

const KIND_LABELS: Record<Activity["kind"], string> = {
  note: "Note",
  stage_change: "Stage",
  email_draft: "Draft",
  outreach: "Outreach",
  task: "Task",
  meeting: "Scheduled",
  system: "System",
};

export function ProspectDrawer({
  prospect,
  events,
  currencyCode,
  qualifyOnOpen,
  notify,
  onClose,
  onEdit,
  onSchedule,
  onEditEvent,
  onChanged,
}: {
  prospect: Prospect;
  /** Events already linked to this prospect. */
  events: CalendarEvent[];
  currencyCode: string;
  /** Set when the drawer opens straight after an approval. */
  qualifyOnOpen: boolean;
  notify: Notify;
  onClose: () => void;
  onEdit: () => void;
  onSchedule: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onChanged: () => Promise<void>;
}) {
  const upcomingEvents = events
    .filter((event) => new Date(event.startsAt).getTime() >= Date.now() - 60 * 60_000)
    .slice(0, 3);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [drafts, setDrafts] = useState<MessageDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [qualifying, setQualifying] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoRan = useRef(false);

  const load = async () => {
    const [nextActivities, nextDrafts] = await Promise.all([
      listActivities(prospect.id),
      listDrafts(prospect.id),
    ]);
    setActivities(nextActivities);
    setDrafts(nextDrafts);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .catch(() => {
        if (active) notify("The timeline could not be loaded.", undefined, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospect.id]);

  const qualify = async () => {
    if (qualifying) return;
    setQualifying(true);
    try {
      await qualifyProspect(prospect.id);
      await Promise.all([load(), onChanged()]);
      notify("Qualified and a draft is ready to review");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "The prospect could not be qualified.",
        undefined,
        "error",
      );
    } finally {
      setQualifying(false);
    }
  };

  // Approval hands off here with qualifyOnOpen; run once, never on re-render.
  useEffect(() => {
    if (qualifyOnOpen && !autoRan.current && !prospect.qualifiedAt) {
      autoRan.current = true;
      void qualify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualifyOnOpen, prospect.id]);

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const created = await logActivity(prospect.id, "note", note.trim());
      setActivities((current) => [created, ...current]);
      setNote("");
    } catch (error) {
      notify(error instanceof Error ? error.message : "The note could not be saved.", undefined, "error");
    } finally {
      setBusy(false);
    }
  };

  const changeStage = async (next: Stage) => {
    if (next === prospect.stage) return;
    const previous = prospect.stage;
    setBusy(true);
    try {
      await setProspectStage(prospect.id, next, previous, prospect.name);
      await Promise.all([load(), onChanged()]);
      notify(`${prospect.name} moved to ${next}`, {
        label: "Undo",
        onClick: () => {
          void setProspectStage(prospect.id, previous, next, prospect.name)
            .then(onChanged)
            .catch(() => notify("That change could not be undone.", undefined, "error"));
        },
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "The stage could not be changed.", undefined, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteProspect(prospect.id);
      onClose();
      await onChanged();
      notify(`${prospect.name} deleted`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "The prospect could not be deleted.", undefined, "error");
    } finally {
      setBusy(false);
    }
  };

  const latestDraft = drafts[0] ?? null;

  const copyDraft = async (draft: MessageDraft) => {
    const text = draft.subject ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.body;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify("Copy failed — select the text and copy it manually.", undefined, "error");
    }
  };

  const sent = async (draft: MessageDraft) => {
    setBusy(true);
    try {
      await markDraftSent(draft, prospect.name);
      await load();
      if (prospect.stage === "New" || prospect.stage === "Qualified") {
        await setProspectStage(prospect.id, "Contacted", prospect.stage, prospect.name);
        await Promise.all([load(), onChanged()]);
      }
      notify("Recorded as sent");
    } catch (error) {
      notify(error instanceof Error ? error.message : "That could not be recorded.", undefined, "error");
    } finally {
      setBusy(false);
    }
  };

  const socials = SOCIAL_NETWORKS.filter((network) => prospect.socials[network]);
  const site = prospect.enrichment?.website ?? null;
  const sourceOf = (network: (typeof SOCIAL_NETWORKS)[number]) =>
    prospect.enrichment?.socialSource?.[network];
  const siteHost = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  return (
    <Modal labelledBy="prospect-title" onClose={onClose} className="drawer wide">
      <div className="drawer-head">
        <div>
          <p className="eyebrow">
            {prospect.origin === "discovered" ? "Discovered prospect" : "Prospect"}
          </p>
          <h2 id="prospect-title">{prospect.name}</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <div className="drawer-company">
        <Avatar initials={prospect.initials} tone={prospect.tone} />
        <div>
          <strong>{categoryLabel(prospect.category)}</strong>
          <span>{prospect.location || "No location"}</span>
        </div>
        <Badge tone={prospect.stage.toLowerCase()}>{prospect.stage}</Badge>
      </div>

      {/* ------------------------------------------------------- essentials */}
      <div className="drawer-essentials">
        <div className="drawer-block">
          <label htmlFor="stage-select">Stage</label>
          <select
            id="stage-select"
            value={prospect.stage}
            onChange={(event) => void changeStage(event.target.value as Stage)}
            disabled={busy}
          >
            {STAGES.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
        </div>
        <div className="drawer-block">
          <label>Estimated value</label>
          <p className="essential-value">{formatValue(prospect.value, currencyCode)}</p>
        </div>
        <div className="drawer-block">
          <label>Next action</label>
          <p className="essential-value">{prospect.next || "Not set"}</p>
        </div>
      </div>

      {/* ---------------------------------------------------- contact facts */}
      <div className="drawer-block">
        <label>Contact details found</label>
        <div className="contact-grid">
          <ContactRow label="Phone" value={prospect.phone} href={prospect.phone ? `tel:${prospect.phone}` : ""} />
          <ContactRow label="Email" value={prospect.email} href={prospect.email ? `mailto:${prospect.email}` : ""} />
          <ContactRow label="Website" value={prospect.website} href={prospect.website} />
          {site && (
            <div className={`site-check ${site.offDomain || !site.reachable ? "bad" : site.suspicious ? "warn" : "ok"}`}>
              <Icon name={site.offDomain || !site.reachable ? "close" : "check"} size={12} />
              {site.offDomain ? (
                <span>
                  Redirects to <strong>{siteHost(site.finalUrl)}</strong> — the domain no longer serves their site
                </span>
              ) : !site.reachable ? (
                <span>Site not reachable{site.status ? ` (HTTP ${site.status})` : ""}</span>
              ) : site.suspicious ? (
                <span>Site looks parked or taken over</span>
              ) : (
                <span>
                  Live{site.https ? " · HTTPS" : " · no HTTPS"}{site.hasViewport ? " · mobile-friendly" : " · not mobile-friendly"}
                </span>
              )}
            </div>
          )}
          {socials.length ? (
            socials.map((network) => (
              <ContactRow
                key={network}
                label={SOCIAL_LABELS[network]}
                value={prospect.socials[network] ?? ""}
                href={prospect.socials[network] ?? ""}
                tag={
                  sourceOf(network) === "website"
                    ? "from their site"
                    : sourceOf(network) === "search"
                      ? "found via search · verify"
                      : undefined
                }
              />
            ))
          ) : (
            <ContactRow
              label="Socials"
              value=""
              href=""
              tag={
                prospect.enrichment?.socialSearch === "done"
                  ? "searched, none found"
                  : prospect.enrichment?.socialSearch === "unavailable"
                    ? "search unavailable on free tier"
                    : undefined
              }
            />
          )}
        </div>
        {prospect.enrichment ? (
          <div className="enrichment-line">
            <Badge tone="green">Enriched from Google</Badge>
            {prospect.enrichment.rating !== null && (
              <span className="rating">
                ★ {prospect.enrichment.rating.toFixed(1)}
                {prospect.enrichment.ratingCount !== null && (
                  <small> ({prospect.enrichment.ratingCount})</small>
                )}
              </span>
            )}
            {prospect.enrichment.businessStatus &&
              prospect.enrichment.businessStatus !== "OPERATIONAL" && (
                <Badge tone="amber">{prospect.enrichment.businessStatus.replace(/_/g, " ").toLowerCase()}</Badge>
              )}
            {prospect.enrichment.mapsUri && (
              <a href={prospect.enrichment.mapsUri} target="_blank" rel="noreferrer noopener">
                Open in Google Maps
              </a>
            )}
          </div>
        ) : (
          <Badge tone={prospect.confidence === "High" ? "green" : "amber"}>
            {prospect.origin === "manual"
              ? "Manually entered · not verified"
              : "From public map data · verify before use"}
          </Badge>
        )}
      </div>

      {/* --------------------------------------------------- qualification */}
      <div className="drawer-block insight">
        <div className="insight-heading">
          <span className="insight-icon">
            <Icon name="spark" size={14} />
          </span>
          <label>{prospect.qualifiedAt ? "What they're missing" : "Qualification"}</label>
          {prospect.qualifiedAt && (
            <button
              className="text-btn"
              onClick={() => void qualify()}
              disabled={qualifying}
              title="Costs one Gemini call"
            >
              {qualifying ? <Spinner /> : "Regenerate"}
            </button>
          )}
        </div>

        {qualifying && !prospect.qualifiedAt ? (
          <p className="qualifying">
            <Spinner /> Checking their web presence and writing a first message…
          </p>
        ) : prospect.qualifiedAt ? (
          <>
            {prospect.gaps.length ? (
              <ul className="gap-list">
                {prospect.gaps.map((gap) => (
                  <li key={gap}>
                    <Icon name="close" size={11} /> {gap}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cell-ok">No gaps found in their listed web presence.</p>
            )}
            {prospect.service && (
              <p className="service-line">
                <Icon name="spark" size={14} /> Suggested: <strong>{prospect.service}</strong>
              </p>
            )}
            <p>{prospect.reason}</p>
          </>
        ) : (
          <>
            <p>
              Not qualified yet. LifeDesk can check what this business is missing and draft a
              first message tailored to them.
            </p>
            <button className="button secondary" onClick={() => void qualify()} disabled={qualifying}>
              {qualifying ? <Spinner /> : <Icon name="spark" size={15} />}
              Qualify and draft outreach
            </button>
          </>
        )}
      </div>

      {/* --------------------------------------------------------- schedule */}
      <div className="drawer-block">
        <div className="insight-heading">
          <label>Schedule</label>
          <button className="text-btn" onClick={onSchedule}>
            <Icon name="plus" size={13} /> Schedule
          </button>
        </div>
        {upcomingEvents.length ? (
          <ul className="mini-agenda">
            {upcomingEvents.map((event) => (
              <li key={event.id}>
                <button onClick={() => onEditEvent(event)}>
                  <Icon name="calendar" size={14} />
                  <span>
                    <strong>{event.title}</strong>
                    <small>
                      {new Date(event.startsAt).toLocaleString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {eventKindLabel(event.kind)}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-row compact">Nothing scheduled with them yet.</p>
        )}
      </div>

      {/* ------------------------------------------------------------ draft */}
      {latestDraft && (
        <div className="drawer-block draft-block">
          <div className="insight-heading">
            <label>
              Outreach draft
              <span className="filter-count">v{latestDraft.version}</span>
            </label>
            <Badge tone={latestDraft.status === "sent" ? "green" : latestDraft.status === "discarded" ? "amber" : "purple"}>
              {latestDraft.status}
            </Badge>
          </div>
          {latestDraft.subject && (
            <p className="draft-subject">
              <span>Subject</span> {latestDraft.subject}
            </p>
          )}
          <pre className="draft-body">{latestDraft.body}</pre>
          <p className="form-note">
            LifeDesk never sends this. Copy it into your own email or messenger, edit it as you
            like, then record it as sent so the timeline stays accurate.
          </p>
          <div className="draft-actions">
            <button className="button secondary" onClick={() => void copyDraft(latestDraft)}>
              <Icon name={copied ? "check" : "note"} size={14} /> {copied ? "Copied" : "Copy"}
            </button>
            {prospect.email && (
              <a
                className="button secondary"
                href={`mailto:${prospect.email}?subject=${encodeURIComponent(latestDraft.subject)}&body=${encodeURIComponent(latestDraft.body)}`}
              >
                <Icon name="send" size={14} /> Open in email
              </a>
            )}
            {latestDraft.status !== "sent" && (
              <button className="button primary" onClick={() => void sent(latestDraft)} disabled={busy}>
                <Icon name="check" size={14} /> I sent this
              </button>
            )}
          </div>
        </div>
      )}

      {prospect.notes && (
        <div className="drawer-block">
          <label>Notes</label>
          <p>{prospect.notes}</p>
        </div>
      )}

      <div className="drawer-block">
        <label htmlFor="note-input">Add to the timeline</label>
        <div className="note-composer">
          <textarea
            id="note-input"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What happened? A call, a reply, something you noticed…"
          />
          <button className="button secondary" onClick={() => void addNote()} disabled={busy || !note.trim()}>
            <Icon name="note" size={15} /> Save note
          </button>
        </div>
      </div>

      <div className="drawer-block">
        <label>Activity</label>
        {loading ? (
          <Spinner />
        ) : activities.length ? (
          <ol className="timeline">
            {activities.map((activity) => (
              <li key={activity.id}>
                <span className={`timeline-kind kind-${activity.kind}`}>
                  {KIND_LABELS[activity.kind]}
                </span>
                <div>
                  <p>{activity.summary}</p>
                  <small>{new Date(activity.createdAt).toLocaleString()}</small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-row">Nothing recorded yet. Notes, stage changes, and outreach appear here.</p>
        )}
      </div>

      <div className="drawer-actions">
        {confirmDelete ? (
          <>
            <button className="button secondary" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
            <button className="button danger" onClick={() => void remove()} disabled={busy}>
              <Icon name="trash" size={15} /> Delete permanently
            </button>
          </>
        ) : (
          <>
            <button className="button ghost" onClick={() => setConfirmDelete(true)} disabled={busy} aria-label={`Delete ${prospect.name}`}>
              <Icon name="trash" size={15} />
            </button>
            <button className="button secondary" onClick={onEdit} disabled={busy}>
              Edit prospect
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function ContactRow({ label, value, href, tag }: { label: string; value: string; href: string; tag?: string }) {
  return (
    <div className={`contact-row ${value ? "" : "missing"}`}>
      <span className="contact-label">{label}</span>
      <span className="contact-value">
        {value ? (
          href ? (
            <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener">
              {value}
            </a>
          ) : (
            <span>{value}</span>
          )
        ) : (
          <span className="contact-missing">Not listed</span>
        )}
        {tag && <span className="contact-tag">{tag}</span>}
      </span>
    </div>
  );
}
