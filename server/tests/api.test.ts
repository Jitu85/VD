import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import type { PlatformStore, PublicModule, PublicSettings } from '../src/contracts.js';

class MemoryStore implements PlatformStore {
  public healthy = true;

  async ping(): Promise<void> {
    if (!this.healthy) throw new Error('Database unavailable');
  }

  async getPublicSettings(): Promise<PublicSettings> {
    return { guestLoginEnabled: false };
  }

  async listPublicModules(): Promise<PublicModule[]> {
    return [
      {
        code: 'A',
        title: 'English Grammar & Composition',
        description: 'Interactive grammar practice.',
        status: 'published',
        routeSlug: 'grammar',
        sortOrder: 10,
      },
    ];
  }
}

async function withServer(
  callback: (baseUrl: string, store: MemoryStore) => Promise<void>,
): Promise<void> {
  const store = new MemoryStore();
  const app = createApp({
    store,
    corsOrigins: ['http://127.0.0.1:4173'],
    environment: 'test',
  });
  const server: Server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${port}`, store);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('health endpoint reports a usable store', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok(response.headers.get('x-request-id'));
    assert.deepEqual(await response.json(), { data: { status: 'ok' } });
  });
});

test('health endpoint does not leak database failures', async () => {
  await withServer(async (baseUrl, store) => {
    store.healthy = false;
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json() as { error: { code: string; message: string } };
    assert.equal(response.status, 503);
    assert.equal(body.error.code, 'DATABASE_UNAVAILABLE');
    assert.equal(body.error.message, 'The service is temporarily unavailable.');
  });
});

test('public settings and modules use the persistence contract', async () => {
  await withServer(async (baseUrl) => {
    const [settingsResponse, modulesResponse] = await Promise.all([
      fetch(`${baseUrl}/api/v1/settings/public`),
      fetch(`${baseUrl}/api/v1/modules`),
    ]);
    assert.equal(settingsResponse.status, 200);
    assert.deepEqual(await settingsResponse.json(), { data: { guestLoginEnabled: false } });
    assert.equal(modulesResponse.status, 200);
    assert.deepEqual(await modulesResponse.json(), {
      data: [{
        code: 'A',
        title: 'English Grammar & Composition',
        description: 'Interactive grammar practice.',
        status: 'published',
        routeSlug: 'grammar',
        sortOrder: 10,
      }],
    });
  });
});

test('unknown endpoints return a stable JSON error contract', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/not-real`);
    const body = await response.json() as { error: { code: string; requestId: string } };
    assert.equal(response.status, 404);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.ok(body.error.requestId);
  });
});

test('unapproved browser origins are rejected', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/modules`, {
      headers: { Origin: 'https://unapproved.example' },
    });
    const body = await response.json() as { error: { code: string } };
    assert.equal(response.status, 403);
    assert.equal(body.error.code, 'ORIGIN_NOT_ALLOWED');
  });
});

test('malformed JSON returns a request-scoped validation error', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/not-real`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });
    const body = await response.json() as { error: { code: string; requestId: string } };
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'MALFORMED_JSON');
    assert.ok(body.error.requestId);
    assert.equal(body.error.requestId, response.headers.get('x-request-id'));
  });
});
