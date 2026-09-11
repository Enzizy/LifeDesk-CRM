import { useState } from "react";
import type { DragEvent } from "react";
import { setProspectStage } from "../../lib/records";
import { Avatar, Badge, Icon } from "../../components/ui";
import type { Notify } from "../../components/ui";
import type { Prospect, Stage } from "../../types";
import { STAGES, formatValue } from "../../types";
import { categoryLabel } from "../../lib/discovery";

const DRAG_MIME = "application/x-lifedesk-prospect";

export function PipelineView({
  prospects,
  currencyCode,
  notify,
  onOpen,
  onChanged,
}: {
  prospects: Prospect[];
  currencyCode: string;
  notify: Notify;
  onOpen: (prospect: Prospect) => void;
  onChanged: () => Promise<void>;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  // Optimistic placement: the card moves the instant it is dropped, and is put
  // back only if the server refuses. Waiting for the round trip made drops feel
  // like they had missed.
  const [pending, setPending] = useState<Record<number, Stage>>({});

  const stageOf = (prospect: Prospect): Stage => pending[prospect.id] ?? prospect.stage;

  const move = async (prospect: Prospect, next: Stage) => {
    const previous = prospect.stage;
    if (next === previous) return;
    setPending((current) => ({ ...current, [prospect.id]: next }));
    try {
      await setProspectStage(prospect.id, next, previous, prospect.name);
      await onChanged();
      notify(`${prospect.name} moved to ${next}`, {
        label: "Undo",
        onClick: () => {
          void setProspectStage(prospect.id, previous, next, prospect.name)
            .then(onChanged)
            .catch(() => notify("That change could not be undone.", undefined, "error"));
        },
      });
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "The stage could not be changed.",
        undefined,
        "error",
      );
    } finally {
      setPending((current) => {
        const next = { ...current };
        delete next[prospect.id];
        return next;
      });
    }
  };

  const onDragStart = (event: DragEvent, prospect: Prospect) => {
    event.dataTransfer.setData(DRAG_MIME, String(prospect.id));
    event.dataTransfer.effectAllowed = "move";
    setDragging(prospect.id);
  };

  const onDrop = (event: DragEvent, stage: Stage) => {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData(DRAG_MIME));
    setOver(null);
    setDragging(null);
    const prospect = prospects.find((item) => item.id === id);
    if (prospect) void move(prospect, stage);
  };

  const total = (stage: Stage) =>
    prospects.filter((p) => stageOf(p) === stage).reduce((sum, p) => sum + p.value, 0);

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Sales workspace</p>
          <h1>Pipeline</h1>
          <p className="heading-sub">
            Drag a card between stages, or use the menu on each card.
          </p>
        </div>
      </section>

      {!prospects.length && (
        <section className="pipeline-empty-banner">
          <span className="move-icon">
            <Icon name="funnel" size={16} />
          </span>
          <div>
            <strong>Your pipeline is ready</strong>
            <small>Approve a candidate or add a prospect to begin tracking an opportunity.</small>
          </div>
        </section>
      )}

      <div className="pipeline-board kanban">
        {STAGES.map((stage) => {
          const inStage = prospects.filter((prospect) => stageOf(prospect) === stage);
          return (
            <section
              className={`pipeline-column ${over === stage ? "drop-target" : ""}`}
              key={stage}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes(DRAG_MIME)) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (over !== stage) setOver(stage);
                }
              }}
              onDragLeave={(event) => {
                // Only clear when leaving the column itself, not a child card.
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(null);
              }}
              onDrop={(event) => onDrop(event, stage)}
              aria-label={`${stage} column`}
            >
              <header>
                <strong>{stage}</strong>
                <span className="column-meta">
                  {inStage.length > 0 && <small>{formatValue(total(stage), currencyCode)}</small>}
                  <Badge>{inStage.length}</Badge>
                </span>
              </header>
              <div className="column-cards">
                {inStage.map((prospect) => (
                  <article
                    className={`pipeline-card ${dragging === prospect.id ? "is-dragging" : ""} ${pending[prospect.id] ? "is-pending" : ""}`}
                    key={prospect.id}
                    draggable
                    onDragStart={(event) => onDragStart(event, prospect)}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                  >
                    <div className="pipeline-card-head">
                      <Avatar initials={prospect.initials} tone={prospect.tone} />
                      <button
                        className="more-btn"
                        onClick={() => onOpen(prospect)}
                        aria-label={`Open ${prospect.name}`}
                      >
                        <Icon name="dots" size={14} />
                      </button>
                    </div>
                    <button className="card-title" onClick={() => onOpen(prospect)}>
                      {prospect.name}
                    </button>
                    <small>{prospect.service || categoryLabel(prospect.category)}</small>
                    {prospect.gaps.length > 0 && (
                      <small className="card-gaps">
                        {prospect.gaps.slice(0, 2).join(" · ")}
                      </small>
                    )}
                    <footer>
                      <b>{formatValue(prospect.value, currencyCode)}</b>
                      <label className="move-control">
                        <span>Move</span>
                        <select
                          value={stageOf(prospect)}
                          onChange={(event) => void move(prospect, event.target.value as Stage)}
                          aria-label={`Move ${prospect.name}`}
                        >
                          {STAGES.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                    </footer>
                  </article>
                ))}
                {!inStage.length && over === stage && (
                  <div className="drop-hint">Drop here</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
