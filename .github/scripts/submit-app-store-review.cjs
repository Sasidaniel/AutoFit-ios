const fs = require('node:fs');
const { createAppleClient } = require('./app-store-api.cjs');

async function submitReview(listing, request, checkpoint = () => {}) {
  if (listing.submissionRequest?.pausedByOwner !== false
    || listing.submissionRequest.ownerAuthorizedReviewSubmission !== true
    || listing.submissionRequest.ownerApprovedCreative !== true || listing.price !== 'Free'
    || listing.referenceBuild !== '1.0 (52)') {
    throw new Error('Explicit current owner authorization for free App Review submission is required');
  }
  const report = { submissionConfirmed: false, publicationPerformed: false, releaseType: 'MANUAL' };
  const record = (stage, values = {}) => {
    Object.assign(report, values, { stage, checkedAt: new Date().toISOString() });
    checkpoint({ ...report });
  };
  async function many(route) {
    const records = [];
    for (let page = 0; route; page++) {
      if (page === 10) throw new Error('Apple review pagination limit exceeded');
      const response = await request('GET', route);
      if (!Array.isArray(response.data)) throw new Error('Invalid Apple list response');
      records.push(...response.data);
      route = response.links?.next;
    }
    return records;
  }
  record('checking-version');
  const apps = await many('/v1/apps?filter[bundleId]=com.sasidaniel.autofit&limit=2');
  if (apps.length !== 1 || apps[0].id !== '6820408299'
    || apps[0].attributes.bundleId !== 'com.sasidaniel.autofit') throw new Error('AutoFit app identity mismatch');
  const appID = apps[0].id;
  const versions = (await many(`/v1/apps/${appID}/appStoreVersions?filter[platform]=IOS&limit=50`))
    .filter((version) => version.attributes.versionString === '1.0');
  if (versions.length !== 1) throw new Error('Cannot uniquely identify initial iOS version 1.0');
  let version = versions[0];
  const queued = ['WAITING_FOR_REVIEW', 'IN_REVIEW'];
  if (!['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW', ...queued].includes(version.attributes.appStoreState)) {
    throw new Error(`Version is not available for this submission: ${version.attributes.appStoreState}`);
  }
  if (version.attributes.releaseType !== 'MANUAL') {
    if (queued.includes(version.attributes.appStoreState)) throw new Error('Existing queued release is not manual');
    await request('PATCH', `/v1/appStoreVersions/${version.id}`, {
      data: { type: 'appStoreVersions', id: version.id, attributes: { releaseType: 'MANUAL' } },
    });
    version = (await request('GET', `/v1/appStoreVersions/${version.id}`)).data;
    if (version.attributes.releaseType !== 'MANUAL') throw new Error('Apple did not confirm manual release');
  }
  record('checking-approved-build', { appID, versionID: version.id });
  let selected;
  try { selected = (await request('GET', `/v1/appStoreVersions/${version.id}/build`)).data; }
  catch (error) {
    if (error.status !== 404) throw error;
  }
  if (selected && (selected.id !== '8848fbbb-477b-4fc0-b40a-94a5b61920f2' || selected.attributes.version !== '52')) {
    throw new Error('Version already selects a different build; existing selection was not overwritten');
  }
  if (!selected) {
    if (queued.includes(version.attributes.appStoreState)) throw new Error('Queued version does not confirm the approved build');
    const builds = await many(`/v1/builds?filter[app]=${appID}&filter[version]=52&limit=10`);
    const matches = builds.filter((build) => build.id === '8848fbbb-477b-4fc0-b40a-94a5b61920f2'
      && build.attributes.version === '52' && build.attributes.processingState === 'VALID' && !build.attributes.expired);
    if (matches.length !== 1) throw new Error('Approved existing build 52 is not available and valid');
    const prerelease = (await request('GET', `/v1/builds/${matches[0].id}/preReleaseVersion`)).data;
    if (prerelease.attributes.version !== '1.0' || prerelease.attributes.platform !== 'IOS') {
      throw new Error('Approved build does not belong to initial iOS version 1.0');
    }
    await request('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, {
      data: { type: 'builds', id: matches[0].id },
    });
    selected = (await request('GET', `/v1/appStoreVersions/${version.id}/build`)).data;
    if (selected?.id !== matches[0].id || selected.attributes.version !== '52') throw new Error('Apple did not confirm build selection');
  }
  record('finding-review', { appID, versionID: version.id, versionState: version.attributes.appStoreState });
  const reviews = (await many(`/v1/apps/${appID}/reviewSubmissions?limit=50`))
    .filter((review) => (!review.attributes.platform || review.attributes.platform === 'IOS')
      && ['READY_FOR_REVIEW', ...queued].includes(review.attributes.state));
  if (reviews.length > 1) throw new Error('Ambiguous active review submissions; existing content was not changed');
  let review = reviews[0];
  if (!review) {
    if (queued.includes(version.attributes.appStoreState)) throw new Error('Queued version has no matching review receipt');
    review = (await request('POST', '/v1/reviewSubmissions', {
      data: { type: 'reviewSubmissions', relationships: { app: { data: { type: 'apps', id: appID } } } },
    })).data;
  }
  if (!review?.id) throw new Error('Apple did not return a review submission ID');
  record('checking-review-items', { reviewSubmissionID: review.id });
  let items = await many(`/v1/reviewSubmissions/${review.id}/items?include=appStoreVersion&limit=50`);
  if (items.some((item) => item.relationships?.appStoreVersion?.data?.id !== version.id) || items.length > 1) {
    throw new Error('Review contains unrelated or ambiguous items; no submission was sent');
  }
  if (queued.includes(review.attributes.state)) {
    if (items.length !== 1 || !queued.includes(version.attributes.appStoreState)) {
      throw new Error('Existing submission does not confirm the requested version');
    }
    record('confirmed', { submissionConfirmed: true, reviewState: review.attributes.state, alreadySubmitted: true });
    return report;
  }
  if (!items.length) {
    record('adding-review-item');
    const item = (await request('POST', '/v1/reviewSubmissionItems', {
      data: { type: 'reviewSubmissionItems', relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: review.id } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } },
      } },
    })).data;
    if (!item?.id) throw new Error('Apple did not confirm the review item');
  }
  record('submitting', { submissionOutcome: 'unverified' });
  await request('PATCH', `/v1/reviewSubmissions/${review.id}`, {
    data: { type: 'reviewSubmissions', id: review.id, attributes: { platform: 'IOS', submitted: true } },
  });
  record('checking-receipt', { submissionRequestAccepted: true });
  for (let attempt = 0; attempt < 5; attempt++) {
    review = (await request('GET', `/v1/reviewSubmissions/${review.id}`)).data;
    version = (await request('GET', `/v1/appStoreVersions/${version.id}`)).data;
    items = await many(`/v1/reviewSubmissions/${review.id}/items?include=appStoreVersion&limit=50`);
    if (version.attributes.releaseType !== 'MANUAL') throw new Error('Release mode changed; submission receipt requires manual review');
    if (queued.includes(review.attributes.state) && queued.includes(version.attributes.appStoreState)
      && items.length === 1 && items[0].relationships?.appStoreVersion?.data?.id === version.id) {
      record('confirmed', { submissionConfirmed: true, submissionOutcome: 'confirmed',
        reviewState: review.attributes.state, versionState: version.attributes.appStoreState });
      return report;
    }
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Apple review receipt not confirmed: ${review.attributes.state}/${version.attributes.appStoreState}`);
}

if (require.main === module) {
  const listing = JSON.parse(fs.readFileSync('marketing/app-store/listing.json', 'utf8'));
  let report = { submissionConfirmed: false, publicationPerformed: false };
  const save = (value) => {
    report = value;
    if (process.env.APPSTORE_REVIEW_REPORT) fs.writeFileSync(process.env.APPSTORE_REVIEW_REPORT, JSON.stringify(report, null, 2));
  };
  submitReview(listing, createAppleClient(), save).then((result) => {
    console.log(JSON.stringify(result, null, 2));
  }).catch((error) => {
    save({ ...report, error: error.message, submissionOutcome: report.submissionOutcome || 'not-submitted' });
    console.error(error.message);
    process.exitCode = 1;
  });
}
module.exports = { submitReview };
