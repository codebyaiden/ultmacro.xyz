(() => {
  'use strict';
  const form = document.getElementById('bug-form');
  if (!(form instanceof HTMLFormElement)) return;
  const status = document.getElementById('delivery-status');
  const send = document.getElementById('submit-report');
  const message = document.getElementById('report-message');
  const preview = document.getElementById('report-preview');
  const previewText = document.getElementById('report-preview-text');
  const previewButton = document.getElementById('preview-report');
  const copyButton = document.getElementById('copy-report');
  const success = document.getElementById('report-success');
  const receipt = document.getElementById('report-receipt');
  const guidance = document.getElementById('context-guidance');
  const tips = {
    macro: 'Include the tower, wave and action where the macro fails. Check F2 pause and F3 stop behavior.',
    setup: 'Include any AutoHotkey or OCR error and your display settings. Never paste Windows account paths.',
    strategy: 'Include the map, tower and strategy version. Avoid posting entire strategy files here.',
    website: 'Name the page, device and exact action that failed. This helps us reproduce it.',
    other: 'Explain what you were trying to do and the exact result.'
  };
  let startedAt = Date.now();
  let available = false;
  let busy = false;
  const fields = ['category', 'version', 'system', 'frequency', 'title', 'steps', 'expected', 'actual', 'notes', 'logExcerpt'];
  const privateContent = /(?:https?:\/\/|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\b(?:password|secret|token|authorization|cookie|api[_-]?key|webhook)\s*[:=]|[a-z]:\\users\\|\/users\/[^/\s]+)/i;

  const field = name => form.elements.namedItem(name);
  const data = () => Object.fromEntries(fields.map(name => [name, field(name).value.trim()]));
  const setMessage = (value, isError = false) => {
    message.textContent = value;
    message.dataset.error = String(isError);
  };
  const explain = (ready, text) => {
    available = ready;
    status.dataset.ready = String(ready);
    status.querySelector('span:last-child').textContent = text;
    send.disabled = !ready;
  };
  const reportText = d => [
    'ULTIMATE MACRO · BUG REPORT',
    '',
    'Title: ' + d.title,
    'Area: ' + d.category,
    'UM version: ' + d.version,
    'Device / OS: ' + d.system,
    'Frequency: ' + d.frequency,
    '',
    'Steps to reproduce:',
    d.steps,
    '',
    'Expected:',
    d.expected,
    '',
    'Actual:',
    d.actual,
    d.notes ? '\nExtra context:\n' + d.notes : '',
    d.logExcerpt ? '\nReviewed log excerpt:\n' + d.logExcerpt : ''
  ].filter(Boolean).join('\n');

  function validateForPreview() {
    for (const name of ['category','version','system','title','steps','expected','actual','frequency']) {
      const input = field(name);
      if (!input.checkValidity()) {
        input.reportValidity();
        return false;
      }
    }
    const d = data();
    if (Object.values(d).some(v => privateContent.test(v))) {
      setMessage('Private information or links detected. Remove those before previewing or sending.', true);
      field('logExcerpt').focus();
      return false;
    }
    return true;
  }

  const refreshStatus = async () => {
    try {
      const response = await fetch('/api/bug-reports/v1/health', { cache: 'no-store', credentials: 'same-origin' });
      const body = await response.json();
      if (response.ok && body.receiving === true) {
        explain(true, 'Private staff inbox connected');
        setMessage('Review your report before sending. No files or device data are collected automatically.');
      } else {
        explain(false, 'Staff report delivery not configured');
        setMessage('Sending is unavailable right now. You can still preview and copy your report.');
      }
    } catch {
      explain(false, 'Staff report delivery unavailable');
      setMessage('Unable to reach the report server. You can still preview and copy your report.');
    }
  };

  field('category').addEventListener('change', () => {
    guidance.textContent = tips[field('category').value] || 'Explain the issue and how to reproduce it.';
  });
  previewButton.addEventListener('click', () => {
    if (!validateForPreview()) return;
    previewText.textContent = reportText(data());
    preview.hidden = false;
    preview.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    setMessage('Review this text carefully. It is what staff will receive.');
  });
  document.getElementById('close-preview').addEventListener('click', () => { preview.hidden = true; });
  copyButton.addEventListener('click', async () => {
    if (!validateForPreview()) return;
    try {
      await navigator.clipboard.writeText(reportText(data()));
      setMessage('Report copied. You can paste it into a Discord support ticket.');
    } catch {
      previewButton.click();
      setMessage('Clipboard unavailable. Copy the text from the report preview.', true);
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity() || !validateForPreview()) return;
    if (!available) { setMessage('Staff delivery is not connected. Copy your report instead.', true); return; }
    const d = { ...data(), website: field('website').value, consent: field('consent').checked, startedAt };
    busy = true;
    send.disabled = true;
    send.textContent = 'Sending…';
    setMessage('Sending to the private staff inbox…');
    try {
      const response = await fetch('/api/bug-reports/v1/reports', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(d)
      });
      const result = await response.json();
      if (response.status === 202 && result.delivered === true && /^UM-[A-F0-9]{12}$/.test(result.receipt || '')) {
        form.hidden = true;
        preview.hidden = true;
        receipt.textContent = result.receipt;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'auto' });
        return;
      }
      setMessage(result.error || 'Could not deliver the report. Copy it and try again later.', true);
      if (response.status === 503) await refreshStatus();
    } catch {
      setMessage('The connection failed. Your report is still here; copy it or retry.', true);
    } finally {
      busy = false;
      send.textContent = 'Send to staff ↗';
      send.disabled = !available;
    }
  });
  void refreshStatus();
})();
