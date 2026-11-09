const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepareDraft } = require('../.github/scripts/prepare-app-store-draft.cjs');
const approved = require('../marketing/app-store/listing.json');

function fixture(options = {}) {
  const calls = [];
  const version = { id: 'version', attributes: { versionString: '1.0',
    appStoreState: options.state || 'PREPARE_FOR_SUBMISSION', releaseType: 'AFTER_APPROVAL' } };
  const infoLocales = [{ id: 'info-he', attributes: { locale: 'he', name: 'Old name' } }];
  const versionLocales = [{ id: 'version-he', attributes: { locale: 'he', description: '' } }];
  let versionReads = 0;
  const request = async (method, route, body) => {
    calls.push({ method, route, body });
    if (method === 'GET') {
      if (route.startsWith('/v1/apps?')) return { data: [{ id: 'app', attributes: { bundleId: 'com.sasidaniel.autofit' } }] };
      if (route.includes('/appStoreVersions?')) return { data: [version] };
      if (route.includes('/appInfos?')) return { data: [{ id: 'info', attributes: { appStoreState: 'PREPARE_FOR_SUBMISSION' } }] };
      if (route.includes('/appInfoLocalizations?')) return { data: structuredClone(infoLocales) };
      if (route.includes('/appStoreVersionLocalizations?')) {
        versionReads++;
        const data = structuredClone(versionLocales);
        if (options.wrongDescription && versionReads > 1) data[0].attributes.description = 'not saved';
        return { data };
      }
      if (route === '/v1/appStoreVersions/version') return { data: structuredClone(version) };
    }
    if (method === 'PATCH' && route === '/v1/appStoreVersions/version') {
      Object.assign(version.attributes, body.data.attributes); return { data: version };
    }
    for (const [type, records] of [['appInfoLocalizations', infoLocales], ['appStoreVersionLocalizations', versionLocales]]) {
      if (route.startsWith(`/v1/${type}`)) {
        if (options.rejectName && body?.data.attributes.name) throw new Error('Apple refused duplicate app name');
        if (method === 'PATCH') {
          const item = records.find((item) => item.id === body.data.id);
          assert.ok(item); Object.assign(item.attributes, body.data.attributes); return { data: item };
        }
        if (method === 'POST') {
          const item = { id: `${type}-new`, attributes: body.data.attributes };
          records.push(item);
          if (options.autoCreateVersionLocale && type === 'appInfoLocalizations') {
            versionLocales.push({ id: 'auto-version-en', attributes: { locale: item.attributes.locale } });
          }
          return { data: item };
        }
      }
    }
    throw new Error(`Unexpected operation ${method} ${route}`);
  };
  return { calls, request };
}

test('approved draft writes and verifies both locales, sets manual release and never submits or selects a build', async () => {
  const f = fixture();
  const result = await prepareDraft(approved, f.request);
  assert.equal(result.metadataVerified, true);
  assert.equal(result.submissionPerformed, false);
  assert.equal(result.releaseType, 'MANUAL');
  assert.equal(result.buildChanged, false);
  const writes = f.calls.filter((call) => call.method !== 'GET');
  assert.equal(writes.length, 5);
  for (const call of f.calls) assert.doesNotMatch(call.route, /reviewSubmissions|reviewSubmissionItems|releaseRequests|relationships\/build|appPrices|appScreenshots/);
  assert.deepEqual(writes[0].body.data.attributes, { releaseType: 'MANUAL' });
});

test('draft preparation refuses missing approval and noneditable versions before any writes', async () => {
  const f = fixture();
  await assert.rejects(prepareDraft({ ...approved, submissionRequest: {} }, f.request), /approval/);
  assert.equal(f.calls.length, 0);
  const submitted = fixture({ state: 'WAITING_FOR_REVIEW' });
  await assert.rejects(prepareDraft(approved, submitted.request), /editable/);
  assert.equal(submitted.calls.filter((call) => call.method !== 'GET').length, 0);
});

test('a rejected app name or unsuccessful readback remains an explicit failure', async () => {
  await assert.rejects(prepareDraft(approved, fixture({ rejectName: true }).request), /duplicate app name/);
  await assert.rejects(prepareDraft(approved, fixture({ wrongDescription: true }).request), /did not confirm/);
});

test('refreshes version localizations after Apple automatically creates the matching locale', async () => {
  const f = fixture({ autoCreateVersionLocale: true });
  const result = await prepareDraft(approved, f.request);
  assert.equal(result.metadataVerified, true);
  assert.equal(f.calls.filter((call) => call.method === 'POST' && call.route === '/v1/appStoreVersionLocalizations').length, 0);
  assert.ok(f.calls.find((call) => call.method === 'PATCH' && call.route === '/v1/appStoreVersionLocalizations/auto-version-en'));
});
