'use strict';

var _nodealarmproxy = require('nodealarmproxy');

var _nodealarmproxy2 = _interopRequireDefault(_nodealarmproxy);

var _envisalink = require('nodealarmproxy/envisalink');

var _envisalink2 = _interopRequireDefault(_envisalink);

var _dateformat = require('dateformat');

var _dateformat2 = _interopRequireDefault(_dateformat);

var _platform = require('./platform');

var _platform2 = _interopRequireDefault(_platform);

require('babel-polyfill');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var enableSet = true;
var initialLaunch = true;

/* Register the plugin with homebridge */
module.exports = function (homebridge) {
    var Service = homebridge.hap.Service;
    var Characteristic = homebridge.hap.Characteristic;
    var Accessory = homebridge.hap.Accessory;
    var uuid = homebridge.hap.uuid;

    homebridge.registerPlatform("homebridge-envisalink", "Envisalink", (0, _platform2.default)(Service, Characteristic, Accessory, uuid));
};