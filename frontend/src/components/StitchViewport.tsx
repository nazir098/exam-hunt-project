import { ReactNode } from "react";

/**
 * Mobile: optional centered frame. Desktop (lg+): full-width website canvas.
 */
export default function StitchViewport({ children }: { children: ReactNode }) {
  return (
    <div className="stitch-viewport-root min-h-[100dvh] w-full bg-[#0a0a14] lg:bg-background">
      <div className="stitch-viewport w-full min-h-[100dvh] relative flex flex-col bg-background overflow-x-hidden max-lg:max-w-[430px] max-lg:mx-auto max-lg:shadow-2xl max-lg:shadow-black/50 lg:max-w-none lg:mx-0 lg:shadow-none">
        {children}
      </div>
    </div>
  );
}
