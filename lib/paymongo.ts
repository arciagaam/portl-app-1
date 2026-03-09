import { createHmac, timingSafeEqual } from 'crypto';

const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

function getSecretKey(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) {
    throw new Error('PAYMONGO_SECRET_KEY environment variable is not set');
  }
  return key;
}

function getAuthHeader(): string {
  return `Basic ${Buffer.from(getSecretKey() + ':').toString('base64')}`;
}

// ============================================================================
// TYPES
// ============================================================================

export interface LineItem {
  amount: number; // in centavos
  currency: string;
  name: string;
  quantity: number;
  description?: string;
}

export interface CreateCheckoutSessionParams {
  lineItems: LineItem[];
  paymentMethodTypes: string[];
  description?: string;
  referenceNumber?: string;
  successUrl?: string;
  cancelUrl?: string;
  sendEmailReceipt?: boolean;
  metadata?: Record<string, string>;
  billing?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  checkoutSessionId: string;
}

export interface PaymentData {
  id: string;
  amount: number;
  status: string;
  source: {
    id: string;
    type: string;
    brand?: string;
    last4?: string;
  };
  paidAt: number;
  fee: number;
  netAmount: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CheckoutSessionResponse> {
  const requestBody = {
    data: {
      attributes: {
        line_items: params.lineItems.map((item) => ({
          amount: item.amount,
          currency: item.currency,
          name: item.name,
          quantity: item.quantity,
          ...(item.description && { description: item.description }),
        })),
        payment_method_types: params.paymentMethodTypes,
        ...(params.description && { description: params.description }),
        ...(params.referenceNumber && { reference_number: params.referenceNumber }),
        ...(params.successUrl && { success_url: params.successUrl }),
        ...(params.cancelUrl && { cancel_url: params.cancelUrl }),
        send_email_receipt: params.sendEmailReceipt ?? true,
        show_line_items: true,
        show_description: true,
        ...(params.metadata && { metadata: params.metadata }),
        ...(params.billing && {
          billing: {
            ...(params.billing.name && { name: params.billing.name }),
            ...(params.billing.email && { email: params.billing.email }),
            ...(params.billing.phone && { phone: params.billing.phone }),
          },
        }),
      },
    },
  };

  const response = await fetch(`${PAYMONGO_API_URL}/checkout_sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error('[PayMongo] Error status:', response.status);
    console.error('[PayMongo] Error body:', JSON.stringify(errorData, null, 2));
    const message = errorData?.errors?.[0]?.detail || `PayMongo API error: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const attributes = data.data.attributes;

  return {
    checkoutUrl: attributes.checkout_url,
    checkoutSessionId: data.data.id,
  };
}

export async function retrieveCheckoutSession(
  checkoutSessionId: string
): Promise<{ status: string; payments: PaymentData[] }> {
  const response = await fetch(
    `${PAYMONGO_API_URL}/checkout_sessions/${checkoutSessionId}`,
    {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.errors?.[0]?.detail || `PayMongo API error: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const attributes = data.data.attributes;

  const payments: PaymentData[] = (attributes.payments || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (payment: any) => ({
      id: payment.id,
      amount: payment.attributes.amount,
      status: payment.attributes.status,
      source: {
        id: payment.attributes.source.id,
        type: payment.attributes.source.type,
        brand: payment.attributes.source.brand,
        last4: payment.attributes.source.last4,
      },
      paidAt: payment.attributes.paid_at,
      fee: payment.attributes.fee,
      netAmount: payment.attributes.net_amount,
    })
  );

  return {
    status: attributes.status,
    payments,
  };
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify PayMongo webhook signature.
 *
 * The `Paymongo-Signature` header format: `t=<timestamp>,te=<test_signature>,li=<live_signature>`
 *
 * Signature is HMAC-SHA256 of `"<timestamp>.<raw_body>"` using the webhook secret key.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecretKey: string
): boolean {
  const parts = signatureHeader.split(',');
  const values: Record<string, string> = {};

  for (const part of parts) {
    const [key, ...rest] = part.split('=');
    values[key] = rest.join('=');
  }

  const timestamp = values['t'];
  if (!timestamp) return false;

  // Determine which signature to check based on the secret key prefix
  const isLiveKey = webhookSecretKey.startsWith('whsk_live');
  const expectedSignature = isLiveKey ? values['li'] : values['te'];

  if (!expectedSignature) return false;

  const payload = `${timestamp}.${rawBody}`;
  const computedSignature = createHmac('sha256', webhookSecretKey)
    .update(payload)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(expectedSignature, 'hex');
    const computedBuffer = Buffer.from(computedSignature, 'hex');
    return timingSafeEqual(sigBuffer, computedBuffer);
  } catch {
    return false;
  }
}
