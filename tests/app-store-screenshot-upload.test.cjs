const { test } = require('node:test');
const assert = require('node:assert/strict');
const { uploadParts, specification, uploadScreenshots } = require('../.github/scripts/upload-app-store-screenshots.cjs');

const listing = { submissionRequest: { ownerAuthorizedReviewSubmission: true }, nativePreview: { finalSubmissionAssets: true } };
const groups = { iphone: 'IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE', ipad: 'IPAD_13_PROFILE' };
const assets = ['he', 'en'].flatMap((language) => ['iphone', 'ipad'].flatMap((family) =>
  Array.from({ length: 8 }, (_, index) => ({ family, language, scene: String(index),
    fileName: `${family}-${language}-${index}.png`, sha256: `${family}-${language}-${index}`,
    bytes: Buffer.from('native image'), width: family === 'iphone' ? 1320 : 2064, height: family === 'iphone' ? 2868 : 2752 }))));
const catalog = {
  features: [{ featureId: 'APP_STORE_VERSIONS', placementPolicies: [{ placementType: 'APP_SCREENSHOT',
    groupLimits: [{ groupIds: Object.values(groups), maxCount: 10 }] }] }],
  placementProfileGroups: Object.entries(groups).map(([family, placementProfileGroupId]) => ({
    placementProfileGroupId, platform: family === 'iphone' ? 'IPHONE_APP_STORE' : 'IPAD_APP_STORE' })),
  placementTypes: [{ placementTypeId: 'APP_SCREENSHOT', acceptsAssetCategories: ['APP_SCREENSHOTS_AND_PREVIEWS'],
    specMappings: Object.entries(groups).map(([family, placementGroupId]) => ({ placementGroupId, specs: [family] })) }],
  imageSpecs: ['iphone', 'ipad'].map((family) => {
    const asset = assets.find((item) => item.family === family);
    return { specId: family, dimensions: { minWidth: asset.width, maxWidth: asset.width, minHeight: asset.height, maxHeight: asset.height },
      fileExtensions: ['.png'], mimeTypes: ['image/png'], maxFileSize: 10000000 };
  }),
};

function mockApple({ unrelated = false, processingFailed = false } = {}) {
  const images = [], placements = [], writes = [], transfers = [];
  const version = { id: 'bd117cfb-bd2b-4874-9baf-92a0e4ede4cc', attributes: {
    versionString: '1.0', appStoreState: 'PREPARE_FOR_SUBMISSION', releaseType: 'MANUAL' } };
  async function request(method, route, body) {
    const url = new URL(route, 'https://api.appstoreconnect.apple.com'), pathname = url.pathname;
    if (method !== 'GET') writes.push({ method, pathname, body });
    if (pathname === '/v1/apps') return { data: [{ id: '6820408299', attributes: { bundleId: 'com.sasidaniel.autofit' } }] };
    if (pathname.endsWith('/appStoreVersions')) return { data: [version] };
    if (pathname.endsWith('/appStoreVersionLocalizations')) return { data: [
      { id: 'he', attributes: { locale: 'he' } }, { id: 'en', attributes: { locale: 'en-US' } }] };
    if (pathname.endsWith('/assetLibrary')) return { data: { id: 'library' } };
    if (pathname === '/v1/appAssetLibraryRefData') return { data: [{ attributes: catalog }] };
    if (pathname === '/v1/appAssetLibraries/library/images') return { data: [...images] };
    if (pathname.endsWith('/placements')) {
      if (unrelated) return { data: [{ id: 'foreign', relationships: { image: { data: { id: 'foreign-image' } } } }] };
      return { data: placements.filter((item) => item.localeID === pathname.split('/')[3]
        && item.attributes.placementGroup === url.searchParams.get('filter[placementGroup]')) };
    }
    if (pathname === '/v1/appAssetLibraryImages' && method === 'POST') {
      const image = { id: `image-${images.length}`, attributes: { ...body.data.attributes, state: 'AWAITING_UPLOAD',
        uploadOperations: [{ method: 'PUT', url: 'https://store-030.blobstore.apple.com/image', offset: 0,
          length: body.data.attributes.fileSize, requestHeaders: [{ name: 'Content-Type', value: 'image/png' }] }] } };
      images.push(image); return { data: image };
    }
    if (pathname.startsWith('/v1/appAssetLibraryImages/')) {
      const image = images.find((item) => item.id === pathname.split('/')[3]);
      if (method === 'PATCH') {
        assert.deepEqual(body.data.attributes, { uploaded: true });
        const asset = assets.find((item) => item.fileName === image.attributes.fileName);
        Object.assign(image.attributes, { state: processingFailed ? 'FAILED' : 'PREPARE_FOR_SUBMISSION',
          specId: asset.family, imageAsset: { width: asset.width, height: asset.height } });
      }
      return { data: image };
    }
    if (pathname === '/v1/appAssetLibraryPlacements' && method === 'POST') {
      const placement = { id: `placement-${placements.length}`, localeID: body.data.relationships.appStoreVersionLocalization.data.id,
        attributes: { ...body.data.attributes, state: 'PARENT_PREPARE_FOR_SUBMISSION' }, relationships: body.data.relationships };
      placements.push(placement); return { data: placement };
    }
    if (pathname === '/v1/appAssetLibraryPlacementOrderingRequests' && method === 'POST') return { data: { id: 'order' } };
    if (pathname === `/v1/appStoreVersions/${version.id}`) return { data: version };
    throw new Error(`Unexpected operation ${method} ${pathname}`);
  }
  return { request, writes, images, placements, transfers, transfer: async (url, options) => {
    transfers.push(options); return { ok: true, status: 200 };
  } };
}

test('native screenshot uploader requires explicit final asset authorization before Apple requests', async () => {
  let requests = 0;
  await assert.rejects(uploadScreenshots({ ...listing, nativePreview: { finalSubmissionAssets: false } }, assets,
    async () => { requests++; }), /not authorized/);
  assert.equal(requests, 0);
});

test('native screenshot byte uploads validate all Apple hosts and exact byte coverage before transferring', async () => {
  let calls = 0;
  const transfer = async () => { calls++; return { ok: true }; };
  const operation = { method: 'PUT', url: 'https://store-030.blobstore.apple.com/image',
    length: 4, offset: 0, requestHeaders: [{ name: 'Content-Type', value: 'image/png' }] };
  for (const bad of [{ url: 'https://apple.com.attacker.test/image' }, { offset: 1 }, { length: 5 },
    { requestHeaders: [{ name: 'Authorization', value: 'never-forward-jwt' }] }]) {
    await assert.rejects(uploadParts([{ ...operation, ...bad }], Buffer.from('test'), transfer), /Unsafe|complete/);
  }
  assert.equal(calls, 0);
  await uploadParts([operation], Buffer.from('test'), transfer);
  assert.equal(calls, 1);
  await assert.rejects(uploadParts([operation], Buffer.from('test'), async () => ({ ok: false, status: 500 })), /HTTP 500/);
});

test('native screenshot specifications and capacity are checked against the live Apple catalog', () => {
  assert.equal(specification(catalog, assets[0]).specID, 'iphone');
  assert.throws(() => specification(catalog, { ...assets[0], width: 1290 }), /specification/);
  const invalid = structuredClone(catalog);
  invalid.features[0].placementPolicies[0].groupLimits[0].maxCount = 7;
  assert.throws(() => specification(invalid, assets[0]), /specification/);
});

test('native screenshot uploader verifies 32 processed images and four ordered groups without submission and reuses them on retry', async () => {
  const mock = mockApple(), receipts = [];
  const options = { transfer: mock.transfer, wait: async () => {}, checkpoint: (report) => receipts.push(structuredClone(report)) };
  const result = await uploadScreenshots(listing, assets, mock.request, options);
  assert.equal(result.screenshotsVerified, true);
  assert.equal(result.records.length, 32);
  assert.equal(result.submissionPerformed, false);
  assert.equal(result.publicationPerformed, false);
  assert.equal(mock.images.length, 32);
  assert.equal(mock.placements.length, 32);
  assert.equal(mock.transfers.length, 32);
  assert.ok(mock.transfers.every((item) => !item.headers.Authorization && item.redirect === 'error'));
  await uploadScreenshots(listing, assets, mock.request, options);
  assert.equal(mock.images.length, 32); assert.equal(mock.placements.length, 32); assert.equal(mock.transfers.length, 32);
  assert.equal(receipts.at(-1).screenshotsVerified, true);
  assert.ok(mock.writes.every((item) => !/reviewSubmissions|appStoreVersions/.test(item.pathname)));
});

test('native screenshot uploader preserves unrelated assets and explicitly rejects failed processing', async () => {
  const foreign = mockApple({ unrelated: true });
  await assert.rejects(uploadScreenshots(listing, assets, foreign.request), /unrelated/);
  assert.equal(foreign.writes.length, 0);
  const failed = mockApple({ processingFailed: true });
  await assert.rejects(uploadScreenshots(listing, assets, failed.request, { transfer: failed.transfer }), /processing refused/);
});
