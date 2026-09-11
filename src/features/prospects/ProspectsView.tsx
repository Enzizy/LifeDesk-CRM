import { useMemo, useState } from "react";
import { Avatar, Badge, Icon } from "../../components/ui";
import type { Prospect } from "../../types";
import { formatValue } from "../../types";
import { categoryLabel } from "../../lib/discovery";

const PAGE_SIZE = 25;
type SortKey = "name" | "stage" | "value" | "created";

export function ProspectsView({
  prospects,
  currencyCode,
  onOpen,
  onAddProspect,
}: {
  prospects: Prospect[];
  currencyCode: string;
  onOpen: (prospect: Prospect) => void;
  onAddProspect: () => void;
}) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [sort, setSort] = useState<SortKey>("created");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    const rows = prospects.filter(
      (prospect) =>
        (stageFilter === "All" || prospect.stage === stageFilter) &&
        `${prospect.name} ${prospect.category} ${prospect.location} ${prospect.service}`
          .toLowerCase()
          .includes(query),
    );
    const order: Record<SortKey, (a: Prospect, b: Prospect) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      stage: (a, b) => a.stage.localeCompare(b.stage),
      value: (a, b) => b.value - a.value,
      created: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return rows.sort(order[sort]);
  }, [prospects, stageFilter, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const setFilter = (next: string) => {
    setStageFilter(next);
    setPage(0);
  };

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Sales workspace</p>
          <h1>Prospects</h1>
        </div>
        <button className="button primary" onClick={onAddProspect}>
          <Icon name="plus" size={15} /> Add prospect
        </button>
      </section>

      <section className="panel table-panel dense">
        <div className="table-toolbar">
          <div className="search-box">
            <Icon name="search" size={15} />
            <input
              placeholder="Search name, category, location, service"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="filter-tabs">
            {["All", "New", "Qualified", "Contacted", "Meeting", "Proposal", "Won"].map(
              (stage) => (
                <button
                  key={stage}
                  className={stageFilter === stage ? "selected" : ""}
                  onClick={() => setFilter(stage)}
                >
                  {stage}
                  {stage !== "All" && (
                    <span className="tab-count">
                      {prospects.filter((p) => p.stage === stage).length}
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
          <select
            className="sort-select"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort prospects"
          >
            <option value="created">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="stage">By stage</option>
            <option value="value">Highest value</option>
          </select>
        </div>

        <div className="table-scroll">
          <table className="dense-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Category</th>
                <th>Stage</th>
                <th>Service</th>
                <th>Gaps</th>
                <th>Next action</th>
                <th className="num">Value</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {visible.map((prospect) => (
                <tr key={prospect.id} onClick={() => onOpen(prospect)} tabIndex={0}
                  onKeyDown={(event) => event.key === "Enter" && onOpen(prospect)}>
                  <td className="cell-business">
                    <Avatar initials={prospect.initials} tone={prospect.tone} />
                    <span>
                      <strong>{prospect.name}</strong>
                      {prospect.location && <small>{prospect.location}</small>}
                    </span>
                  </td>
                  <td className="cell-muted">{prospect.category ? categoryLabel(prospect.category) : "—"}</td>
                  <td>
                    <Badge tone={prospect.stage.toLowerCase()}>{prospect.stage}</Badge>
                  </td>
                  <td className="cell-muted">{prospect.service || "—"}</td>
                  <td className="cell-gaps">
                    {prospect.gaps.length ? (
                      <span title={prospect.gaps.join("\n")}>
                        {prospect.gaps.length} {prospect.gaps.length === 1 ? "gap" : "gaps"}
                      </span>
                    ) : prospect.qualifiedAt ? (
                      <span className="cell-ok">none</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="cell-muted cell-next">{prospect.next || "—"}</td>
                  <td className="num">{formatValue(prospect.value, currencyCode)}</td>
                  <td className="cell-open">
                    <Icon name="arrow" size={13} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length && (
          <div className="empty-state">
            {prospects.length
              ? "No prospects match this filter."
              : "No prospects yet. Run a discovery or add one manually."}
          </div>
        )}

        <div className="table-foot">
          <span>
            {filtered.length === prospects.length
              ? `${prospects.length} prospects`
              : `${filtered.length} of ${prospects.length} prospects`}
          </span>
          {pageCount > 1 && (
            <span className="pager">
              <button onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0}>
                Previous
              </button>
              <span>
                Page {safePage + 1} of {pageCount}
              </span>
              <button
                onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                disabled={safePage >= pageCount - 1}
              >
                Next
              </button>
            </span>
          )}
        </div>
      </section>
    </>
  );
}
