const fs = require('node:fs');
const crypto = require('node:crypto');
const keyID = process.env.APPSTORE_API_KEY_ID;
const issuer = process.env.APPSTORE_API_ISSUER_ID;
const buildNumber = process.env.APP_BUILD_NUMBER;
const privateKey = Buffer.from(process.env.APPSTORE_API_KEY_P8_BASE64 || '', 'base64').toString('utf8');
const base64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

async function api(path, method = 'GET', body) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64({ alg: 'ES256', kid: keyID, typ: 'JWT' })}.${base64({ iss: issuer, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' })}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  const response = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${unsigned}.${signature}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Apple verification failed: HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

(async () => {
  if (!keyID || !issuer || !privateKey || !/^[1-9][0-9]*$/.test(buildNumber || '')) {
    throw new Error('Missing App Store credentials or invalid approved build number');
  }
  const plist = fs.readFileSync('ios/App/App/Info.plist', 'utf8');
  if (!/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\s*\/>/.test(plist)) {
    throw new Error('An explicit approved encryption exemption is required before internal distribution');
  }
  const apps = await api('/v1/apps?filter[bundleId]=com.sasidaniel.autofit&limit=2');
  if (apps.data?.length !== 1) throw new Error('Cannot uniquely identify the AutoFit app');
  const appID = apps.data[0].id;
  const assignedGroups = new Set();
  for (let attempt = 0; attempt < 80; attempt++) {
    const result = await api(`/v1/builds?filter[app]=${encodeURIComponent(appID)}&filter[version]=${encodeURIComponent(buildNumber)}&include=buildBetaDetail&sort=-uploadedDate&limit=5`);
    const build = result.data?.find((item) => item.attributes.version === buildNumber);
    const processing = build?.attributes.processingState;
    const detailID = build?.relationships?.buildBetaDetail?.data?.id;
    const beta = result.included?.find((item) => item.type === 'buildBetaDetails' && item.id === detailID);
    const internal = beta?.attributes.internalBuildState;
    console.log(`Apple build ${buildNumber}: ${processing || 'not yet visible'}; internal ${internal || 'not yet available'}`);
    if (['FAILED', 'INVALID'].includes(processing)) throw new Error(`Apple rejected build ${buildNumber}: ${processing}`);
    if (processing === 'VALID') {
      if (build.attributes.usesNonExemptEncryption === true) {
        throw new Error('Apple build encryption declaration differs from the approved app declaration');
      }
      if (build.attributes.usesNonExemptEncryption == null) {
        await api(`/v1/builds/${encodeURIComponent(build.id)}`, 'PATCH', {
          data: { type: 'builds', id: build.id, attributes: { usesNonExemptEncryption: false } },
        });
        console.log(`Applied the existing approved encryption exemption to build ${buildNumber}`);
      } else if (internal === 'IN_BETA_TESTING') {
        console.log(`Verified internal TestFlight build ${buildNumber}; Apple ID ${build.id}`);
        console.log(`External state: ${beta.attributes.externalBuildState}; no external submission performed`);
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
          `## Internal TestFlight release\nBuild **${buildNumber}**, Apple ID \`${build.id}\`: **VALID / IN_BETA_TESTING**.\nChecked-out source: \`${process.env.GITHUB_SHA}\`; the existing uploaded binary is not rebuilt or replaced by verification.\nNo external beta or App Store submission.\n`);
        return;
      } else if (internal === 'READY_FOR_BETA_TESTING') {
        const groups = await api(`/v1/apps/${encodeURIComponent(appID)}/betaGroups?limit=200`);
        const internalGroups = groups.data?.filter((group) => group.attributes.isInternalGroup === true);
        if (!internalGroups?.length) throw new Error('No existing internal tester group is configured; no testers were created');
        for (const group of internalGroups) {
          if (assignedGroups.has(group.id)) continue;
          await api(`/v1/betaGroups/${encodeURIComponent(group.id)}/relationships/builds`, 'POST', {
            data: [{ type: 'builds', id: build.id }],
          });
          assignedGroups.add(group.id);
          console.log(`Enabled build ${buildNumber} for an existing internal tester group`);
        }
      }
    }
    if (attempt < 79) await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  throw new Error(`Build ${buildNumber} was uploaded but internal availability is unconfirmed. Do not re-upload the same build number.`);
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
