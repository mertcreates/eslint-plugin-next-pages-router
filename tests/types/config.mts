import plugin from '@mertcreates/eslint-plugin-next-pages-router';

const compareOptions = {
  pagesDir: 'pages',
  checkSwitch: false,
} satisfies plugin.CompareOptions;

const navigationOptions = {
  preferUrlObject: true,
} satisfies plugin.NavigationOptions;

const rules: typeof plugin.rules = {
  'no-invalid-route-compare': plugin.rules['no-invalid-route-compare'],
  'no-invalid-router-navigation': plugin.rules['no-invalid-router-navigation'],
};

const presets: [typeof plugin.configs.recommended, typeof plugin.configs['flat/recommended']] = [
  plugin.configs.recommended,
  plugin.configs['flat/recommended'],
];

void compareOptions;
void navigationOptions;
void rules;
void presets;
