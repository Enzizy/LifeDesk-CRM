import { CommandBar } from "../discovery/CommandBar";
import { setTaskDone } from "../../lib/records";
import { Avatar, Badge, Icon } from "../../components/ui";
import { categoryLabel } from "../../lib/discovery";
import type { Notify } from "../../components/ui";
import type { CalendarEvent, Candidate, Prospect, Settings, Task } from "../../types";
import { eventKindLabel, formatValue, initialsFor, plural, toneFor } from "../../types";

export function Home({
  prospects,
  tasks,
  events,
  candidates,
  settings,
  notify,
  onReviewCandidate,
  onOpenProspect,
  onNavigate,
  onAddProspect,
  onAddTask,
  onDiscover,
  onRefreshTasks,
  onEditEvent,
}: {
  prospects: Prospect[];
  tasks: Task[];
  events: CalendarEvent[];
  candidates: Candidate[];
  settings: Settings;
  notify: Notify;
  onReviewCandidate: (candidate: Candidate) => void;
  onOpenProspect: (prospect: Prospect) => void;
  onNavigate: (page: string) => void;
  onAddProspect: () => void;
  onAddTask: () => void;
  onDiscover: (command: string) => void;
  onRefreshTasks: () => Promise<void>;
  onEditEvent: (event: CalendarEvent) => void;
}) {
  const todayKey = new Date().toDateString();
  const todaysEvents = events.filter((event) => new Date(event.startsAt).toDateString() === todayKey);
  const currency = settings.currencyCode;
  const toQualify = prospects.filter(
    (p) => p.stage === "New" || p.stage === "Qualified",
  );
  const inConversation = prospects.filter(
    (p) => p.stage === "Contacted" || p.stage === "Meeting" || p.stage === "Proposal",
  );
  const openTasks = tasks.filter((task) => !task.done);
  const total = prospects.reduce((sum, p) => sum + p.value, 0);

  const columns = [
    {
      title: "Discover businesses",
      sub: "Find your next opportunity",
      empty: "Ask LifeDesk to run your first discovery.",
      rows: candidates.slice(0, 4).map((candidate) => ({
        key: `c${candidate.id}`,
        initials: initialsFor(candidate.name),
        tone: toneFor(candidate.name),
        title: candidate.name,
        sub: candidate.category ? categoryLabel(candidate.category) : candidate.location || "Awaiting review",
        onOpen: () => onReviewCandidate(candidate),
      })),
    },
    {
      title: "Review & qualify",
      sub: "Choose the right fit",
      empty: "Approved candidates land here.",
      rows: toQualify.slice(0, 4).map((prospect) => ({
        key: `p${prospect.id}`,
        initials: prospect.initials,
        tone: prospect.tone,
        title: prospect.name,
        sub: prospect.next || categoryLabel(prospect.category),
        onOpen: () => onOpenProspect(prospect),
      })),
    },
    {
      title: "Start a conversation",
      sub: "Make a thoughtful first move",
      empty: "Qualified prospects appear here when outreach begins.",
      rows: inConversation.slice(0, 4).map((prospect) => ({
        key: `p${prospect.id}`,
        initials: prospect.initials,
        tone: prospect.tone,
        title: prospect.name,
        sub: prospect.next || prospect.stage,
        onOpen: () => onOpenProspect(prospect),
      })),
    },
  ];

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h1>Client journeys</h1>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={onAddProspect}>
            <Icon name="plus" size={15} /> Add prospect
          </button>
          <button className="button primary" onClick={() => onNavigate("Discover")}>
            <Icon name="search" size={15} /> Discover
          </button>
        </div>
      </section>

      <section className="journey-board panel">
        <div className="board-head">
          <div>
            <h2>New business outreach</h2>
          </div>
          <div
            className="board-progress"
            aria-label={`${candidates.length} candidates to review`}
          >
            <span>{candidates.length}</span>
            <small>to review</small>
          </div>
        </div>

        <CommandBar onSubmit={onDiscover} />

        <div className="journey-grid">
          {columns.map((column, index) => (
            <section
              className={`journey-column ${index === 1 ? "active-stage" : ""}`}
              key={column.title}
            >
              <div className="column-title">
                <div className="stage-caption">
                  <span>0{index + 1}</span>
                  <span>{plural(column.rows.length, "business", "businesses")}</span>
                </div>
                <strong>{column.title}</strong>
                <small>{column.sub}</small>
              </div>
              <div className="column-rows">
                {column.rows.map((row) => (
                  <button className="journey-row" key={row.key} onClick={row.onOpen}>
                    <Avatar initials={row.initials} tone={row.tone} />
                    <span>
                      <strong>{row.title}</strong>
                      <small>{row.sub}</small>
                    </span>
                    <span className="row-open">Open</span>
                    <Icon name="arrow" size={13} />
                  </button>
                ))}
                {!column.rows.length && <p className="empty-row">{column.empty}</p>}
                {index === 0 && candidates.length > 4 && (
                  <button className="stage-footer" onClick={() => onNavigate("Discover")}>
                    See all {candidates.length} <Icon name="arrow" size={14} />
                  </button>
                )}
              </div>
              {index < 2 && (
                <svg
                  className="stage-connector"
                  viewBox="0 0 32 180"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M0 40 C28 40 4 90 32 90 M0 145 C28 145 4 90 32 90" />
                  <circle cx="2" cy="40" r="2" />
                  <circle cx="2" cy="145" r="2" />
                  <circle cx="30" cy="90" r="2" />
                </svg>
              )}
            </section>
          ))}

          <section className="next-moves">
            <header>
              <span>Next moves</span>
            </header>
            <button
              className="next-move primary-move"
              onClick={() =>
                candidates[0] ? onReviewCandidate(candidates[0]) : onNavigate("Discover")
              }
            >
              <span className="move-icon">
                <Icon name="search" size={16} />
              </span>
              <span>
                <strong>
                  {candidates.length ? "Review candidates" : "Start discovery"}
                </strong>
                <small>
                  {candidates.length
                    ? `${candidates.length} waiting for you`
                    : "Find your first businesses"}
                </small>
              </span>
              <Icon name="arrow" size={14} />
            </button>
            <button className="next-move" onClick={() => onNavigate("Tasks")}>
              <span className="move-icon">
                <Icon name="check" size={16} />
              </span>
              <span>
                <strong>Follow up</strong>
                <small>
                  {openTasks.length ? plural(openTasks.length, "open task") : "Plan outreach"}
                </small>
              </span>
              <Icon name="arrow" size={14} />
            </button>
            <button className="next-move" onClick={() => onNavigate("Pipeline")}>
              <span className="move-icon">
                <Icon name="funnel" size={16} />
              </span>
              <span>
                <strong>Move a deal forward</strong>
                <small>
                  {plural(prospects.filter((p) => p.stage === "Proposal").length, "proposal")} ready
                </small>
              </span>
              <Icon name="arrow" size={14} />
            </button>
            <button className="all-work-link" onClick={() => onNavigate("Prospects")}>
              View all work <Icon name="arrow" size={13} />
            </button>
          </section>
        </div>
      </section>

      <div className="lower-grid">
        <section className="panel followup-panel">
          <div className="panel-head">
            <div>
              <h2>Next on your list</h2>
            </div>
            <button
              className="circle-btn"
              onClick={() => onNavigate("Prospects")}
              aria-label="View all prospects"
            >
              <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="followup-table">
            <div className="followup-head">
              <span>Business</span>
              <span>Next action</span>
              <span>Stage</span>
            </div>
            {prospects.slice(0, 4).map((prospect) => (
              <button
                className="followup-row"
                key={prospect.id}
                onClick={() => onOpenProspect(prospect)}
              >
                <span className="business-cell">
                  <Avatar initials={prospect.initials} tone={prospect.tone} />
                  <strong>{prospect.name}</strong>
                </span>
                <span>{prospect.next || "Not set"}</span>
                <span>
                  <Badge tone={prospect.stage.toLowerCase()}>{prospect.stage}</Badge>
                </span>
              </button>
            ))}
            {!prospects.length && (
              <div className="home-empty-row">
                <span>No prospects yet.</span>
                <button onClick={onAddProspect}>Add your first prospect</button>
              </div>
            )}
          </div>
        </section>

        <section className="panel pipeline-summary">
          <div className="panel-head">
            <div>
              <h2>Your pipeline, at a glance</h2>
              <p>{plural(prospects.length, "opportunity", "opportunities")} in motion</p>
            </div>
            <button
              className="circle-btn"
              onClick={() => onNavigate("Pipeline")}
              aria-label="Open pipeline"
            >
              <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="pulse-body">
            <div className={`ring ${prospects.length ? "" : "empty-ring"}`}>
              <span>
                {formatValue(total, currency)}
                <small>potential value</small>
              </span>
            </div>
            <div className="pulse-legend">
              {(
                [
                  ["New", "var(--lilac)"],
                  ["Qualified", "var(--mint)"],
                  ["Contacted", "var(--peach)"],
                  ["Meeting", "var(--sky)"],
                  ["Proposal", "var(--ink)"],
                  ["Won", "#7994ba"],
                ] as const
              )
                .filter(([stage]) => prospects.some((p) => p.stage === stage))
                .map(([stage, color]) => (
                  <div key={stage}>
                    <i style={{ background: color }} />
                    <span>{stage}</span>
                    <b>{prospects.filter((p) => p.stage === stage).length}</b>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </div>

      <section className="panel task-strip">
        <div className="panel-head">
          <div>
            <h2>Today's focus</h2>
            <p>
              {todaysEvents.length ? plural(todaysEvents.length, "event") + " · " : ""}
              {plural(openTasks.length, "open task")}
            </p>
          </div>
          <div className="heading-actions">
            <button className="text-btn" onClick={() => onNavigate("Calendar")}>
              Calendar <Icon name="arrow" size={14} />
            </button>
            <button className="text-btn" onClick={() => onNavigate("Tasks")}>
              View tasks <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>
        {todaysEvents.length > 0 && (
          <ul className="today-schedule">
            {todaysEvents.map((event) => (
              <li key={event.id}>
                <button onClick={() => onEditEvent(event)}>
                  <span className="today-time">
                    {new Date(event.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <strong>{event.title}</strong>
                  <small>{eventKindLabel(event.kind)}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="task-inline">
          {tasks.slice(0, 4).map((task) => (
            <label key={task.id} className={task.done ? "done" : ""}>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => {
                  void setTaskDone(task.id, !task.done)
                    .then(onRefreshTasks)
                    .catch(() =>
                      notify("The task could not be updated.", undefined, "error"),
                    );
                }}
              />
              <span>{task.title}</span>
            </label>
          ))}
          {!tasks.length && (
            <button className="task-empty" onClick={onAddTask}>
              <span className="move-icon">
                <Icon name="plus" size={15} />
              </span>
              <span>
                <strong>No tasks yet</strong>
                <small>Add your first follow-up or reminder</small>
              </span>
              <Icon name="arrow" size={14} />
            </button>
          )}
        </div>
      </section>
    </>
  );
}
