import http from 'http';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface Sample {
  label: string;
  elapsed: number;
  success: boolean;
  code: number;
  timestamp: number;
}

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '25', 10);
const ITERATIONS_PER_WORKER = parseInt(process.env.ITERATIONS || '15', 10);

const parsedUrl = new URL(BASE_URL);
const host = parsedUrl.hostname;
const port = parseInt(parsedUrl.port || '3000', 10);

function httpRequest(options: {
  method: string;
  path: string;
  body?: Record<string, unknown>;
}): Promise<{ statusCode: number; duration: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : undefined;
    const startTime = Date.now();

    const req = http.request(
      {
        host,
        port,
        method: options.method,
        path: options.path,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
        timeout: 5000,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          const duration = Date.now() - startTime;
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ statusCode: res.statusCode || 500, duration, data: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runWorker(workerId: number): Promise<Sample[]> {
  const samples: Sample[] = [];

  for (let i = 0; i < ITERATIONS_PER_WORKER; i++) {
    // 1. Health check
    try {
      const res = await httpRequest({ method: 'GET', path: '/health' });
      samples.push({
        label: '01 - Health Check',
        elapsed: res.duration,
        success: res.statusCode === 200,
        code: res.statusCode,
        timestamp: Date.now(),
      });
    } catch {
      samples.push({
        label: '01 - Health Check',
        elapsed: 5000,
        success: false,
        code: 500,
        timestamp: Date.now(),
      });
    }

    // 2. Create Account
    const accId = `acc_load_${workerId}_${i}_${uuidv4().substring(0, 8)}`;
    try {
      const res = await httpRequest({
        method: 'POST',
        path: '/api/v1/accounts',
        body: { id: accId, name: `Load User ${workerId}-${i}` },
      });
      samples.push({
        label: '02 - Create Account',
        elapsed: res.duration,
        success: res.statusCode === 201,
        code: res.statusCode,
        timestamp: Date.now(),
      });
    } catch {
      samples.push({
        label: '02 - Create Account',
        elapsed: 5000,
        success: false,
        code: 500,
        timestamp: Date.now(),
      });
    }

    // 3. Get Account Balance
    try {
      const res = await httpRequest({
        method: 'GET',
        path: `/api/v1/accounts/${accId}/balance`,
      });
      samples.push({
        label: '03 - Get Balance',
        elapsed: res.duration,
        success: res.statusCode === 200,
        code: res.statusCode,
        timestamp: Date.now(),
      });
    } catch {
      samples.push({
        label: '03 - Get Balance',
        elapsed: 5000,
        success: false,
        code: 500,
        timestamp: Date.now(),
      });
    }

    // 4. Credit Transaction
    try {
      const res = await httpRequest({
        method: 'POST',
        path: `/api/v1/accounts/${accId}/transactions`,
        body: {
          type: 'credit',
          amount: 500,
          referenceId: `ref_cred_${uuidv4()}`,
          description: 'Load test credit',
        },
      });
      samples.push({
        label: '04 - Credit Transaction',
        elapsed: res.duration,
        success: res.statusCode === 201,
        code: res.statusCode,
        timestamp: Date.now(),
      });
    } catch {
      samples.push({
        label: '04 - Credit Transaction',
        elapsed: 5000,
        success: false,
        code: 500,
        timestamp: Date.now(),
      });
    }

    // 5. Debit Transaction
    try {
      const res = await httpRequest({
        method: 'POST',
        path: `/api/v1/accounts/${accId}/transactions`,
        body: {
          type: 'debit',
          amount: 120,
          referenceId: `ref_deb_${uuidv4()}`,
          description: 'Load test debit',
        },
      });
      samples.push({
        label: '05 - Debit Transaction',
        elapsed: res.duration,
        success: res.statusCode === 201,
        code: res.statusCode,
        timestamp: Date.now(),
      });
    } catch {
      samples.push({
        label: '05 - Debit Transaction',
        elapsed: 5000,
        success: false,
        code: 500,
        timestamp: Date.now(),
      });
    }

    // 6. Get Transaction History
    try {
      const res = await httpRequest({
        method: 'GET',
        path: `/api/v1/accounts/${accId}/transactions?page=1&pageSize=10`,
      });
      samples.push({
        label: '06 - Get History',
        elapsed: res.duration,
        success: res.statusCode === 200,
        code: res.statusCode,
        timestamp: Date.now(),
      });
    } catch {
      samples.push({
        label: '06 - Get History',
        elapsed: 5000,
        success: false,
        code: 500,
        timestamp: Date.now(),
      });
    }

    // 7. Money Transfer (Transfer to pre-existing account)
    try {
      const res = await httpRequest({
        method: 'POST',
        path: '/api/v1/accounts/transfer',
        body: {
          fromAccountId: accId,
          toAccountId: 'acc_benchmark_target',
          amount: 50,
          referenceId: `ref_transfer_${uuidv4()}`,
        },
      });
      samples.push({
        label: '07 - Money Transfer',
        elapsed: res.duration,
        success: res.statusCode === 200,
        code: res.statusCode,
        timestamp: Date.now(),
      });
    } catch {
      samples.push({
        label: '07 - Money Transfer',
        elapsed: 5000,
        success: false,
        code: 500,
        timestamp: Date.now(),
      });
    }
  }

  return samples;
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🔥 Transaction Ledger Service - Load Testing Runner`);
  console.log(`======================================================`);
  console.log(`Target:         ${BASE_URL}`);
  console.log(`Concurrency:    ${CONCURRENCY} concurrent workers`);
  console.log(`Iterations:     ${ITERATIONS_PER_WORKER} per worker`);
  console.log(`Total Planned:  ~${CONCURRENCY * ITERATIONS_PER_WORKER * 7} requests\n`);

  // Ensure target account exists
  try {
    await httpRequest({
      method: 'POST',
      path: '/api/v1/accounts',
      body: { id: 'acc_benchmark_target', name: 'Benchmark Shared Target' },
    });
  } catch {
    // Already exists or ignore
  }

  const startTime = Date.now();
  console.log('⚡ Executing concurrent load test...');

  const workerPromises: Promise<Sample[]>[] = [];
  for (let w = 1; w <= CONCURRENCY; w++) {
    workerPromises.push(runWorker(w));
  }

  const results = await Promise.all(workerPromises);
  const totalDurationSec = (Date.now() - startTime) / 1000;

  const samples: Sample[] = results.flat();
  const totalRequests = samples.length;
  const successfulRequests = samples.filter((s) => s.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const errorRate = (failedRequests / totalRequests) * 100;
  const throughput = totalRequests / totalDurationSec;

  const elapseds = samples.map((s) => s.elapsed).sort((a, b) => a - b);
  const min = elapseds[0] || 0;
  const max = elapseds[elapseds.length - 1] || 0;
  const sum = elapseds.reduce((a, b) => a + b, 0);
  const avg = elapseds.length ? sum / elapseds.length : 0;
  const p50 = elapseds[Math.floor(elapseds.length * 0.5)] || 0;
  const p90 = elapseds[Math.floor(elapseds.length * 0.9)] || 0;
  const p95 = elapseds[Math.floor(elapseds.length * 0.95)] || 0;
  const p99 = elapseds[Math.floor(elapseds.length * 0.99)] || 0;

  // Calculate Performance Score (100-point rubric)
  let score = 0;
  if (errorRate === 0) score += 40;
  else if (errorRate < 1) score += 35;
  else if (errorRate < 5) score += 20;

  if (avg < 30) score += 30;
  else if (avg < 75) score += 25;
  else if (avg < 150) score += 20;
  else score += 10;

  if (throughput > 400) score += 30;
  else if (throughput > 200) score += 25;
  else if (throughput > 100) score += 20;
  else score += 10;

  let grade = 'A+';
  if (score < 90) grade = 'A';
  if (score < 80) grade = 'B';
  if (score < 70) grade = 'C';

  console.log(`\n======================================================`);
  console.log(`🏆 LOAD TESTING SCORECARD`);
  console.log(`======================================================`);
  console.log(`Overall Score:      ${score} / 100  (Grade: ${grade})`);
  console.log(`Total Requests:     ${totalRequests.toLocaleString()}`);
  console.log(`Successful:         ${successfulRequests.toLocaleString()} (${(100 - errorRate).toFixed(2)}%)`);
  console.log(`Failed:             ${failedRequests.toLocaleString()} (${errorRate.toFixed(2)}%)`);
  console.log(`Duration:           ${totalDurationSec.toFixed(2)}s`);
  console.log(`Throughput:         ${throughput.toFixed(1)} req/sec`);
  console.log(`Average Latency:    ${avg.toFixed(1)} ms`);
  console.log(`Median (P50):       ${p50} ms`);
  console.log(`90th Percentile:    ${p90} ms`);
  console.log(`95th Percentile:    ${p95} ms`);
  console.log(`99th Percentile:    ${p99} ms`);
  console.log(`Min / Max Latency:  ${min} ms / ${max} ms`);
  console.log(`======================================================\n`);

  // Write JMeter-compatible JTL file
  const jmeterDir = path.resolve(process.cwd(), 'jmeter');
  if (!fs.existsSync(jmeterDir)) {
    fs.mkdirSync(jmeterDir, { recursive: true });
  }

  const jtlRows = [
    'timeStamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,failureMessage,bytes,sentBytes,grpThreads,allThreads,URL,Latency,IdleTime,Connect',
  ];

  samples.forEach((s, idx) => {
    jtlRows.push(
      `${s.timestamp},${s.elapsed},${s.label},${s.code},${s.success ? 'OK' : 'Error'},thread-${(idx % CONCURRENCY) + 1},text,${s.success},,128,64,${CONCURRENCY},${CONCURRENCY},${BASE_URL},${s.elapsed},0,1`
    );
  });

  const jtlPath = path.join(jmeterDir, 'results.jtl');
  fs.writeFileSync(jtlPath, jtlRows.join('\n'));
  console.log(`📁 JMeter results exported to: ${jtlPath}`);
}

main().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
