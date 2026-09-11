// Design preview: renders the real shell with fixture data and no backend.
//
// Only reachable in development with `?preview=<page>` in the URL — main.tsx
// never mounts this in a production build. It exists so screens can be
// reviewed and screenshotted without a session. Mutations are no-ops.
//
//   ?preview=home | discover | prospects | pipeline | clients | tasks
//   ?preview=signin
//   ?preview=prospect       (prospect drawer over the Prospects page)
//   ?preview=candidate      (candidate drawer over the Discover page)
//   &empty=1                (same page with no data — the empty states)

import { Workspace } from "../App";
import { SignIn } from "../features/auth/AuthGate";
import type { Workspace as WorkspaceData } from "../hooks/useWorkspace";
import * as fixtures from "./fixtures";

const noop = async () => {};

export function PreviewApp() {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("preview") ?? "home";
  const empty = params.has("empty");

  if (target === "signin") return <SignIn />;

  const workspace: WorkspaceData = {
    prospects: empty ? [] : fixtures.prospects,
    tasks: empty ? [] : fixtures.tasks,
    candidates: empty ? [] : fixtures.candidates,
    settings: fixtures.settings,
    loading: false,
    error: "",
    refresh: noop,
    refreshProspects: noop,
    refreshTasks: noop,
    refreshCandidates: noop,
    setSettings: () => {},
  };

  const pageFor: Record<string, string> = {
    home: "Home",
    discover: "Discover",
    prospects: "Prospects",
    pipeline: "Pipeline",
    clients: "Clients",
    tasks: "Tasks",
    prospect: "Prospects",
    candidate: "Discover",
  };

  return (
    <Workspace
      email="rey@joynoinc.com"
      workspace={workspace}
      initialPage={pageFor[target] ?? "Home"}
      previewOpen={
        target === "prospect"
          ? { prospect: fixtures.prospects[0] }
          : target === "candidate"
            ? { candidate: fixtures.candidates[0] }
            : undefined
      }
    />
  );
}
