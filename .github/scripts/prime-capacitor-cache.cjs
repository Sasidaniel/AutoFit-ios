const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function primeCapacitorCache(version, downloadDirectory, cacheDirectory) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid Capacitor version');
  const release = JSON.parse(fs.readFileSync(path.join(downloadDirectory, 'release.json'), 'utf8'));
  if (release.tag_name !== version) throw new Error('Capacitor release version mismatch');
  const verified = ['Capacitor', 'Cordova'].map((name) => {
    const filename = `${name}.xcframework.zip`;
    const assets = release.assets.filter((asset) => asset.name === filename);
    const url = `https://github.com/ionic-team/capacitor-swift-pm/releases/download/${version}/${filename}`;
    if (assets.length !== 1 || assets[0].browser_download_url !== url
      || !/^sha256:[a-f0-9]{64}$/.test(assets[0].digest)) {
      throw new Error(`Missing or invalid ${name} release integrity metadata`);
    }
    const source = path.join(downloadDirectory, filename);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
    if (`sha256:${digest}` !== assets[0].digest) throw new Error(`${name} download checksum mismatch`);
    const destination = path.join(cacheDirectory, url.replace(/[^A-Za-z0-9_]/g, '_'));
    if (fs.existsSync(destination)
      && crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex') !== digest) {
      throw new Error(`${name} existing cached artifact checksum mismatch`);
    }
    return { name, source, destination };
  });
  fs.mkdirSync(cacheDirectory, { recursive: true });
  for (const artifact of verified) {
    if (!fs.existsSync(artifact.destination)) fs.copyFileSync(artifact.source, artifact.destination, fs.constants.COPYFILE_EXCL);
  }
  return verified.map((artifact) => artifact.name);
}

module.exports = { primeCapacitorCache };
if (require.main === module) {
  if (process.argv.length !== 5) throw new Error('Usage: prime-capacitor-cache.cjs VERSION DOWNLOAD_DIRECTORY CACHE_DIRECTORY');
  console.log(`Verified and primed: ${primeCapacitorCache(...process.argv.slice(2)).join(', ')}`);
}
