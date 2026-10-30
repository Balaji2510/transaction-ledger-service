import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app/app.js';
import { InMemoryAccountRepository } from '../../src/modules/accounts/repositories/in-memory-account.repository.js';

describe('Swagger Documentation & Request Tracing Integration Tests', () => {
  const app = createApp({ accountRepository: new InMemoryAccountRepository() });

  it('should serve OpenAPI 3.0 specification at /api-docs.json', async () => {
    const res = await request(app).get('/api-docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('Transaction Ledger Service API');
    expect(res.body.paths['/api/v1/accounts']).toBeDefined();
    expect(res.body.paths['/api/v1/accounts/transfer']).toBeDefined();
  });

  it('should serve interactive Swagger UI HTML at /docs', async () => {
    const res = await request(app).get('/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui');
    expect(res.text).toContain('/api-docs.json');
  });

  it('should attach x-correlation-id to response headers for distributed tracing', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  it('should propagate client provided x-correlation-id', async () => {
    const customCorrelationId = 'client-trace-uuid-12345';
    const res = await request(app)
      .get('/health')
      .set('x-correlation-id', customCorrelationId);

    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBe(customCorrelationId);
  });
});
