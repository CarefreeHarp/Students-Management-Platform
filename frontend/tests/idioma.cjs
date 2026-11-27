const es = require('../public/i18n/es.json');

const t = (key, args = {}) => es[key].replace(/\{(\d+)\}/g, (_, i) => String(args[i]));
module.exports = { t, actual: () => 'es', locale: () => 'es-CO' };
