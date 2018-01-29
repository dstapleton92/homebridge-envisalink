'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.initializeNAP = initializeNAP;
exports.getNAPConnection = getNAPConnection;
exports.manualNAPCommand = manualNAPCommand;

var _nodealarmproxy = require('nodealarmproxy');

var _nodealarmproxy2 = _interopRequireDefault(_nodealarmproxy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var napConnection = void 0;

function initializeNAP(alarmConfig) {
    napConnection = _nodealarmproxy2.default.initConfig(alarmConfig);
    return napConnection;
}

function getNAPConnection() {
    if (!napConnection) {
        throw new TypeError('Node Alarm Proxy not initialized!');
    } else {
        return napConnection;
    }
}

function manualNAPCommand(command, callback) {
    return _nodealarmproxy2.default.manualCommand(command, callback);
}