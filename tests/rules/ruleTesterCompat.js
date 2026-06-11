const { RuleTester } = require('eslint');
const { version: eslintVersion } = require('eslint/package.json');

function getEslintMajor() {
  return Number(String(eslintVersion).split('.')[0]);
}

function createRuleTester({ jsx = false } = {}) {
  if (getEslintMajor() >= 9) {
    return new RuleTester({
      languageOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        parserOptions: jsx
          ? {
              ecmaFeatures: {
                jsx: true,
              },
            }
          : undefined,
      },
    });
  }

  return new RuleTester({
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ...(jsx && {
        ecmaFeatures: {
          jsx: true,
        },
      }),
    },
  });
}

module.exports = {
  createRuleTester,
};
