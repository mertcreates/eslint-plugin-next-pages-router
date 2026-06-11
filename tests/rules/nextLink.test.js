const assert = require('node:assert/strict');

const {
  collectNextLinkLocalNames,
  isNextLinkOpeningElement,
} = require('../../lib/nextLink');

function createImportedLinkScope(localName) {
  const importedVariable = {
    defs: [
      {
        type: 'ImportBinding',
        parent: {
          type: 'ImportDeclaration',
          source: { value: 'next/link' },
        },
      },
    ],
  };

  return {
    upper: null,
    set: new Map([[localName, importedVariable]]),
    variables: [importedVariable],
  };
}

function createShadowedLinkScope(localName) {
  const localVariable = { defs: [] };

  return {
    upper: null,
    set: new Map([[localName, localVariable]]),
    variables: [localVariable],
  };
}

describe('nextLink helpers', () => {
  it('collects local names from next/link imports', () => {
    const linkNames = new Set();

    collectNextLinkLocalNames(
      {
        type: 'ImportDeclaration',
        source: { type: 'Literal', value: 'next/link' },
        specifiers: [
          {
            type: 'ImportDefaultSpecifier',
            local: { name: 'Link' },
          },
          {
            type: 'ImportSpecifier',
            imported: { type: 'Identifier', name: 'default' },
            local: { name: 'NextLink' },
          },
        ],
      },
      linkNames
    );

    assert.deepStrictEqual([...linkNames], ['Link', 'NextLink']);
  });

  it('accepts only imported next/link bindings when scope is available', () => {
    const linkNames = new Set(['Link']);

    assert.strictEqual(
      isNextLinkOpeningElement(
        {
          type: 'JSXOpeningElement',
          name: { type: 'JSXIdentifier', name: 'Link' },
        },
        linkNames,
        () => createImportedLinkScope('Link')
      ),
      true
    );

    assert.strictEqual(
      isNextLinkOpeningElement(
        {
          type: 'JSXOpeningElement',
          name: { type: 'JSXIdentifier', name: 'Link' },
        },
        linkNames,
        () => createShadowedLinkScope('Link')
      ),
      false
    );
  });
});
