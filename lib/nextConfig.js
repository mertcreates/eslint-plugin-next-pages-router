const { existsSync, readFileSync } = require('fs');
const { join, extname, isAbsolute } = require('path');
const vm = require('vm');

function resolveConfigPath(cwd, configPath) {
  const raw = configPath || '';

  if (!raw) {
    return null;
  }

  return isAbsolute(raw) ? raw : join(cwd, raw);
}

function toPlainJsonValue(value) {
  return value && typeof value === 'object'
    ? JSON.parse(JSON.stringify(value))
    : null;
}

function tryLoadJson(absPath) {
  try {
    const raw = readFileSync(absPath, 'utf8');
    const data = JSON.parse(raw);

    return toPlainJsonValue(data);
  } catch {
    return null;
  }
}

function extractDefaultExportObjectLiteral(raw) {
  const match = /\bexport\s+default\b/.exec(raw);

  if (!match) {
    return null;
  }

  const start = raw.indexOf('{', match.index + match[0].length);

  if (start === -1) {
    return null;
  }

  if (raw.slice(match.index + match[0].length, start).trim()) {
    return null;
  }

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];

    if (lineComment) {
      if (char === '\n' || char === '\r') {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char !== '}') {
      continue;
    }

    depth -= 1;

    if (depth === 0) {
      return raw.slice(start, i + 1);
    }
  }

  return null;
}

function tryLoadMjs(absPath) {
  try {
    const raw = readFileSync(absPath, 'utf8');
    const objectLiteral = extractDefaultExportObjectLiteral(raw);

    if (!objectLiteral) {
      return null;
    }

    const data = vm.runInNewContext(`(${objectLiteral})`, Object.create(null), {
      timeout: 50,
    });

    return toPlainJsonValue(data);
  } catch {
    return null;
  }
}

function normalizeConfigExport(value) {
  if (!value) {
    return null;
  }

  const config = value && value.__esModule && value.default ? value.default : value;

  if (typeof config === 'function') {
    try {
      const resolved = config(null, { defaultConfig: {} });

      return resolved && typeof resolved === 'object' ? resolved : null;
    } catch {
      return null;
    }
  }

  return typeof config === 'object' ? config : null;
}

function loadNextConfigSync({ cwd, configPath }) {
  const candidates = [];

  if (configPath) {
    const resolved = resolveConfigPath(cwd, configPath);

    if (resolved) {
      candidates.push(resolved);
    }
  } else {
    candidates.push(
      join(cwd, 'next.config.js'),
      join(cwd, 'next.config.cjs'),
      join(cwd, 'next.config.mjs'),
      join(cwd, 'next.config.json')
    );
  }

  for (const absPath of candidates) {
    if (!existsSync(absPath)) {
      continue;
    }

    const ext = extname(absPath);

    if (ext === '.json') {
      const jsonConfig = tryLoadJson(absPath);

      if (jsonConfig) {
        return jsonConfig;
      }

      continue;
    }

    if (ext === '.mjs') {
      const mjsConfig = tryLoadMjs(absPath);

      if (mjsConfig) {
        return mjsConfig;
      }

      continue;
    }

    try {
      const mod = require(absPath);
      const config = normalizeConfigExport(mod);

      if (config) {
        return config;
      }
    } catch {
      continue;
    }
  }

  return null;
}

module.exports = {
  loadNextConfigSync,
};
