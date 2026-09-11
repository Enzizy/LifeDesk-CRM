import { useEffect, useRef, useState } from "react";
import { interpretAssistantCommand, runDiscovery } from "../../lib/cloud";
import type { AssistantPreview } from "../../lib/cloud";
import { archiveCandidate, restoreCandidate } from "../../lib/records";
import { contactLine } from "../../lib/mappers";
import { categoryLabel, describeFilters, emptyFilters } from "../../lib/discovery";
import type { DiscoveryFilters } from "../../lib/discovery";
import { FilterEditor } from "./FilterEditor";
import { Avatar, Badge, Icon, Spinner } from "../../components/ui";
import type { Notify } from "../../components/ui";
import type { Candidate, Settings } from "../../types";
import { SOCIAL_LABELS, SOCIAL_NETWORKS, initialsFor, plural, toneFor } from "../../types";

export function DiscoverView({
  candidates,
  settings,
  seed,
  notify,
  onReview,
  onApprove,
  onRefreshCandidates,
}: {
  candidates: Candidate[];
  settings: Settings;
  /** A command typed on Home; interpreted once on arrival. */
  seed: string | null;
  notify: Notify;
  onReview: (candidate: Candidate) => void;
  onApprove: (candidate: Candidate) => void;
  onRefreshCandidates: () => Promise<void>;
}) {
  const [command, setCommand] = useState(seed ?? "");
  const [interpreting, setInterpreting] = useState(false);
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<AssistantPreview | null>(null);
  const [filters, setFilters] = useState<DiscoveryFilters>(() =>
    emptyFilters(settings.defaultLocation, settings.discoveryLimit),
  );
  const [lastRun, setLastRun] = useState<string>("");
  const seededRef = useRef(false);

  const interpret = async (text: string) => {
    if (interpreting || !text.trim()) return;
    setInterpreting(true);
    try {
      const result = await interpretAssistantCommand(text, "Discover", settings.defaultLocation);
      setPreview(result);
      if (result.interpretedFilters) {
        setFilters({
          ...result.interpretedFilters,
          location: result.interpretedFilters.location || settings.defaultLocation,
          limit: result.interpretedFilters.limit || settings.discoveryLimit,
        });
      }
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "The command could not be read.",
        undefined,
        "error",
      );
    } finally {
      setInterpreting(false);
    }
  };

  // Interpret a seeded command exactly once, even under StrictMode's double
  // effect invocation, so it never costs two model calls.
  useEffect(() => {
    if (seed && !seededRef.current) {
      seededRef.current = true;
      void interpret(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    try {
      const result = await runDiscovery(filters, command);
      const found = result.candidates.length;
      const summary = !found && result.skippedDuplicates
        ? `No new businesses — all ${result.skippedDuplicates} were already in your queue.`
        : !found
          ? "No businesses matched those filters. Try a wider radius or more types."
          : `${found} ${found === 1 ? "business" : "businesses"} found near ${result.resolvedLocation}` +
            (result.skippedDuplicates ? ` · ${result.skippedDuplicates} already known` : "");
      setLastRun(summary);
      notify(summary);
      await onRefreshCandidates();
    } catch (error) {
      notify(error instanceof Error ? error.message : "The discovery failed.", undefined, "error");
    } finally {
      setRunning(false);
    }
  };

  const archive = (candidate: Candidate) => {
    void archiveCandidate(candidate.id)
      .then(onRefreshCandidates)
      .then(() =>
        notify(`${candidate.name} archived`, {
          label: "Undo",
          onClick: () => {
            void restoreCandidate(candidate.id).then(onRefreshCandidates);
          },
        }),
      )
      .catch(() => notify("The candidate could not be archived.", undefined, "error"));
  };

  const canRun = !running && filters.location.trim().length > 0 && filters.categories.length > 0;

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Find new business</p>
          <h1>Discover</h1>
          <p className="heading-sub">
            Describe who you want to work with, check the filters, then run it.
          </p>
        </div>
        <div className="heading-meta">
          <span className="meta-pill">
            <Icon name="spark" size={13} /> 2 credits per run · 3,000 free daily
          </span>
        </div>
      </section>

      <section className="panel discover-command">
        <div className="board-search">
          <span className="command-mode">Discover</span>
          <span className="search-spark">
            <Icon name="spark" size={18} />
          </span>
          <input
            id="ai-command"
            aria-label="Describe the businesses you want"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void interpret(command)}
            placeholder="e.g. beach resorts and dive shops around Mactan that don't have a website"
          />
          <button
            className={interpreting ? "is-running" : ""}
            onClick={() => void interpret(command)}
            disabled={interpreting || !command.trim()}
            aria-label="Interpret command"
          >
            {interpreting ? <Spinner /> : <Icon name="arrow" size={17} />}
          </button>
        </div>
        {preview && (
          <div className="discover-preview">
            <span className="insight-icon">
              <Icon name="spark" size={13} />
            </span>
            <div>
              <p>{preview.summary}</p>
              {preview.missingContext && preview.missingContext.length > 0 && (
                <small>Still needed: {preview.missingContext.join(" · ")}</small>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="discover-grid">
        <section className="panel discover-filters">
          <div className="panel-head">
            <div>
              <h2>Filters</h2>
              <p>Edit anything before you run. Nothing is spent until you do.</p>
            </div>
          </div>
          <FilterEditor filters={filters} onChange={setFilters} />
          <div className="discover-run">
            <p className="form-note">
              Will search {describeFilters(filters)}. Costs 2 Geoapify credits of your 3,000
              free daily allowance, however many results come back.
            </p>
            <button className="button primary" onClick={() => void run()} disabled={!canRun}>
              {running ? <Spinner /> : <Icon name="search" size={15} />}
              {running ? "Searching…" : "Run discovery"}
            </button>
            {!filters.categories.length && (
              <small className="source-line">Pick at least one business type.</small>
            )}
          </div>
        </section>

        <section className="panel discover-results">
          <div className="panel-head">
            <div>
              <h2>To review</h2>
              <p>
                {candidates.length
                  ? `${plural(candidates.length, "business", "businesses")} waiting. Approve to save as a prospect and get a tailored draft.`
                  : lastRun || "Results land here after a run."}
              </p>
            </div>
            <Badge tone="purple">{candidates.length}</Badge>
          </div>

          <div className="candidate-list">
            {candidates.map((candidate) => {
              const socials = SOCIAL_NETWORKS.filter((network) => candidate.socials[network]);
              return (
                <article className="candidate-row" key={candidate.id}>
                  <button className="candidate-main" onClick={() => onReview(candidate)}>
                    <Avatar initials={initialsFor(candidate.name)} tone={toneFor(candidate.name)} />
                    <span className="candidate-text">
                      <strong>{candidate.name}</strong>
                      <small>
                        {categoryLabel(candidate.category)}
                        {candidate.location ? ` · ${candidate.location}` : ""}
                      </small>
                    </span>
                  </button>
                  <div className="candidate-facts">
                    <FactPill ok={Boolean(candidate.website)} label="Website" />
                    <FactPill ok={Boolean(candidate.phone)} label="Phone" />
                    <FactPill ok={Boolean(candidate.email)} label="Email" />
                    {socials.length ? (
                      socials.map((network) => (
                        <FactPill key={network} ok label={SOCIAL_LABELS[network]} />
                      ))
                    ) : (
                      <FactPill ok={false} label="Socials" />
                    )}
                  </div>
                  <small className="candidate-contact">{contactLine(candidate)}</small>
                  <div className="candidate-actions">
                    <button
                      className="button ghost small"
                      onClick={() => archive(candidate)}
                      aria-label={`Archive ${candidate.name}`}
                    >
                      Archive
                    </button>
                    <button className="button primary small" onClick={() => onApprove(candidate)}>
                      <Icon name="check" size={13} /> Approve
                    </button>
                  </div>
                </article>
              );
            })}
            {!candidates.length && (
              <div className="empty-state">
                <span className="move-icon">
                  <Icon name="search" size={16} />
                </span>
                <strong>Nothing to review</strong>
                <small>Run a discovery to fill this list.</small>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function FactPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`fact-pill ${ok ? "has" : "missing"}`} title={ok ? `${label} listed` : `No ${label.toLowerCase()} listed`}>
      <Icon name={ok ? "check" : "close"} size={10} />
      {label}
    </span>
  );
}
