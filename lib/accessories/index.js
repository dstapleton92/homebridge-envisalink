'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _zone = require('./zone');

var _zone2 = _interopRequireDefault(_zone);

var _contact = require('./contact');

var _contact2 = _interopRequireDefault(_contact);

var _leak = require('./leak');

var _leak2 = _interopRequireDefault(_leak);

var _motion = require('./motion');

var _motion2 = _interopRequireDefault(_motion);

var _smoke = require('./smoke');

var _smoke2 = _interopRequireDefault(_smoke);

var _partition = require('./partition');

var _partition2 = _interopRequireDefault(_partition);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var buildAccessories = function buildAccessories(Service, Characteristic, Accessory, uuid) {
    var Base = (0, _base2.default)(Service, Characteristic, Accessory, uuid);
    var ZoneBase = (0, _zone2.default)(Base);
    return {
        ContactSensor: (0, _contact2.default)(ZoneBase),
        LeakSensor: (0, _leak2.default)(ZoneBase),
        MotionSensor: (0, _motion2.default)(ZoneBase),
        SmokeSensor: (0, _smoke2.default)(ZoneBase),
        Partition: (0, _partition2.default)(Base)
    };
};
exports.default = buildAccessories;