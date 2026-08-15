import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Order Confirmed — Ambica Food Corner",
}



export default function OrderPreviewPage() {
  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
      {/* Check icon */}
      <div className="flex justify-center mb-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "#fdf0eb" }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
      </div>

      <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-dark text-center mb-2">
        Order confirmed
      </h1>
      <p className="font-sans text-sm text-muted text-center mb-1">
        Thanks for your order! It&apos;ll be ready at
      </p>
      <p className="font-sans text-sm font-medium text-dark text-center mb-8">
        Ambica Food Corner, Shop No. 5
      </p>

      {/* Order meta */}
      <div
        className="flex justify-between items-center rounded-sm px-4 py-3 mb-8"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
      >
        <div>
          <p className="font-mono text-xs text-faint uppercase tracking-[0.07em]">
            Order
          </p>
          <p className="font-mono text-sm text-dark mt-0.5">
            #AFC-0001
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-faint uppercase tracking-[0.07em]">
            Est. ready
          </p>
          <p className="font-mono text-sm text-dark mt-0.5">~30 min</p>
        </div>
      </div>



      {/* Info */}
      <div
        className="rounded-sm px-4 py-4 mb-8 flex flex-col gap-1"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
      >
        <p className="font-sans text-sm font-medium text-dark">
          We&apos;re getting started on your order now.
        </p>
        <p className="font-sans text-xs text-muted leading-relaxed">
          Come to the counter when you&apos;re ready and we&apos;ll have your
          food waiting. Look for our sign at Vaso Circle, Vaso, Gujarat 387380.
        </p>
      </div>

      <div className="text-center mt-6">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.07em] text-muted hover:text-dark transition-colors"
        >
          Back to menu
        </Link>
      </div>
    </div>
  )
}
