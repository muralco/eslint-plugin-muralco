import layersRule from './layers';
import modulesRule from './modules';
import sortedImportsRule from './sorted-imports';
import customJsxRule from './custom-jsx';

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
    'custom-jsx': customJsxRule,
    layers: layersRule,
    modules: modulesRule,
    'sorted-imports': sortedImportsRule,
  },
};
