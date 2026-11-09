const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createReader, collectReadiness } = require('../.github/scripts/app-store-readiness.cjs');

test('Apple readiness client permits only same-origin read requests', async () => {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const env = {
    APPSTORE_API_KEY_ID: 'test-key', APPSTORE_API_ISSUER_ID: 'test-issuer',
    APPSTORE_API_KEY_P8_BASE64: Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64'),
  };
  const requests = [];
  const read = createReader(env, async (url, options) => {
    requests.push({ url: String(url), options });
    return { ok: true, json: async () => ({ data: [] }) };
  });
  await read('/v1/apps');
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.body, undefined);
  assert.match(requests[0].options.headers.Authorization, /^Bearer /);
  await assert.rejects(read('https://example.com/v1/apps'), /Unexpected/);
  await assert.rejects(read('/v2/apps'), /Unexpected/);
  assert.equal(requests.length, 1);
});

test('readiness reports missing records honestly and never emits review contact values', async () => {
  const paths = [];
  const list = (data) => ({ data });
  const record = (id, attributes) => ({ id, attributes });
  const routes = {
    '/v1/apps?filter[bundleId]=com.sasidaniel.autofit&limit=2': list([record('app', { bundleId: 'com.sasidaniel.autofit', name: 'AutoFit' })]),
    '/v1/apps/app/appInfos?limit=50': list([record('info', { appStoreState: 'PREPARE_FOR_SUBMISSION' })]),
    '/v1/appInfos/info/appInfoLocalizations?limit=50': list([record('en', { locale: 'en-US', name: 'AutoFit' })]),
    '/v1/apps/app/appStoreVersions?filter[platform]=IOS&limit=50': list([record('version', { versionString: '1.0', appStoreState: 'PREPARE_FOR_SUBMISSION', releaseType: 'MANUAL' })]),
    '/v1/appStoreVersions/version/appStoreVersionLocalizations?limit=50': list([record('locale', { locale: 'en-US' })]),
    '/v1/appStoreVersionLocalizations/locale/appScreenshotSets?limit=200': list([]),
    '/v1/appStoreVersions/version/appStoreReviewDetail': {
      data: record('review', { contactEmail: 'not-for-report@example.test', contactFirstName: 'Private', contactLastName: 'Contact', contactPhone: 'not-for-report-phone' }),
    },
    '/v1/appStoreVersions/version/build': { data: null },
  };
  const report = await collectReadiness(async (route) => {
    paths.push(route);
    assert.ok(routes[route], `Unexpected request ${route}`);
    return routes[route];
  });
  assert.equal(report.submissionPerformed, false);
  assert.equal(report.appInformation[0].locales[0].privacyPolicyURL, null);
  assert.equal(report.versions[0].build.number, null);
  assert.equal(report.versions[0].reviewContact.complete, true);
  assert.equal(report.versions[0].locales[0].supportURL, null);
  assert.deepEqual(report.versions[0].locales[0].screenshots, []);
  assert.doesNotMatch(JSON.stringify(report), /not-for-report|"Private"|"Contact"/);
  assert.equal(paths.length, 8);
});

test('API failure is not interpreted as an empty successful inspection', async () => {
  await assert.rejects(collectReadiness(async () => { throw new Error('Apple unavailable'); }), /Apple unavailable/);
  await assert.rejects(collectReadiness(async () => ({ data: [] })), /uniquely identify/);
});
