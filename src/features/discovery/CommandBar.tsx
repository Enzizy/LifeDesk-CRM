import { useState } from "react";
import { Icon } from "../../components/ui";

const EXAMPLES = [
  "Beach resorts around Mactan with no website",
  "Dental clinics in Cebu City",
  "Cafés and restaurants near IT Park",
];

/**
 * The Home entry point. It does not call the model itself: it hands the
 * command to the Discover page, which interprets it once and shows the filters
 * with room to edit them. Keeping one code path for interpretation means one
 * place to reason about cost.
 */
export function CommandBar({ onSubmit }: { onSubmit: (command: string) => void }) {
  const [command, setCommand] = useState("");

  const submit = () => {
    const text = command.trim();
    if (!text) return;
    onSubmit(text);
  };

  return (
    <>
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
          onKeyDown={(event) => event.key === "Enter" && submit()}
          placeholder="Describe the businesses you want to work with…"
        />
        <button onClick={submit} disabled={!command.trim()} aria-label="Open in Discover">
          <Icon name="arrow" size={17} />
        </button>
      </div>
      <div className="command-suggestions is-open">
        <span>Try</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            onClick={() => {
              setCommand(example);
              onSubmit(example);
            }}
          >
            {example}
          </button>
        ))}
        <small>Opens Discover · nothing runs until you confirm</small>
      </div>
    </>
  );
}
