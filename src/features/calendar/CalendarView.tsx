import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import { Avatar, Badge, Icon, Modal } from "../../components/ui";
import type { CalendarEvent, Prospect, Task } from "../../types";
import { eventKindLabel, plural } from "../../types";

/* ---------------------------------------------------------- date helpers */

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const keyOfIso = (iso: string) => dayKey(new Date(iso));
const todayKey = () => dayKey(new Date());
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const whenOf = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const DRAG_MIME = "application/x-lifedesk-event";

/** Same clock time as `iso`, on the day given by `key`. */
function moveToDay(iso: string, key: string): string {
  const original = new Date(iso);
  const target = new Date(`${key}T12:00:00`);
  target.setHours(original.getHours(), original.getMinutes(), 0, 0);
  return target.toISOString();
}

/** Every cell of a Sunday-first month grid, padded to full weeks. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  // Drop a trailing all-next-month week so short months are five rows.
  const lastRow = cells.slice(35);
  return lastRow.every((d) => d.getMonth() !== month) ? cells.slice(0, 35) : cells;
}

export type AgendaItem =
  | { kind: "event"; at: string; event: CalendarEvent }
  | { kind: "task"; at: string; task: Task };

export function agendaFor(events: CalendarEvent[], tasks: Task[], key: string): AgendaItem[] {
  const items: AgendaItem[] = [
    ...events.filter((e) => keyOfIso(e.startsAt) === key).map((event) => ({ kind: "event" as const, at: event.startsAt, event })),
    ...tasks.filter((t) => t.due === key && !t.done).map((task) => ({ kind: "task" as const, at: `${task.due}T23:59:59`, task })),
  ];
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

/* --------------------------------------------------------------- view */

export function CalendarView({
  events,
  tasks,
  prospects,
  onAddEvent,
  onEditEvent,
  onReschedule,
  onOpenProspect,
}: {
  events: CalendarEvent[];
  tasks: Task[];
  prospects: Prospect[];
  onAddEvent: (startIso: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
  /** Called after the user confirms a drag-to-reschedule. */
  onReschedule: (event: CalendarEvent, newStartsAt: string) => Promise<void>;
  onOpenProspect: (prospect: Prospect) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{ event: CalendarEvent; to: string } | null>(null);
  const [moving, setMoving] = useState(false);

  const onChipDragStart = (e: DragEvent, event: CalendarEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData(DRAG_MIME, String(event.id));
    e.dataTransfer.effectAllowed = "move";
    setDragging(event.id);
  };
  const onCellDrop = (e: DragEvent, key: string) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData(DRAG_MIME));
    setDropTarget(null);
    setDragging(null);
    const event = events.find((item) => item.id === id);
    if (!event) return;
    if (keyOfIso(event.startsAt) === key) return; // dropped where it already was
    setPendingMove({ event, to: moveToDay(event.startsAt, key) });
  };
  const confirmMove = async () => {
    if (!pendingMove) return;
    setMoving(true);
    try {
      await onReschedule(pendingMove.event, pendingMove.to);
      setPendingMove(null);
    } finally {
      setMoving(false);
    }
  };
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<string>(todayKey());

  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, { events: CalendarEvent[]; tasks: Task[] }>();
    const bucket = (key: string) => {
      if (!map.has(key)) map.set(key, { events: [], tasks: [] });
      return map.get(key)!;
    };
    for (const event of events) bucket(keyOfIso(event.startsAt)).events.push(event);
    for (const task of tasks) if (task.due && !task.done) bucket(task.due).tasks.push(task);
    return map;
  }, [events, tasks]);

  const agenda = agendaFor(events, tasks, selected);
  const selectedDate = new Date(`${selected}T12:00:00`);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const prospectById = (id: number | null) => (id ? prospects.find((p) => p.id === id) : undefined);

  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };
  const goToday = () => {
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelected(todayKey());
  };

  // Adding from a day picks a sensible default time rather than midnight.
  const startFor = (key: string) => new Date(`${key}T10:00:00`).toISOString();

  const upcoming = events
    .filter((e) => new Date(e.startsAt).getTime() >= Date.now() - 60 * 60_000)
    .slice(0, 5);

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Schedule</p>
          <h1>Calendar</h1>
        </div>
        <div className="heading-actions">
          <button className="button primary" onClick={() => onAddEvent(startFor(selected))}>
            <Icon name="plus" size={15} /> New event
          </button>
        </div>
      </section>

      <div className="calendar-grid-layout">
        <section className="panel calendar-panel">
          <div className="calendar-toolbar">
            <div className="calendar-nav">
              <button className="round-action" onClick={() => shift(-1)} aria-label="Previous month">
                <Icon name="arrow" size={14} />
              </button>
              <h2>{monthLabel}</h2>
              <button className="round-action" onClick={() => shift(1)} aria-label="Next month">
                <Icon name="arrow" size={14} />
              </button>
            </div>
            <button className="button secondary small" onClick={goToday}>
              Today
            </button>
          </div>

          <div className="calendar-weekdays" aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="calendar-cells" role="grid" aria-label={monthLabel}>
            {cells.map((date) => {
              const key = dayKey(date);
              const inMonth = date.getMonth() === cursor.month;
              const day = byDay.get(key);
              const items = [
                ...(day?.events ?? []).map((e) => ({ id: `e${e.id}`, label: `${timeOf(e.startsAt)} ${e.title}`, kind: e.kind, event: e as CalendarEvent | null })),
                ...(day?.tasks ?? []).map((t) => ({ id: `t${t.id}`, label: t.title, kind: "task", event: null as CalendarEvent | null })),
              ];
              return (
                <button
                  key={key}
                  role="gridcell"
                  className={[
                    "calendar-cell",
                    inMonth ? "" : "outside",
                    key === todayKey() ? "is-today" : "",
                    key === selected ? "is-selected" : "",
                    dropTarget === key ? "drop-target" : "",
                  ].join(" ")}
                  onClick={() => setSelected(key)}
                  onDoubleClick={() => onAddEvent(startFor(key))}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes(DRAG_MIME)) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dropTarget !== key) setDropTarget(key);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
                  }}
                  onDrop={(e) => onCellDrop(e, key)}
                  aria-label={date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                  aria-selected={key === selected}
                >
                  <span className="calendar-daynum">{date.getDate()}</span>
                  <span className="calendar-items">
                    {items.slice(0, 3).map((item) => (
                      <span
                        key={item.id}
                        className={`calendar-chip kind-${item.kind} ${item.event ? "draggable" : ""} ${item.event && dragging === item.event.id ? "is-dragging" : ""}`}
                        draggable={Boolean(item.event)}
                        onDragStart={item.event ? (e) => onChipDragStart(e, item.event!) : undefined}
                        onDragEnd={() => {
                          setDragging(null);
                          setDropTarget(null);
                        }}
                        title={item.event ? "Drag to another day to reschedule" : undefined}
                      >
                        {item.label}
                      </span>
                    ))}
                    {items.length > 3 && <span className="calendar-more">+{items.length - 3} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="panel calendar-agenda">
          <div className="panel-head">
            <div>
              <h2>
                {selected === todayKey()
                  ? "Today"
                  : selectedDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <p>
                {agenda.length
                  ? plural(agenda.length, "item")
                  : "Nothing scheduled"}
              </p>
            </div>
            <button className="circle-btn" onClick={() => onAddEvent(startFor(selected))} aria-label="Add event on this day">
              <Icon name="plus" size={16} />
            </button>
          </div>

          <ol className="agenda-list">
            {agenda.map((item) =>
              item.kind === "event" ? (
                <li key={`e${item.event.id}`}>
                  <button className="agenda-item" onClick={() => onEditEvent(item.event)}>
                    <span className="agenda-time">{timeOf(item.event.startsAt)}</span>
                    <span className="agenda-body">
                      <strong>{item.event.title}</strong>
                      <small>
                        {eventKindLabel(item.event.kind)}
                        {item.event.endsAt ? ` · until ${timeOf(item.event.endsAt)}` : ""}
                        {item.event.location ? ` · ${item.event.location}` : ""}
                      </small>
                      {prospectById(item.event.prospectId) && (
                        <ProspectChip prospect={prospectById(item.event.prospectId)!} onOpen={onOpenProspect} />
                      )}
                    </span>
                    <Badge tone={`ev-${item.event.kind}`}>{eventKindLabel(item.event.kind)}</Badge>
                  </button>
                </li>
              ) : (
                <li key={`t${item.task.id}`}>
                  <div className="agenda-item is-task">
                    <span className="agenda-time">Due</span>
                    <span className="agenda-body">
                      <strong>{item.task.title}</strong>
                      <small>Task{item.task.details ? ` · ${item.task.details}` : ""}</small>
                      {prospectById(item.task.prospectId) && (
                        <ProspectChip prospect={prospectById(item.task.prospectId)!} onOpen={onOpenProspect} />
                      )}
                    </span>
                    <Badge tone="task">Task</Badge>
                  </div>
                </li>
              ),
            )}
            {!agenda.length && (
              <li className="empty-row">Double-click a day, or use + to add something here.</li>
            )}
          </ol>

          {upcoming.length > 0 && (
            <div className="agenda-upcoming">
              <label>Coming up</label>
              <ul className="plain-list">
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <button className="text-btn" onClick={() => onEditEvent(event)}>
                      {new Date(event.startsAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                      {" · "}
                      {event.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {pendingMove && (
        <RescheduleConfirm
          event={pendingMove.event}
          to={pendingMove.to}
          busy={moving}
          onCancel={() => setPendingMove(null)}
          onConfirm={() => void confirmMove()}
        />
      )}
    </>
  );
}

function RescheduleConfirm({
  event,
  to,
  busy,
  onCancel,
  onConfirm,
}: {
  event: CalendarEvent;
  to: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal labelledBy="reschedule-title" onClose={onCancel}>
      <div className="drawer-head">
        <div>
          <p className="eyebrow">Reschedule</p>
          <h2 id="reschedule-title">Move "{event.title}"?</h2>
        </div>
        <button className="close-btn" onClick={onCancel} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>
      <div className="reschedule-summary">
        <div>
          <label>From</label>
          <p>{whenOf(event.startsAt)}</p>
        </div>
        <Icon name="arrow" size={16} />
        <div>
          <label>To</label>
          <p>{whenOf(to)}</p>
        </div>
      </div>
      <p className="form-note">
        Same time of day{event.endsAt ? " and length" : ""}. Open the event afterwards if the time
        needs to change too.{event.prospectId ? " This will be noted on the prospect's timeline." : ""}
      </p>
      <div className="form-actions">
        <button className="button secondary" onClick={onCancel} disabled={busy}>
          Keep it
        </button>
        <button className="button primary" onClick={onConfirm} disabled={busy} autoFocus>
          <Icon name="calendar" size={15} /> Move it
        </button>
      </div>
    </Modal>
  );
}

function ProspectChip({ prospect, onOpen }: { prospect: Prospect; onOpen: (p: Prospect) => void }) {
  return (
    <span
      className="agenda-prospect"
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(prospect);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          onOpen(prospect);
        }
      }}
    >
      <Avatar initials={prospect.initials} tone={prospect.tone} />
      {prospect.name}
    </span>
  );
}
