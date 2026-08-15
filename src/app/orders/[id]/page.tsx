import Link from "next/link"
import { sdk } from "@/lib/medusa"
import { formatPrice } from "@/lib/format-price"
import ReceiptActions from "@/components/ReceiptActions"
import type { BillData } from "@/lib/bill-template"

interface OrderLineItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  thumbnail?: string
}

interface OrderAddress {
  address_1?: string
  city?: string
  province?: string
  postal_code?: string
  phone?: string
}

interface Order {
  id: string
  email?: string
  status: string
  fulfillment_status?: string
  items: OrderLineItem[]
  item_total?: number
  shipping_total?: number
  discount_total?: number
  total?: number
  currency_code?: string
  created_at?: string
  metadata?: Record<string, unknown>
  customer?: { first_name?: string; last_name?: string }
  shipping_address?: OrderAddress
}

async function getOrder(id: string): Promise<Order | null> {
  try {
    const { order } = await (sdk.store.order.retrieve(id, {
      fields:
        "id,email,status,fulfillment_status,created_at,currency_code,item_total,shipping_total,discount_total,total,metadata,customer.first_name,customer.last_name,*items,*shipping_address",
    }) as Promise<{ order: unknown }>)
    return order as Order
  } catch (err) {
    console.error("Failed to retrieve order:", err)
    return null
  }
}

// display_id is a store-wide counter shared across every customer, so it isn't
// shown to customers (see /store/customers/email-orders). Look up this order's
// position within just this customer's own order history instead.
async function getCustomerOrderNumber(email: string | undefined, orderId: string): Promise<number | null> {
  if (!email) return null
  try {
    const { orders } = await sdk.client.fetch<{ orders: { id: string; customer_order_number: number }[] }>(
      "/store/customers/email-orders",
      { query: { email } }
    )
    return orders.find((o) => o.id === orderId)?.customer_order_number ?? null
  } catch (err) {
    console.error("Failed to look up customer order number:", err)
    return null
  }
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="font-serif text-xl font-medium text-dark mb-2">Order not found</p>
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.07em] text-brand hover:underline">
          Return to menu
        </Link>
      </div>
    )
  }

  const customerOrderNumber = await getCustomerOrderNumber(order.email, order.id)
  const orderTotal = order.total ?? 0
  const subtotal =
    order.item_total ?? order.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const shippingTotal = order.shipping_total ?? 0
  const discountTotal = order.discount_total ?? 0
  const isDelivery = order.metadata?.mode === "delivery"
  const streetAddress = order.shipping_address?.address_1 || (order.metadata?.streetAddress as string | undefined)
  const city = order.shipping_address?.city || (order.metadata?.city as string | undefined)
  const deliveryAddress = [streetAddress, city].filter(Boolean).join(", ")
  const orderNotes = (order.metadata?.orderNotes as string | undefined)?.trim()

  const billOrderNumber = customerOrderNumber ?? order.id.slice(0, 8).toUpperCase()
  const orderLabel = `#${billOrderNumber}`
  const billData: BillData = {
    customerName:
      [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") || "there",
    orderDisplayId: billOrderNumber,
    orderDate: order.created_at,
    currencyCode: order.currency_code || "INR",
    items: order.items.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.unit_price * item.quantity,
    })),
    subtotal,
    shippingTotal,
    discountTotal,
    total: orderTotal,
    mode: (order.metadata?.mode as string | undefined) ?? "pickup",
    shippingAddress: order.shipping_address,
  }
  const shareLines = [
    `Ambica Food Corner — Order ${orderLabel}`,
    ...order.items.map(
      (item) => `${item.quantity} x ${item.title} — ${formatPrice(item.unit_price * item.quantity)}`
    ),
    `Subtotal: ${formatPrice(subtotal)}`,
    `${isDelivery ? "Delivery" : "Pickup"}: ${formatPrice(shippingTotal)}`,
    discountTotal > 0 ? `Discount: -${formatPrice(discountTotal)}` : null,
    orderTotal > 0 ? `Total: ${formatPrice(orderTotal)}` : null,
    isDelivery && deliveryAddress ? `Deliver to: ${deliveryAddress}` : null,
  ].filter((line): line is string => Boolean(line))
  const shareText = shareLines.join("\n")

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

      {isDelivery ? (
        <>
          <p className="font-sans text-sm text-muted text-center mb-1">
            Thanks for your order! It will be delivered to
          </p>
          <p className="font-sans text-sm font-medium text-dark text-center mb-8">
            {deliveryAddress || "your delivery address"}
          </p>
        </>
      ) : (
        <>
          <p className="font-sans text-sm text-muted text-center mb-1">
            Thanks for your order! It&apos;ll be ready at
          </p>
          <p className="font-sans text-sm font-medium text-dark text-center mb-8">
            Ambica Food Corner, Shop No. 5
          </p>
        </>
      )}

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
            #{customerOrderNumber ?? order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-faint uppercase tracking-[0.07em]">
            Est. ready
          </p>
          <p className="font-mono text-sm text-dark mt-0.5">~30 min</p>
        </div>
      </div>

      <ReceiptActions
        shareTitle={`Ambica Food Corner — Order ${orderLabel}`}
        shareText={shareText}
        billData={billData}
        orderDisplayId={billOrderNumber}
      />

      {/* Order items */}
      {order.items.length > 0 && (
        <div className="mb-8">
          <p
            className="font-mono text-xs uppercase tracking-[0.07em] mb-3"
            style={{ color: "var(--color-amber)" }}
          >
            Items
          </p>
          <ul className="flex flex-col">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex justify-between py-3"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <span className="font-sans text-sm text-dark">
                  {item.quantity} × {item.title}
                </span>
                <span className="font-mono text-sm text-dark">
                  {formatPrice(item.unit_price * item.quantity)}
                </span>
              </li>
            ))}
            <li className="flex justify-between py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <span className="font-sans text-sm text-muted">Subtotal</span>
              <span className="font-mono text-sm text-dark">{formatPrice(subtotal)}</span>
            </li>
            <li className="flex justify-between py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <span className="font-sans text-sm text-muted">{isDelivery ? "Delivery" : "Pickup"}</span>
              <span className="font-mono text-sm text-dark">{formatPrice(shippingTotal)}</span>
            </li>
            {discountTotal > 0 && (
              <li className="flex justify-between py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <span className="font-sans text-sm text-muted">Discount</span>
                <span className="font-mono text-sm text-dark">-{formatPrice(discountTotal)}</span>
              </li>
            )}
            {orderTotal > 0 && (
              <li className="flex justify-between py-3">
                <span className="font-sans font-semibold text-sm text-dark">Total</span>
                <span className="font-mono text-sm text-dark">{formatPrice(orderTotal)}</span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Order notes */}
      {orderNotes && (
        <div className="mb-8">
          <p
            className="font-mono text-xs uppercase tracking-[0.07em] mb-3"
            style={{ color: "var(--color-amber)" }}
          >
            Order notes
          </p>
          <p
            className="font-sans text-sm text-dark rounded-sm px-4 py-3"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
          >
            {orderNotes}
          </p>
        </div>
      )}

      <div className="print:hidden text-center mt-6">
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
