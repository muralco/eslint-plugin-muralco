import layersRule from './layers';
import sortedImportsRule from './sorted-imports';

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
    layers: layersRule,
    'sorted-imports': sortedImportsRule,
  },
};
