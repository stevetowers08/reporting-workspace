/**
 * Aggregated metrics endpoint with short server-side cache
 */

const CACHE_TTL_MS = 120_000; // 120s
let lastCacheKey = '';
let lastCacheAt = 0;
let lastPayload: Response | null = null;

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get('clientId');
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'clientId is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const cacheKey = `${clientId}:${start || ''}:${end || ''}`;
    const now = Date.now();
    if (lastPayload && cacheKey === lastCacheKey && (now - lastCacheAt) < CACHE_TTL_MS) {
      return new Response(lastPayload.body, lastPayload);
    }

    const dateRange = start && end
      ? { start, end }
      : (() => {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 30);
          return { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] };
        })();

    // Dynamic import to keep API file light
    const { EventMetricsService } = await import('@/services/data/eventMetricsService');
    const { DatabaseService } = await import('@/services/data/databaseService');

    const client = await DatabaseService.getClientById(clientId);
    if (!client) {
      return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const metrics = await EventMetricsService.getComprehensiveMetrics(
      clientId,
      dateRange,
      client.accounts,
      client.conversion_actions,
      true
    );

    const payload = new Response(JSON.stringify(metrics), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120',
      },
    });

    lastCacheKey = cacheKey;
    lastCacheAt = now;
    lastPayload = payload;
    return payload;
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


