import { ReactNode } from "react";

/** Constrains UI to Stitch mobile frame (~390px) so desktop matches the export mocks. */
export default function StitchViewport({ children }: { children: ReactNode }) {
  return (
    <div className="stitch-viewport-root min-h-[100dvh] w-full flex justify-center bg-[#0a0a14]">
      <div className="stitch-viewport w-full max-w-[430px] min-h-[100dvh] relative flex flex-col bg-background shadow-2xl shadow-black/50 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
