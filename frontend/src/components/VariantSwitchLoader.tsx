import AppLoader from "./AppLoader";
import VariantQuestionLoader from "./VariantQuestionLoader";
import type { VariantSwitchMode } from "../utils/variantLabels";

type Props = {
  mode: VariantSwitchMode;
  label?: string;
};

export default function VariantSwitchLoader({ mode, label = "" }: Props) {
  if (mode === "ai") {
    return <VariantQuestionLoader label={label} />;
  }
  return (
    <div className="variant-plain-loader">
      <AppLoader
        variant="compact"
        mode="practice"
        icon="description"
        label="Loading original question…"
      />
    </div>
  );
}
