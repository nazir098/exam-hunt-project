const LEGEND = [
  { key: "current", label: "Current", hint: "Viewing now" },
  { key: "answered", label: "Answered", hint: "Saved in this test" },
  { key: "visited", label: "Visited", hint: "Opened, not saved" },
  { key: "marked", label: "Flagged", hint: "Mark for review" },
  { key: "unattempted", label: "Not visited", hint: "Not opened yet", wide: true },
] as const;

export default function TestTileLegend() {
  return (
    <section className="test-tile-legend" aria-label="Question tile legend">
      <header className="test-tile-legend__head">
        <span className="material-symbols-outlined" aria-hidden>
          grid_view
        </span>
        <h3 className="test-tile-legend__title">Question tiles</h3>
      </header>
      <ul className="test-tile-legend__grid">
        {LEGEND.map((item) => (
          <li
            key={item.key}
            className={`test-tile-legend__item${"wide" in item && item.wide ? " test-tile-legend__item--wide" : ""}`}
          >
            <span
              className={`test-tile-legend__swatch test-tile-legend__swatch--${item.key}`}
              aria-hidden
            >
              Q
            </span>
            <div className="test-tile-legend__copy">
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
