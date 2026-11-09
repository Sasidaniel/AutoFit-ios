const fs = require('node:fs');
const crypto = require('node:crypto');

const origin = 'https://api.appstoreconnect.apple.com';
const bundleID = 'com.sasidaniel.autofit';

function createReader(env = process.env, fetchImpl = fetch) {
  const keyID = env.APPSTORE_API_KEY_ID;
  const issuer = env.APPSTORE_API_ISSUER_ID;
  const key = Buffer.from(env.APPSTORE_API_KEY_P8_BASE64 || '', 'base64').toString('utf8');
  if (!keyID || !issuer || !key.includes('BEGIN PRIVATE KEY')) throw new Error('Missing Apple API credentials');
  return async (route) => {
    const url = new URL(route, origin);
    if (url.origin !== origin || !url.pathname.startsWith('/v1/')) throw new Error('Unexpected Apple API destination');
    const now = Math.floor(Date.now() / 1000);
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({ alg: 'ES256', kid: keyID, typ: 'JWT' })}.${encode({ iss: issuer, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`;
    const signature = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${unsigned}.${signature}` },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const error = new Error(`Apple readiness GET ${url.pathname}: HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  };
}

async function collectReadiness(read) {
  async function many(route) {
    const records = [];
    for (let page = 0; route; page++) {
      if (page >= 10) throw new Error('Apple readiness pagination limit exceeded');
      const result = await read(route);
      if (!Array.isArray(result.data)) throw new Error('Invalid Apple list response');
      records.push(...result.data);
      route = result.links?.next;
    }
    return records;
  }
  async function optional(route) {
    try { return { state: 'available', data: (await read(route)).data }; }
    catch (error) {
      if (error.status !== 404) throw error;
      return { state: 'not-found', httpStatus: 404 };
    }
  }
  const apps = await many(`/v1/apps?filter[bundleId]=${bundleID}&limit=2`);
  if (apps.length !== 1 || apps[0].attributes.bundleId !== bundleID) throw new Error('Cannot uniquely identify AutoFit');
  const app = apps[0], appPath = `/v1/apps/${encodeURIComponent(app.id)}`;
  const infos = await many(`${appPath}/appInfos?limit=50`);
  const appInformation = [];
  for (const info of infos) {
    const locales = await many(`/v1/appInfos/${encodeURIComponent(info.id)}/appInfoLocalizations?limit=50`);
    appInformation.push({
      id: info.id, state: info.attributes.appStoreState,
      locales: locales.map(({ id, attributes: a }) => ({
        id, locale: a.locale, name: a.name, subtitle: a.subtitle,
        privacyPolicyURL: a.privacyPolicyUrl || null,
      })),
    });
  }
  const versions = await many(`${appPath}/appStoreVersions?filter[platform]=IOS&limit=50`);
  const versionInformation = [];
  for (const version of versions) {
    const route = `/v1/appStoreVersions/${encodeURIComponent(version.id)}`;
    const locales = await many(`${route}/appStoreVersionLocalizations?limit=50`);
    const localeInformation = [];
    for (const locale of locales) {
      const sets = await many(`/v1/appStoreVersionLocalizations/${encodeURIComponent(locale.id)}/appScreenshotSets?limit=200`);
      const screenshots = [];
      for (const set of sets) {
        const images = await many(`/v1/appScreenshotSets/${encodeURIComponent(set.id)}/appScreenshots?limit=50`);
        screenshots.push({
          displayType: set.attributes.screenshotDisplayType,
          count: images.length,
          states: images.map((image) => image.attributes.assetDeliveryState?.state || 'unknown'),
        });
      }
      const a = locale.attributes;
      localeInformation.push({
        id: locale.id, locale: a.locale, descriptionCharacters: [...(a.description || '')].length,
        promotionalTextCharacters: [...(a.promotionalText || '')].length,
        supportURL: a.supportUrl || null, screenshots,
      });
    }
    const review = await optional(`${route}/appStoreReviewDetail`);
    const build = await optional(`${route}/build`);
    const reviewAttributes = review.data?.attributes;
    versionInformation.push({
      id: version.id, version: version.attributes.versionString,
      state: version.attributes.appStoreState, releaseType: version.attributes.releaseType,
      copyrightProvided: !!version.attributes.copyright,
      build: { state: build.state, id: build.data?.id || null, number: build.data?.attributes.version || null },
      reviewContact: {
        state: review.state,
        complete: !!reviewAttributes && ['contactFirstName', 'contactLastName', 'contactPhone', 'contactEmail']
          .every((field) => !!reviewAttributes[field]?.trim()),
        demoAccountRequired: reviewAttributes?.demoAccountRequired ?? null,
      },
      locales: localeInformation,
    });
  }
  return {
    checkedAt: new Date().toISOString(), readOnly: true, submissionPerformed: false,
    app: { id: app.id, name: app.attributes.name, bundleID },
    appInformation, versions: versionInformation,
    notAssessed: ['agreements', 'price and availability', 'age-rating answers', 'privacy-label answers',
      'policy accuracy and approval', 'native screenshot provenance', 'media rights', 'system-backup handling'],
  };
}

async function main() {
  const report = await collectReadiness(createReader());
  const output = process.env.APPSTORE_READINESS_REPORT || 'app-store-readiness.json';
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## App Store readiness (read only)\nApp: ${report.app.name}, bundle: ${bundleID}.\n`
    + `Found ${report.versions.length} iOS version(s). No metadata, pricing, build or submission was changed.\n`
    + 'The artifact contains a sanitized snapshot, not a certificate of readiness or successful submission.\n');
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { createReader, collectReadiness };
