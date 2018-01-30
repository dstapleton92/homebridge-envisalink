'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.MotionSensor = undefined;

var _zone = require('./zone');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var MotionSensor = function (_ZoneAccessory) {
    _inherits(MotionSensor, _ZoneAccessory);

    function MotionSensor(log, name, partitionNumber, zoneNumber) {
        _classCallCheck(this, MotionSensor);

        var _this = _possibleConstructorReturn(this, (MotionSensor.__proto__ || Object.getPrototypeOf(MotionSensor)).call(this, log, name, partitionNumber, zoneNumber));

        _this.initializeZoneService(_this.Service.MotionSensor, _this.Characteristic.MotionDetected, false, true);
        return _this;
    }

    return MotionSensor;
}(_zone.ZoneAccessory);

exports.MotionSensor = MotionSensor;