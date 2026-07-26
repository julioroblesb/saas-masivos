import { performance } from 'node:perf_hooks';

const baseUrl = new URL(process.env.LOAD_BASE_URL ?? 'http://127.0.0.1:3000');
const tenantSteps = (process.env.LOAD_TENANTS ?? '5,10,20')
  .split(',')
  .map(Number)
  .filter((value) => Number.isInteger(value) && value > 0);
const requestsPerTenant = Number(process.env.LOAD_REQUESTS_PER_TENANT ?? 20);
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 20);
const p95BudgetMs = Number(process.env.LOAD_P95_BUDGET_MS ?? 1_000);
const minimumSuccessRate = Number(process.env.LOAD_MIN_SUCCESS_RATE ?? 0.99);

if (
  tenantSteps.length === 0 ||
  !Number.isInteger(requestsPerTenant) ||
  requestsPerTenant < 1 ||
  !Number.isInteger(concurrency) ||
  concurrency < 1
) {
  throw new Error('Invalid load-test configuration');
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
}

async function runStep(tenantCount) {
  const jobs = Array.from(
    { length: tenantCount * requestsPerTenant },
    (_, index) => ({
      tenant: (index % tenantCount) + 1,
      request: Math.floor(index / tenantCount) + 1,
    }),
  );
  const latencies = [];
  let succeeded = 0;
  let failed = 0;
  let cursor = 0;
  const startedAt = performance.now();

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      const started = performance.now();
      try {
        const response = await fetch(new URL('/api/health', baseUrl), {
          headers: {
            'x-load-tenant': `tenant-${job.tenant}`,
            'x-load-request': String(job.request),
          },
          signal: AbortSignal.timeout(10_000),
        });
        latencies.push(performance.now() - started);
        if (response.ok) succeeded += 1;
        else failed += 1;
        await response.arrayBuffer();
      } catch {
        latencies.push(performance.now() - started);
        failed += 1;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker()),
  );

  const total = succeeded + failed;
  const successRate = total === 0 ? 0 : succeeded / total;
  return {
    tenants: tenantCount,
    requests: total,
    concurrency: Math.min(concurrency, jobs.length),
    duration_ms: Math.round(performance.now() - startedAt),
    success_rate: Number(successRate.toFixed(4)),
    latency_ms: {
      p50: Math.round(percentile(latencies, 50)),
      p95: Math.round(percentile(latencies, 95)),
      p99: Math.round(percentile(latencies, 99)),
      max: Math.round(Math.max(...latencies)),
    },
    passed: successRate >= minimumSuccessRate && percentile(latencies, 95) <= p95BudgetMs,
  };
}

const results = [];
for (const tenantCount of tenantSteps) {
  results.push(await runStep(tenantCount));
}

const report = {
  timestamp: new Date().toISOString(),
  target: new URL('/api/health', baseUrl).toString(),
  thresholds: {
    minimum_success_rate: minimumSuccessRate,
    p95_budget_ms: p95BudgetMs,
  },
  results,
};

console.log(JSON.stringify(report, null, 2));
if (results.some((result) => !result.passed)) process.exit(1);
