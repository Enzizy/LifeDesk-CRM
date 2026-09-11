import { useState } from "react";
import { signOut } from "./lib/cloud";
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
import { SettingsDialog } from "./features/settings/SettingsDialog";
import { Avatar, Icon, Spinner, Toast, useToast } from "./components/ui";
import type { Candidate, Prospect } from "./types";
import { initialsFor } from "./types";

const PAGES = ["Home", "Discover", "Prospects", "Pipeline", "Clients", "Tasks"] as const;
const NAV_ICONS: Record<string, string> = {
  Home: "home",
  Discover: "search",
  Prospects: "users",
  Pipeline: "funnel",
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
  previewOpen?: { prospect?: Prospect; candidate?: Candidate };
}) {
  const { toast, notify, dismiss } = useToast();
  const [page, setPage] = useState<string>(initialPage);
  const [discoverSeed, setDiscoverSeed] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(previewOpen?.candidate ?? null);
  const [prospect, setProspect] = useState<Prospect | null>(previewOpen?.prospect ?? null);
  const [qualifyOnOpen, setQualifyOnOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [showProspectForm, setShowProspectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
    refreshCandidates,
    setSettings,
  } = workspace;

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
          currencyCode={settings.currencyCode}
          qualifyOnOpen={qualifyOnOpen}
          notify={notify}
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
