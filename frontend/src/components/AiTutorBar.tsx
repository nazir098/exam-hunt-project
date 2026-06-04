export default function AiTutorBar() {
  return (
    <div className="lumina-ai-bar">
      <div className="lumina-ai-bar-inner">
        <button type="button" className="lumina-ai-chip" disabled title="Coming soon">
          <span className="material-symbols-outlined">lightbulb</span>
          <span className="lumina-ai-chip-label">AI Hint</span>
        </button>
        <button type="button" className="lumina-ai-chip" disabled title="Coming soon">
          <span className="material-symbols-outlined">psychology</span>
          <span className="lumina-ai-chip-label">AI Explain</span>
        </button>
        <div className="lumina-ai-input-wrap">
          <input type="text" placeholder="Ask AI a specific doubt about this…" disabled />
          <button type="button" className="lumina-ai-send" disabled aria-label="Send">
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <button type="button" className="lumina-ai-fab md-hidden" disabled aria-label="Chat">
          <span className="material-symbols-outlined">chat</span>
        </button>
      </div>
    </div>
  );
}
