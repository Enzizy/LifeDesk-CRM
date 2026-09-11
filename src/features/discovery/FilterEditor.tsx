import { useState } from "react";
import {
  CATEGORY_GROUPS,
  DEFAULT_RADIUS_METERS,
  MAX_RADIUS_METERS,
  MAX_RESULT_LIMIT,
  categoryLabel,
} from "../../lib/discovery";
import type { DiscoveryFilters } from "../../lib/discovery";
import { Icon } from "../../components/ui";

export function FilterEditor({
  filters,
  onChange,
}: {
  filters: DiscoveryFilters;
  onChange: (filters: DiscoveryFilters) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => {
    // Open whichever groups already have a selection, so an interpreted command
    // shows its choices without the user hunting for them.
    const selected = new Set(filters.categories);
    return new Set(
      CATEGORY_GROUPS.filter(
        (group) =>
          selected.has(group.parent) || group.items.some((item) => selected.has(item.id)),
      ).map((group) => group.label),
    );
  });
  const [search, setSearch] = useState("");

  const selected = new Set(filters.categories);
  const setCategories = (categories: string[]) => onChange({ ...filters, categories });
  const toggle = (id: string) =>
    setCategories(
      selected.has(id)
        ? filters.categories.filter((entry) => entry !== id)
        : [...filters.categories, id],
    );

  const toggleGroup = (label: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const query = search.trim().toLowerCase();
  const visibleGroups = query
    ? CATEGORY_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(query)),
      })).filter((group) => group.items.length)
    : CATEGORY_GROUPS;

  return (
    <div className="filter-editor">
      <div className="form-grid">
        <label>
          Location
          <input
            value={filters.location}
            onChange={(event) => onChange({ ...filters, location: event.target.value })}
            placeholder="Mactan, Cebu"
          />
        </label>
        <label>
          How many results
          <input
            type="number"
            min="1"
            max={MAX_RESULT_LIMIT}
            value={filters.limit}
            onChange={(event) =>
              onChange({
                ...filters,
                limit: Math.min(MAX_RESULT_LIMIT, Math.max(1, Number(event.target.value) || 1)),
              })
            }
          />
        </label>
      </div>

      <label>
        Search radius · {(filters.radiusMeters / 1000).toFixed(1)} km
        <input
          type="range"
          min="500"
          max={MAX_RADIUS_METERS}
          step="500"
          value={filters.radiusMeters || DEFAULT_RADIUS_METERS}
          onChange={(event) =>
            onChange({ ...filters, radiusMeters: Number(event.target.value) })
          }
        />
      </label>

      <label>
        Business name contains (optional)
        <input
          value={filters.nameContains ?? ""}
          onChange={(event) =>
            onChange({ ...filters, nameContains: event.target.value || undefined })
          }
          placeholder="Only when you're looking for a specific place"
        />
      </label>

      <div className="drawer-block">
        <div className="filter-cat-head">
          <label>
            Business types
            {selected.size > 0 && <span className="filter-count">{selected.size} selected</span>}
          </label>
          <div className="filter-cat-tools">
            <div className="search-box compact">
              <Icon name="search" size={13} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter types"
                aria-label="Filter business types"
              />
            </div>
            {selected.size > 0 && (
              <button type="button" className="text-btn" onClick={() => setCategories([])}>
                Clear
              </button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="category-grid selected-strip">
            {filters.categories.map((id) => (
              <button
                key={id}
                type="button"
                className="category-chip selected"
                onClick={() => toggle(id)}
                aria-label={`Remove ${categoryLabel(id)}`}
              >
                {categoryLabel(id)} <Icon name="close" size={11} />
              </button>
            ))}
          </div>
        )}

        <div className="category-groups">
          {visibleGroups.map((group) => {
            const isOpen = query ? true : open.has(group.label);
            const inGroup = group.items.filter((item) => selected.has(item.id)).length;
            const parentSelected = selected.has(group.parent);
            return (
              <section className="category-group" key={group.label}>
                <header>
                  <button
                    type="button"
                    className="category-group-toggle"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={isOpen}
                  >
                    <Icon name="arrow" size={12} />
                    <strong>{group.label}</strong>
                    {inGroup > 0 && <span className="filter-count">{inGroup}</span>}
                  </button>
                  <button
                    type="button"
                    className={parentSelected ? "category-chip selected small" : "category-chip small"}
                    onClick={() => toggle(group.parent)}
                    aria-pressed={parentSelected}
                    title={`Search every ${group.label.toLowerCase()} type at once`}
                  >
                    All
                  </button>
                </header>
                {isOpen && (
                  <div className="category-grid">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={selected.has(item.id) ? "category-chip selected" : "category-chip"}
                        onClick={() => toggle(item.id)}
                        aria-pressed={selected.has(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          {!visibleGroups.length && (
            <p className="empty-row">No business types match "{search}".</p>
          )}
        </div>
      </div>
    </div>
  );
}
