import { execSync } from 'child_process';
import { mkdirSync, cpSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Starting build process...');

try {
  // Clean dist directory
  const distDir = join(rootDir, 'dist');
  if (existsSync(distDir)) {
    console.log('🧹 Cleaning dist directory...');
    rmSync(distDir, { recursive: true, force: true });
  }

  // Verify PostCSS config exists in client directory
  const postcssConfigPath = join(rootDir, 'client', 'postcss.config.js');
  if (!existsSync(postcssConfigPath)) {
    console.error('❌ ERROR: postcss.config.js not found in client directory!');
    console.error('   This will cause CSS to not be processed in production.');
    console.error('   Expected location:', postcssConfigPath);
    throw new Error('Missing postcss.config.js in client directory');
  }
  console.log('✅ PostCSS config found in client directory');

  // Install client dependencies
  console.log('📦 Installing client dependencies...');
  execSync('npm install --production=false', {
    cwd: join(rootDir, 'client'),
    stdio: 'inherit'
  });

  // Build client
  console.log('🔨 Building client...');
  execSync('npm run build', {
    cwd: join(rootDir, 'client'),
    stdio: 'inherit'
  });

  // Create dist directories
  console.log('📁 Creating dist directories...');
  mkdirSync(distDir, { recursive: true });
  mkdirSync(join(distDir, 'public'), { recursive: true });

  // Copy client build to dist/public
  console.log('📋 Copying client build files...');
  const clientDistDir = join(rootDir, 'client', 'dist');
  if (existsSync(clientDistDir)) {
    cpSync(clientDistDir, join(distDir, 'public'), { recursive: true });
  } else {
    throw new Error('Client build directory not found');
  }

  // Build server
  console.log('🔨 Building server...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', {
    cwd: rootDir,
    stdio: 'inherit'
  });

  console.log('✅ Build completed successfully!');
  console.log('📦 Output directory: dist/');
  console.log('   - Server: dist/index.js');
  console.log('   - Client: dist/public/');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
