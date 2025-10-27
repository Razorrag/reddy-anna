import { build } from 'esbuild';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read package.json to get all dependencies
const packageJson = JSON.parse(
  readFileSync(join(rootDir, 'package.json'), 'utf-8')
);

// Get all dependencies and devDependencies
const allDependencies = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.devDependencies || {})
];

console.log('🔨 Building server with esbuild...');
console.log(`📦 Externalizing ${allDependencies.length} packages`);

try {
  await build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outdir: 'dist',
    external: allDependencies,
    sourcemap: false,
    minify: false,
    logLevel: 'info'
  });

  console.log('✅ Server build completed!');
} catch (error) {
  console.error('❌ Server build failed:', error);
  process.exit(1);
}
