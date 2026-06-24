import { useEffect, useState } from "react";
import AiMarkdown from "./AiMarkdown";
import { useTypewriterText } from "../hooks/useTypewriterText";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

type Props = {
  text: string;
  className?: string;
  /** Animate typing; disable for reduced-motion or instant replay. */
  animate?: boolean;
  onComplete?: () => void;
};

export default function AiStreamingMarkdown({
  text,
  className = "",
  animate: animateProp = true,
  onComplete,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const animate = animateProp && !reducedMotion;
  const { visibleText, complete } = useTypewriterText(text, { enabled: animate });

  useEffect(() => {
    if (complete) {
      onComplete?.();
    }
  }, [complete, onComplete]);

  if (!text.trim()) {
    return null;
  }

  return (
    <div
      className={`ai-streaming-markdown${complete ? "" : " is-streaming"}${className ? ` ${className}` : ""}`}
    >
      {complete ? (
        <AiMarkdown text={text} />
      ) : (
        <p className="ai-streaming-markdown__plain">{visibleText}</p>
      )}
      {!complete && <span className="ai-streaming-markdown__cursor" aria-hidden />}
    </div>
  );
}
