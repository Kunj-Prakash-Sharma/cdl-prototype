import { Gift } from "lucide-react";
import { CopyCode } from "@/components/site/copy-code";
import { sampleOffer } from "@/content/samples";

// V5 offer bar: a near-black (ink) strip above the header. The offer is sample content (D82): no real coupon exists yet, and the
// price at checkout always comes from the server. Set `sampleOffer` to null to hide the bar.
export function OfferBar() {
  if (!sampleOffer) return null;
  const { text, highlight, code, ends } = sampleOffer;
  return (
    <div className="bg-ink text-white print:hidden" data-testid="offer-bar">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2.5 px-4.5 py-2.5 text-center text-sm font-semibold sm:px-6 lg:px-8">
        <Gift className="size-4.5 shrink-0 text-brand-200" aria-hidden />
        <span>
          {text} <b className="text-brand-200">{highlight}</b> with code
        </span>
        <CopyCode code={code} note={ends} />
      </div>
    </div>
  );
}
