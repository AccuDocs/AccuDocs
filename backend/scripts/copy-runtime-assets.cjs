const fs = require('fs');
const path = require('path');

const sourceRoot = path.resolve(__dirname, '..', 'src');
const distRoot = path.resolve(__dirname, '..', 'dist');
const runtimeExtensions = new Set(['.js', '.sql']);

let copiedFiles = 0;

const ensureDirectory = (directoryPath) => {
  fs.mkdirSync(directoryPath, { recursive: true });
};

const copyRuntimeAssets = (currentPath) => {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      copyRuntimeAssets(sourcePath);
      continue;
    }

    if (!runtimeExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const relativePath = path.relative(sourceRoot, sourcePath);
    const destinationPath = path.join(distRoot, relativePath);

    ensureDirectory(path.dirname(destinationPath));
    fs.copyFileSync(sourcePath, destinationPath);
    copiedFiles += 1;
  }
};

ensureDirectory(distRoot);
copyRuntimeAssets(sourceRoot);

console.log(`Copied ${copiedFiles} runtime asset(s) into dist.`);
