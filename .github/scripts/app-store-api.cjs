const crypto = require('node:crypto');
const origin = 'https://api.appstoreconnect.apple.com';

function appleErrorDetails(errors) {
  const messages = [];
  function visit(value, depth = 0) {
    if (!value || depth > 8 || messages.length >= 100) return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, depth + 1)); return; }
    if (typeof value !== 'object') return;
    const message = [value.code, value.title, value.detail, value.source?.pointer]
      .filter((part) => typeof part === 'string' && part).join(': ');
    if (message) messages.push(message);
    if (value.errors) visit(value.errors, depth + 1);
    const associated = value.meta?.associatedErrors;
    if (associated) {
      if (Array.isArray(associated)) visit(associated, depth + 1);
      else Object.values(associated).forEach((item) => visit(item, depth + 1));
    }
  }
  visit(errors);
  return messages;
}

function createAppleClient(env = process.env, fetchImpl = fetch) {
  const keyID = env.APPSTORE_API_KEY_ID, issuer = env.APPSTORE_API_ISSUER_ID;
  const key = Buffer.from(env.APPSTORE_API_KEY_P8_BASE64 || '', 'base64').toString('utf8');
  if (!keyID || !issuer || !key.includes('BEGIN PRIVATE KEY')) throw new Error('Missing Apple API credentials');
  return async (method, route, body) => {
    const url = new URL(route, origin);
    if (url.origin !== origin || !url.pathname.startsWith('/v1/')
      || !['GET', 'PATCH', 'POST'].includes(method) || method === 'GET' && body !== undefined) {
      throw new Error('Unexpected Apple API destination or operation');
    }
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${encode({ alg: 'ES256', kid: keyID, typ: 'JWT' })}.${encode({ iss: issuer, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`;
    const signature = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    const response = await fetchImpl(url, {
      method,
      headers: { Authorization: `Bearer ${unsigned}.${signature}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      let detail = '';
      let appleErrors = [];
      try {
        const result = await response.json();
        appleErrors = appleErrorDetails(result.errors);
        detail = appleErrors.join('; ').slice(0, 12000);
      } catch (error) {
        detail = `Cannot decode Apple error response: ${error.message}`;
      }
      const error = new Error(`Apple ${method} ${url.pathname}: HTTP ${response.status}${detail ? `; ${detail}` : ''}`);
      error.status = response.status;
      error.appleErrors = appleErrors;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  };
}
module.exports = { createAppleClient, appleErrorDetails };
