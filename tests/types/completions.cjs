const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const PACKAGE_NAME = '@mertcreates/eslint-plugin-next-pages-router';
const repoRoot = path.resolve(__dirname, '../..');

function linkPackage(consumerRoot, packageRoot) {
  const nodeModules = path.join(consumerRoot, 'node_modules');
  const packageScope = path.join(consumerRoot, 'node_modules', '@mertcreates');
  fs.mkdirSync(packageScope, { recursive: true });
  fs.symlinkSync(
    packageRoot,
    path.join(packageScope, 'eslint-plugin-next-pages-router'),
    process.platform === 'win32' ? 'junction' : 'dir'
  );
  fs.symlinkSync(
    path.join(repoRoot, 'node_modules', 'eslint'),
    path.join(nodeModules, 'eslint'),
    process.platform === 'win32' ? 'junction' : 'dir'
  );
  fs.symlinkSync(
    path.join(repoRoot, 'node_modules', '@types'),
    path.join(nodeModules, '@types'),
    process.platform === 'win32' ? 'junction' : 'dir'
  );
}

function createLanguageService(rootDir, fileNames) {
  const options = {
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };

  const host = {
    directoryExists: ts.sys.directoryExists,
    fileExists: ts.sys.fileExists,
    getCompilationSettings: () => options,
    getCurrentDirectory: () => rootDir,
    getDefaultLibFileName: (compilerOptions) =>
      ts.getDefaultLibFilePath(compilerOptions),
    getScriptFileNames: () => fileNames,
    getScriptSnapshot: (fileName) => {
      const source = ts.sys.readFile(fileName);
      return source === undefined
        ? undefined
        : ts.ScriptSnapshot.fromString(source);
    },
    getScriptVersion: () => '0',
    readDirectory: ts.sys.readDirectory,
    readFile: ts.sys.readFile,
    realpath: ts.sys.realpath,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
  };

  return ts.createLanguageService(host);
}

function writeMarkedSource(rootDir, name, markedSource) {
  const marker = '/*cursor*/';
  const markerIndex = markedSource.indexOf(marker);
  assert.notEqual(markerIndex, -1, `${name} source must contain a cursor marker`);
  const source = markedSource.replace(marker, '');
  const fileName = path.join(rootDir, name);
  fs.writeFileSync(fileName, source);
  return { fileName, position: markerIndex };
}

function completionNames(service, source) {
  const result = service.getCompletionsAtPosition(source.fileName, source.position, {});
  assert.ok(result, `expected completions in ${source.fileName}`);
  return new Set(result.entries.map((entry) => entry.name));
}

function main() {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'next-pages-router-completions-')
  );

  try {
    linkPackage(tempRoot, repoRoot);

    const compare = writeMarkedSource(
      tempRoot,
      'compare.ts',
      `import plugin = require('${PACKAGE_NAME}');
const options: plugin.CompareOptions = {
  /*cursor*/
};
`
    );
    const navigation = writeMarkedSource(
      tempRoot,
      'navigation.ts',
      `import plugin = require('${PACKAGE_NAME}');
const options: plugin.NavigationOptions = {
  /*cursor*/
};
`
    );
    const presets = writeMarkedSource(
      tempRoot,
      'presets.ts',
      `import plugin = require('${PACKAGE_NAME}');
plugin.configs["/*cursor*/"];
`
    );
    const rules = writeMarkedSource(
      tempRoot,
      'rules.ts',
      `import plugin = require('${PACKAGE_NAME}');
plugin.rules["/*cursor*/"];
`
    );
    const info = writeMarkedSource(
      tempRoot,
      'quick-info.ts',
      `import plugin = require('${PACKAGE_NAME}');
const options: plugin.CompareOptions = {};
options.pages/*cursor*/Dir;
`
    );

    const service = createLanguageService(tempRoot, [
      compare.fileName,
      navigation.fileName,
      presets.fileName,
      rules.fileName,
      info.fileName,
    ]);

    const compareNames = completionNames(service, compare);
    assert.ok(compareNames.has('pagesDir'));
    assert.ok(compareNames.has('checkSwitch'));
    assert.ok(!compareNames.has('preferUrlObject'));

    const navigationNames = completionNames(service, navigation);
    assert.ok(navigationNames.has('pagesDir'));
    assert.ok(navigationNames.has('preferUrlObject'));
    assert.ok(!navigationNames.has('checkSwitch'));

    const presetNames = completionNames(service, presets);
    assert.ok(presetNames.has('recommended'));
    assert.ok(presetNames.has('flat/recommended'));

    const ruleNames = completionNames(service, rules);
    assert.ok(ruleNames.has('no-invalid-route-compare'));
    assert.ok(ruleNames.has('no-invalid-router-navigation'));

    const quickInfo = service.getQuickInfoAtPosition(info.fileName, info.position);
    assert.ok(quickInfo, 'expected quick-info for CompareOptions.pagesDir');
    const documentation = ts.displayPartsToString(quickInfo.documentation);
    assert.match(documentation, /Path to the Next\.js pages directory/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main();
