import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
const { default: handler, runHourlyEarningsSummary, crossedEarningsMilestone } = await import('../api/dashboard-pairing.mjs?remote-tests');
const owner = `um_dashboard_owner=${'r'.repeat(48)}`;
const call = async (route, { method = 'GET', body, token } = {}) => {
  const headers = new Headers({ cookie: owner, accept: 'application/json', origin: 'http://localhost' });
  if (body !== undefined) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await handler(new Request(`http://localhost/api/dashboard/v1${route}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  }));
  return { response, data: await response.json() };
};

test('remote controls require a fresh PC state, deliver once, and accept an authenticated result', async () => {
  const issued = await call('/pairing-codes', { method: 'POST', body: {} });
  assert.equal(issued.response.status, 201);
  const code = issued.data.code;
  const claimed = await call('/pairing/claim', { method: 'POST', body: { code, deviceName: 'Test PC', appVersion: 'test-1' } });
  assert.equal(claimed.response.status, 201);
  const deviceToken = claimed.data.deviceToken;
  const snapshot = { runState: 'stopped', activeStrategy: 'Example', activeSlot: 1, rotationEnabled: false, map: '', mode: '', strategySlots: [{ slot: 1, name: 'Example' }] };
  await call('/heartbeat', { method: 'POST', token: deviceToken, body: { appVersion: 'test-1', snapshot } });

  const started = await call('/remote/commands', { method: 'POST', body: { deviceId: claimed.data.deviceId, command: 'start' } });
  assert.equal(started.response.status, 202);
  const duplicate = await call('/remote/commands', { method: 'POST', body: { deviceId: claimed.data.deviceId, command: 'start' } });
  assert.equal(duplicate.response.status, 409);

  const poll = await call('/remote/commands/poll', { method: 'POST', token: deviceToken, body: {} });
  assert.equal(poll.data.commands.length, 1);
  assert.equal(poll.data.commands[0].action, 'start');
  const secondPoll = await call('/remote/commands/poll', { method: 'POST', token: deviceToken, body: {} });
  assert.equal(secondPoll.data.commands.length, 0);

  const result = await call('/remote/commands/result', { method: 'POST', token: deviceToken, body: { id: poll.data.commands[0].id, status: 'succeeded', message: 'Received.' } });
  assert.equal(result.response.status, 200);
  const stale = await call('/remote/commands/result', { method: 'POST', token: deviceToken, body: { id: poll.data.commands[0].id, status: 'succeeded' } });
  assert.equal(stale.response.status, 409);

  const event = {
    eventId: 'a'.repeat(32), sequence: 1, type: 'game.joined',
    occurredAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), appVersion: 'test-1',
    runId: 'b'.repeat(32), source: 'screen', confidence: 'observed',
    data: { map: 'Fallen', mode: 'Molten' }
  };
  const uploaded = await call('/events', { method: 'POST', token: deviceToken, body: { events: [event] } });
  assert.equal(uploaded.response.status, 200);
  const feed = await call('/events?limit=10');
  assert.equal(feed.data.events[0].type, 'game.joined');
  assert.equal(feed.data.events[0].data.map, 'Fallen');

  const summaryBoundary = Math.floor(Date.now() / 3600000) * 3600000;
  const resultEvent = {
    eventId: 'c'.repeat(32), sequence: 2, type: 'match.victory',
    occurredAt: new Date(summaryBoundary - 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'), appVersion: 'test-1',
    runId: 'b'.repeat(32), source: 'screen', confidence: 'observed',
    data: { map: 'Fallen', coins: 100000, gems: 25, towerXp: 1000, durationSeconds: 494 }
  };
  const resultUpload = await call('/events', { method: 'POST', token: deviceToken, body: { events: [resultEvent] } });
  assert.equal(resultUpload.response.status, 200);
  const earnings = await call('/earnings?range=day');
  assert.equal(earnings.response.status, 200);
  assert.deepEqual(earnings.data.totals, { coins: 100000, gems: 25, towerXp: 1000 });
  assert.equal(earnings.data.latest[0].type, 'match.victory');
  const hourly = await runHourlyEarningsSummary(summaryBoundary + 1000);
  assert.equal(hourly.created, 1);
  assert.equal((await runHourlyEarningsSummary(summaryBoundary + 1000)).created, 0);
  assert.equal(crossedEarningsMilestone(99999, 100000, 100000), 100000);
  assert.equal(crossedEarningsMilestone(100000, 100250, 100000), 0);
  const retry = await call('/events', { method: 'POST', token: deviceToken, body: { events: [resultEvent] } });
  assert.equal(retry.data.accepted, 0);
  const anonymous = await handler(new Request('http://localhost/api/dashboard/v1/earnings?range=day'));
  assert.equal(anonymous.status, 401);
});
