import { useState } from "react";
import { signOut } from "./lib/cloud";
import { rescheduleEvent } from "./lib/records";
import { useWorkspace } from "./hooks/useWorkspace";
import type { Workspace as WorkspaceData } from "./hooks/useWorkspace";
import { AuthGate, useSession } from "./features/auth/AuthGate";
import { Home } from "./features/home/Home";
import { DiscoverView } from "./features/discovery/DiscoverView";
import { CandidateDrawer } from "./features/discovery/CandidateDrawer";
import { ProspectsView } from "./features/prospects/ProspectsView";
import { ProspectDrawer } from "./features/prospects/ProspectDrawer";
import { ProspectForm } from "./features/prospects/ProspectForm";
import { PipelineView } from "./features/pipeline/PipelineView";
import { ClientsView } from "./features/clients/ClientsView";
import { TasksView } from "./features/tasks/TasksView";
import { TaskForm } from "./features/tasks/TaskForm";
import { CalendarView } from "./features/calendar/CalendarView";
import { EventForm } from "./features/calendar/EventForm";
import { SettingsDialog } from "./features/settings/SettingsDialog";
import { Avatar, Icon, Spinner, Toast, useToast } from "./components/ui";
import type { CalendarEvent, Candidate, Prospect } from "./types";
import { initialsFor } from "./types";

const PAGES = ["Home", "Discover", "Prospects", "Pipeline", "Calendar", "Clients", "Tasks"] as const;
const NAV_ICONS: Record<string, string> = {
  Home: "home",
  Discover: "search",
  Prospects: "users",
  Pipeline: "funnel",
  Calendar: "calendar",
  Clients: "briefcase",
  Tasks: "check",
};

export default function App() {
  const { session, ready, recovering, finishRecovery } = useSession();
  return (
    <AuthGate session={session} ready={ready} recovering={recovering} onRecovered={finishRecovery}>
      <LiveWorkspace email={session?.user.email ?? ""} />
    </AuthGate>
  );
}

function LiveWorkspace({ email }: { email: string }) {
  const workspace = useWorkspace(true);
  return <Workspace email={email} workspace={workspace} />;
}

/**
 * The shell, given its data. Production wraps it in LiveWorkspace; the dev
 * preview (src/dev) feeds it fixtures so every screen can be rendered and
 * screenshotted without a session or a backend.
 */
export function Workspace({
  email,
  workspace,
  initialPage = "Home",
  previewOpen,
}: {
  email: string;
  workspace: WorkspaceData;
  initialPage?: string;
  /** Dev preview only: start with a drawer already open. */
  previewOpen?: {
    prospect?: Prospect;
    candidate?: Candidate;
    taskForm?: boolean;
    prospectForm?: boolean;
    settings?: boolean;
    eventForm?: boolean;
  };
}) {
  const { toast, notify, dismiss } = useToast();
  const [page, setPage] = useState<string>(initialPage);
  const [discoverSeed, setDiscoverSeed] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(previewOpen?.candidate ?? null);
  const [prospect, setProspect] = useState<Prospect | null>(previewOpen?.prospect ?? null);
  const [qualifyOnOpen, setQualifyOnOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [showProspectForm, setShowProspectForm] = useState(Boolean(previewOpen?.prospectForm));
  const [showTaskForm, setShowTaskForm] = useState(Boolean(previewOpen?.taskForm));
  const [showSettings, setShowSettings] = useState(Boolean(previewOpen?.settings));
  // Event form: null = closed; otherwise either an event to edit or defaults
  // for a new one (a start time, and optionally the prospect it is about).
  const [eventForm, setEventForm] = useState<
    null | { event: CalendarEvent } | { start: string; prospectId?: number }
  >(previewOpen?.eventForm ? { start: new Date().toISOString() } : null);

  const {
    prospects,
    tasks,
    candidates,
    settings,
    loading,
    error,
    refresh,
    refreshProspects,
    refreshTasks,
    refreshEvents,
    refreshCandidates,
    setSettings,
  } = workspace;
  const events = workspace.events;

  // The open drawer must follow the refreshed record, or an edit or a
  // qualification made from inside it would leave stale values on screen.
  const openProspect = prospect
    ? prospects.find((item) => item.id === prospect.id) ?? prospect
    : null;

  const openProspectDrawer = (next: Prospect, qualify = false) => {
    setCandidate(null);
    setQualifyOnOpen(qualify);
    setProspect(next);
  };

  const startDiscover = (command: string) => {
    setDiscoverSeed(command);
    setPage("Discover");
  };

  const navigate = (next: string) => {
    if (next !== "Discover") setDiscoverSeed(null);
    setPage(next);
  };

  return (
    <div className="app-shell">
      <aside className="tool-rail">
        <button className="rail-logo" onClick={() => navigate("Home")} aria-label="LifeDesk home">
          <Icon name="spark" size={18} />
        </button>
        <div className="rail-nav">
          {PAGES.map((item) => (
            <button
              key={item}
              className={page === item ? "active" : ""}
              onClick={() => navigate(item)}
              aria-label={item}
              title={item}
            >
              <Icon name={NAV_ICONS[item]} size={18} />
            </button>
          ))}
        </div>
        <button className="rail-bottom" onClick={() => setShowSettings(true)} aria-label="Settings">
          <Icon name="settings" size={18} />
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="top-brand">
            <Icon name="briefcase" size={21} />
            LifeDesk<span> / personal</span>
          </div>
          <nav className="top-nav">
            {PAGES.map((item) => (
              <button key={item} className={page === item ? "active" : ""} onClick={() => navigate(item)}>
                {item}
                {item === "Discover" && candidates.length > 0 && (
                  <span className="nav-count">{candidates.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="top-actions">
            <span className="demo-label">{loading ? "Syncing…" : "Saved to your account"}</span>
            <button
              className="round-action"
              onClick={() => {
                void signOut().catch(() => notify("Sign out failed.", undefined, "error"));
              }}
              aria-label="Sign out"
              title={`Sign out of ${email}`}
            >
              <Icon name="logout" size={15} />
            </button>
            <button
              className="avatar-button"
              onClick={() => setShowSettings(true)}
              aria-label="Workspace settings"
              title={`${email} · settings`}
            >
              <Avatar initials={initialsFor(email.replace(/@.*/, ""))} tone="navy" />
            </button>
          </div>
        </header>

        <div className="content-wrap">
          {error && (
            <div className="storage-warning" role="status">
              {error} <button onClick={() => void refresh()}>Retry</button>
            </div>
          )}

          {loading && !prospects.length && !candidates.length ? (
            <div className="empty-state">
              <Spinner />
            </div>
          ) : (
            <>
              {page === "Home" && (
                <Home
                  prospects={prospects}
                  tasks={tasks}
                  events={events}
                  candidates={candidates}
                  settings={settings}
                  notify={notify}
                  onReviewCandidate={setCandidate}
                  onOpenProspect={(next) => openProspectDrawer(next)}
                  onNavigate={navigate}
                  onAddProspect={() => setShowProspectForm(true)}
                  onAddTask={() => setShowTaskForm(true)}
                  onDiscover={startDiscover}
                  onRefreshTasks={refreshTasks}
                  onEditEvent={(event) => setEventForm({ event })}
                />
              )}
              {page === "Discover" && (
                <DiscoverView
                  candidates={candidates}
                  settings={settings}
                  seed={discoverSeed}
                  notify={notify}
                  onReview={setCandidate}
                  onApprove={setCandidate}
                  onRefreshCandidates={refreshCandidates}
                />
              )}
              {page === "Prospects" && (
                <ProspectsView
                  prospects={prospects}
                  currencyCode={settings.currencyCode}
                  onOpen={(next) => openProspectDrawer(next)}
                  onAddProspect={() => setShowProspectForm(true)}
                />
              )}
              {page === "Pipeline" && (
                <PipelineView
                  prospects={prospects}
                  currencyCode={settings.currencyCode}
                  notify={notify}
                  onOpen={(next) => openProspectDrawer(next)}
                  onChanged={refreshProspects}
                />
              )}
              {page === "Calendar" && (
                <CalendarView
                  events={events}
                  tasks={tasks}
                  prospects={prospects}
                  onAddEvent={(start) => setEventForm({ start })}
                  onEditEvent={(event) => setEventForm({ event })}
                  onReschedule={async (event, to) => {
                    const name = prospects.find((p) => p.id === event.prospectId)?.name;
                    try {
                      await rescheduleEvent(event, to, name);
                      await refreshEvents();
                      notify(`Moved to ${new Date(to).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}`, {
                        label: "Undo",
                        onClick: () => {
                          void rescheduleEvent({ ...event, startsAt: to, endsAt: event.endsAt ? new Date(new Date(to).getTime() + (new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime())).toISOString() : "" }, event.startsAt, name)
                            .then(refreshEvents)
                            .catch(() => notify("That could not be undone.", undefined, "error"));
                        },
                      });
                    } catch (error) {
                      notify(error instanceof Error ? error.message : "The event could not be moved.", undefined, "error");
                    }
                  }}
                  onOpenProspect={(next) => openProspectDrawer(next)}
                />
              )}
              {page === "Clients" && (
                <ClientsView
                  prospects={prospects}
                  currencyCode={settings.currencyCode}
                  onOpen={(next) => openProspectDrawer(next)}
                  onNavigate={navigate}
                />
              )}
              {page === "Tasks" && (
                <TasksView
                  tasks={tasks}
                  prospects={prospects}
                  notify={notify}
                  onAddTask={() => setShowTaskForm(true)}
                  onChanged={refreshTasks}
                />
              )}
            </>
          )}
        </div>
      </main>

      {candidate && (
        <CandidateDrawer
          candidate={candidate}
          notify={notify}
          onClose={() => setCandidate(null)}
          onApproved={(created) => {
            void refreshProspects();
            openProspectDrawer(created, true);
          }}
          onChanged={refreshCandidates}
        />
      )}

      {openProspect && (
        <ProspectDrawer
          prospect={openProspect}
          events={events.filter((event) => event.prospectId === openProspect.id)}
          currencyCode={settings.currencyCode}
          qualifyOnOpen={qualifyOnOpen}
          notify={notify}
          onSchedule={() =>
            setEventForm({
              start: new Date(Date.now() + 86_400_000).toISOString().slice(0, 11) + "10:00:00.000Z",
              prospectId: openProspect.id,
            })
          }
          onEditEvent={(event) => setEventForm({ event })}
          onClose={() => {
            setProspect(null);
            setQualifyOnOpen(false);
          }}
          onEdit={() => {
            setEditing(openProspect);
            setProspect(null);
            setShowProspectForm(true);
          }}
          onChanged={refreshProspects}
        />
      )}

      {showProspectForm && (
        <ProspectForm
          initial={editing}
          notify={notify}
          onClose={() => {
            setShowProspectForm(false);
            setEditing(null);
          }}
          onSaved={refreshProspects}
        />
      )}

      {showTaskForm && (
        <TaskForm
          prospects={prospects}
          notify={notify}
          onClose={() => setShowTaskForm(false)}
          onSaved={refreshTasks}
        />
      )}

      {eventForm && (
        <EventForm
          initial={"event" in eventForm ? eventForm.event : null}
          prospects={prospects}
          defaultStart={"start" in eventForm ? eventForm.start : undefined}
          defaultProspectId={"prospectId" in eventForm ? eventForm.prospectId ?? null : null}
          notify={notify}
          onClose={() => setEventForm(null)}
          onSaved={refreshEvents}
        />
      )}

      {showSettings && (
        <SettingsDialog
          settings={settings}
          email={email}
          notify={notify}
          onClose={() => setShowSettings(false)}
          onSaved={setSettings}
          onImported={refresh}
        />
      )}

      {toast && <Toast toast={toast} onDismiss={dismiss} />}
    </div>
  );
}
