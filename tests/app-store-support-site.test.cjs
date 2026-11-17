const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSupportPages } = require('../marketing/app-store/support-site.cjs');

test('published support and in-app policies describe actual free adult use in both directions without draft presentation', () => {
  const pages = createSupportPages();
  assert.equal(Object.keys(pages).length, 6);
  for (const [file, html] of Object.entries(pages)) {
    const english = file.includes('-en');
    assert.match(html, new RegExp(`lang="${english ? 'en' : 'he'}" dir="${english ? 'ltr' : 'rtl'}"`));
    assert.doesNotMatch(html, /<meta name="robots" content="noindex,nofollow">/);
    assert.match(html, /mailto:autofitrainer@gmail\.com/);
    assert.doesNotMatch(html, /<p class="review-note">|<p class="legal-draft-warning"/);
    assert.doesNotMatch(html, /<iframe|<script|<form|analytics|googletagmanager|facebook\.net/);
    if (english) {
      assert.doesNotMatch(html, /Review draft|review version|before commercial launch/);
      assert.doesNotMatch(html.replace(/<a[^>]*lang="he"[^>]*>.*?<\/a>/g, ''), /[\u0590-\u05ff]/);
    }
    for (const [, href] of html.matchAll(/href="([^"]+\.html)"/g)) assert.ok(pages[href], href);
  }
  assert.match(pages['support-en.html'], /voice commands currently support Hebrew/);
  assert.match(pages['support-en.html'], /Later AutoFit edits do not automatically update/);
  assert.match(pages['privacy-en.html'], /Formspree/);
  assert.match(pages['privacy-en.html'], /2026-11-17-v1/);
  assert.match(pages['privacy-en.html'], /not identity verification/);
  assert.match(pages['privacy-en.html'], /does not configure automatic expiry/);
  assert.match(pages['privacy-en.html'], /United States/);
  assert.match(pages['terms-en.html'], /mandatory consumer rights/);
});
