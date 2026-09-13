const assert = require('assert');
const { isAllowedRouterObject } = require('../../lib/routerObjects');

describe('router object bindings', () => {
  it('falls back by name when scope information is unavailable', () => {
    const options = { autoDetect: true, getScope: () => null };
    assert.strictEqual(
      isAllowedRouterObject({ type: 'Identifier', name: 'router' }, ['router', 'Router'], [], options),
      true
    );
    assert.strictEqual(
      isAllowedRouterObject({ type: 'Identifier', name: 'navigation' }, ['router', 'Router'], [], options),
      false
    );
  });
});
