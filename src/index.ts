import boundedImports from './bounded-imports';
import layersRule from './layers';
import modulesRule from './modules';
import shortImportsRule from './short-imports';
import sortedImportsRule from './sorted-imports';
import customJsxRule from './custom-jsx';
import noInlineScript from './no-inline-script';

module.exports = {
  configs: {
    recommended: {
      plugins: ['muralco'],
      rules: {
        'muralco/sorted-imports': 'error',
      },
    },
  },
  rules: {
    'bounded-imports': boundedImports,
    'custom-jsx': customJsxRule,
    layers: layersRule,
    modules: modulesRule,
    'short-imports': shortImportsRule,
    'sorted-imports': sortedImportsRule,
    'no-inline-script': noInlineScript,
  },
};
