import Link from "next/link"
import { sdk } from "@/lib/medusa"
import PopularDishes from "@/components/PopularDishes"
import HeroPhoto from "@/components/HeroPhoto"
import DeliveryAreasMarquee from "@/components/DeliveryAreasMarquee"

// The landing page rarely changes; cache it like any other marketing page.
export const revalidate = 60

interface ProductVariant {
  id: string
  title: string
  calculated_price?: {
    calculated_amount: number
    currency_code: string
  }
}

interface Product {
  id: string
  title: string
  handle: string | null
  description: string | null
  thumbnail: string | null
  variants: ProductVariant[]
}

async function getPopularProducts(): Promise<Product[]> {
  const regionId = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID
  try {
    const { products } = await sdk.store.product.list({
      limit: 8,
      fields:
        "id,title,handle,description,thumbnail,*variants,+variants.calculated_price",
      ...(regionId ? { region_id: regionId } : {}),
    } as Parameters<typeof sdk.store.product.list>[0])
    return (products as unknown as Product[]) ?? []
  } catch (err) {
    console.error("[home] getPopularProducts error:", err)
    return []
  }
}

export default async function HomePage() {
  const products = await getPopularProducts()
  const heroProduct = products[0]

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-14 sm:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold text-dark leading-[1.1] mb-6">
              It&apos;s not just food,
              <br />
              it&apos;s{" "}
              <span className="italic" style={{ color: "var(--color-brand)" }}>
                home-style
              </span>{" "}
              comfort.
            </h1>
            <p className="font-sans text-base text-muted leading-relaxed max-w-md mb-8">
              Ambica Food Corner brings you fresh, home-cooked meals and
              snacks — made with care, served fast. Order ahead for pickup or
              delivery.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center font-sans font-semibold text-sm text-cream px-7 py-3.5 rounded-full transition-transform active:scale-95 hover:opacity-90"
                style={{ background: "var(--color-brand)" }}
              >
                View menu
              </Link>
              <Link
                href="/find-us"
                className="inline-flex items-center justify-center font-sans font-semibold text-sm text-dark px-7 py-3.5 rounded-full transition-colors hover:bg-card"
                style={{ border: "1px solid var(--color-border-md)" }}
              >
                Find us
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: "var(--color-card)",
                      border: "2px solid var(--color-cream)",
                    }}
                  >
                    <UserIcon />
                  </span>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5" style={{ color: "var(--color-amber)" }} aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} />
                  ))}
                </div>
                <p className="font-sans text-xs text-muted mt-0.5">
                  Loved by regulars at the corner
                </p>
              </div>
            </div>
          </div>

          {/* Right — photo */}
          <div className="relative mx-auto lg:mx-0" style={{ width: 340, height: 340 }}>
            <div
              className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: "var(--color-card)", border: "8px solid var(--color-cream)", boxShadow: "0 24px 60px rgba(46,42,38,0.18)" }}
            >
              {heroProduct?.thumbnail ? (
                <HeroPhoto src={heroProduct.thumbnail} alt={heroProduct.title} />
              ) : (
                <span className="font-serif italic text-faint text-3xl select-none">Ambica</span>
              )}
            </div>

            {/* Floating badge */}
            <div
              className="absolute -top-2 -left-2 sm:top-2 sm:left-2 flex flex-col items-center justify-center text-center rounded-full"
              style={{
                width: 88,
                height: 88,
                background: "var(--color-cream)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 10px 30px rgba(46,42,38,0.15)",
              }}
            >
              <span className="font-serif font-semibold text-sm text-dark leading-none">Fresh</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.05em] text-muted mt-1">Today</span>
            </div>
          </div>
        </div>
      </section>

      <DeliveryAreasMarquee />

      <PopularDishes products={products} />

      {/* Closing CTA */}
      <section
        className="border-t border-border"
        style={{ background: "var(--color-card)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-16 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-dark mb-3">
            Ready when you are.
          </h2>
          <p className="font-sans text-sm text-muted max-w-md mx-auto mb-8">
            Browse the full menu, add your favourites, and we&apos;ll have it
            fresh and ready — pickup or delivery.
          </p>
          <Link
            href="/menu"
            className="inline-flex items-center justify-center font-sans font-semibold text-sm text-cream px-7 py-3.5 rounded-full transition-transform active:scale-95 hover:opacity-90"
            style={{ background: "var(--color-brand)" }}
          >
            View menu
          </Link>
        </div>
      </section>
    </div>
  )
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.9-6.2 3.9 1.6-7L2 9.2l7.1-.6z" />
    </svg>
  )
}
