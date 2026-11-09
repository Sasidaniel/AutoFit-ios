const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const base = 'http://127.0.0.1:8970';
const debuggingPort = 8971;
const assets = path.join(__dirname, 'assets');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class CDP {
  constructor(url) {
    this.socket = new WebSocket(url); this.pending = new Map(); this.id = 0; this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', ({ data }) => {
      const event = JSON.parse(data);
      if (event.method === 'Runtime.exceptionThrown') this.errors.push(event.params.exceptionDetails);
      if (!event.id) return;
      const task = this.pending.get(event.id);
      if (!task) return;
      clearTimeout(task.timeout); this.pending.delete(event.id);
      if (event.error) task.reject(new Error(JSON.stringify(event.error))); else task.resolve(event.result);
    });
  }
  async send(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      this.pending.set(id, { resolve, reject, timeout });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async wait(expression) {
    for (let i = 0; i < 80; i++) { if (await this.eval(expression)) return; await sleep(100); }
    throw new Error(`Page condition not met: ${expression}`);
  }
}
async function main() {
  const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profile = process.env.CAPTURE_PROFILE;
  if (!profile || !path.isAbsolute(profile)) throw new Error('CAPTURE_PROFILE must be a dedicated absolute session path');
  if (!fs.existsSync(chromePath)) throw new Error('Chrome executable not found');
  const status = await fetch(`${base}/listing.json`);
  if (!status.ok) throw new Error('Local review server is not ready');
  const listing = await status.json();
  fs.mkdirSync(assets, { recursive: true });
  const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${debuggingPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', 'about:blank'],
  { stdio: 'ignore' });
  let browser, page;
  const records = [];
  try {
    let version;
    for (let i = 0; i < 100; i++) {
      try { const r = await fetch(`http://127.0.0.1:${debuggingPort}/json/version`); version = await r.json(); break; }
      catch { await sleep(100); }
    }
    if (!version) throw new Error('Isolated Chrome did not become ready');
    browser = new CDP(version.webSocketDebuggerUrl);
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const targets = await (await fetch(`http://127.0.0.1:${debuggingPort}/json/list`)).json();
    page = new CDP(targets.find((target) => target.id === targetId).webSocketDebuggerUrl);
    await page.send('Page.enable'); await page.send('Runtime.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    const capture = async (filename) => {
      await sleep(350);
      await page.eval('document.fonts.ready');
      await page.eval('document.activeElement?.blur()');
      const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
      const bytes = Buffer.from(data, 'base64');
      fs.writeFileSync(path.join(assets, filename), bytes);
      records.push({ file: filename, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20),
        sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    };
    const click = async (selector) => page.eval(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw new Error('Missing capture control: '+${JSON.stringify(selector)});node.click();})()`);
    const scrollCard = async (index) => page.eval(`window.scrollTo(0, document.querySelector('.exercise-card[data-entry-index="${index}"]').getBoundingClientRect().top + scrollY - 170)`);
    const nativeControlChecks = [];
    const nativeCompositions = process.argv.includes('--native-compositions');
    if (process.argv.includes('--native-controls-check')) {
      const nativeSource = fs.readFileSync(path.join(__dirname, 'native-controls.js'), 'utf8');
      const source = nativeSource.slice(0, nativeSource.indexOf('\nrun().catch')).replace(/^import .*$/gm, '');
      for (const [family, width, height] of [['iphone', 440, 956], ['ipad', 1032, 1376]]) {
        for (const language of ['he', 'en']) {
          await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
          await page.send('Page.navigate', { url: `${base}/fixture.html?lang=${language}` });
          await page.wait(`location.pathname==='/app/' && !!document.querySelector('#exerciseList .exercise-card') && document.documentElement.lang==='${language}' && document.getElementById('splashScreen').classList.contains('hidden')`);
          await page.eval(`window.prepareStoreScene=(()=>{${source};return prepare;})()`);
          for (const screen of ['workout', 'sets', 'plans', 'saved', 'statistics', 'history', 'cardio', 'library']) {
            await page.eval(`window.prepareStoreScene(${JSON.stringify(screen)})`);
            if (['sets', 'cardio'].includes(screen)) {
              const index = screen === 'sets' ? 1 : 0;
              const visible = await page.eval(`(()=>{
                const card=document.querySelector('.exercise-card[data-entry-index="${index}"]').getBoundingClientRect();
                const header=document.querySelector('.topbar').getBoundingClientRect();
                const status=document.querySelector('.workout-quick-status');
                return card.top>=Math.max(header.bottom,status?.getClientRects().length?status.getBoundingClientRect().bottom:0);
              })()`);
              if (!visible) throw new Error(`Exercise heading hidden by sticky controls: ${family}/${language}/${screen}`);
            }
            nativeControlChecks.push({ family, language, screen, actualDOMControls: true, nativeDeviceCapture: false });
          }
          console.log(`Verified eight actual DOM capture controls: ${family}/${language}; browser only, no native simulation`);
        }
      }
    }
    if (nativeCompositions) {
      const provenance = JSON.parse(fs.readFileSync(path.join(assets, 'native', 'provenance.json'), 'utf8'));
      if (provenance.actualCapacitorSimulatorApp !== true || !listing.nativePreview?.families.length) {
        throw new Error('Verified native source images are required before composition');
      }
      for (const family of listing.nativePreview.families) {
        if (!['iphone', 'ipad'].includes(family)) throw new Error('Invalid native composition family');
        const [width, height, scale] = family === 'iphone' ? [440, 956, 3] : [1032, 1376, 2];
        for (const language of ['he', 'en']) {
          for (const screen of listing.locales[language].screens) {
            const file = `${family}-${language}-${screen.id}.png`;
            const original = provenance.records.find((record) => record.file === file);
            const bytes = fs.readFileSync(path.join(assets, 'native', file));
            if (!original || crypto.createHash('sha256').update(bytes).digest('hex') !== original.sha256) {
              throw new Error(`Native source hash mismatch: ${file}`);
            }
            await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
            await page.send('Page.navigate', { url: `${base}/capture.html?source=native&family=${family}&lang=${language}&screen=${screen.id}` });
            await page.wait(`document.documentElement.dataset.ready==='true' && document.documentElement.dataset.nativeFamily===${JSON.stringify(family)} && document.getElementById('screen').getAttribute('src')===${JSON.stringify(`/assets/native/${file}`)} && document.getElementById('screen').complete && document.getElementById('screen').naturalWidth>0`);
            const aligned = await page.eval(`(()=>{
              const phone=document.querySelector('.phone').getBoundingClientRect();
              const title=document.getElementById('title'), caption=document.getElementById('caption');
              return scrollY===0 && phone.top===${family === 'iphone' ? 222 : 450}
                && title.scrollWidth<=title.clientWidth && caption.scrollWidth<=caption.clientWidth
                && caption.getBoundingClientRect().bottom<phone.top;
            })()`);
            if (!aligned) throw new Error(`Clipped native composition: ${family}/${language}/${screen.id}`);
            const output = `native-${family}-${language}-${screen.id}.png`;
            await capture(output);
            const image = fs.readFileSync(path.join(assets, output));
            if (image.readUInt32BE(16) !== width * scale || image.readUInt32BE(20) !== height * scale
              || ![0, 2].includes(image[25])) throw new Error(`Native composition dimensions or opacity incorrect: ${output}`);
            Object.assign(records.at(-1), { sourceFile: file, sourceSHA256: original.sha256 });
          }
          console.log(`Composed eight opaque native-source candidates: ${family}/${language}`);
        }
      }
      fs.writeFileSync(path.join(assets, 'native-compositions.json'), JSON.stringify({
        capturedAt: new Date().toISOString(), nativeDeviceSource: true, syntheticData: true,
        compositor: version.Browser, sourceProvenance: 'native/provenance.json',
        finalSubmissionAssets: false, records,
      }, null, 2));
    }
    if (!process.argv.includes('--review-only') && !process.argv.includes('--native-controls-check') && !nativeCompositions) {
    for (const language of ['he', 'en']) {
      await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
      await page.send('Page.navigate', { url: `${base}/fixture.html?lang=${language}` });
      await page.wait(`location.pathname==='/app/' && !!document.querySelector('#exerciseList .exercise-card') && document.documentElement.lang==='${language}'`);
      await page.wait(`document.getElementById('splashScreen').classList.contains('hidden')`);
      await scrollCard(0);
      await capture(`raw-${language}-workout.png`);
      await click('.exercise-card[data-entry-index="1"] .workout-card-toggle');
      await scrollCard(1);
      await capture(`raw-${language}-sets.png`);
      await click('[data-page-link="plans"]');
      await click('.plan-custom-builder summary');
      await click('#btnPersonalPlan');
      await page.wait(`!!document.querySelector('dialog[open] #personalPlanForm')`);
      await page.eval(`(()=>{const f=document.querySelector('#personalPlanForm');for(const [k,v] of Object.entries({goal:'strength',experience:'regular',days:'3',minutes:'45',location:'gym'})){f.elements[k].value=v;f.elements[k].dispatchEvent(new Event('change',{bubbles:true}));}})()`);
      await page.eval(`(()=>{const f=document.querySelector('#personalPlanForm');for(const value of ['משקולות יד','ספסל']) f.querySelector('[name="equipment"][value="'+value+'"]').checked=true;f.requestSubmit();})()`);
      await page.wait(`!!document.querySelector('dialog[open] .training-plan-row')`);
      await capture(`raw-${language}-plans.png`);
      await click('#btnSaveAlternatePlan');
      await page.wait(`!!document.querySelector('dialog[open].saved-plans-dialog [data-edit-plan]')`);
      await capture(`raw-${language}-saved.png`);
      await page.eval(`document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close())`);
      await sleep(100);
      await click('.tab-btn[data-tab="dashboard"]');
      await page.eval('window.scrollTo(0,0)');
      await capture(`raw-${language}-statistics.png`);
      await click('.tab-btn[data-tab="history"]');
      await page.eval('window.scrollTo(0,0)');
      await capture(`raw-${language}-history.png`);
      await click('.tab-btn[data-tab="workout"]');
      await click('.exercise-card[data-entry-index="0"] .workout-card-toggle');
      await scrollCard(0);
      await capture(`raw-${language}-cardio.png`);
      await click('.tab-btn[data-tab="exercises"]');
      await click('[data-environment="all"]');
      await click('[data-equipment-group="muscles"]');
      await page.eval('window.scrollTo(0,0)');
      await capture(`raw-${language}-library.png`);
      console.log(`Captured eight actual ${language} app screens`);
      for (const screen of listing.locales[language].screens) {
        await page.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 3, mobile: false });
        await page.send('Page.navigate', { url: `${base}/capture.html?lang=${language}&screen=${screen.id}` });
        await page.wait(`location.search===${JSON.stringify(`?lang=${language}&screen=${screen.id}`)} && document.documentElement.dataset.ready==='true' && document.getElementById('screen').getAttribute('src')===${JSON.stringify(`/assets/raw-${language}-${screen.id}.png`)} && document.getElementById('screen').complete && document.getElementById('screen').naturalWidth>0`);
        await page.eval('window.scrollTo(0,0)');
        const aligned = await page.eval(`(()=>{
          const brand=document.querySelector('.brand').getBoundingClientRect();
          const phone=document.querySelector('.phone').getBoundingClientRect();
          const title=document.getElementById('title'), caption=document.getElementById('caption');
          return brand.top===26 && phone.top===222 && scrollY===0
            && title.scrollWidth<=title.clientWidth && caption.scrollWidth<=caption.clientWidth
            && caption.getBoundingClientRect().bottom<phone.top;
        })()`);
        if (!aligned) throw new Error(`Clipped or misaligned composition: ${language}-${screen.id}`);
        await capture(`${language}-${screen.id}.png`);
      }
    }
    if (page.errors.length) throw new Error(`Uncaught app errors: ${JSON.stringify(page.errors)}`);
    fs.writeFileSync(path.join(assets, 'provenance.json'), JSON.stringify({
      capturedAt: new Date().toISOString(), referenceSource: listing.referenceSource,
      runtime: version.Browser, source: 'Actual unmodified www UI in isolated Chrome; no native plugin simulation',
      syntheticData: true, nativeDeviceCapture: false, finalSubmissionAssets: false,
      rawViewport: { width: 390, height: 844, scale: 3 },
      compositionViewport: { width: 430, height: 932, scale: 3 },
      records,
    }, null, 2));
    console.log(`Saved ${records.length} PNG files with hashes and provenance`);
    }
    const checks = [];
    for (const language of ['he', 'en']) {
      for (const width of [320, 390, 768, 1280]) {
        await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
        await page.send('Page.navigate', { url: `${base}/?lang=${language}` });
        await page.wait(`document.querySelectorAll('#galleryGrid img').length===8`);
        await page.eval(`document.querySelectorAll('img[src]').forEach(img=>img.loading='eager')`);
        await page.wait(`[...document.images].filter(img=>img.getAttribute('src')).every(img=>img.complete && img.naturalWidth>0)`);
        const check = await page.eval(`({
          language: document.documentElement.lang, direction: document.documentElement.dir,
          width:innerWidth, contentWidth:document.documentElement.scrollWidth,
          copyCards:document.querySelectorAll('.copy-card').length, blockers:document.querySelectorAll('#blockers .blocker').length,
          iphoneFeatures:[...document.querySelectorAll('#iphoneFeatures article')].map(card=>({title:card.querySelector('h3').textContent,text:card.querySelector('p').textContent})),
          campaign:{
            headline:document.getElementById('campaignHeading').textContent,
            positioning:document.getElementById('campaignPositioning').textContent,
            cards:[...document.querySelectorAll('#campaignCards article')].map(card=>({title:card.querySelector('h3').textContent,text:card.querySelector('p').textContent})),
            hooks:[...document.querySelectorAll('#campaignHooks p')].map(node=>node.textContent)
          },
          missingImages:[...document.images].filter(img=>img.getAttribute('src') && (!img.complete || !img.naturalWidth)).length,
          title:document.getElementById('introTitle').textContent,
          subtitle:document.getElementById('subtitle').textContent,
          fullDescription:document.querySelector('.copy-card.long p').textContent
        })`);
        if (check.language !== language || check.direction !== (language === 'he' ? 'rtl' : 'ltr')
          || check.contentWidth > check.width || check.copyCards !== 5 || check.blockers !== listing.review.blockers.length || check.missingImages
          || check.title.includes('unavailable') || check.subtitle !== listing.locales[language].subtitle
          || JSON.stringify(check.iphoneFeatures) !== JSON.stringify(listing.locales[language].iphoneFeatures.map(({title,text})=>({title,text})))
          || JSON.stringify(check.campaign) !== JSON.stringify(listing.locales[language].campaign)
          || check.fullDescription !== listing.locales[language].description) {
          throw new Error(`Review layout/content failure: ${JSON.stringify(check)}`);
        }
        await click('#galleryGrid button');
        await page.wait(`document.getElementById('imageDialog').open`);
        const fullImage = await page.eval(`({src:document.getElementById('largeImage').getAttribute('src'),href:document.getElementById('downloadImage').getAttribute('href')})`);
        if (fullImage.src !== `/assets/${language}-workout.png` || fullImage.href !== fullImage.src) throw new Error('Enlargement/download mismatch');
        await click('.close-dialog');
        await click('#languageToggle');
        const switched = await page.eval('document.documentElement.lang');
        if (switched === language) throw new Error('Language toggle did not switch');
        await click('#languageToggle');
        checks.push({ language, width, horizontalOverflow: false, copyExact: true, iphoneFeaturesExact: true, campaignExact: true, imageDialog: true, languageToggle: true });
        if (listing.nativePreview?.families.length) {
          for (const family of listing.nativePreview.families) {
            await page.eval(`document.getElementById('nativeFamily').value=${JSON.stringify(family)};document.getElementById('nativeFamily').dispatchEvent(new Event('change'))`);
            await page.wait(`document.querySelectorAll('#nativeGallery img').length===8`);
            const prefix = listing.nativePreview.composedFamilies.includes(family) ? `/assets/native-${family}-${language}-` : `/assets/native/${family}-${language}-`;
            const expected = listing.locales[language].screens.map((screen) => `${prefix}${screen.id}.png`);
            const actual = await page.eval(`[...document.querySelectorAll('#nativeGallery img')].map(img=>img.getAttribute('src'))`);
            if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Native gallery image identity mismatch');
            await click('#nativeGallery button');
            const opened = await page.eval(`document.getElementById('largeImage').getAttribute('src')`);
            if (opened !== expected[0]) throw new Error('Native enlargement source mismatch');
            await click('.close-dialog');
          }
        }
      }
    }
    await click('#reviewButton');
    const receipt = await page.eval(`JSON.parse(localStorage.getItem('autofit-store-creative-review'))`);
    if (receipt.submissionAuthorized !== false || receipt.status !== 'creative-only') throw new Error('Creative approval oversteps submission boundary');
    await page.eval(`localStorage.removeItem('autofit-store-creative-review')`);
    const supportChecks = [];
    for (const language of ['he', 'en']) {
      for (const width of [390, 1024]) {
        await page.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
        for (const kind of ['support', 'privacy', 'terms']) {
          const route = `/${kind}${language === 'he' ? '' : '-en'}.html`;
          await page.send('Page.navigate', { url: base + route });
          await page.wait(`document.querySelector('main footer a[href^="mailto:"]') !== null`);
          const check = await page.eval(`({
            language:document.documentElement.lang,direction:document.documentElement.dir,
            overflow:document.documentElement.scrollWidth>innerWidth,
            contact:document.querySelector('footer a[href^="mailto:"]').getAttribute('href'),
            draft:!!document.querySelector('.review-note'),
            translated:!!document.querySelector('nav a[lang="${language === 'he' ? 'en' : 'he'}"]')
          })`);
          if (check.language !== language || check.direction !== (language === 'he' ? 'rtl' : 'ltr')
            || check.overflow || !check.draft || !check.translated
            || check.contact !== `mailto:${listing.review.publicSupportAndPrivacyEmail}`) {
            throw new Error(`Support/policy review failure: ${route} ${width} ${JSON.stringify(check)}`);
          }
          supportChecks.push({ language, width, kind, horizontalOverflow: false, publicContact: true, draftExplicit: true });
        }
      }
    }
    const blockedPaths = ['/PROJECT-NOTES.md', '/.git/config', '/capture.cjs', '/support-site.cjs',
      '/native-controls.js', '/native-store-control.json', '/native-store-ready', '/native-store-error',
      '/app/../PROJECT-NOTES.md', '/app/service-worker.js'];
    for (const url of blockedPaths) {
      const response = await fetch(base + url);
      if (response.status < 400) throw new Error(`Local server exposed a nonpublic path: ${url}`);
    }
    if (page.errors.length) throw new Error(`Review errors: ${JSON.stringify(page.errors)}`);
    const report = { checkedAt: new Date().toISOString(), checks, supportChecks, nativeControlChecks, localApprovalOnly: true, nonpublicPathsBlocked: blockedPaths.length };
    fs.writeFileSync(path.join(assets, 'browser-checks.json'), JSON.stringify(report, null, 2));
    console.log(`Verified ${checks.length} storefront layouts, ${supportChecks.length} support/policy layouts, image identity, language toggle and local-only approval`);
  } finally {
    if (browser) { try { await browser.send('Browser.close'); } catch (error) { console.error(`Chrome close: ${error.message}`); } browser.socket.close(); }
    if (page) page.socket.close();
    if (chrome.exitCode === null) await Promise.race([new Promise((resolve) => chrome.once('exit', resolve)), sleep(3000)]);
    if (chrome.exitCode === null) chrome.kill();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
