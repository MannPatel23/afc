import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import DeliveryAreasMarquee from "@/components/DeliveryAreasMarquee"

export const metadata: Metadata = {
  title: "About Us — Ambica Food Corner",
  description: "Learn more about Ambica Food Corner, our passion for fresh ingredients, handcrafted fast food, and why customers love us.",
}

const MENU_ITEMS = [
  "Burgers",
  "Pizzas",
  "Sandwiches",
  "Maggi",
  "French Fries",
  "Garlic Bread",
]

const WHY_US = [
  {
    title: "Fresh Ingredients",
    description: "We use fresh vegetables, quality cheeses, premium sauces, and carefully selected ingredients to prepare every meal.",
    icon: LeafIcon,
  },
  {
    title: "Handcrafted with Care",
    description: "Every order is freshly prepared by hand, ensuring great taste, quality, and attention to detail.",
    icon: HeartIcon,
  },
  {
    title: "Fast Service",
    description: "Good food shouldn't keep you waiting. We prepare and serve your order quickly without compromising on quality.",
    icon: ZapIcon,
  },
  {
    title: "Hygiene & Quality",
    description: "We maintain high standards of cleanliness and food safety so you can enjoy every meal with confidence.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Affordable Prices",
    description: "Delicious food doesn't have to be expensive. We believe in offering generous portions and excellent value for money.",
    icon: TagIcon,
  },
]

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Back to Menu */}
      <Link
        href="/menu"
        className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-[0.07em] text-muted hover:text-dark transition-colors mb-8"
      >
        ← Menu
      </Link>

      <p
        className="font-mono text-xs uppercase tracking-[0.1em] mb-3"
        style={{ color: "var(--color-amber)" }}
      >
        Our story
      </p>
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-dark leading-tight mb-2">
        About Ambica Food Corner
      </h1>
      <h2
        className="font-sans text-lg font-medium mb-8"
        style={{ color: "var(--color-amber)" }}
      >
        Where Freshness Meets Flavour
      </h2>

      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 md:gap-12 items-center mb-16">
        <div className="flex flex-col gap-4">
          <p className="font-sans text-sm sm:text-base text-muted leading-relaxed">
            Welcome to <strong>Ambica Food Corner</strong>, your trusted destination for delicious, freshly prepared fast food. Our mission is simple—to serve food that&apos;s fresh, flavourful, and made with care.
          </p>
          <p className="font-sans text-sm sm:text-base text-muted leading-relaxed">
            Every dish we serve is handcrafted using carefully selected, fresh ingredients. We believe that quality ingredients make all the difference, which is why every burger, pizza, sandwich, and snack is prepared fresh to order.
          </p>
          <p className="font-sans text-sm sm:text-base text-muted leading-relaxed">
            Whether you&apos;re looking for a quick evening snack, a satisfying meal, or comfort food to enjoy with friends and family, Ambica Food Corner is here to serve you with quality and consistency.
          </p>
        </div>

        {/* Hero Image */}
        <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden shadow-md border border-border">
          <Image
            src="/Images/about_hero.png"
            alt="Ambica Food Corner delicious fast food spread"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Delicious Menu section */}
      <section aria-labelledby="menu-heading" className="mb-16">
        <p
          className="font-mono text-xs uppercase tracking-[0.07em] mb-4"
          style={{ color: "var(--color-amber)" }}
        >
          Our Delicious Menu
        </p>
        <p className="font-sans text-sm text-muted leading-relaxed mb-6">
          We proudly offer a wide selection of customer favourites, freshly prepared for you:
        </p>
        <div className="flex flex-wrap gap-2.5">
          {MENU_ITEMS.map((item) => (
            <span
              key={item}
              className="font-sans text-xs sm:text-sm px-4 py-2 rounded-full font-medium border transition-colors hover:bg-card"
              style={{
                background: "var(--color-input)",
                borderColor: "var(--color-border)",
                color: "var(--color-dark)",
              }}
            >
              {item}
            </span>
          ))}
          <span
            className="font-sans text-xs sm:text-sm px-4 py-2 rounded-full font-medium italic border"
            style={{
              background: "var(--color-card)",
              borderColor: "var(--color-border-md)",
              color: "var(--color-brand)",
            }}
          >
            And many more...
          </span>
        </div>
      </section>

      {/* Why Customers Love Us */}
      <section aria-labelledby="why-us-heading" className="mb-16">
        <p
          className="font-mono text-xs uppercase tracking-[0.07em] mb-6"
          style={{ color: "var(--color-amber)" }}
        >
          Why Customers Love Us
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {WHY_US.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="rounded-lg p-5 flex flex-col gap-3 transition-shadow duration-200 hover:shadow-md"
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center bg-input border"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Icon />
              </div>
              <h3 className="font-serif font-semibold text-base text-dark">
                {title}
              </h3>
              <p className="font-sans text-xs sm:text-sm text-muted leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Where We Deliver */}
      <section aria-labelledby="delivery-heading" className="mb-16">
        <p
          className="font-mono text-xs uppercase tracking-[0.07em] mb-4"
          style={{ color: "var(--color-amber)" }}
        >
          Where We Deliver
        </p>
        <p className="font-sans text-sm text-muted leading-relaxed mb-6">
          We currently deliver fresh to the villages below — and we&apos;re
          growing. Soon we&apos;ll be delivering everywhere nearby.
        </p>
        <DeliveryAreasMarquee variant="card" />
      </section>

      {/* Our Promise & Footer CTA */}
      <section aria-labelledby="promise-heading" className="mb-16">
        <div
          className="rounded-lg p-6 sm:p-8 text-center flex flex-col gap-4 border"
          style={{
            background: "var(--color-input)",
            borderColor: "var(--color-border)",
            boxShadow: "0 1px 3px rgba(46,42,38,0.05)",
          }}
        >
          <p
            className="font-mono text-xs uppercase tracking-[0.07em]"
            style={{ color: "var(--color-amber)" }}
          >
            Our Promise
          </p>
          <p className="font-serif text-lg sm:text-xl font-medium text-dark max-w-2xl mx-auto leading-relaxed">
            At <strong>Ambica Food Corner</strong>, every customer is important to us. Whether you&apos;re dining in, taking away, or ordering online, we&apos;re committed to delivering fresh food, outstanding taste, and exceptional service with every order.
          </p>
          <p className="font-sans text-xs sm:text-sm text-muted mt-2">
            Thank you for making us a part of your meals. We look forward to serving you again and again.
          </p>
        </div>
      </section>

      {/* Sourcing */}
      <div className="mb-16 border-t pt-8" style={{ borderColor: "var(--color-border)" }}>
        <p className="font-sans text-xs text-faint leading-relaxed text-center">
          Fresh ingredients. Great taste. Fast service. That&apos;s the Ambica Food Corner promise.
        </p>
      </div>

      {/* CTA Box */}
      <div
        className="rounded-lg px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div>
          <p className="font-serif text-lg font-semibold text-dark mb-1">
            Come and eat with us.
          </p>
          <p className="font-sans text-sm text-muted">
            Ambica Food Corner — Open Daily 5 PM – 2 AM
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            href="/find-us"
            className="font-sans text-sm font-medium text-dark py-2.5 px-5 rounded-sm transition-colors hover:bg-card"
            style={{ border: "1px solid var(--color-border-md)" }}
          >
            Find us
          </Link>
          <Link
            href="/"
            className="font-sans font-semibold text-sm text-cream py-2.5 px-5 rounded-sm transition-opacity hover:opacity-90"
            style={{ background: "var(--color-brand)" }}
          >
            Order now
          </Link>
        </div>
      </div>
    </div>
  )
}

// Icon Components
function LeafIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-brand)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 0 8.5C17 15 15 20 11 20z" />
      <path d="M19 2L11 10" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-brand)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-brand)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-brand)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 11 2 2 4-4" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-brand)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  )
}
