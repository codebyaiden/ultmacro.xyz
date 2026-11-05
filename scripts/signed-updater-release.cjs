'use strict';

const { constants, createHash, createPublicKey, verify } = require('node:crypto');
const { RELEASE_BASE } = require('../src/releases-data.js');

const FEED = 'https://keys.ultmacro.xyz/keys/ahk-updates/';
const VERSION = /^1\.4\.(?:0|[1-9][0-9]{0,4})\.(?:0|[1-9][0-9]{0,4})$/u;
const FIELDS = ['Version', 'Channel', 'Url', 'Sha256', 'Bytes', 'IssuedAt', 'ExpiresAt'];
const MAX_ZIP = 256 * 1024 * 1024;
const utf8 = new TextDecoder('utf-8', { fatal: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const need = (condition, message) => { if (!condition) throw new Error(message); };

// Same public SPKI as the Windows updater and the VPS publisher. Never load a
// verification key from the feed or from an environment variable.
const KEY = createPublicKey({
  type: 'spki',
  format: 'der',
  key: Buffer.from([
    'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA6U5ag5h2XurUdMy+1+0t',
    'zyIlpaJbVqvnocaFlhnqFj+WWXh2Kry0cjTddE/kY4KK+CiavZguX0vIlFVYlun7',
    'vUCqm0dZ6pOt0XXU26lmFpT/YrVaMGkKevzuQwuc0dEhPRI+fsm9hipZP42yB9Rr',
    'LNVw5ccOTUKW9js6lLa7/42F5Gx1QZaNnsBJCGEFsmNk0PaNSXRlvdbdLrsOEqFY',
    'SSQI1wAWTK3YMEMC0fVvqdKVRQlfglluV9efeUHRDOnG6igDxgSCNsxuIy0CjueD',
    'e+cKAd3SJXtvkXEsXtAjoJJPb6KDNUCBiC61lY5lmKWbV/sjI3i+cDcEKRYqHTZQ',
    '1CZwyA72k8y8Rba/fWuTEvpcAfBcVkWILOcDn+Yo2rNAUlfM6wGzp6qCVCjShiAl',
    'ukpKZ/F4Omx+bV9XQr0AT+ctaBT32/XuxbJcqgDECaleRZBp0CHAMZfqUVbP3kve',
    'yjp6WjKm8JZnwo5n02emHSajK240ctxaI178uQZWCfITsZgVZhA/rfDB0ElswU36',
    'JAoVa15Fur+i6MWEjBwGylHOtG5yT1ZV/1ZcWN6KQHsiXomKGwLvLeU0t8kNbn//',
    'BYiGFij3awCU1d0tqeUM+ETtSlr56sWv7fHtNMTJCz2QA5V8z6E864n9s9QfLnt7',
    '2/k3RgehbC9YKD2w4YJUaUkCAwEAAQ=='
  ].join(''), 'base64')
});
need(sha256(KEY.export({ type: 'spki', format: 'der' })) ===
  '503a3ee6b92e738db190897c436abaf0e57d78e62899e29c254dae2aaa4afe0d', 'Updater public key pin mismatch');

function utc(value) {
  const time = Date.parse(value);
  need(typeof value === 'string' && Number.isFinite(time) &&
    new Date(time).toISOString().replace('.000Z', 'Z') === value, 'Invalid updater timestamp');
  return time;
}

function parseOffer(raw, sig, { key = KEY, now = Date.now() } = {}) {
  need(raw.length > 0 && raw.length <= 16384 && sig.length === 512, 'Invalid updater manifest/signature size');
  need(key.asymmetricKeyType === 'rsa' && key.asymmetricKeyDetails?.modulusLength === 4096,
    'Invalid updater verification key');
  need(verify('sha256', raw, { key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }, sig),
    'Updater manifest signature rejected');
  const offer = JSON.parse(utf8.decode(raw));
  need(offer && typeof offer === 'object' && Object.keys(offer).length === FIELDS.length &&
    FIELDS.every(field => Object.hasOwn(offer, field)) && Buffer.from(JSON.stringify(offer)).equals(raw),
    'Unexpected updater manifest fields or encoding');
  need(typeof offer.Version === 'string' && VERSION.test(offer.Version) && offer.Channel === 'ahk-stable' &&
    offer.Url === FEED + offer.Version + '.zip', 'Invalid updater version, channel or ZIP URL');
  need(typeof offer.Sha256 === 'string' && /^[a-f0-9]{64}$/u.test(offer.Sha256) &&
    Number.isSafeInteger(offer.Bytes) && offer.Bytes > 0 && offer.Bytes <= MAX_ZIP, 'Invalid updater ZIP hash or size');
  const issued = utc(offer.IssuedAt), expires = utc(offer.ExpiresAt);
  need(issued <= now + 300000 && expires > now && expires > issued &&
    expires - issued <= 14 * 86400000, 'Updater offer expired or outside its validity window');
  return offer;
}

async function readBody(fetcher, url, max, chunk) {
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(45000) });
  need(response.ok && response.body, 'Updater fetch failed (HTTP ' + response.status + ')');
  let size = 0;
  for await (const bytes of response.body) {
    size += bytes.length;
    need(size <= max, 'Updater response exceeds its expected size');
    chunk(bytes);
  }
  return size;
}

async function smallFile(fetcher, name, limit) {
  const chunks = [];
  await readBody(fetcher, FEED + name, limit, bytes => chunks.push(bytes));
  return Buffer.concat(chunks);
}

async function loadSignedUpdaterRelease({ version, commit, notes, fetcher = fetch, verification } = {}) {
  need(typeof version === 'string' && VERSION.test(version), 'Specify the approved updater build number');
  need(typeof commit === 'string' && /^[a-f0-9]{40}$/u.test(commit), 'Specify the reviewed source commit');
  need(typeof notes === 'string' && notes.trim() && notes.length <= 20000, 'Provide reviewed release notes');
  const [raw, sig] = await Promise.all([smallFile(fetcher, 'stable.json', 16384), smallFile(fetcher, 'stable.sig', 512)]);
  const offer = parseOffer(raw, sig, verification);
  need(offer.Version === version, 'The live updater build is not the requested version');
  const digest = createHash('sha256');
  const size = await readBody(fetcher, offer.Url, offer.Bytes, bytes => digest.update(bytes));
  need(size === offer.Bytes && digest.digest('hex') === offer.Sha256, 'Public ZIP differs from the signed updater package');
  need(raw.equals(await smallFile(fetcher, 'stable.json', 16384)), 'The updater changed during verification; try again');

  return {
    tag: 'v' + offer.Version,
    name: 'Ultimate Macro ' + offer.Version,
    url: RELEASE_BASE + '/tree/' + commit,
    published: offer.IssuedAt,
    prerelease: false,
    source: 'signed-updater',
    body: notes.trim(),
    asset: {
      name: offer.Version + '.zip', url: offer.Url, size, digest: 'sha256:' + offer.Sha256, downloads: null
    },
    extras: []
  };
}

module.exports = { loadSignedUpdaterRelease, parseOffer };
