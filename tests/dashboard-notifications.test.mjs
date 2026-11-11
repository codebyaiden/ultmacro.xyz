import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
const { default: handler } = await import('../api/dashboard-pairing.mjs');

const endpoint = 'https://push.example.invalid/dashboard-test';
const pushSubscription = { endpoint, keys: { p256dh: 'A'.repeat(44), auth: 'B'.repeat(20) } };
const freshOwner = () => `um_dashboard_owner=${Array.from({ length: 48 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')}`;
const request = async (route, { owner = freshOwner(), method = 'GET', body, authorization } = {}) => {
  const headers = new Headers({ cookie: owner, accept: 'application/json', origin: 'http://localhost' });
  if (body !== undefined) headers.set('content-type', 'application/json');
  if (authorization) headers.set('authorization', authorization);
  const response = await handler(new Request(`http://localhost/api/dashboard/v1${route}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  }));
  return { response, data: await response.json() };
};

test('notification preferences are owner-scoped and can inherit account settings', async () => {
  const owner = freshOwner();
  const defaults = await request('/notifications/preferences', { owner });
  assert.equal(defaults.response.status, 200);
  assert.equal(defaults.data.effective.runEvents, 'off');
  assert.equal(defaults.data.effective.hourlySummary, 'off');
  assert.equal(defaults.data.effective.milestones, 'off');

  const saved = await request('/notifications/preferences', {
    owner, method: 'PUT', body: { scope: 'account', preferences: { results: 'errors', runEvents: 'all', connection: 'offline', hourlySummary: 'hourly', milestones: 'on' } }
  });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.data.account.runEvents, 'all');
  assert.equal(saved.data.account.hourlySummary, 'hourly');
  assert.equal(saved.data.account.milestones, 'on');
  const otherOwner = await request('/notifications/preferences', { owner: freshOwner() });
  assert.equal(otherOwner.data.account.runEvents, 'off');

  const subscribed = await request('/notifications/subscriptions', { owner, method: 'POST', body: { subscription: pushSubscription } });
  assert.equal(subscribed.response.status, 201);
  assert.match(subscribed.data.deviceId, /^[a-f0-9]{64}$/);
  const devicePrefs = await request('/notifications/preferences', {
    owner, method: 'PUT', body: { scope: 'device', deviceId: subscribed.data.deviceId, preferences: { results: 'all', runEvents: 'runs', connection: 'all', hourlySummary: 'off', milestones: 'off' } }
  });
  assert.equal(devicePrefs.data.effective.runEvents, 'runs');
  const reset = await request('/notifications/preferences', { owner, method: 'DELETE', body: { scope: 'device', deviceId: subscribed.data.deviceId } });
  assert.equal(reset.data.effective.runEvents, 'all');

  const offline = await request(`/notifications/detail?id=11111111-1111-4111-8111-111111111111`, { owner });
  assert.equal(offline.response.status, 410);
});
