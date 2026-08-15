"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCart } from "@/lib/cart-context"
import { useOrderStatus } from "@/lib/order-status-context"
import { formatPrice } from "@/lib/format-price"
import { sdk } from "@/lib/medusa"
import { reportClientError } from "@/lib/report-error"
import CartItemRow from "@/components/CartItem"
import EmptyState from "@/components/EmptyState"
import AuthField from "@/components/auth/AuthField"
import {
  ArrowRightIcon,
  BuildingIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SpinnerIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from "@/components/auth/AuthIcons"

type DeliveryMode = "pickup" | "delivery"

const RAZORPAY_PROVIDER_ID = "pp_razorpay_razorpay"
const SHIPPING_OPTION_NAMES: Record<DeliveryMode, string> = {
  pickup: "Store Pickup",
  delivery: "Home Delivery",
}

type ShippingOption = {
  id: string
  name: string
  amount: number
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, handler: (response: unknown) => void) => void
    }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// Retries a flaky request a couple of times with backoff before giving up.
// Used for the shipping-options fetch, whose one-shot failure used to
// silently leave checkout unable to place an order in Pickup mode.
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 700): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (retries <= 0) throw err
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return withRetry(fn, retries - 1, delayMs * 2)
  }
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="font-mono text-xs uppercase tracking-[0.06em] px-4 py-2 rounded-sm transition-all duration-200"
      style={{
        background: active ? "var(--color-cream)" : "transparent",
        color: active ? "var(--color-dark)" : "var(--color-muted)",
        boxShadow: active ? "0 1px 3px rgba(46,42,38,0.15)" : "none",
      }}
    >
      {children}
    </button>
  )
}

export default function CheckoutPage() {
  const {
    items,
    total,
    subtotal,
    resetCartState,
    isLoaded,
    cart,
    updateCart,
    applyPromoCode,
    removePromoCode,
  } = useCart()
  const { acceptingOrders, message: closedMessage } = useOrderStatus()
  const router = useRouter()

  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const [promoCode, setPromoCode] = useState("")
  const [promoError, setPromoError] = useState<string | null>(null)
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)
  const [removingPromoCode, setRemovingPromoCode] = useState<string | null>(null)

  const [mode, setMode] = useState<DeliveryMode>("pickup")
  const [customerName, setCustomerName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [email, setEmail] = useState("")
  const [streetAddress, setStreetAddress] = useState("")
  const [city, setCity] = useState("")
  const [orderNotes, setOrderNotes] = useState("")

  const [errors, setErrors] = useState<{
    customerName?: string
    mobileNumber?: string
    email?: string
    streetAddress?: string
    city?: string
  }>({})

  const [hasInitialized, setHasInitialized] = useState(false)
  const [shippingOptions, setShippingOptions] = useState<Record<DeliveryMode, ShippingOption | undefined>>({
    pickup: undefined,
    delivery: undefined,
  })
  const [shippingOptionsError, setShippingOptionsError] = useState<string | null>(null)
  const [isLoadingShippingOptions, setIsLoadingShippingOptions] = useState(false)

  // Fetch the real Pickup / Delivery shipping options (with their live prices)
  // as soon as we have a cart, so the delivery charge shown here always matches
  // what will actually be applied to the cart at checkout. Retries a couple
  // times on transient failures (e.g. backend cold start) before surfacing
  // an error — a silent one-shot failure here used to leave Pickup checkout
  // (which has no loading gate of its own) able to reach "Pay" and then fail
  // with a generic error.
  const cartId = cart?.id
  const loadShippingOptions = useCallback(async () => {
    if (!cartId) return
    setShippingOptionsError(null)
    setIsLoadingShippingOptions(true)
    try {
      const { shipping_options } = await withRetry(() =>
        sdk.store.fulfillment.listCartOptions({ cart_id: cartId })
      )
      const pickup = shipping_options?.find(
        (o: { name: string }) => o.name === SHIPPING_OPTION_NAMES.pickup
      )
      const delivery = shipping_options?.find(
        (o: { name: string }) => o.name === SHIPPING_OPTION_NAMES.delivery
      )
      setShippingOptions({
        pickup: pickup && { id: pickup.id, name: pickup.name, amount: pickup.amount ?? 0 },
        delivery: delivery && { id: delivery.id, name: delivery.name, amount: delivery.amount ?? 0 },
      })
    } catch (err) {
      reportClientError("checkout.load_shipping_options", err, { cartId })
      setShippingOptionsError("Couldn't load delivery details.")
    } finally {
      setIsLoadingShippingOptions(false)
    }
  }, [cartId])

  useEffect(() => {
    // Deferred, matching this file's existing convention (see hasInitialized
    // below) for keeping setState calls out of the effect's synchronous body.
    setTimeout(() => {
      loadShippingOptions()
    }, 0)
  }, [loadShippingOptions])

  const persistMetadata = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!cart) return
      const currentMetadata = (cart.metadata as Record<string, unknown>) || {}
      const newMetadata = { ...currentMetadata, ...updates }
      await updateCart({ metadata: newMetadata })
    },
    [cart, updateCart]
  )

  // Restore state from Medusa cart metadata on load
  useEffect(() => {
    if (isLoaded && !hasInitialized) {
      if (cart) {
        const metadata = (cart.metadata as Record<string, string | undefined>) || {}
        setTimeout(() => {
          if (metadata.customerName) setCustomerName(metadata.customerName)
          if (metadata.mobileNumber) setMobileNumber(metadata.mobileNumber)
          if (metadata.mode) setMode(metadata.mode as DeliveryMode)
          if (metadata.streetAddress) setStreetAddress(metadata.streetAddress)
          if (metadata.city) setCity(metadata.city)
          if (metadata.orderNotes) setOrderNotes(metadata.orderNotes)
          setHasInitialized(true)
        }, 0)
      } else {
        setTimeout(() => {
          setHasInitialized(true)
        }, 0)
      }
    }
  }, [isLoaded, cart, hasInitialized])

  // Pre-fill fields from cookie if the user is already signed in
  useEffect(() => {
    if (!hasInitialized) return
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]*)'))
      return match ? decodeURIComponent(match[2]) : null
    }
    const cookieEmail = getCookie("email")
    const cookieName = getCookie("name")

    queueMicrotask(() => {
      if (cookieEmail && !email) setEmail(cookieEmail)
      if (cookieName && !customerName) {
        setCustomerName(cookieName)
        persistMetadata({ customerName: cookieName })
      }
    })
  }, [hasInitialized, email, customerName, persistMetadata])

  const handleModeChange = async (newMode: DeliveryMode) => {
    setMode(newMode)
    // Clear address validation errors when switching to pickup since it is not required
    if (newMode === "pickup") {
      setErrors((prev) => ({
        ...prev,
        streetAddress: undefined,
        city: undefined,
      }))
    }
    await persistMetadata({ mode: newMode })
  }

  const handleNameBlur = () => {
    persistMetadata({ customerName })
  }

  const handleMobileBlur = () => {
    persistMetadata({ mobileNumber })
  }

  const handleStreetBlur = () => {
    persistMetadata({ streetAddress })
  }

  const handleCityBlur = () => {
    persistMetadata({ city })
  }

  const handleNotesBlur = () => {
    persistMetadata({ orderNotes })
  }

  async function handleApplyPromoCode() {
    const code = promoCode.trim().toUpperCase()
    if (!code) return

    setPromoError(null)
    setIsApplyingPromo(true)
    try {
      await applyPromoCode(code)
      setPromoCode("")
    } catch (err) {
      console.error("Failed to apply promo code:", err)
      setPromoError("That promo code isn't valid or has expired.")
    } finally {
      setIsApplyingPromo(false)
    }
  }

  async function handleRemovePromoCode(code: string) {
    setRemovingPromoCode(code)
    try {
      await removePromoCode(code)
    } catch (err) {
      console.error("Failed to remove promo code:", err)
    } finally {
      setRemovingPromoCode(null)
    }
  }

  async function handlePlaceOrder() {
    if (!acceptingOrders) return

    // Run validation
    const newErrors: typeof errors = {}
    if (!customerName.trim()) {
      newErrors.customerName = "Name is required"
    }

    const cleanMobile = mobileNumber.trim()
    if (!cleanMobile) {
      newErrors.mobileNumber = "Mobile number is required"
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      newErrors.mobileNumber = "Please enter a valid 10-digit Indian mobile number"
    }

    // Optional — only validate format if the customer actually entered one.
    const cleanEmail = email.trim().toLowerCase()
    if (cleanEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (mode === "delivery") {
      if (!streetAddress.trim()) {
        newErrors.streetAddress = "Street address is required"
      }
      if (!city.trim()) {
        newErrors.city = "City is required"
      }
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    if (!cart || items.length === 0) return

    setOrderError(null)
    setIsPlacingOrder(true)

    // Email is optional. Medusa's order/customer creation needs some email
    // to key a guest customer record on, so fall back to a synthetic one
    // built from the (required) mobile number rather than leaving it blank —
    // keeps the same phone number consistently identifying the same guest
    // customer across orders even when they never type a real email.
    const effectiveEmail = cleanEmail || `${cleanMobile}@guest.ambicafoodcorner.local`

    try {
      // Automatically sign in the user on the browser with the entered email & name
      document.cookie = "auth=1; path=/; max-age=2592000; SameSite=Lax"
      document.cookie = `email=${encodeURIComponent(effectiveEmail)}; path=/; max-age=2592000; SameSite=Lax`
      document.cookie = `name=${encodeURIComponent(customerName.trim())}; path=/; max-age=2592000; SameSite=Lax`

      // Persist all latest data to Medusa cart metadata before completing
      await persistMetadata({
        customerName,
        mobileNumber,
        mode,
        streetAddress: mode === "delivery" ? streetAddress : "",
        city: mode === "delivery" ? city : "",
        orderNotes,
      })

      await sdk.store.cart.update(cart.id, {
        // Real email if given, otherwise the synthetic phone-based one so
        // order history / customer records always have something to key on.
        email: effectiveEmail,
        shipping_address: {
          first_name: customerName,
          address_1: mode === "delivery" ? streetAddress : "Ambica Food Corner, Shop No. 5",
          city: mode === "delivery" ? city : "Vaso",
          country_code: "in",
          phone: cleanMobile,
        },
      })

      // Save the delivery address to the customer's address book so it shows
      // up under Customers > Addresses in the admin. Best-effort: a failure
      // here shouldn't block placing the order. Pickup orders use the store's
      // own address, which isn't a customer address worth saving.
      if (mode === "delivery") {
        try {
          const { addresses } = await sdk.store.customer.listAddress()
          const alreadySaved = addresses.some(
            (a: { address_1?: string; city?: string }) =>
              a.address_1 === streetAddress && a.city === city
          )
          if (!alreadySaved) {
            await sdk.store.customer.createAddress({
              first_name: customerName,
              address_1: streetAddress,
              city,
              country_code: "in",
              phone: cleanMobile,
            })
          }
        } catch (err) {
          console.error("Failed to save address to customer's address book:", err)
        }
      }

      const selectedOption = shippingOptions[mode]
      if (!selectedOption) {
        throw new Error(
          `The "${SHIPPING_OPTION_NAMES[mode]}" shipping option isn't configured on the store yet.`
        )
      }
      const { cart: cartWithShipping } = await sdk.store.cart.addShippingMethod(cart.id, {
        option_id: selectedOption.id,
      })

      const { payment_collection } = await sdk.store.payment.initiatePaymentSession(
        cartWithShipping,
        { provider_id: RAZORPAY_PROVIDER_ID }
      )
      const paymentSession = payment_collection.payment_sessions?.find(
        (s: { provider_id: string }) => s.provider_id === RAZORPAY_PROVIDER_ID
      )
      const sessionData = paymentSession?.data as
        | { razorpay_order_id?: string; amount?: number; key_id?: string }
        | undefined
      if (!sessionData?.razorpay_order_id || !sessionData.key_id) {
        throw new Error("Failed to initialize the Razorpay payment session.")
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error("Failed to load the Razorpay checkout script.")
      }

      const razorpay = new window.Razorpay({
        key: sessionData.key_id,
        order_id: sessionData.razorpay_order_id,
        amount: Math.round((sessionData.amount ?? 0) * 100),
        currency: "INR",
        name: "Ambica Food Corner",
        description: mode === "delivery" ? "Home Delivery order" : "Store Pickup order",
        prefill: {
          name: customerName,
          contact: cleanMobile,
        },
        theme: { color: "#A8674A" },
        handler: async () => {
          try {
            const result = await sdk.store.cart.complete(cart.id)
            if (result.type === "order") {
              resetCartState()
              router.push(`/orders/${result.order.id}`)
            } else {
              reportClientError("checkout.cart_complete_error", result.error, { cartId: cart.id })
              setOrderError("Payment succeeded but placing the order failed. Please contact us.")
            }
          } catch (err) {
            reportClientError("checkout.complete_after_payment", err, { cartId: cart.id })
            setOrderError("Payment succeeded but placing the order failed. Please contact us.")
          } finally {
            setIsPlacingOrder(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsPlacingOrder(false)
          },
        },
      })
      razorpay.on("payment.failed", (response: unknown) => {
        reportClientError("checkout.payment_failed", new Error("Razorpay payment.failed"), {
          cartId: cart.id,
          response,
        })
        setOrderError("Payment failed. Please try again.")
        setIsPlacingOrder(false)
      })
      razorpay.open()
    } catch (err) {
      reportClientError("checkout.place_order", err, { cartId: cart.id, mode })
      setOrderError("Something went wrong placing your order. Please try again.")
      setIsPlacingOrder(false)
    }
  }

  // Only trust a real fetched amount — a guessed fallback could show (and
  // charge) a different price than the shipping option actually configured
  // on the store.
  const deliveryOptionLoaded = shippingOptions.delivery !== undefined
  // Gates the Pay button for whichever mode is currently selected — Pickup
  // needs this check just as much as Delivery does, since it also resolves
  // a shipping option server-side before payment can be initiated.
  const currentModeOptionLoaded = shippingOptions[mode] !== undefined
  const deliveryCharge = mode === "delivery" ? shippingOptions.delivery?.amount ?? 0 : 0
  const backendShippingTotal = cart?.shipping_total ?? 0
  const discountTotal = cart?.discount_total ?? 0
  const baseTotal = (total || subtotal) - backendShippingTotal
  const orderTotal = baseTotal + deliveryCharge

  if (!isLoaded) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-center min-h-[300px]">
        <p className="font-sans text-sm text-muted animate-pulse">Loading checkout...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-dark mb-6">Checkout</h1>
        <EmptyState
          title="Your basket is empty"
          description="Add something delicious from the menu before checking out."
          action={
            <Link
              href="/"
              className="inline-block font-mono text-xs uppercase tracking-[0.07em] text-brand hover:underline"
            >
              Browse the menu →
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-dark mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start">
        {/* Delivery details card */}
        <div
          className="rounded-lg p-5 sm:p-7 flex flex-col gap-7 order-2 lg:order-1"
          style={{
            background: "var(--color-input)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 1px 3px rgba(46,42,38,0.06)",
          }}
        >
          {/* Mode toggle */}
          <div
            role="tablist"
            aria-label="Delivery method"
            className="inline-flex p-1 rounded-md gap-1 w-fit"
            style={{ background: "var(--color-card)" }}
          >
            <ModeTab active={mode === "pickup"} onClick={() => handleModeChange("pickup")}>
              Pickup
            </ModeTab>
            <ModeTab active={mode === "delivery"} onClick={() => handleModeChange("delivery")}>
              Delivery
            </ModeTab>
          </div>

          {/* Customer details */}
          <section aria-label="Customer details" className="flex flex-col gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.07em]" style={{ color: "var(--color-amber)" }}>
              Customer details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AuthField
                label="Name"
                type="text"
                value={customerName}
                onChange={setCustomerName}
                onBlur={handleNameBlur}
                placeholder="Your name"
                icon={<UserIcon className="w-full h-full" />}
                error={errors.customerName}
                autoComplete="name"
              />
              <AuthField
                label="Mobile number"
                type="tel"
                value={mobileNumber}
                onChange={setMobileNumber}
                onBlur={handleMobileBlur}
                placeholder="Your mobile number"
                icon={<PhoneIcon className="w-full h-full" />}
                error={errors.mobileNumber}
                autoComplete="tel"
                inputMode="tel"
                maxLength={10}
              />
            </div>
            {/* Email — optional, full width */}
            <div className="flex flex-col gap-1">
              <AuthField
                label="Email (optional)"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="your@email.com"
                icon={<MailIcon className="w-full h-full" />}
                error={errors.email}
                autoComplete="email"
                inputMode="email"
              />

            </div>
          </section>

          {/* Collection / Delivery point */}
          <section aria-label="Collection point" className="flex flex-col gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.07em]" style={{ color: "var(--color-amber)" }}>
              {mode === "pickup" ? "Collect from" : "Deliver to"}
            </p>
            {mode === "pickup" ? (
              <div
                className="flex items-start gap-3 rounded-md px-4 py-3.5"
                style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
              >
                <MapPinIcon className="w-5 h-5 shrink-0 mt-0.5 text-brand" />
                <div>
                  <p className="font-sans font-semibold text-sm text-dark">Ambica Food Corner</p>
                  <p className="font-sans text-sm text-muted">Vaso Circle, Vaso, Gujarat 387380</p>
                  <p className="font-sans text-xs text-faint mt-0.5">~30 min ready time</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <AuthField
                    label="Street address"
                    type="text"
                    value={streetAddress}
                    onChange={setStreetAddress}
                    onBlur={handleStreetBlur}
                    placeholder="Street address"
                    icon={<MapPinIcon className="w-full h-full" />}
                    error={errors.streetAddress}
                    autoComplete="address-line1"
                  />
                </div>
                <AuthField
                  label="City"
                  type="text"
                  value={city}
                  onChange={setCity}
                  onBlur={handleCityBlur}
                  placeholder="City"
                  icon={<BuildingIcon className="w-full h-full" />}
                  error={errors.city}
                  autoComplete="address-level2"
                />
              </div>
            )}
          </section>

          {/* Order Notes */}
          <section aria-label="Order Notes" className="flex flex-col gap-2">
            <p className="font-mono text-xs uppercase tracking-[0.07em]" style={{ color: "var(--color-amber)" }}>
              Order notes (optional)
            </p>
            <textarea
              placeholder="Any special instructions for the kitchen..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              onBlur={handleNotesBlur}
              className="w-full font-sans text-sm bg-input text-dark placeholder:text-faint px-4 py-3 rounded-md outline-none transition-colors focus:ring-2 focus:ring-offset-1 resize-none"
              style={{
                border: "1px solid var(--color-border)",
                minHeight: "90px",
                ["--tw-ring-color" as string]: "var(--color-brand)",
                ["--tw-ring-offset-color" as string]: "var(--color-cream)",
              }}
              aria-label="Order Notes"
            />
          </section>

          <div>
            <Link
              href="/cart"
              className="font-mono text-xs uppercase tracking-[0.07em] text-muted hover:text-dark transition-colors"
            >
              ← Back to cart
            </Link>
          </div>
        </div>

        {/* Order summary card */}
        <div
          className="rounded-lg p-5 sm:p-7 flex flex-col gap-5 order-1 lg:order-2 lg:sticky"
          style={{
            background: "var(--color-input)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 4px 20px rgba(46,42,38,0.08)",
            top: "1.5rem",
          }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.07em]" style={{ color: "var(--color-amber)" }}>
            Order summary · {items.length} {items.length === 1 ? "item" : "items"}
          </p>

          <ul className="flex flex-col gap-3 pt-2">
            {items.map((item) => (
              <CartItemRow key={item.variantId} item={item} />
            ))}
          </ul>

          {/* Promo code */}
          <section aria-label="Promo code" className="flex flex-col gap-2">
            {cart?.promotions && cart.promotions.length > 0 && (
              <ul className="flex flex-wrap gap-2 mb-1">
                {cart.promotions.map((promo) => (
                  <li
                    key={promo.id}
                    className="flex items-center gap-1.5 rounded-full pl-3 pr-1.5 py-1"
                    style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
                  >
                    <TagIcon className="w-3.5 h-3.5 text-brand" />
                    <span className="font-mono text-xs tracking-[0.04em] text-dark">{promo.code}</span>
                    <button
                      type="button"
                      onClick={() => promo.code && handleRemovePromoCode(promo.code)}
                      disabled={removingPromoCode === promo.code}
                      aria-label={`Remove promo code ${promo.code}`}
                      className="flex items-center justify-center rounded-full text-faint hover:text-dark transition-colors disabled:opacity-50"
                      style={{ width: 18, height: 18 }}
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <div
                className="flex items-center gap-2.5 flex-1 rounded-md px-3.5 py-2.5 transition-colors duration-200 focus-within:ring-2 focus-within:ring-offset-1"
                style={{
                  background: "var(--color-input)",
                  border: `1px solid ${promoError ? "var(--color-brand)" : "var(--color-border)"}`,
                  ["--tw-ring-color" as string]: "var(--color-brand)",
                  ["--tw-ring-offset-color" as string]: "var(--color-cream)",
                }}
              >
                <span className="text-faint shrink-0" aria-hidden="true" style={{ width: 16, height: 16 }}>
                  <TagIcon className="w-full h-full" />
                </span>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleApplyPromoCode()
                    }
                  }}
                  placeholder="PROMO CODE"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Promo code"
                  aria-invalid={!!promoError}
                  className="w-full bg-transparent font-mono text-sm uppercase tracking-[0.04em] text-dark placeholder:text-faint placeholder:normal-case placeholder:tracking-normal outline-none min-w-0"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyPromoCode}
                disabled={isApplyingPromo || !promoCode.trim()}
                className="font-mono text-xs uppercase tracking-[0.06em] px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                style={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-dark)",
                }}
              >
                {isApplyingPromo ? "…" : "Apply"}
              </button>
            </div>
            {promoError && (
              <p role="alert" className="font-sans text-xs" style={{ color: "var(--color-brand)" }}>
                {promoError}
              </p>
            )}
          </section>

          <div className="flex flex-col gap-2 pt-1" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div className="flex justify-between pt-3">
              <span className="font-sans text-sm text-muted">Subtotal</span>
              <span className="font-mono text-sm text-dark">{formatPrice(baseTotal)}</span>
            </div>
            {mode === "delivery" && (
              <div className="flex justify-between">
                <span className="font-sans text-sm text-muted">Delivery charge</span>
                <span className="font-mono text-sm text-dark">
                  {deliveryOptionLoaded ? formatPrice(deliveryCharge) : "Calculating…"}
                </span>
              </div>
            )}
            {discountTotal > 0 && (
              <div className="flex justify-between">
                <span className="font-sans text-sm text-muted">Discount</span>
                <span className="font-mono text-sm" style={{ color: "var(--color-brand)" }}>
                  −{formatPrice(discountTotal)}
                </span>
              </div>
            )}
            <div
              className="flex justify-between pt-2 mt-1 font-semibold"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <span className="font-sans text-sm text-dark">Total</span>
              <span className="font-mono text-sm text-dark">{formatPrice(orderTotal)}</span>
            </div>
          </div>

          {orderError && (
            <p role="alert" className="font-sans text-xs text-center" style={{ color: "var(--color-brand)" }}>
              {orderError}
            </p>
          )}

          {!acceptingOrders && (
            <p role="alert" className="font-sans text-xs text-center" style={{ color: "var(--color-brand)" }}>
              {closedMessage ?? "We're not accepting orders right now."}
            </p>
          )}

          {shippingOptionsError && (
            <p role="alert" className="font-sans text-xs text-center" style={{ color: "var(--color-brand)" }}>
              {shippingOptionsError}{" "}
              <button
                type="button"
                onClick={loadShippingOptions}
                className="underline underline-offset-2 hover:opacity-80"
              >
                Retry
              </button>
            </p>
          )}

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={
              !acceptingOrders ||
              isPlacingOrder ||
              isLoadingShippingOptions ||
              !currentModeOptionLoaded
            }
            className="group flex items-center justify-center gap-2 w-full font-sans font-semibold text-sm text-cream py-3.5 rounded-md transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{ background: "var(--color-brand)" }}
          >
            {isPlacingOrder ? (
              <>
                <SpinnerIcon className="w-4 h-4" />
                Processing…
              </>
            ) : !acceptingOrders ? (
              "Not accepting orders"
            ) : (
              <>
                Pay {formatPrice(orderTotal)}
                <ArrowRightIcon className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <p className="flex items-center justify-center gap-1.5 font-sans text-xs text-faint">
            <LockIcon className="w-3.5 h-3.5" />
            Payments secured by Razorpay
          </p>
        </div>
      </div>
    </div>
  )
}
