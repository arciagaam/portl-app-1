import { cleanupAllExpiredOrders } from '@/lib/checkout-internal';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cancelled = await cleanupAllExpiredOrders();
    return Response.json({ ok: true, cancelled });
  } catch (error) {
    console.error('Cron cleanup failed:', error);
    return Response.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
