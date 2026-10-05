const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function countFiles(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

function build() {
  console.log('🚀 Starting production build for Lost & Found Portal...');

  if (!fs.existsSync(FRONTEND_DIR)) {
    console.error(`❌ Error: Frontend directory not found at ${FRONTEND_DIR}`);
    process.exit(1);
  }

  // Clean dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // Copy frontend files to dist
  copyDirRecursive(FRONTEND_DIR, DIST_DIR);

  // Verification checks
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ Build failed: dist/index.html was not generated!');
    process.exit(1);
  }

  const totalFiles = countFiles(DIST_DIR);
  console.log(`✓ Verification passed: dist/index.html exists.`);
  console.log(`✓ Output directory: ${DIST_DIR}`);
  console.log(`✓ Total static assets packaged: ${totalFiles}`);
  console.log('🎉 Production build completed successfully!');
}

build();
