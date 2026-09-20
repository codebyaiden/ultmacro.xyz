(function (root) {
	'use strict';

	async function request(path, options) {
		const response = await fetch(`/api/strategies${path}`, { credentials: 'same-origin', ...options });
		let body = null;
		try { body = await response.json(); } catch (_) { body = null; }
		if (!response.ok) {
			const error = new Error(body?.error || `Request failed (${response.status})`);
			error.status = response.status;
			error.details = body?.details;
			throw error;
		}
		return body;
	}

	function params(values) {
		const query = new URLSearchParams();
		Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '' && value !== false) query.set(key, String(value)); });
		return query.toString();
	}

	function list(filters) {
		const query = params(filters);
		return request(query ? `?${query}` : '');
	}

	function detail(identifier) {
		return request(`/${encodeURIComponent(identifier)}`);
	}

	function publish(formData, existingId) {
		return request(existingId ? `/${encodeURIComponent(existingId)}/versions` : '', { method: 'POST', body: formData });
	}

	function jsonPost(path, payload) {
		return request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
	}

	function rate(id, rating) { return jsonPost(`/${encodeURIComponent(id)}/ratings`, { rating }); }
	function report(id, payload) { return jsonPost(`/${encodeURIComponent(id)}/reports`, payload); }
	function installIntent(id, version) { return jsonPost(`/${encodeURIComponent(id)}/install-intents`, { version }); }
	function installEvent(id, payload) { return jsonPost(`/${encodeURIComponent(id)}/install-events`, payload); }

	async function health() {
		const response = await fetch('/api/health', { credentials: 'same-origin' });
		let body = null;
		try { body = await response.json(); } catch (_) { body = null; }
		if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
		return body;
	}

	async function adminRequest(path, options) {
		const response = await fetch(`/api/admin${path}`, { credentials: 'same-origin', ...options });
		let body = null;
		try { body = await response.json(); } catch (_) { body = null; }
		if (!response.ok) {
			const error = new Error(body?.error || `Admin request failed (${response.status})`);
			error.status = response.status;
			throw error;
		}
		return body;
	}

	function adminJson(path, payload) { return adminRequest(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); }

	root.StrategyNetworkApi = { list, detail, publish, rate, report, installIntent, installEvent, health, adminRequest, adminJson };
})(window);
