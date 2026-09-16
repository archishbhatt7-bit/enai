type BrandMarkProps = {
  className?: string;
  tone?: "ink" | "copper" | "paper";
  withWordmark?: boolean;
};

/**
 * The eNai mark is a small appointment "slot" cut into a lowercase n.
 * It intentionally avoids the category-default scissors icon so it remains
 * recognisable at favicon, app-icon, and storefront-badge sizes.
 */
export default function BrandMark({
  className = "",
  tone = "ink",
  withWordmark = false,
}: BrandMarkProps) {
  const tones = {
    ink: "bg-[#24201d] text-[#f7f2eb]",
    copper: "bg-[#b85434] text-white",
    paper: "bg-[#f7f2eb] text-[#24201d] border border-[#ded5cb]",
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`} aria-hidden="true">
        <svg viewBox="0 0 32 32" className="h-5 w-5 fill-none" stroke="currentColor" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 24V13.5c0-2.5 1.9-4.5 4.4-4.5 2.7 0 4.6 2 4.6 4.8V24" />
          <path d="M17 14c0-3 1.8-5 4.1-5 2.2 0 3.9 1.6 3.9 3.8" />
          <path d="M21 18.5h4" />
        </svg>
      </span>
      {withWordmark && <span className="font-semibold tracking-[-0.045em] text-[#24201d]">eNai</span>}
    </div>
  );
}
