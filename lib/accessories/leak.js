"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var buildLeakSensor = function buildLeakSensor(Base) {
    var LeakSensor = function (_Base) {
        _inherits(LeakSensor, _Base);

        function LeakSensor(log, name, partitionNumber, zoneNumber) {
            _classCallCheck(this, LeakSensor);

            var _this = _possibleConstructorReturn(this, (LeakSensor.__proto__ || Object.getPrototypeOf(LeakSensor)).call(this, log, name, partitionNumber, zoneNumber));

            _this.initializeZoneService(_this.Service.LeakSensor, _this.Characteristic.LeakDetected, _this.Characteristic.LeakDetected.LEAK_NOT_DETECTED, _this.Characteristic.LeakDetected.LEAK_DETECTED);
            return _this;
        }

        return LeakSensor;
    }(Base);

    return LeakSensor;
};
exports.default = buildLeakSensor;