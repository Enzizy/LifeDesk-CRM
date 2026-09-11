import { deleteTask, setTaskDone } from "../../lib/records";
import { Badge, Icon } from "../../components/ui";
import type { Notify } from "../../components/ui";
import type { Prospect, Task } from "../../types";
import { plural } from "../../types";

/** "Today", "Tomorrow", "Yesterday", "Mon 14 Sep", or "3 days overdue". */
function describeDue(due: string, done: boolean): string {
  if (!due) return "";
  const target = new Date(`${due}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return done ? "Yesterday" : "1 day overdue";
  if (diff < 0 && !done) return `${-diff} days overdue`;
  return target.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

type Group = { key: string; label: string; tone: string; tasks: Task[] };

/**
 * Groups by due date, which the spec asks for and the previous build never did:
 * `due` was captured by the form and then only ever shown as free text.
 */
function groupTasks(tasks: Task[]): Group[] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const endOfToday = today.getTime();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const open = tasks.filter((task) => !task.done);
  const overdue: Task[] = [];
  const dueToday: Task[] = [];
  const upcoming: Task[] = [];
  const someday: Task[] = [];

  for (const task of open) {
    if (!task.due) {
      someday.push(task);
      continue;
    }
    const due = new Date(`${task.due}T23:59:59`).getTime();
    if (due < startOfToday.getTime()) overdue.push(task);
    else if (due <= endOfToday) dueToday.push(task);
    else upcoming.push(task);
  }

  return [
    { key: "overdue", label: "Overdue", tone: "amber", tasks: overdue },
    { key: "today", label: "Today", tone: "purple", tasks: dueToday },
    { key: "upcoming", label: "Upcoming", tone: "neutral", tasks: upcoming },
    { key: "someday", label: "No due date", tone: "neutral", tasks: someday },
    {
      key: "done",
      label: "Completed",
      tone: "green",
      tasks: tasks.filter((task) => task.done),
    },
  ].filter((group) => group.tasks.length > 0);
}

export function TasksView({
  tasks,
  prospects,
  notify,
  onAddTask,
  onChanged,
}: {
  tasks: Task[];
  prospects: Prospect[];
  notify: Notify;
  onAddTask: () => void;
  onChanged: () => Promise<void>;
}) {
  const groups = groupTasks(tasks);
  const open = tasks.filter((task) => !task.done).length;
  const nameFor = (id: number | null) =>
    id ? prospects.find((prospect) => prospect.id === id)?.name : undefined;

  const toggle = (task: Task) => {
    void setTaskDone(task.id, !task.done)
      .then(onChanged)
      .catch(() => notify("The task could not be updated.", undefined, "error"));
  };

  const remove = (task: Task) => {
    void deleteTask(task.id)
      .then(onChanged)
      .then(() => notify("Task deleted"))
      .catch(() => notify("The task could not be deleted.", undefined, "error"));
  };

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h1>Tasks</h1>
        </div>
        <button className="button primary" onClick={onAddTask}>
          <Icon name="plus" size={15} />
          Add task
        </button>
      </section>

      <div className="tasks-grid">
      <section className="panel task-page-panel">
        <div className="panel-head">
          <div>
            <h2>All tasks</h2>
            <p>{plural(open, "task")} still to do.</p>
          </div>
        </div>

        {groups.map((group) => (
          <div className="task-group" key={group.key}>
            <div className="task-group-head">
              <Badge tone={group.tone}>{group.label}</Badge>
              <span>{group.tasks.length}</span>
            </div>
            <div className="task-page-list">
              {group.tasks.map((task) => {
                const linked = nameFor(task.prospectId);
                return (
                  <div
                    key={task.id}
                    className={`task-page-row ${task.done ? "done" : ""}`}
                  >
                    <button
                      className="task-check"
                      aria-label={`${task.done ? "Reopen" : "Complete"} ${task.title}`}
                      aria-pressed={task.done}
                      onClick={() => toggle(task)}
                    >
                      {task.done && <Icon name="check" size={12} />}
                    </button>
                    <span>
                      <strong>{task.title}</strong>
                      <small>
                        {[describeDue(task.due, task.done) || null, linked || null, task.details || null]
                          .filter(Boolean)
                          .join(" · ") || "Personal"}
                      </small>
                    </span>
                    <button
                      className="more-btn"
                      aria-label={`Delete ${task.title}`}
                      onClick={() => remove(task)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!tasks.length && (
          <div className="empty-state task-page-empty">
            <span className="move-icon">
              <Icon name="check" size={16} />
            </span>
            <strong>Nothing to do yet</strong>
            <small>Add a task when you have a follow-up or reminder.</small>
            <button className="button secondary" onClick={onAddTask}>
              Add task
            </button>
          </div>
        )}
      </section>

      <aside className="panel tasks-overview">
        <div className="panel-head">
          <div>
            <h2>At a glance</h2>
          </div>
        </div>
        <ul className="overview-list">
          {groups
            .filter((group) => group.key !== "done")
            .map((group) => (
              <li key={group.key}>
                <Badge tone={group.tone}>{group.label}</Badge>
                <strong>{group.tasks.length}</strong>
              </li>
            ))}
          {!open && <li className="empty-row">Nothing open. Enjoy it.</li>}
        </ul>
        <div className="overview-linked">
          <label>Linked to prospects</label>
          {tasks.filter((task) => !task.done && task.prospectId).length ? (
            <ul className="plain-list">
              {[...new Set(tasks.filter((task) => !task.done && task.prospectId).map((task) => task.prospectId))]
                .map((id) => nameFor(id))
                .filter(Boolean)
                .slice(0, 6)
                .map((name) => (
                  <li key={name}>{name}</li>
                ))}
            </ul>
          ) : (
            <p className="empty-row">No open tasks are tied to a prospect yet.</p>
          )}
        </div>
        <button className="button secondary" onClick={onAddTask}>
          <Icon name="plus" size={15} /> Add task
        </button>
      </aside>
      </div>
    </>
  );
}
