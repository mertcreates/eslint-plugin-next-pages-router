const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PACKAGE_NAME = '@mertcreates/eslint-plugin-next-pages-router';
const PACKAGE_DIRECTORY = 'eslint-plugin-next-pages-router';
const TYPE_DEPENDENCIES = [
  '@types/eslint',
  '@types/estree',
  '@types/json-schema',
];
const repoRoot = path.resolve(__dirname, '../..');
const typesRoot = __dirname;
const tscPath = require.resolve('typescript/bin/tsc');

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
  });
}

function copyEntry(source, destination) {
  const sourceStats = fs.lstatSync(source);
  if (sourceStats.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyEntry(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }
  if (!sourceStats.isFile()) {
    throw new Error(`Cannot copy unsupported package entry: ${source}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function installPackedPackage(consumerRoot, tarballPath) {
  const packageScope = path.join(
    consumerRoot,
    'node_modules',
    '@mertcreates'
  );
  fs.mkdirSync(packageScope, { recursive: true });
  run('tar', ['-xzf', tarballPath, '-C', packageScope]);
  fs.renameSync(
    path.join(packageScope, 'package'),
    path.join(packageScope, PACKAGE_DIRECTORY)
  );
  return path.join(packageScope, PACKAGE_DIRECTORY);
}

function installTypeDependencies(
  consumerRoot,
  { includeEslintRuntime = true } = {}
) {
  const nodeModules = path.join(consumerRoot, 'node_modules');
  fs.mkdirSync(nodeModules, { recursive: true });
  if (includeEslintRuntime) {
    fs.symlinkSync(
      path.join(repoRoot, 'node_modules', 'eslint'),
      path.join(nodeModules, 'eslint'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );
  }
  for (const dependency of TYPE_DEPENDENCIES) {
    copyEntry(
      path.join(repoRoot, 'node_modules', dependency),
      path.join(nodeModules, dependency)
    );
  }
}

function compileFixture(consumerRoot) {
  run(process.execPath, [tscPath, '-p', path.join(consumerRoot, 'tsconfig.json')], {
    cwd: consumerRoot,
    stdio: 'inherit',
  });
}

function copyCompileFixture(consumerRoot) {
  fs.copyFileSync(path.join(typesRoot, 'config.cts'), path.join(consumerRoot, 'config.cts'));
  fs.copyFileSync(path.join(typesRoot, 'config.mts'), path.join(consumerRoot, 'config.mts'));
  fs.copyFileSync(path.join(typesRoot, 'tsconfig.json'), path.join(consumerRoot, 'tsconfig.json'));
}

function main() {
  run(process.execPath, [path.join(typesRoot, 'completions.cjs')], {
    stdio: 'inherit',
  });

  const packageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'next-pages-router-package-')
  );

  try {
    const packOutput = run('npm', [
      'pack',
      '--ignore-scripts',
      '--pack-destination',
      packageRoot,
    ]);
    const packLines = packOutput.trim().split(/\r?\n/);
    const tarballName = packLines[packLines.length - 1];
    assert.ok(tarballName && tarballName.endsWith('.tgz'));
    const tarballPath = path.join(packageRoot, tarballName);
    const archiveEntries = run('tar', ['-tzf', tarballPath]);
    assert.match(archiveEntries, /package\/index\.js\n/);
    assert.match(archiveEntries, /package\/index\.d\.ts\n/);
    assert.match(archiveEntries, /package\/rules\/no-invalid-route-compare\.js\n/);
    assert.match(archiveEntries, /package\/lib\/routeEvaluation\.js\n/);
    assert.doesNotMatch(archiveEntries, /package\/tests\//);

    const packedConsumerRoot = path.join(packageRoot, 'consumer');
    fs.mkdirSync(packedConsumerRoot);
    copyCompileFixture(packedConsumerRoot);
    const extractedPackage = installPackedPackage(packedConsumerRoot, tarballPath);
    installTypeDependencies(packedConsumerRoot);
    compileFixture(packedConsumerRoot);

    const typesOnlyConsumerRoot = path.join(packageRoot, 'consumer-types-only');
    fs.mkdirSync(typesOnlyConsumerRoot);
    copyCompileFixture(typesOnlyConsumerRoot);
    installPackedPackage(typesOnlyConsumerRoot, tarballPath);
    installTypeDependencies(typesOnlyConsumerRoot, {
      includeEslintRuntime: false,
    });
    compileFixture(typesOnlyConsumerRoot);

    run(
      process.execPath,
      [
        '-e',
        `const plugin = require('${PACKAGE_NAME}'); if (!plugin.rules || !plugin.configs || Object.keys(plugin).sort().join(',') !== 'configs,rules') process.exit(1);`,
      ],
      { cwd: packedConsumerRoot }
    );

    const esmScript = `import plugin from '${PACKAGE_NAME}'; if (!plugin.rules || !plugin.configs || Object.keys(plugin).sort().join(',') !== 'configs,rules') process.exit(1);`;
    run(process.execPath, ['--input-type=module', '-e', esmScript], {
      cwd: packedConsumerRoot,
    });

    const packedPackageJson = JSON.parse(
      fs.readFileSync(path.join(extractedPackage, 'package.json'), 'utf8')
    );
    assert.ok(packedPackageJson.dependencies?.['@types/eslint']);
    assert.equal(packedPackageJson.devDependencies?.['@types/eslint'], undefined);
  } finally {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
