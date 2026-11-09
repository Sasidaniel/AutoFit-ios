const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSupportPages } = require('../marketing/app-store/support-site.cjs');

test('public policy publication refuses the actual unapproved draft rather than stripping its warnings', () => {
  assert.throws(() => createSupportPages(), /publication refused/);
});

test('support and both actual in-app policies render in two directions with explicit review status', () => {
  const pages = createSupportPages({ allowDraft: true });
  assert.equal(Object.keys(pages).length, 6);
  for (const [file, html] of Object.entries(pages)) {
    const english = file.includes('-en');
    assert.match(html, new RegExp(`lang="${english ? 'en' : 'he'}" dir="${english ? 'ltr' : 'rtl'}"`));
    assert.match(html, /noindex,nofollow/);
    assert.match(html, /mailto:autofitrainer@gmail\.com/);
    assert.match(html, /review-note/);
    assert.doesNotMatch(html, /<iframe|<script|<form|analytics|googletagmanager|facebook\.net/);
    if (english) {
      assert.match(html, /not published support or privacy URLs/);
      assert.doesNotMatch(html.replace(/<a[^>]*lang="he"[^>]*>.*?<\/a>/g, ''), /[\u0590-\u05ff]/);
    }
    for (const [, href] of html.matchAll(/href="([^"]+\.html)"/g)) assert.ok(pages[href], href);
  }
  assert.match(pages['support-en.html'], /voice commands currently support Hebrew/);
  assert.match(pages['support-en.html'], /Later AutoFit edits do not automatically update/);
  assert.match(pages['privacy-en.html'], /Formspree/);
  assert.match(pages['privacy-en.html'], /commercial-draft-3/);
  assert.match(pages['privacy-en.html'], /identity and guardianship are not verified/);
  assert.match(pages['terms-en.html'], /mandatory consumer rights/);
});
