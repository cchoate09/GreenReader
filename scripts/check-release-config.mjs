import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const platformIndex = argv.indexOf('--platform');
const targetPlatform = platformIndex >= 0 ? argv[platformIndex + 1] : 'android';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function findPlugin(plugins, name) {
  return plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === name);
}

const appJson = readJson('app.json');
const easJson = readJson('eas.json');
const adBannerSource = fs.readFileSync(path.join(repoRoot, 'src/components/AdBanner.js'), 'utf8');

const errors = [];
const warnings = [];
const expoConfig = appJson.expo ?? {};
const adMobPlugin = findPlugin(expoConfig.plugins ?? [], 'react-native-google-mobile-ads');
const adMobPluginOptions = adMobPlugin?.[1] ?? {};
const androidSubmit = easJson.submit?.production?.android;
const testIosAppId = 'ca-app-pub-3940256099942544~1458002511';

if (!androidSubmit) {
  errors.push('Missing EAS Submit Android production configuration in eas.json.');
} else {
  if (androidSubmit.serviceAccountKeyPath === './google-play-key.json') {
    errors.push('Android submit still points at a repo-root Google Play key. Use ./.secrets/google-play-key.json instead.');
  }

  if (!androidSubmit.serviceAccountKeyPath?.startsWith('./.secrets/')) {
    errors.push('Android submit credentials should point to a gitignored path under ./.secrets/.');
  }

  if (!fileExists(androidSubmit.serviceAccountKeyPath)) {
    warnings.push(`Android submit key not found at ${androidSubmit.serviceAccountKeyPath}. Put the Play service account JSON there before running eas submit.`);
  }
}

if (!adMobPluginOptions.androidAppId) {
  errors.push('Missing Android AdMob app ID in app.json.');
}

if (!/android:\s*'ca-app-pub-/.test(adBannerSource)) {
  errors.push('Missing Android production banner ad unit in src/components/AdBanner.js.');
}

if (!fileExists('android/app-upload.jks')) {
  warnings.push('Local Android upload keystore is missing at android/app-upload.jks.');
}

if (!fileExists('android/keystore.properties')) {
  warnings.push('Local Android keystore.properties is missing at android/keystore.properties.');
}

const iosSubmit = easJson.submit?.production?.ios;
const iosBannerDisabled = /ios:\s*null/.test(adBannerSource);
const iosSubmitPlaceholder = iosSubmit && /your@apple\.id|YOUR_APP_STORE_CONNECT_APP_ID|YOUR_APPLE_TEAM_ID/.test(JSON.stringify(iosSubmit));
const iosAdMobConfigured = !!adMobPluginOptions.iosAppId && adMobPluginOptions.iosAppId !== testIosAppId;

if (targetPlatform === 'ios' || targetPlatform === 'all') {
  if (!iosAdMobConfigured) {
    errors.push('iOS AdMob app ID is not configured with a real production value in app.json.');
  }

  if (iosBannerDisabled) {
    errors.push('iOS banner ads are disabled in src/components/AdBanner.js. Add a real iOS banner unit before an iOS release.');
  }

  if (!iosSubmit || iosSubmitPlaceholder) {
    errors.push('iOS EAS Submit configuration is missing or still contains placeholder values.');
  }
} else {
  if (!iosAdMobConfigured) {
    warnings.push('iOS AdMob app ID still uses the default test value in app.json. That is fine for Android-only release work, but it blocks an iOS store release.');
  }

  if (iosBannerDisabled) {
    warnings.push('iOS banner ads are intentionally disabled until a real production unit is configured.');
  }

  if (!iosSubmit) {
    warnings.push('iOS EAS Submit configuration is intentionally omitted. Add real App Store Connect values when you are ready to ship iOS.');
  } else if (iosSubmitPlaceholder) {
    warnings.push('iOS EAS Submit still contains placeholder values.');
  }
}

const heading = targetPlatform === 'all'
  ? 'Release config check (all platforms)'
  : `Release config check (${targetPlatform})`;

console.log(`\n${heading}`);
console.log('='.repeat(heading.length));

if (errors.length === 0) {
  console.log('Errors: none');
} else {
  console.log('Errors:');
  errors.forEach((error) => console.log(`- ${error}`));
}

if (warnings.length === 0) {
  console.log('Warnings: none');
} else {
  console.log('Warnings:');
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

process.exit(errors.length > 0 ? 1 : 0);
