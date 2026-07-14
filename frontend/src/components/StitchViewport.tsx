import { ReactNode } from "react";

/**
 * Full-width app canvas on all breakpoints (no centered phone frame).
 */
export default function StitchViewport({ children }: { children: ReactNode }) {
  return (
    <div className="stitch-viewport-root min-h-[100dvh] w-full bg-background">
      <div className="stitch-viewport w-full min-h-[100dvh] relative flex flex-col bg-background overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
