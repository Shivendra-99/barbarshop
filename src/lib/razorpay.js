/**
 * Razorpay Checkout helper. Loads the hosted checkout.js on demand (kept out of
 * index.html so it only downloads when someone actually pays) and opens the
 * payment modal, resolving with the success payload or rejecting on dismiss.
 */

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let loading = null

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new Error('Could not load the payment gateway. Check your connection.'))
    }
    document.body.appendChild(s)
  })
  return loading
}

/**
 * Open Razorpay Checkout for a created order.
 * `order` is the /payments/order response ({ orderId, amount, currency, keyId,
 * name, description, prefill }). Resolves with { orderId, paymentId, signature }
 * on success; rejects with an Error if the user closes the modal or it fails.
 */
export async function openCheckout(order) {
  await loadCheckout()

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.name || 'SalonSaathi',
      description: order.description || 'Salon booking',
      order_id: order.orderId,
      prefill: order.prefill || {},
      theme: { color: '#c9a227' },
      handler: (resp) =>
        resolve({
          orderId: resp.razorpay_order_id,
          paymentId: resp.razorpay_payment_id,
          signature: resp.razorpay_signature,
        }),
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled.')),
      },
    })
    rzp.on('payment.failed', (resp) =>
      reject(new Error(resp?.error?.description || 'Payment failed. Please try again.')),
    )
    rzp.open()
  })
}
