const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { test } = require('node:test');
const listing = require('./listing.json');
const assets = path.join(__dirname, 'assets');
const provenance = JSON.parse(fs.readFileSync(path.join(assets, 'provenance.json'), 'utf8'));

test('both localizations meet actual metadata limits, including UTF-8 keyword bytes', () => {
  for (const [locale, copy] of Object.entries(listing.locales)) {
    for (const [field, limit] of Object.entries({ name: 30, subtitle: 30, promotionalText: 170, description: 4000 })) {
      assert.ok(copy[field]?.trim(), `${locale} ${field} is required`);
      assert.ok([...copy[field]].length <= limit, `${locale} ${field} exceeds ${limit}`);
    }
    assert.ok(Buffer.byteLength(copy.keywords, 'utf8') <= 100, `${locale} keywords exceed 100 UTF-8 bytes`);
    assert.doesNotMatch(copy.description, /<[^>]+>/, 'Store descriptions must be plain text');
    assert.doesNotMatch(copy.description, /₪|\$\d|free forever|חינם לתמיד/i);
    assert.deepEqual(copy.screens.map((item) => item.id), ['workout', 'plans', 'sets', 'statistics', 'saved', 'history', 'cardio', 'library']);
    assert.equal(new Set(copy.screens.map((item) => item.title)).size, 8);
    assert.deepEqual(copy.iphoneFeatures.map((item) => item.id), ['health', 'biometrics', 'music', 'activity']);
    for (const feature of copy.iphoneFeatures) {
      assert.ok(feature.title && feature.text);
      assert.ok(copy.description.includes(`${feature.title}: ${feature.text}`), `${locale} iPhone claims must match store copy exactly`);
    }
    assert.ok(copy.campaign.headline && copy.campaign.positioning);
    assert.equal(copy.campaign.cards.length, 4);
    assert.equal(copy.campaign.hooks.length, 3);
    for (const card of copy.campaign.cards) assert.ok(card.title && card.text);
    for (const item of copy.screens) {
      assert.ok(item.title && item.caption && item.alt && item.eyebrow);
      assert.ok(item.title.split('\n').length === 2, 'Each artwork has two authored headline lines');
    }
  }
});

test('every displayed image exists, has verified dimensions and contains no alpha channel', () => {
  assert.equal(provenance.records.length, 32);
  assert.equal(new Set(provenance.records.map((item) => item.file)).size, 32);
  for (const item of provenance.records) {
    const bytes = fs.readFileSync(path.join(assets, item.file));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    const raw = item.file.startsWith('raw-');
    assert.equal(bytes.readUInt32BE(16), raw ? 1170 : 1290);
    assert.equal(bytes.readUInt32BE(20), raw ? 2532 : 2796);
    assert.equal(bytes[24], 8, '8-bit PNG');
    assert.equal(bytes[25], 2, 'Opaque RGB, not RGBA or indexed transparency');
    let offset = 8;
    while (offset < bytes.length) {
      const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
      assert.notEqual(type, 'tRNS', 'No transparency chunks');
      offset += length + 12;
    }
    assert.equal(offset, bytes.length);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256);
  }
  for (const [locale, copy] of Object.entries(listing.locales)) {
    for (const screen of copy.screens) {
      assert.ok(provenance.records.find((item) => item.file === `${locale}-${screen.id}.png`));
      assert.ok(provenance.records.find((item) => item.file === `raw-${locale}-${screen.id}.png`));
    }
  }
});

test('review does not pass off browser screenshots or unresolved store facts as final', () => {
  assert.equal(listing.status, 'local-review-only');
  assert.equal(listing.price, 'Free');
  assert.equal(provenance.nativeDeviceCapture, false);
  assert.equal(provenance.finalSubmissionAssets, false);
  assert.equal(provenance.syntheticData, true);
  assert.equal(provenance.referenceSource, listing.referenceSource);
  for (const key of ['sellerName', 'ageRating', 'supportURL', 'privacyURL', 'territories']) assert.equal(listing.review[key], null);
  assert.deepEqual(listing.review.blockers.map((item) => item.id), ['native', 'legal', 'urls', 'privacy', 'store']);
  const script = fs.readFileSync(path.join(__dirname, 'review.js'), 'utf8');
  assert.match(script, /submissionAuthorized: false/);
  assert.doesNotMatch(script, /api\.appstoreconnect|fetch\([^)]*,\s*\{/);
});

test('native review gallery preserves actual source hashes and separate partial-run provenance', () => {
  const native = JSON.parse(fs.readFileSync(path.join(assets, 'native', 'provenance.json'), 'utf8'));
  assert.equal(native.actualCapacitorSimulatorApp, true);
  assert.equal(native.syntheticData, true);
  assert.equal(native.nativeVoiceSimulated, false);
  assert.equal(native.finalSubmissionAssets, false, 'Raw simulator PNGs are not final opaque artwork');
  for (const family of listing.nativePreview.families) {
    const [width, height] = family === 'iphone' ? [1320, 2868] : [2064, 2752];
    for (const language of ['he', 'en']) {
      const hashes = [];
      for (const screen of listing.locales[language].screens) {
        const file = `${family}-${language}-${screen.id}.png`;
        const record = native.records.find((item) => item.file === file);
        assert.ok(record, file);
        const bytes = fs.readFileSync(path.join(assets, 'native', file));
        assert.equal(bytes.readUInt32BE(16), width); assert.equal(bytes.readUInt32BE(20), height);
        assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), record.sha256);
        hashes.push(record.sha256);
      }
      assert.equal(new Set(hashes).size, 8, 'Each device/locale has eight distinct scenes');
    }
  }
});

test('native artwork is opaque at exact device dimensions and tied to the original native pixels', () => {
  const native = JSON.parse(fs.readFileSync(path.join(assets, 'native', 'provenance.json'), 'utf8'));
  const compositions = JSON.parse(fs.readFileSync(path.join(assets, 'native-compositions.json'), 'utf8'));
  assert.equal(compositions.nativeDeviceSource, true);
  for (const family of listing.nativePreview.composedFamilies) {
    const [width, height] = family === 'iphone' ? [1320, 2868] : [2064, 2752];
    for (const language of ['he', 'en']) {
      for (const screen of listing.locales[language].screens) {
        const record = compositions.records.find((item) => item.file === `native-${family}-${language}-${screen.id}.png`);
        assert.ok(record);
        const original = native.records.find((item) => item.file === record.sourceFile);
        assert.equal(record.sourceSHA256, original.sha256);
        const bytes = fs.readFileSync(path.join(assets, record.file));
        assert.equal(bytes.readUInt32BE(16), width); assert.equal(bytes.readUInt32BE(20), height);
        assert.equal(bytes[24], 8); assert.equal(bytes[25], 2);
        let offset = 8;
        while (offset < bytes.length) {
          const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
          assert.notEqual(type, 'tRNS'); offset += length + 12;
        }
        assert.equal(offset, bytes.length);
        assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), record.sha256);
      }
    }
  }
});
