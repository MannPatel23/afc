const VILLAGES = [
  "Vaso",
  "Rampur",
  "Gangapur",
  "Deva",
  "Shreejipura",
  "Bamroli",
  "Pij",
  "Palana",
  "Dantali",
  "Shiholdi",
  "Alindra",
]

interface DeliveryAreasMarqueeProps {
  /** "band" — full-bleed strip for the homepage. "card" — rounded box for use inside a boxed layout like the About page. */
  variant?: "band" | "card"
}

export default function DeliveryAreasMarquee({
  variant = "band",
}: DeliveryAreasMarqueeProps) {
  const items = [...VILLAGES, ...VILLAGES]

  const track = (
    <>
      <p className="sr-only">
        We currently deliver to: {VILLAGES.join(", ")}. More villages coming
        soon — we&apos;re expanding every week.
      </p>

      <div className="flex items-center gap-3 mb-5">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.1em] px-3 py-1 rounded-full shrink-0"
          style={{ background: "var(--color-brand)", color: "var(--color-cream)" }}
        >
          Now delivering
        </span>
        <p className="font-sans text-xs sm:text-sm text-muted">
          More villages coming soon — we&apos;re expanding every week.
        </p>
      </div>

      <div
        className="afc-scrollbar-hide afc-marquee-viewport overflow-hidden"
        aria-hidden="true"
      >
        <ul className="afc-marquee afc-motion-safe flex w-max items-center gap-x-10 sm:gap-x-14">
          {items.map((village, i) => (
            <li
              key={`${village}-${i}`}
              className="flex items-center gap-x-3 shrink-0 font-serif text-lg sm:text-xl text-dark whitespace-nowrap"
            >
              {village}
              <span aria-hidden="true" className="text-faint">
                •
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )

  if (variant === "card") {
    return (
      <div
        className="rounded-lg p-5 sm:p-6 overflow-hidden"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
      >
        {track}
      </div>
    )
  }

  return (
    <section
      className="border-y border-border overflow-hidden"
      style={{ background: "var(--color-card)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">{track}</div>
    </section>
  )
}
