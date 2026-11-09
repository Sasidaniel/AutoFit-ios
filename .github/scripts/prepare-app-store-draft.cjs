const fs = require('node:fs');
const { createAppleClient } = require('./app-store-api.cjs');

async function prepareDraft(listing, request) {
  if (listing.submissionRequest?.ownerApprovedCreative !== true
    || listing.submissionRequest.submissionConfirmed !== false
    || listing.referenceBuild !== '1.0 (52)' || listing.price !== 'Free') {
    throw new Error('Missing matching owner approval for the initial free listing');
  }
  for (const language of ['he', 'en']) {
    const copy = listing.locales?.[language];
    for (const [field, limit] of Object.entries({ name: 30, subtitle: 30, promotionalText: 170, description: 4000 })) {
      if (!copy?.[field]?.trim() || [...copy[field]].length > limit) throw new Error(`Invalid ${language} ${field}`);
    }
    if (!copy.keywords?.trim() || Buffer.byteLength(copy.keywords, 'utf8') > 100) throw new Error('Invalid keywords');
  }
  const apps = (await request('GET', '/v1/apps?filter[bundleId]=com.sasidaniel.autofit&limit=2')).data;
  if (apps.length !== 1 || apps[0].attributes.bundleId !== 'com.sasidaniel.autofit') throw new Error('App identity mismatch');
  const appID = apps[0].id;
  const versions = (await request('GET', `/v1/apps/${appID}/appStoreVersions?filter[platform]=IOS&limit=50`)).data;
  const matches = versions.filter((item) => item.attributes.versionString === '1.0'
    && item.attributes.appStoreState === 'PREPARE_FOR_SUBMISSION');
  if (matches.length !== 1) throw new Error('Cannot uniquely identify an editable initial version; nothing submitted');
  const version = matches[0];
  const infos = (await request('GET', `/v1/apps/${appID}/appInfos?limit=50`)).data
    .filter((item) => item.attributes.appStoreState === 'PREPARE_FOR_SUBMISSION');
  if (infos.length !== 1) throw new Error('Cannot uniquely identify editable app information');
  const info = infos[0];
  await request('PATCH', `/v1/appStoreVersions/${version.id}`, {
    data: { type: 'appStoreVersions', id: version.id, attributes: { releaseType: 'MANUAL' } },
  });
  const infoRoute = `/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`;
  const versionRoute = `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`;
  for (const [language, locale] of [['he', 'he'], ['en', 'en-US']]) {
    const copy = listing.locales[language];
    for (const spec of [
      { type: 'appInfoLocalizations', route: infoRoute, attributes: { name: copy.name, subtitle: copy.subtitle },
        parentType: 'appInfos', parentID: info.id, relationship: 'appInfo' },
      { type: 'appStoreVersionLocalizations', route: versionRoute,
        attributes: { description: copy.description, promotionalText: copy.promotionalText, keywords: copy.keywords },
        parentType: 'appStoreVersions', parentID: version.id, relationship: 'appStoreVersion' },
    ]) {
      const currentLocales = (await request('GET', spec.route)).data;
      const existing = currentLocales.filter((item) => item.attributes.locale === locale);
      if (existing.length > 1) throw new Error('Ambiguous existing localization');
      if (existing.length) {
        await request('PATCH', `/v1/${spec.type}/${existing[0].id}`, {
          data: { type: spec.type, id: existing[0].id, attributes: spec.attributes },
        });
      } else {
        await request('POST', `/v1/${spec.type}`, {
          data: { type: spec.type, attributes: { locale, ...spec.attributes },
            relationships: { [spec.relationship]: { data: { type: spec.parentType, id: spec.parentID } } } },
        });
      }
    }
  }
  const updatedInfos = (await request('GET', infoRoute)).data;
  const updatedVersions = (await request('GET', versionRoute)).data;
  const current = (await request('GET', `/v1/appStoreVersions/${version.id}`)).data;
  if (current.attributes.releaseType !== 'MANUAL'
    || current.attributes.appStoreState !== 'PREPARE_FOR_SUBMISSION') throw new Error('Unexpected version state after draft preparation');
  for (const [language, locale] of [['he', 'he'], ['en', 'en-US']]) {
    const appInfo = updatedInfos.find((item) => item.attributes.locale === locale)?.attributes;
    const versionInfo = updatedVersions.find((item) => item.attributes.locale === locale)?.attributes;
    for (const key of ['name', 'subtitle']) {
      if (appInfo?.[key] !== listing.locales[language][key]) throw new Error(`Apple did not confirm ${locale} ${key}`);
    }
    for (const key of ['description', 'promotionalText', 'keywords']) {
      if (versionInfo?.[key] !== listing.locales[language][key]) throw new Error(`Apple did not confirm ${locale} ${key}`);
    }
  }
  return { checkedAt: new Date().toISOString(), appID, versionID: version.id,
    state: current.attributes.appStoreState, releaseType: 'MANUAL', locales: ['he', 'en-US'],
    metadataVerified: true, submissionPerformed: false, buildChanged: false,
    screenshotsUploaded: false, pricingChanged: false };
}

if (require.main === module) {
  const listing = JSON.parse(fs.readFileSync('marketing/app-store/listing.json', 'utf8'));
  prepareDraft(listing, createAppleClient()).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (process.env.APPSTORE_DRAFT_REPORT) fs.writeFileSync(process.env.APPSTORE_DRAFT_REPORT, JSON.stringify(result, null, 2));
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { prepareDraft };
