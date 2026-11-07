(() => {
  const card = document.querySelector('[data-notification-detail]');
  const heading = document.querySelector('[data-detail-title]');
  if (!card) return;
  const id = new URL(location.href).searchParams.get('id') || '';
  const date = value => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
  };
  const api = async () => {
    await fetch('/api/dashboard/v1/session/bootstrap', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: '{}' });
    return fetch(`/api/dashboard/v1/notifications/detail?id=${encodeURIComponent(id)}`, { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } });
  };
  (async () => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('This alert link is not valid.');
    const response = await api();
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'This alert is no longer available.');
    const item = data.notification;
    heading.textContent = item.title;
    const title = document.createElement('h2'); title.textContent = item.title;
    const body = document.createElement('p'); body.textContent = item.body;
    const occurred = document.createElement('time'); occurred.dateTime = item.occurredAt; occurred.textContent = date(item.occurredAt);
    card.replaceChildren(title, body, occurred);
  })().catch(error => {
    heading.textContent = 'Alert unavailable';
    const message = document.createElement('p'); message.textContent = error.message;
    const activity = document.createElement('a'); activity.href = '/dashboard/activity/'; activity.textContent = 'Open Activity';
    card.replaceChildren(message, activity);
  });
})();
