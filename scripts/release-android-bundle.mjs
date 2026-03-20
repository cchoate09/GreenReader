import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const androidDir = path.join(repoRoot, 'android');
const gradleInvocation = process.platform === 'win32'
  ? {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'gradlew.bat bundleRelease'],
    }
  : {
      command: './gradlew',
      args: ['bundleRelease'],
    };

const checkResult = spawnSync(
  process.execPath,
  [path.join(repoRoot, 'scripts', 'check-release-config.mjs'), '--platform', 'android'],
  {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  },
);

if (checkResult.status !== 0) {
  process.exit(checkResult.status ?? 1);
}

const buildResult = spawnSync(
  gradleInvocation.command,
  gradleInvocation.args,
  {
    cwd: androidDir,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
    stdio: 'inherit',
  },
);

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const bundlePath = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
if (fs.existsSync(bundlePath)) {
  console.log(`\nAndroid release bundle ready: ${bundlePath}`);
}
