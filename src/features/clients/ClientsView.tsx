import { Avatar, Badge, Icon } from "../../components/ui";
import type { Prospect } from "../../types";
import { formatValue } from "../../types";
import { categoryLabel } from "../../lib/discovery";

export function ClientsView({
  prospects,
  currencyCode,
  onOpen,
  onNavigate,
}: {
  prospects: Prospect[];
  currencyCode: string;
  onOpen: (prospect: Prospect) => void;
  onNavigate: (page: string) => void;
}) {
  const clients = prospects.filter((prospect) => prospect.stage === "Won");

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Relationships</p>
          <h1>Clients</h1>
          <p className="heading-sub">
            Your active relationships and the work attached to them.
          </p>
        </div>
        <button className="button secondary" onClick={() => onNavigate("Pipeline")}>
          <Icon name="funnel" size={15} />
          View pipeline
        </button>
      </section>

      {clients.length ? (
        <section className="panel client-list">
          {clients.map((client) => (
            <article className="client-item" key={client.id}>
              <Avatar initials={client.initials} tone={client.tone} />
              <div>
                <h2>{client.name}</h2>
                <p>
                  {client.service || categoryLabel(client.category)} ·{" "}
                  {formatValue(client.value, currencyCode)}
                </p>
              </div>
              <Badge tone="green">Active</Badge>
              <button className="button secondary" onClick={() => onOpen(client)}>
                Open history
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel empty-client">
          <div className="empty-illustration">
            <Icon name="briefcase" size={20} />
          </div>
          <h2>Your first client will land here</h2>
          <p>
            Move a prospect to Won in the pipeline and LifeDesk keeps the whole
            relationship history — notes, stage changes, and activity — attached to it.
          </p>
          <button className="button secondary" onClick={() => onNavigate("Pipeline")}>
            Open pipeline
          </button>
        </section>
      )}
    </>
  );
}
