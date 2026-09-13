const assert = require('assert');
const { createStaticIdentifierResolver } = require('../../lib/staticStrings');

describe('static string resolver', () => {
  it('keeps identifiers unknown when scope metadata is unavailable', () => {
    const resolve = createStaticIdentifierResolver({});
    assert.strictEqual(resolve({ type: 'Identifier', name: 'target' }), null);
  });
});
