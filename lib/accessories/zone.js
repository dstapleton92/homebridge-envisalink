'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ZoneAccessory = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('./base');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ZoneAccessory = function (_BaseAccessory) {
    _inherits(ZoneAccessory, _BaseAccessory);

    function ZoneAccessory(log, name, partitionNumber, zoneNumber) {
        _classCallCheck(this, ZoneAccessory);

        return _possibleConstructorReturn(this, (ZoneAccessory.__proto__ || Object.getPrototypeOf(ZoneAccessory)).call(this, log, name, partitionNumber, zoneNumber));
    }

    _createClass(ZoneAccessory, [{
        key: 'initializeZoneService',
        value: function initializeZoneService(ZoneService, zoneCharacteristic, closedState, openState) {
            var service = new ZoneService(this.name);
            this.zoneCharacteristic = zoneCharacteristic;
            this.closedState = closedState;
            this.openState = openState;
            service.getCharacteristic(zoneCharacteristic).on('get', this.getState.bind(this));
            this.services.push(service);
        }
    }, {
        key: 'getState',
        value: function getState(callback) {
            var currentState = this.closedState;
            if (this.state && this.state.send == "open") {
                currentState = this.openState;
            }
            callback(null, currentState);
        }
    }, {
        key: 'handleEnvisalinkData',
        value: function handleEnvisalinkData(state) {
            var _this2 = this;

            this.state = state;
            var service = this.getServices()[0];
            this.getState(function (noarg, state) {
                service.getCharacteristic(_this2.zoneCharacteristic).setValue(state);
            });
            console.log(`Set state on accessory ${this.name} to ${JSON.stringify(this.state)}`);
        }
    }]);

    return ZoneAccessory;
}(_base.BaseAccessory);

exports.ZoneAccessory = ZoneAccessory;