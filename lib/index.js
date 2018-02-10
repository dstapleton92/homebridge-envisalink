'use strict';

require('babel-polyfill');

var _platform = require('./platform');

/* Register the plugin with homebridge */
module.exports = function (homebridge) {
    homebridge.registerPlatform("homebridge-envisalink", "Envisalink", _platform.EnvisalinkPlatform);
};