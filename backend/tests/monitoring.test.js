const test = require('node:test');
const assert = require('node:assert/strict');

const { createMonitoringState } = require('../lib/monitoring');

test('monitoring snapshot exposes counters and a degraded state when the database is down', () => {
  const timeline = [1000, 2000, 3500];
  const monitoring = createMonitoringState({
    serviceName: 'AHEDNA API',
    version: '0.1.0',
    now: () => timeline.shift() ?? 3500,
  });

  monitoring.onRequestStart();
  monitoring.onRequestComplete({ statusCode: 503 });

  const snapshot = monitoring.getSnapshot({
    database: {
      ok: false,
      checkedAt: '2026-04-27T10:00:00.000Z',
      latencyMs: 83,
      message: 'Database timeout',
    },
  });

  assert.equal(snapshot.status, 'degraded');
  assert.equal(snapshot.counters.totalRequests, 1);
  assert.equal(snapshot.counters.totalErrors, 1);
  assert.equal(snapshot.counters.activeRequests, 0);
  assert.equal(snapshot.database.ok, false);
  assert.equal(snapshot.uptimeSeconds, 2.5);
});

test('monitoring metrics expose Prometheus-compatible gauges and counters', () => {
  const monitoring = createMonitoringState({
    version: '0.1.0',
  });

  monitoring.onRequestStart();
  monitoring.onRequestComplete({ statusCode: 200 });

  const metrics = monitoring.getMetrics({
    database: {
      ok: true,
      checkedAt: '2026-04-27T10:00:00.000Z',
      latencyMs: 12,
      message: 'Database connection successful',
    },
  });

  assert.match(metrics, /ahedna_requests_total 1/);
  assert.match(metrics, /ahedna_request_errors_total 0/);
  assert.match(metrics, /ahedna_database_up 1/);
  assert.match(metrics, /ahedna_database_latency_ms 12/);
});
