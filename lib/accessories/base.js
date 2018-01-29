'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var buildBaseAccessory = function buildBaseAccessory(Service, Characteristic, Accessory, uuid, log) {
    var EnvisalinkAccessory = function (_Accessory) {
        _inherits(EnvisalinkAccessory, _Accessory);

        function EnvisalinkAccessory(log, accessoryType, config, partition, zone) {
            _classCallCheck(this, EnvisalinkAccessory);

            var id = `envisalink.${partition}`;
            if (zone) {
                id += `.${zone}`;
            }
            var uuid_base = uuid.generate(id);

            var _this = _possibleConstructorReturn(this, (EnvisalinkAccessory.__proto__ || Object.getPrototypeOf(EnvisalinkAccessory)).call(this, config.name, uuid_base));

            _this.Service = Service;
            _this.Characteristic = Characteristic;
            _this.Accessory = Accessory;

            _this.uuid_base = uuid_base;
            _this.log = log;
            _this.name = config.name;
            _this.accessoryType = accessoryType;
            _this.partition = partition;
            _this.pin = config.pin;
            _this.zone = zone;
            _this.status = null;

            _this.services = [];
            if (_this.accessoryType == "partition") {
                var service = new Service.SecuritySystem(_this.name);
                service.getCharacteristic(Characteristic.SecuritySystemCurrentState).on('get', _this.getAlarmState.bind(_this));
                service.getCharacteristic(Characteristic.SecuritySystemTargetState).on('get', _this.getAlarmState.bind(_this)).on('set', _this.setAlarmState.bind(_this));
                service.addCharacteristic(Characteristic.ObstructionDetected).on('get', _this.getReadyState.bind(_this));
                _this.services.push(service);
            }
            return _this;
        }

        _createClass(EnvisalinkAccessory, [{
            key: 'getServices',
            value: function getServices() {
                return this.services;
            }
        }, {
            key: 'getReadyState',
            value: function getReadyState(callback) {
                var currentState = this.status;
                var status = true;
                if (currentState && currentState.bytes === this.partition) {
                    if (currentState.send === "ready" || currentState.send === "readyforce") {
                        status = false;
                    }
                }
                callback(null, status);
            }
        }, {
            key: 'getAlarmState',
            value: function getAlarmState(callback) {
                var currentState = this.status;
                var status = Characteristic.SecuritySystemCurrentState.DISARMED;

                if (currentState && currentState.bytes === this.partition) {
                    //Default to disarmed

                    if (currentState.send == "alarm") {
                        status = Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
                    } else if (currentState.send == "armed") {

                        //0: AWAY, 1: STAY, 2:  ZERO-ENTRY-AWAY, 3:  ZERO-ENTRY-STAY

                        if (currentState.mode === '1' || currentState.mode === '3') {
                            status = Characteristic.SecuritySystemCurrentState.STAY_ARM;
                        } else {
                            status = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                        }
                    } else if (currentState.send == "exitdelay" || currentState.send == "entrydelay") {
                        //Use the target alarm state during the exit and entrance delays.
                        status = this.lastTargetState;
                    }
                }
                callback(null, status);
            }
        }, {
            key: 'setAlarmState',
            value: function setAlarmState(state, callback) {
                this.addDelayedEvent('alarm', state, callback);
            }
        }, {
            key: 'processAlarmState',
            value: function processAlarmState(nextEvent, callback) {
                var _this2 = this;

                if (nextEvent.enableSet == true) {
                    if (nextEvent.data !== Characteristic.SecuritySystemCurrentState.DISARMED && this.status && this.status.code === '651') {
                        var accservice = this.getServices()[0];
                        accservice.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(Characteristic.SecuritySystemCurrentState.DISARMED);
                        nextEvent.callback(null, Characteristic.SecuritySystemCurrentState.DISARMED);
                        return;
                    }

                    this.log(`Attempting to set alarm state to: ${nextEvent.data}`);
                    var command = null;
                    this.lastTargetState = nextEvent.data;
                    if (nextEvent.data == Characteristic.SecuritySystemCurrentState.DISARMED) {
                        this.log("Disarming alarm with PIN.");
                        command = `040${this.partition}${this.pin}`;
                    } else if (nextEvent.data == Characteristic.SecuritySystemCurrentState.STAY_ARM || nextEvent.data == Characteristic.SecuritySystemCurrentState.NIGHT_ARM) {
                        this.log("Arming alarm to Stay/Night.");
                        command = `031${this.partition}`;
                    } else if (nextEvent.data == Characteristic.SecuritySystemCurrentState.AWAY_ARM) {
                        this.log("Arming alarm to Away.");
                        command = `030${this.partition}`;
                    }
                    if (command) {
                        nap.manualCommand(command, function (msg) {
                            if (msg === '024') {
                                if (nextEvent.attempts > 5) {
                                    nextEvent.callback(null);
                                    callback();
                                    return;
                                }
                                var eventData = {
                                    data: nextEvent.data,
                                    enableSet: nextEvent.enableSet,
                                    attempts: (nextEvent.attempts || 0) + 1
                                };

                                _this2.insertDelayedEvent('alarm', eventData, nextEvent.callback, 1000);
                            } else {
                                nextEvent.callback(null, nextEvent.data);
                                callback();
                            }
                        });
                    } else {
                        this.log(`Unhandled alarm state: ${nextEvent.data}`);
                        nextEvent.callback(null);
                        callback();
                    }
                } else {
                    nextEvent.callback(null);
                    callback();
                }
            }
        }, {
            key: 'processTimeChange',
            value: function processTimeChange(nextEvent, callback) {
                var _this3 = this;

                var date = dateFormat(new Date(), "HHMMmmddyy");
                this.log(`Setting the current time on the alarm system to: ${date}`);
                nap.manualCommand(`010${date}`, function (data) {
                    if (data) {
                        _this3.log("Time not set successfully.");
                    } else {
                        _this3.log("Time set successfully.");
                    }

                    callback();
                });
            }
        }, {
            key: 'insertDelayedEvent',
            value: function insertDelayedEvent(type, data, callback, delay, pushEndBool) {
                var _this4 = this;

                var eventData = void 0;
                if (typeof data === 'object') {
                    eventData = data;
                    eventData.type = type;
                    eventData.callback = callback;
                } else {
                    eventData = {
                        id: Math.floor(Math.random() * 10000 + 1),
                        type: type,
                        data: data,
                        enableSet: enableSet,
                        callback: callback
                    };
                }

                if (pushEndBool) {
                    this.delayedEvents = this.delayedEvents || [];
                    this.delayedEvents.push(eventData);
                } else {
                    this.delayedEvents = [eventData].concat(this.delayedEvents || []);
                }

                if (this.delayedEvents.length === 1) {
                    setTimeout(function () {
                        _this4.processDelayedEvents();
                    }, delay || 0);
                }
            }
        }, {
            key: 'addDelayedEvent',
            value: function addDelayedEvent(type, data, callback, delay) {
                // TODO: Does this need to be called with .call(this)?
                this.insertDelayedEvent(type, data, callback, delay, true);
            }
        }, {
            key: 'processDelayedEvents',
            value: function processDelayedEvents() {
                var _this5 = this;

                if (this.delayedEvents && this.delayedEvents.length > 0) {
                    var nextEvent = this.delayedEvents[0];
                    this.delayedEvents = this.delayedEvents.slice(1);
                    var callback = function callback() {
                        if (_this5.delayedEvents.length > 0) {
                            setTimeout(function () {
                                _this5.processDelayedEvents();
                            }, 0);
                        }
                    };
                    if (nextEvent.type === 'alarm') {
                        this.processAlarmState(nextEvent, callback);
                    } else if (nextEvent.type === 'time') {
                        this.processTimeChange(nextEvent, callback);
                    }
                }
            }
        }]);

        return EnvisalinkAccessory;
    }(Accessory);

    return EnvisalinkAccessory;
};
exports.default = buildBaseAccessory;