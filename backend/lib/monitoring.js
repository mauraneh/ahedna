function roundMetric(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(3));
}

function isoDate(timestamp) {
  return new Date(timestamp).toISOString();
}

function createMonitoringState(options = {}) {
  const serviceName = options.serviceName || 'AHEDNA API';
  const version = options.version || '0.0.0';
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const startedAtMs = now();

  let totalRequests = 0;
  let totalErrors = 0;
  let activeRequests = 0;
  let lastRequestAt = null;
  let lastErrorAt = null;

  function onRequestStart() {
    totalRequests += 1;
    activeRequests += 1;
    lastRequestAt = isoDate(now());
  }

  function onRequestComplete(meta = {}) {
    activeRequests = Math.max(0, activeRequests - 1);

    if (Number(meta.statusCode) >= 500) {
      totalErrors += 1;
      lastErrorAt = isoDate(now());
    }
  }

  function getSnapshot({ database } = {}) {
    const currentNow = now();
    const uptimeSeconds = Math.max(0, (currentNow - startedAtMs) / 1000);
    const memoryUsage = process.memoryUsage();
    const resolvedDatabase = database || {
      ok: false,
      checkedAt: isoDate(currentNow),
      latencyMs: null,
      message: 'Database status unavailable',
    };

    return {
      status: resolvedDatabase.ok ? 'ok' : 'degraded',
      service: serviceName,
      version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: isoDate(currentNow),
      startedAt: isoDate(startedAtMs),
      uptimeSeconds: roundMetric(uptimeSeconds),
      database: resolvedDatabase,
      counters: {
        totalRequests,
        totalErrors,
        activeRequests,
        errorRate: totalRequests === 0 ? 0 : roundMetric(totalErrors / totalRequests),
      },
      system: {
        nodeVersion: process.version,
        pid: process.pid,
        memoryRssBytes: memoryUsage.rss,
        heapUsedBytes: memoryUsage.heapUsed,
        heapTotalBytes: memoryUsage.heapTotal,
        externalBytes: memoryUsage.external,
      },
      lastRequestAt,
      lastErrorAt,
    };
  }

  function getMetrics({ database } = {}) {
    const snapshot = getSnapshot({ database });
    const databaseUp = snapshot.database.ok ? 1 : 0;
    const databaseLatency = snapshot.database.latencyMs ?? 0;

    return [
      '# HELP ahedna_uptime_seconds Application uptime in seconds',
      '# TYPE ahedna_uptime_seconds gauge',
      `ahedna_uptime_seconds ${snapshot.uptimeSeconds}`,
      '# HELP ahedna_requests_total Total HTTP requests observed by the API',
      '# TYPE ahedna_requests_total counter',
      `ahedna_requests_total ${snapshot.counters.totalRequests}`,
      '# HELP ahedna_request_errors_total Total HTTP requests answered with a 5xx status',
      '# TYPE ahedna_request_errors_total counter',
      `ahedna_request_errors_total ${snapshot.counters.totalErrors}`,
      '# HELP ahedna_active_requests Current number of active HTTP requests',
      '# TYPE ahedna_active_requests gauge',
      `ahedna_active_requests ${snapshot.counters.activeRequests}`,
      '# HELP ahedna_database_up Database readiness status',
      '# TYPE ahedna_database_up gauge',
      `ahedna_database_up ${databaseUp}`,
      '# HELP ahedna_database_latency_ms Database health check latency in milliseconds',
      '# TYPE ahedna_database_latency_ms gauge',
      `ahedna_database_latency_ms ${databaseLatency}`,
      '# HELP ahedna_process_rss_bytes Resident memory size used by the Node.js process',
      '# TYPE ahedna_process_rss_bytes gauge',
      `ahedna_process_rss_bytes ${snapshot.system.memoryRssBytes}`,
      '',
    ].join('\n');
  }

  return {
    onRequestStart,
    onRequestComplete,
    getSnapshot,
    getMetrics,
  };
}

module.exports = {
  createMonitoringState,
};
