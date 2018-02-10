'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Partition = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _base = require('./base');

var _nap = require('../nap');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Partition = function (_BaseAccessory) {
    _inherits(Partition, _BaseAccessory);

    function Partition(log, name, partitionNumber, pin) {
        _classCallCheck(this, Partition);

        var _this = _possibleConstructorReturn(this, (Partition.__proto__ || Object.getPrototypeOf(Partition)).call(this, log, name, partitionNumber));

        _this.pin = pin;
        _this.lastTargetState = _this.Characteristic.SecuritySystemTargetState.DISARM;
        var service = new _this.Service.SecuritySystem(_this.name);
        service.getCharacteristic(_this.Characteristic.SecuritySystemCurrentState).on('get', _this.getCurrentState.bind(_this));
        service.getCharacteristic(_this.Characteristic.SecuritySystemTargetState).on('get', _this.getTargetState.bind(_this)).on('set', _this.setTargetState.bind(_this));
        service.addCharacteristic(_this.Characteristic.ObstructionDetected).on('get', _this.getReadyState.bind(_this));
        _this.services.push(service);
        return _this;
    }

    _createClass(Partition, [{
        key: 'getCurrentState',
        value: function getCurrentState(callback) {
            var partitionState = void 0;
            if (this.state) {
                // TODO: switch to tpi codes
                switch (this.state.code) {
                    case '654':
                        partitionState = this.Characteristic.SecuritySystemCurrentState.TRIGGERED;
                        break;
                    case '652':
                        //0: AWAY, 1: STAY, 2:  ZERO-ENTRY-AWAY, 3:  ZERO-ENTRY-STAY
                        var mode = this.state.mode;
                        if (mode === '0' || mode === '2') {
                            partitionState = this.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                        } else if (mode === '1' || mode === '3') {
                            partitionState = this.Characteristic.SecuritySystemCurrentState.STAY_ARM;
                        } else {
                            this.log(`Unhandled arm mode: ${this.state.mode}`);
                        }
                        break;
                    case '657':
                    case '656':
                        // entry delay, exit delay
                        // TODO: implement lastTargetState
                        partitionState = this.lastTargetState;
                        break;
                    case '655':
                        partitionState = this.Characteristic.SecuritySystemCurrentState.DISARMED;
                        break;
                    default:
                        this.log(`Unhandled alarm state: ${this.state.code}`);
                        partitionState = this.Characteristic.SecuritySystemCurrentState.DISARMED;
                }
            } else {
                this.log(`Envisalink did not provide a state for the partition.`);
            }
            callback(null, partitionState);
        }
    }, {
        key: 'getTargetState',
        value: function getTargetState(callback) {
            callback(null, this.lastTargetState);
        }
    }, {
        key: 'setTargetState',
        value: function setTargetState(state, callback) {
            var _this2 = this;

            if (this.blockUpdate) {
                this.blockUpdate = false;
                if (state === this.Characteristic.SecuritySystemTargetState.AWAY_ARM) {
                    return callback(null, this.lastTargetState);
                }
                return callback(null, state);
            }
            this.log('state:');
            this.log(this.state);
            if (state !== this.Characteristic.SecuritySystemTargetState.DISARM && this.state && this.state.code === '651') {
                // partition is NOT READY
                this.lastTargetState = this.Characteristic.SecuritySystemTargetState.DISARM;
                return callback(new Error('Partition Not Ready!'));
            }
            this.log(`Attempting to set alarm state to: ${state}`);
            var command = void 0;
            switch (state) {
                case this.Characteristic.SecuritySystemTargetState.DISARM:
                    this.log("Disarming alarm with PIN.");
                    command = `040${this.partitionNumber}${this.pin}`;
                    break;
                case this.Characteristic.SecuritySystemTargetState.STAY_ARM:
                case this.Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                    this.armingFromHomekit = true;
                    this.log("Arming alarm to Stay/Night.");
                    command = `031${this.partitionNumber}`;
                    break;
                case this.Characteristic.SecuritySystemTargetState.AWAY_ARM:
                    this.armingFromHomekit = true;
                    this.log("Arming alarm to Away.");
                    command = `030${this.partitionNumber}`;
                    break;
                default:
                    this.log(`Attempted to set target state to unhandled value: ${state}`);
            }
            if (command) {
                (0, _nap.manualNAPCommand)(command, function (msg) {
                    if (msg === '024') {
                        // TODO: Properly handle this!
                        callback(null);
                    } else {
                        _this2.lastTargetState = state;
                        callback(null, _this2.lastTargetState);
                    }
                });
            } else {
                callback(null);
            }
        }
    }, {
        key: 'handleEnvisalinkData',
        value: function handleEnvisalinkData(state) {
            this.log(`Setting state from EVL: ${JSON.stringify(state)}`);
            if (state && state.code) {
                this.state = state;
                var service = this.getServices()[0];
                var currentStateCharacteristic = service.getCharacteristic(this.Characteristic.SecuritySystemCurrentState);
                var targetStateCharacteristic = service.getCharacteristic(this.Characteristic.SecuritySystemTargetState);

                switch (state.code) {
                    case '654':
                        // partition in alarm
                        // alarm triggered!
                        currentStateCharacteristic.setValue(this.Characteristic.SecuritySystemCurrentState.TRIGGERED);
                        break;
                    case '652':
                        // armed
                        //0: AWAY, 1: STAY, 2:  ZERO-ENTRY-AWAY, 3:  ZERO-ENTRY-STAY
                        if (state.mode === '0' || state.mode === '2') {
                            currentStateCharacteristic.setValue(this.Characteristic.SecuritySystemCurrentState.AWAY_ARM);
                            this.blockUpdate = true;
                            targetStateCharacteristic.setValue(this.Characteristic.SecuritySystemTargetState.AWAY_ARM);
                            this.lastTargetState = this.Characteristic.SecuritySystemTargetState.AWAY_ARM;
                        } else if (state.mode === '1' || state.mode === '3') {
                            currentStateCharacteristic.setValue(this.Characteristic.SecuritySystemCurrentState.STAY_ARM);
                            this.blockUpdate = true;
                            targetStateCharacteristic.setValue(this.Characteristic.SecuritySystemTargetState.STAY_ARM);
                            this.lastTargetState = this.Characteristic.SecuritySystemTargetState.STAY_ARM;
                        } else {
                            this.log(`Unhandled arm mode: ${state.mode}`);
                        }
                        break;
                    case '655':
                        // partition disarmed
                        currentStateCharacteristic.setValue(this.Characteristic.SecuritySystemCurrentState.DISARMED);
                        this.blockUpdate = true;
                        targetStateCharacteristic.setValue(this.Characteristic.SecuritySystemTargetState.DISARM);
                        this.lastTargetState = this.Characteristic.SecuritySystemTargetState.DISARM;
                        break;
                    case '657':
                        // entry delay
                        break;
                    case '656':
                        // exit delay
                        // Envisalink doesn't tell whether the exit delay is for home or away, so assuming away
                        // There is no enduring side effect; it will only cause the "set pending" spinner in Homekit
                        // when the partition actually arms, the correct status will be set
                        // If the arm was started on the homekit side, there is no need to update the target state
                        if (this.armingFromHomekit) {
                            this.armingFromHomekit = false;
                        } else {
                            this.blockUpdate = true;
                            targetStateCharacteristic.setValue(this.Characteristic.SecuritySystemTargetState.AWAY_ARM);
                        }
                        break;
                }
            }
        }
    }, {
        key: 'getReadyState',
        value: function getReadyState(callback) {
            // this is a hack for showing the ready state in HomeKit
            // If the partition is ready, it is not "obstructed"
            var obstructionDetected = true;
            if (this.state && this.state.send) {
                if (this.state.send === "ready" || this.state.send === "readyforce") {
                    obstructionDetected = false;
                }
            }
            callback(null, obstructionDetected);
        }
    }]);

    return Partition;
}(_base.BaseAccessory);

exports.Partition = Partition;