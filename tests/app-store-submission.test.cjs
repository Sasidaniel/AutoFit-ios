const { test } = require('node:test');
const assert = require('node:assert/strict');
const { submitReview } = require('../.github/scripts/submit-app-store-review.cjs');
const { appleErrorDetails } = require('../.github/scripts/app-store-api.cjs');
const listing = require('../marketing/app-store/listing.json');
const buildID = '8848fbbb-477b-4fc0-b40a-94a5b61920f2';

test('Apple associated validation errors are preserved instead of hiding the actionable blockers', () => {
  const details = appleErrorDetails([{ code: 'INVALID_STATE', detail: 'See associated errors',
    meta: { ignored: 'not-for-report', associatedErrors: {
      '/version': [{ code: 'MISSING_FIELD', detail: 'Support URL required', source: { pointer: '/data/attributes/supportUrl' } }],
      '/app': [{ code: 'MISSING_PRIVACY', detail: 'Privacy policy URL required' }],
    } },
  }]);
  assert.equal(details.length, 3);
  assert.match(details[1], /Support URL required.*supportUrl/);
  assert.match(details[2], /Privacy policy URL required/);
  assert.doesNotMatch(JSON.stringify(details), /not-for-report/);
});

function fixture(options = {}) {
  const calls = [], checkpoints = [];
  const queued = options.queued === true;
  const version = { id: 'version', attributes: { versionString: '1.0',
    appStoreState: queued ? 'WAITING_FOR_REVIEW' : 'PREPARE_FOR_SUBMISSION', releaseType: 'MANUAL' } };
  let selected = options.selected === false ? null : { id: buildID, attributes: { version: '52' } };
  let review = options.noReview ? null : { id: 'review', attributes: { platform: 'IOS',
    state: queued ? 'WAITING_FOR_REVIEW' : 'READY_FOR_REVIEW' } };
  const items = options.unrelated ? [{ id: 'other', relationships: { appEvent: { data: { id: 'event' } } } }]
    : queued ? [{ id: 'item', relationships: { appStoreVersion: { data: { id: 'version' } } } }] : [];
  let submitted = false;
  const request = async (method, route, body) => {
    calls.push({ method, route, body });
    if (method === 'GET') {
      if (route.startsWith('/v1/apps?')) return { data: [{ id: '6820408299', attributes: { bundleId: 'com.sasidaniel.autofit' } }] };
      if (route.includes('/appStoreVersions?')) return { data: [version] };
      if (route.endsWith('/build')) return { data: selected };
      if (route.startsWith('/v1/builds?')) return { data: [{ id: buildID,
        attributes: { version: '52', processingState: options.invalidBuild ? 'INVALID' : 'VALID', expired: false } }] };
      if (route.endsWith('/preReleaseVersion')) return { data: { attributes: { version: '1.0', platform: 'IOS' } } };
      if (route.includes('/reviewSubmissions?')) return { data: review ? [review] : [] };
      if (route.startsWith('/v1/reviewSubmissions/review/items?')) return { data: items };
      if (route === '/v1/reviewSubmissions/review') {
        if (submitted && options.readbackError) throw new Error('Apple receipt readback unavailable');
        return { data: review };
      }
      if (route === '/v1/appStoreVersions/version') return { data: version };
    }
    if (method === 'PATCH' && route.endsWith('/relationships/build')) {
      selected = { id: body.data.id, attributes: { version: '52' } }; return null;
    }
    if (method === 'POST' && route === '/v1/reviewSubmissions') {
      review = { id: 'review', attributes: { state: 'READY_FOR_REVIEW' } }; return { data: review };
    }
    if (method === 'POST' && route === '/v1/reviewSubmissionItems') {
      if (options.appleBlocker) throw new Error('Apple HTTP 409: required privacy policy URL is missing');
      const item = { id: 'item', relationships: body.data.relationships };
      items.push(item); return { data: item };
    }
    if (method === 'PATCH' && route === '/v1/reviewSubmissions/review') {
      assert.deepEqual(body.data.attributes, { platform: 'IOS', submitted: true });
      submitted = true; review.attributes.state = 'WAITING_FOR_REVIEW'; version.attributes.appStoreState = 'WAITING_FOR_REVIEW';
      return { data: review };
    }
    throw new Error(`Unexpected Apple operation ${method} ${route}`);
  };
  return { calls, checkpoints, request, checkpoint: (value) => checkpoints.push(value) };
}

test('review submission requires renewed owner authorization before any Apple request', async () => {
  for (const change of [{ ownerAuthorizedReviewSubmission: false }, { pausedByOwner: true }]) {
    const f = fixture();
    await assert.rejects(submitReview({ ...listing,
      submissionRequest: { ...listing.submissionRequest, ...change } }, f.request), /authorization/);
    assert.equal(f.calls.length, 0);
  }
});

test('submits only the approved existing version and confirms both Apple queue states with manual release', async () => {
  const f = fixture({ selected: false, noReview: true });
  const result = await submitReview(listing, f.request, f.checkpoint);
  assert.equal(result.submissionConfirmed, true);
  assert.equal(result.publicationPerformed, false);
  assert.equal(result.releaseType, 'MANUAL');
  assert.equal(result.versionState, 'WAITING_FOR_REVIEW');
  assert.equal(result.reviewState, 'WAITING_FOR_REVIEW');
  assert.deepEqual(f.calls.find((call) => call.route.endsWith('/relationships/build')).body.data, { type: 'builds', id: buildID });
  assert.equal(f.calls.filter((call) => call.method === 'POST' && call.route === '/v1/reviewSubmissions').length, 1);
  assert.equal(f.checkpoints.at(-1).stage, 'confirmed');
  for (const call of f.calls) {
    assert.doesNotMatch(call.route, /releaseRequests|appStoreVersionReleaseRequests|appPrices|ageRating|privacyPolicy|appInfoLocalizations/);
  }
});

test('refuses unrelated review items and invalid approved binaries without sending a submission', async () => {
  for (const options of [{ unrelated: true }, { selected: false, invalidBuild: true }]) {
    const f = fixture(options);
    await assert.rejects(submitReview(listing, f.request), /unrelated|not available and valid/);
    assert.equal(f.calls.filter((call) => call.method === 'PATCH' && call.route === '/v1/reviewSubmissions/review').length, 0);
  }
});

test('Apple required-field refusal is preserved and never reported as a successful submission', async () => {
  const f = fixture({ appleBlocker: true });
  await assert.rejects(submitReview(listing, f.request, f.checkpoint), /required privacy policy URL is missing/);
  assert.equal(f.checkpoints.at(-1).submissionConfirmed, false);
  assert.equal(f.checkpoints.at(-1).stage, 'adding-review-item');
  assert.equal(f.calls.filter((call) => call.method === 'PATCH').length, 0);
});

test('a readback failure after submission remains unverified rather than falsely successful or safe to resubmit', async () => {
  const f = fixture({ readbackError: true });
  await assert.rejects(submitReview(listing, f.request, f.checkpoint), /readback unavailable/);
  assert.equal(f.checkpoints.at(-1).submissionConfirmed, false);
  assert.equal(f.checkpoints.at(-1).submissionOutcome, 'unverified');
  assert.equal(f.checkpoints.at(-1).submissionRequestAccepted, true);
});

test('an already queued matching version is verified without submitting it again', async () => {
  const f = fixture({ queued: true });
  const result = await submitReview(listing, f.request);
  assert.equal(result.submissionConfirmed, true);
  assert.equal(result.alreadySubmitted, true);
  assert.equal(f.calls.filter((call) => call.method !== 'GET').length, 0);
});
