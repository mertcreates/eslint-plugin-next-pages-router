const { readdirSync, existsSync } = require('fs');
const { join, extname, relative, sep, isAbsolute } = require('path');

const ALLOWED_EXT = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  '__tests__',
  '__mocks__',
  '__fixtures__',
  '__test__',
  'tests',
]);
const IGNORE_FILE_PATTERNS = [
  '.test.',
  '.spec.',
  '.e2e.',
  '.cy.',
  '.stories.',
  '.story.',
  '.mock.',
];

function shouldIgnoreFile(fileName) {
  if (fileName.endsWith('.d.ts')) {
    return true;
  }
  for (const pat of IGNORE_FILE_PATTERNS) {
    if (fileName.includes(pat)) {
      return true;
    }
  }

  return false;
}

function walkDirSync(dirAbsPath, onFile, onDir) {
  if (typeof onDir === 'function') {
    onDir(dirAbsPath);
  }

  const entries = readdirSync(dirAbsPath, { withFileTypes: true });

  for (const ent of entries) {
    const abs = join(dirAbsPath, ent.name);

    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) {
        continue;
      }
      walkDirSync(abs, onFile, onDir);
      continue;
    }

    if (!ent.isFile()) {
      continue;
    }
    if (shouldIgnoreFile(ent.name)) {
      continue;
    }

    const ext = extname(ent.name);

    if (!ALLOWED_EXT.has(ext)) {
      continue;
    }

    onFile(abs);
  }
}

function fileToRoute(pagesDirAbs, fileAbsPath) {
  const rel = relative(pagesDirAbs, fileAbsPath);
  const noExt = rel.replace(/\.(tsx|ts|jsx|js)$/, '');
  const parts = noExt.split(sep).filter(Boolean);

  if (parts[0] === 'api') {
    return null;
  }

  if (
    parts.length === 1 &&
    ['_app', '_document', '_error', '404', '500'].includes(parts[0])
  ) {
    return null;
  }
  if (parts.includes('_middleware')) {
    return null;
  }

  const routeParts = parts
    .map((seg) => (seg === 'index' ? null : seg))
    .filter(Boolean);

  const route = '/' + routeParts.join('/');

  return route === '/' ? '/' : route;
}

function buildPagesRouteStateSync({ pagesDir, cwd = process.cwd() }) {
  const pagesAbs = isAbsolute(pagesDir) ? pagesDir : join(cwd, pagesDir);

  if (!existsSync(pagesAbs)) {
    return {
      routeSet: new Set(),
      watchedDirs: new Set(),
    };
  }

  const routeSet = new Set();
  const watchedDirs = new Set();

  walkDirSync(
    pagesAbs,
    (fileAbs) => {
      const route = fileToRoute(pagesAbs, fileAbs);

      if (route) {
        routeSet.add(route);
      }
    },
    (dirAbs) => {
      watchedDirs.add(dirAbs);
    }
  );

  return {
    routeSet,
    watchedDirs,
  };
}

const pagesManifest = {
  buildPagesRouteStateSync,
};

module.exports = pagesManifest;
