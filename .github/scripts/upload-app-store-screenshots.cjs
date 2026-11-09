const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createAppleClient } = require('./app-store-api.cjs');

function readAssets(listing, directory) {
  if (!listing.submissionRequest?.ownerAuthorizedReviewSubmission || listing.submissionRequest.pausedByOwner
    || !listing.submissionRequest.ownerApprovedCreative || listing.referenceBuild !== '1.0 (52)'
    || listing.nativePreview?.finalSubmissionAssets !== true) throw new Error('Final native screenshot authorization missing');
  const provenance = JSON.parse(fs.readFileSync(path.join(directory, 'native-compositions.json'), 'utf8'));
  const originals = JSON.parse(fs.readFileSync(path.join(directory, 'native', 'provenance.json'), 'utf8'));
  if (provenance.nativeDeviceSource !== true || originals.actualCapacitorSimulatorApp !== true) {
    throw new Error('Actual native source provenance required');
  }
  const assets = [];
  for (const family of ['iphone', 'ipad']) {
    if (!listing.nativePreview.composedFamilies.includes(family)) throw new Error(`Missing complete ${family} artwork`);
    const [width, height] = family === 'iphone' ? [1320, 2868] : [2064, 2752];
    for (const language of ['he', 'en']) {
      for (const screen of listing.locales[language].screens) {
        const file = `native-${family}-${language}-${screen.id}.png`;
        const record = provenance.records.find((item) => item.file === file);
        const originalFile = `${family}-${language}-${screen.id}.png`;
        const original = originals.records.find((item) => item.file === originalFile);
        const bytes = fs.readFileSync(path.join(directory, file));
        const raw = fs.readFileSync(path.join(directory, 'native', originalFile));
        const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
        if (!record || !original || record.sha256 !== sha256 || record.sourceFile !== originalFile
          || record.sourceSHA256 !== original.sha256
          || crypto.createHash('sha256').update(raw).digest('hex') !== original.sha256
          || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
          || bytes.readUInt32BE(16) !== width || bytes.readUInt32BE(20) !== height || bytes[25] !== 2) {
          throw new Error(`Native image integrity, dimensions or opacity incorrect: ${file}`);
        }
        assets.push({ family, language, scene: screen.id, bytes, width, height, sha256,
          fileName: `${family}-${language}-${screen.id}-${sha256}.png` });
      }
    }
  }
  if (assets.length !== 32 || new Set(assets.map((item) => item.sha256)).size !== 32) {
    throw new Error('Exactly 32 distinct native-source screenshots required');
  }
  return assets;
}

function specification(catalog, asset) {
  const groupID = asset.family === 'iphone' ? 'IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE' : 'IPAD_13_PROFILE';
  const group = catalog.placementProfileGroups.find((item) => item.placementProfileGroupId === groupID);
  const type = catalog.placementTypes.find((item) => item.placementTypeId === 'APP_SCREENSHOT');
  const policy = catalog.features.find((item) => item.featureId === 'APP_STORE_VERSIONS')
    ?.placementPolicies.find((item) => item.placementType === 'APP_SCREENSHOT');
  const limit = policy?.groupLimits.find((item) => item.groupIds.includes(groupID));
  const mapping = type?.specMappings.find((item) => item.placementGroupId === groupID);
  const spec = catalog.imageSpecs.find((item) => mapping?.specs.includes(item.specId)
    && item.dimensions.minWidth === asset.width && item.dimensions.maxWidth === asset.width
    && item.dimensions.minHeight === asset.height && item.dimensions.maxHeight === asset.height
    && item.fileExtensions.includes('.png') && item.mimeTypes.includes('image/png')
    && item.maxFileSize >= asset.bytes.length);
  const platform = asset.family === 'iphone' ? 'IPHONE_APP_STORE' : 'IPAD_APP_STORE';
  if (group?.platform !== platform || !type.acceptsAssetCategories.includes('APP_SCREENSHOTS_AND_PREVIEWS')
    || !limit || limit.maxCount < 8 || !spec) {
    throw new Error(`Apple does not confirm the intended ${asset.family} screenshot specification: ${JSON.stringify({
      groupID, platform: group?.platform, expectedPlatform: platform, capacity: limit?.maxCount,
      specificationMatched: !!spec, width: asset.width, height: asset.height,
    })}`);
  }
  return { groupID, specID: spec.specId };
}

async function uploadParts(operations, bytes, transfer = fetch) {
  let end = 0;
  for (const operation of [...operations].sort((a, b) => a.offset - b.offset)) {
    const url = new URL(operation.url);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.apple.com') || url.username || url.password
      || operation.method !== 'PUT' || !Number.isSafeInteger(operation.offset)
      || !Number.isSafeInteger(operation.length) || operation.offset !== end || operation.length <= 0
      || operation.offset + operation.length > bytes.length
      || operation.requestHeaders.some((item) => /^(authorization|cookie)$/i.test(item.name))) {
      throw new Error('Unsafe or incomplete Apple upload operation');
    }
    end += operation.length;
  }
  if (end !== bytes.length) throw new Error('Apple upload operations do not cover the complete image');
  for (const operation of operations) {
    const response = await transfer(operation.url, {
      method: 'PUT', headers: Object.fromEntries(operation.requestHeaders.map(({ name, value }) => [name, value])),
      body: bytes.subarray(operation.offset, operation.offset + operation.length),
      signal: AbortSignal.timeout(60000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`Apple screenshot byte transfer failed: HTTP ${response.status}`);
  }
}

async function uploadScreenshots(listing, assets, request, {
  transfer = fetch, wait = () => new Promise((resolve) => setTimeout(resolve, 1500)), checkpoint = () => {},
} = {}) {
  if (listing.submissionRequest?.ownerAuthorizedReviewSubmission !== true || listing.submissionRequest.pausedByOwner === true
    || listing.nativePreview?.finalSubmissionAssets !== true || assets.length !== 32) throw new Error('Screenshot upload is not authorized');
  const report = { checkedAt: new Date().toISOString(), screenshotsVerified: false,
    submissionPerformed: false, publicationPerformed: false, binaryUploaded: false, records: [] };
  checkpoint(report);
  const list = async (route) => {
    const result = [];
    for (let page = 0; route && page < 10; page++) {
      const response = await request('GET', route); result.push(...response.data); route = response.links?.next;
    }
    if (route) throw new Error('Apple asset pagination exceeded its bound');
    return result;
  };
  const apps = await list('/v1/apps?filter[bundleId]=com.sasidaniel.autofit&limit=2');
  if (apps.length !== 1 || apps[0].id !== '6820408299'
    || apps[0].attributes.bundleId !== 'com.sasidaniel.autofit') throw new Error('App identity mismatch');
  const versions = await list('/v1/apps/6820408299/appStoreVersions?filter[platform]=IOS&limit=50');
  const matches = versions.filter((item) => item.attributes.versionString === '1.0'
    && item.attributes.appStoreState === 'PREPARE_FOR_SUBMISSION' && item.attributes.releaseType === 'MANUAL');
  if (matches.length !== 1 || matches[0].id !== 'bd117cfb-bd2b-4874-9baf-92a0e4ede4cc') throw new Error('Editable manual-release version mismatch');
  const versionID = matches[0].id;
  const locales = await list(`/v1/appStoreVersions/${versionID}/appStoreVersionLocalizations?limit=50`);
  const libraries = await request('GET', '/v1/apps/6820408299/assetLibrary');
  const libraryID = libraries.data.id;
  const catalogResponse = await request('GET', '/v1/appAssetLibraryRefData?filter[features]=APP_STORE_VERSIONS&filter[placementTypes]=APP_SCREENSHOT');
  if (catalogResponse.data.length !== 1) throw new Error('Ambiguous Apple asset specifications');
  const catalog = catalogResponse.data[0].attributes;
  const prepared = assets.map((asset) => {
    const selected = locales.filter((item) => item.attributes.locale === (asset.language === 'he' ? 'he' : 'en-US'));
    if (selected.length !== 1) throw new Error('Missing or ambiguous target localization');
    return { ...asset, localeID: selected[0].id, ...specification(catalog, asset) };
  });
  const images = await list(`/v1/appAssetLibraries/${libraryID}/images?limit=200`);
  const existingPlacements = new Map();
  for (const language of ['he', 'en']) {
    for (const family of ['iphone', 'ipad']) {
      const group = prepared.filter((item) => item.language === language && item.family === family);
      const { localeID, groupID } = group[0];
      const existing = await list(`/v1/appStoreVersionLocalizations/${localeID}/placements?filter[placementType]=APP_SCREENSHOT&filter[placementGroup]=${groupID}&sort=placementGroupPosition&include=image&limit=200`);
      const knownIDs = images.filter((image) => group.some((asset) => asset.fileName === image.attributes.fileName)).map((image) => image.id);
      if (existing.some((placement) => !knownIDs.includes(placement.relationships?.image?.data?.id))) {
        throw new Error('Existing unrelated screenshots will not be overwritten or reordered');
      }
      existingPlacements.set(`${language}/${family}`, existing);
    }
  }
  const recordProcessing = (asset, image, attempt) => {
    report.processing = { family: asset.family, language: asset.language, scene: asset.scene, imageID: image.id,
      state: image.attributes.state, attempt, expectedSpecID: asset.specID,
      observedSpecID: image.attributes.specId || null,
      width: image.attributes.imageAsset?.width || null, height: image.attributes.imageAsset?.height || null };
    checkpoint(report);
  };
  // Commit every transfer before waiting, so Apple's asynchronous processing can overlap.
  for (const asset of prepared) {
    const found = images.filter((image) => image.attributes.fileName === asset.fileName);
    if (found.length > 1) throw new Error('Ambiguous existing native image');
    let image = found[0];
    if (!image) {
      image = (await request('POST', '/v1/appAssetLibraryImages', { data: {
        type: 'appAssetLibraryImages', attributes: { category: 'APP_SCREENSHOTS_AND_PREVIEWS',
          fileName: asset.fileName, fileSize: asset.bytes.length, referenceName: asset.fileName },
        relationships: { assetLibrary: { data: { type: 'appAssetLibraries', id: libraryID } } },
      } })).data;
      images.push(image);
    }
    if (image.attributes.fileSize !== asset.bytes.length) throw new Error('Existing image size mismatch');
    recordProcessing(asset, image, 0);
    if (image.attributes.state === 'AWAITING_UPLOAD') {
      await uploadParts(image.attributes.uploadOperations, asset.bytes, transfer);
      await request('PATCH', `/v1/appAssetLibraryImages/${image.id}`, {
        data: { type: 'appAssetLibraryImages', id: image.id, attributes: { uploaded: true } },
      });
    } else if (!['UPLOAD_COMPLETE', 'PREPARE_FOR_SUBMISSION'].includes(image.attributes.state)) {
      throw new Error(`Apple image processing refused ${asset.family}/${asset.language}/${asset.scene}: ${image.attributes.state}`);
    }
  }
  for (const language of ['he', 'en']) {
    for (const family of ['iphone', 'ipad']) {
      const group = prepared.filter((item) => item.language === language && item.family === family);
      const { localeID, groupID } = group[0];
      const placementRoute = `/v1/appStoreVersionLocalizations/${localeID}/placements?filter[placementType]=APP_SCREENSHOT&filter[placementGroup]=${groupID}&sort=placementGroupPosition&include=image&limit=200`;
      const existing = existingPlacements.get(`${language}/${family}`);
      const order = [];
      for (const asset of group) {
        let image = images.find((item) => item.attributes.fileName === asset.fileName);
        let ready = false;
        for (let attempt = 0; attempt < 240; attempt++) {
          image = (await request('GET', `/v1/appAssetLibraryImages/${image.id}`)).data;
          recordProcessing(asset, image, attempt + 1);
          if (image.attributes.state === 'PREPARE_FOR_SUBMISSION') { ready = true; break; }
          if (image.attributes.state !== 'UPLOAD_COMPLETE') throw new Error(`Apple image processing refused ${asset.family}/${language}/${asset.scene}: ${image.attributes.state}; ${JSON.stringify(image.attributes.stateDetails)}`);
          await wait();
        }
        if (!ready || image.attributes.specId !== asset.specID || image.attributes.imageAsset?.width !== asset.width
          || image.attributes.imageAsset?.height !== asset.height) {
          throw new Error(`Apple did not confirm the expected processed screenshot: ${JSON.stringify(report.processing)}`);
        }
        const placed = existing.filter((item) => item.relationships?.image?.data?.id === image.id);
        if (placed.length > 1) throw new Error('Ambiguous existing placement');
        const placement = placed[0] || (await request('POST', '/v1/appAssetLibraryPlacements', { data: {
          type: 'appAssetLibraryPlacements', attributes: { placementType: 'APP_SCREENSHOT', placementGroup: groupID },
          relationships: { image: { data: { type: 'appAssetLibraryImages', id: image.id } },
            appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: localeID } } },
        } })).data;
        order.push(placement.id);
        report.records.push({ family, language, scene: asset.scene, sha256: asset.sha256, imageID: image.id, placementID: placement.id });
        checkpoint(report);
      }
      await request('POST', '/v1/appAssetLibraryPlacementOrderingRequests', { data: {
        type: 'appAssetLibraryPlacementOrderingRequests', attributes: { placementGroup: groupID },
        relationships: { orderedPlacements: { data: order.map((id) => ({ type: 'appAssetLibraryPlacements', id })) },
          appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: localeID } } },
      } });
      const verified = await list(placementRoute);
      if (JSON.stringify(verified.map((item) => item.id)) !== JSON.stringify(order)
        || verified.some((item) => item.attributes.state !== 'PARENT_PREPARE_FOR_SUBMISSION')) {
        throw new Error('Apple screenshot placement/order readback did not match');
      }
    }
  }
  const version = (await request('GET', `/v1/appStoreVersions/${versionID}`)).data;
  if (version.attributes.releaseType !== 'MANUAL' || version.attributes.appStoreState !== 'PREPARE_FOR_SUBMISSION') {
    throw new Error('Version release/review state changed during upload');
  }
  delete report.processing;
  report.screenshotsVerified = true; checkpoint(report);
  return report;
}

if (require.main === module) {
  const listing = JSON.parse(fs.readFileSync('marketing/app-store/listing.json', 'utf8'));
  const save = (report) => fs.writeFileSync(process.env.APPSTORE_SCREENSHOT_REPORT, JSON.stringify(report, null, 2));
  Promise.resolve().then(() => uploadScreenshots(listing,
    readAssets(listing, path.resolve('marketing/app-store/assets')), createAppleClient(), { checkpoint: save }))
    .then((report) => console.log(JSON.stringify(report, null, 2))).catch((error) => {
      console.error(error.message); process.exitCode = 1;
    });
}
module.exports = { readAssets, specification, uploadParts, uploadScreenshots };
