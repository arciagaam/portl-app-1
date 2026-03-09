import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/paymongo';
import { prisma } from '@/lib/prisma';
import { confirmOrderFromPayment } from '@/lib/checkout-internal';

export async function POST(request: Request) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('PAYMONGO_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get('paymongo-signature');

  if (!signatureHeader) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  // Verify webhook signature
  const isValid = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
  if (!isValid) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event?.data?.attributes?.type;

  if (eventType === 'checkout_session.payment.paid') {
    try {
      const checkoutSessionData = event.data.attributes.data;
      const checkoutSessionId = checkoutSessionData.id;
      const payments = checkoutSessionData.attributes?.payments || [];

      // Find the order by paymentSessionId
      const order = await prisma.order.findFirst({
        where: { paymentSessionId: checkoutSessionId },
      });

      if (!order) {
        // Order not found - might be for a different system or already processed
        console.warn(`No order found for checkout session: ${checkoutSessionId}`);
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      if (order.status !== 'PENDING') {
        // Already processed - idempotent
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // Get the paid payment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paidPayment = payments.find((p: any) => p.attributes?.status === 'paid');

      if (paidPayment) {
        await confirmOrderFromPayment(order.id, {
          paymentId: paidPayment.id,
          amount: paidPayment.attributes.amount,
          status: paidPayment.attributes.status,
          paidAt: paidPayment.attributes.paid_at,
        });
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      // Still return 200 to prevent retries for processing errors we can investigate
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ message: 'OK' }, { status: 200 });
}
