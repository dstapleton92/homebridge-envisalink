'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _nodealarmproxy = require('nodealarmproxy');

var _nodealarmproxy2 = _interopRequireDefault(_nodealarmproxy);

var _envisalink = require('nodealarmproxy/envisalink');

var _envisalink2 = _interopRequireDefault(_envisalink);

var _dateformat = require('dateformat');

var _dateformat2 = _interopRequireDefault(_dateformat);

require('babel-polyfill');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Service = void 0,
    Characteristic = void 0,
    Accessory = void 0,
    uuid = void 0;
var enableSet = true;

/* Register the plugin with homebridge */
module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    uuid = homebridge.hap.uuid;

    var EnvisalinkPlatform = function () {
        function EnvisalinkPlatform(log, config) {
            var _this = this;

            _classCallCheck(this, EnvisalinkPlatform);

            this.log = log;
            this.deviceType = config.deviceType;
            this.pin = config.pin;
            this.password = config.password;
            this.partitions = config.partitions;
            this.zones = config.zones ? config.zones : [];
            this.userPrograms = config.userPrograms ? config.userPrograms : [];

            this.log(`Configuring Envisalink platform,  Host: ${config.host}, port: ${config.port}, type: ${this.deviceType}`);

            this.platformPartitionAccessories = [];
            for (var i = 0; i < this.partitions.length; i++) {
                var partition = this.partitions[i];
                partition.pin = config.pin;
                var accessory = new EnvisalinkAccessory(this.log, "partition", partition, i + 1);
                this.platformPartitionAccessories.push(accessory);
            }
            this.platformZoneAccessories = [];
            this.platformZoneAccessoryMap = {};

            /*
            * maxZone variable is very important for two reasons
            * (1) Prevents UUID collisions when userPrograms are initialized
            * (2) This variable tells Node Alarm Proxy the maximum zone number to monitor
            */
            var maxZone = this.zones.length;
            if (!config.suppressZoneAccessories) {
                for (var _i = 0; _i < this.zones.length; _i++) {
                    var zone = this.zones[_i];
                    if (zone.type == "motion" || zone.type == "window" || zone.type == "door" || zone.type == "leak" || zone.type == "smoke") {
                        var zoneNum = zone.zoneNumber ? zone.zoneNumber : _i + 1;
                        if (zoneNum > maxZone) {
                            maxZone = zoneNum;
                        }
                        var _accessory = new EnvisalinkAccessory(this.log, zone.type, zone, zone.partition, zoneNum);
                        var accessoryIndex = this.platformZoneAccessories.push(_accessory) - 1;
                        this.platformZoneAccessoryMap[`z.${zoneNum}`] = accessoryIndex;
                    } else {
                        this.log(`Unhandled accessory type: ${zone.type}`);
                    }
                }
            }
            this.platformProgramAccessories = [];
            for (var _i2 = 0; _i2 < this.userPrograms.length; _i2++) {
                var program = this.userPrograms[_i2];
                if (program.type === "smoke") {
                    var _accessory2 = new EnvisalinkAccessory(this.log, program.type, program, program.partition, maxZone + _i2 + 1);
                    this.platformProgramAccessories.push(_accessory2);
                } else {
                    this.log(`Unhandled accessory type: ${program.type}`);
                }
            }

            this.log("Starting node alarm proxy...");
            this.alarmConfig = {
                password: config.password,
                serverpassword: config.password,
                actualhost: config.host,
                actualport: config.port,
                serverhost: '0.0.0.0',
                serverport: config.serverport ? config.serverport : 4026,
                zone: maxZone > 0 ? maxZone : null,
                userPrograms: this.userPrograms.length > 0 ? this.userPrograms.length : null,
                partition: this.partitions ? this.partitions.length : 1,
                proxyenable: true,
                atomicEvents: true
            };
            this.log(`Zones: ${this.alarmConfig.zone}`);
            this.log(`User Programs: ${this.alarmConfig.userPrograms}`);
            this.alarm = _nodealarmproxy2.default.initConfig(this.alarmConfig);
            this.log(`Node alarm proxy started.  Listening for connections at: ${this.alarmConfig.serverhost}:${this.alarmConfig.serverport}`);
            this.alarm.on('data', this.systemUpdate.bind(this));
            this.alarm.on('zoneupdate', this.zoneUpdate.bind(this));
            this.alarm.on('partitionupdate', this.partitionUpdate.bind(this));
            this.alarm.on('partitionuserupdate', this.partitionUserUpdate.bind(this));
            this.alarm.on('systemupdate', this.systemUpdate.bind(this));

            if (!config.suppressClockReset) {
                var nextSetTime = function nextSetTime() {
                    _this.platformPartitionAccessories[0].addDelayedEvent('time');
                    setTimeout(nextSetTime, 60 * 60 * 1000);
                };

                setTimeout(nextSetTime, 5000);
            }
        }

        _createClass(EnvisalinkPlatform, [{
            key: 'partitionUserUpdate',
            value: function partitionUserUpdate(users) {
                this.log(`Partition User Update changed to: ${users}`);
            }
        }, {
            key: 'systemUpdate',
            value: function systemUpdate(data) {
                var _this2 = this;

                this.log('System status changed to: ', data);

                var systemStatus = data.system;
                if (!systemStatus) {
                    systemStatus = data;
                }

                if (systemStatus) {
                    for (var i = 0; i < this.platformProgramAccessories.length; i++) {
                        var programAccessory = this.platformProgramAccessories[i];
                        var accservice = programAccessory.getServices()[0];
                        if (accservice) {
                            var code = systemStatus.code && systemStatus.code.substring(0, 3);
                            if (programAccessory.accessoryType === 'smoke' && code === '631') {
                                (function () {
                                    accservice.getCharacteristic(Characteristic.SmokeDetected).setValue(Characteristic.SmokeDetected.SMOKE_DETECTED);

                                    var partition = _this2.platformPartitionAccessories[parseInt(programAccessory.partition) - 1];
                                    var partitionService = partition && partition.getServices()[0];
                                    partitionService && partitionService.getCharacteristic(Characteristic.SecuritySystemTargetState).getValue(function (context, value) {
                                        partitionService.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(Characteristic.SecuritySystemTargetState.STAY_ARM);
                                        partition.currentState = value;
                                    });
                                })();
                            } else if (programAccessory.accessoryType === 'smoke' && code === '632') {
                                accservice.getCharacteristic(Characteristic.SmokeDetected).setValue(Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
                                var partition = this.platformPartitionAccessories[parseInt(programAccessory.partition) - 1];
                                var partitionService = partition && partition.getServices()[0];
                                if (partition && partition.currentState !== undefined) {
                                    partitionService && partitionService.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(partition.currentState);
                                    delete partition.currentState;
                                }
                            }
                        }
                    }
                }
                if (data.partition) {
                    for (var _i3 = 0; _i3 < this.platformPartitionAccessories.length; _i3++) {
                        var partitionAccessory = this.platformPartitionAccessories[_i3];
                        var _systemStatus = data.partition[`${_i3 + 1}`];
                        if (_systemStatus) {
                            var _code = _systemStatus.code.substring(0, 3);
                            partitionAccessory.systemStatus = _envisalink2.default.tpicommands[_code];
                            partitionAccessory.systemStatus.code = _code;
                            console.log(`Set system status on accessory ${partitionAccessory.name} to ${JSON.stringify(partitionAccessory.systemStatus)}`);
                        }
                    }
                }
            }
        }, {
            key: 'zoneUpdate',
            value: function zoneUpdate(data) {
                var accessoryIndex = this.platformZoneAccessoryMap[`z.${data.zone}`];
                if (accessoryIndex !== undefined) {
                    var accessory = this.platformZoneAccessories[accessoryIndex];
                    if (accessory) {
                        accessory.status = _envisalink2.default.tpicommands[data.code];
                        accessory.status.code = data.code;
                        accessory.status.mode = data.mode;
                        console.log(`Set status on accessory ${accessory.name} to ${JSON.stringify(accessory.status)}`);

                        var accservice = accessory.getServices()[0];

                        if (accservice) {
                            if (accessory.accessoryType == "motion") {

                                accessory.getMotionStatus(function (nothing, resultat) {
                                    accservice.getCharacteristic(Characteristic.MotionDetected).setValue(resultat);
                                });
                            } else if (accessory.accessoryType == "door" || accessory.accessoryType == "window") {

                                accessory.getContactSensorState(function (nothing, resultat) {
                                    accservice.getCharacteristic(Characteristic.ContactSensorState).setValue(resultat);
                                });
                            } else if (accessory.accessoryType == "leak") {

                                accessory.getLeakStatus(function (nothing, resultat) {
                                    accservice.getCharacteristic(Characteristic.LeakDetected).setValue(resultat);
                                });
                            } else if (accessory.accessoryType == "smoke") {

                                accessory.getSmokeStatus(function (nothing, resultat) {
                                    accservice.getCharacteristic(Characteristic.SmokeDetected).setValue(resultat);
                                });
                            }
                        }
                    }
                }
            }
        }, {
            key: 'partitionUpdate',
            value: function partitionUpdate(data) {
                var watchevents = ['601', '602', '609', '610', '650', '651', '652', '654', '656', '657'];
                if (data.code == "652") {
                    //0: AWAY, 1: STAY, 2:  ZERO-ENTRY-AWAY, 3:  ZERO-ENTRY-STAY
                    if (data.mode == '1' || data.mode == "3") {
                        this.awayStay = Characteristic.SecuritySystemCurrentState.STAY_ARM;
                    } else {
                        this.awayStay = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                    }
                }

                var partition = this.platformPartitionAccessories[data.partition - 1];
                if (partition) {
                    partition.status = _envisalink2.default.tpicommands[data.code];
                    partition.status.code = data.code;
                    partition.status.mode = data.mode;
                    partition.status.partition = data.partition;

                    var accservice = partition.getServices()[0];
                    var accstatus = void 0;

                    if (accservice) {
                        if (data.code == "656") {
                            //exit delay
                            enableSet = false;
                            var armMode = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                            if (partition.lastTargetState != null) {
                                armMode = partition.lastTargetState;
                            }
                            partition.lastTargetState = null;
                            accservice.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(armMode);
                            enableSet = true;
                        } else if (data.code == "657") {//entry-delay
                        } else if (data.code == "652" || data.code == "654" || data.code == "655") {
                            //Armed, Alarm, Disarmed
                            partition.getAlarmState(function (nothing, resultat) {

                                if (partition.currentState !== undefined) {
                                    delete partition.currentState;
                                }

                                partition.lastTargetState = null;
                                enableSet = false;
                                accservice.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(resultat);
                                enableSet = true;
                                accservice.getCharacteristic(Characteristic.SecuritySystemCurrentState).setValue(resultat);
                            });
                        } else if (data.code == "626" || data.code == "650" || data.code == "651" || data.code == "653") {
                            //Ready, Not Ready, Ready Force ARM
                            partition.getReadyState(function (nothing, resultat) {
                                console.log(`Setting Obstructed: ${resultat}`);
                                accservice.getCharacteristic(Characteristic.ObstructionDetected).setValue(resultat);
                            });
                        }
                    }
                }
            }
        }, {
            key: 'accessories',
            value: function accessories(callback) {
                callback(this.platformPartitionAccessories.concat(this.platformZoneAccessories).concat(this.platformProgramAccessories));
            }
        }]);

        return EnvisalinkPlatform;
    }();

    var EnvisalinkAccessory = function (_Accessory) {
        _inherits(EnvisalinkAccessory, _Accessory);

        function EnvisalinkAccessory(log, accessoryType, config, partition, zone) {
            _classCallCheck(this, EnvisalinkAccessory);

            var id = `envisalink.${partition}`;
            if (zone) {
                id += `.${zone}`;
            }
            var uuid_base = uuid.generate(id);

            var _this3 = _possibleConstructorReturn(this, (EnvisalinkAccessory.__proto__ || Object.getPrototypeOf(EnvisalinkAccessory)).call(this, config.name, uuid_base));

            _this3.uuid_base = uuid_base;
            _this3.log = log;
            _this3.name = config.name;
            _this3.accessoryType = accessoryType;
            _this3.partition = partition;
            _this3.pin = config.pin;
            _this3.zone = zone;
            _this3.status = null;

            _this3.services = [];
            if (_this3.accessoryType == "partition") {
                var service = new Service.SecuritySystem(_this3.name);
                service.getCharacteristic(Characteristic.SecuritySystemCurrentState).on('get', _this3.getAlarmState.bind(_this3));
                service.getCharacteristic(Characteristic.SecuritySystemTargetState).on('get', _this3.getAlarmState.bind(_this3)).on('set', _this3.setAlarmState.bind(_this3));
                service.addCharacteristic(Characteristic.ObstructionDetected).on('get', _this3.getReadyState.bind(_this3));
                _this3.services.push(service);
            } else if (_this3.accessoryType == "motion") {
                var _service = new Service.MotionSensor(_this3.name);
                _service.getCharacteristic(Characteristic.MotionDetected).on('get', _this3.getMotionStatus.bind(_this3));
                _this3.services.push(_service);
            } else if (_this3.accessoryType == "door") {
                var _service2 = new Service.ContactSensor(_this3.name);
                _service2.getCharacteristic(Characteristic.ContactSensorState).on('get', _this3.getContactSensorState.bind(_this3));
                _this3.services.push(_service2);
            } else if (_this3.accessoryType == "window") {
                var _service3 = new Service.ContactSensor(_this3.name);
                _service3.getCharacteristic(Characteristic.ContactSensorState).on('get', _this3.getContactSensorState.bind(_this3));
                _this3.services.push(_service3);
            } else if (_this3.accessoryType == "leak") {
                var _service4 = new Service.LeakSensor(_this3.name);
                _service4.getCharacteristic(Characteristic.LeakDetected).on('get', _this3.getLeakStatus.bind(_this3));
                _this3.services.push(_service4);
            } else if (_this3.accessoryType == "smoke") {
                var _service5 = new Service.SmokeSensor(_this3.name);
                _service5.getCharacteristic(Characteristic.SmokeDetected).on('get', _this3.getSmokeStatus.bind(_this3));
                _this3.services.push(_service5);
            }
            return _this3;
        }

        _createClass(EnvisalinkAccessory, [{
            key: 'getServices',
            value: function getServices() {
                return this.services;
            }
        }, {
            key: 'getMotionStatus',
            value: function getMotionStatus(callback) {
                var motionDetected = this.status && this.status.send === "open";
                callback(null, motionDetected);
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
            key: 'getContactSensorState',
            value: function getContactSensorState(callback) {
                var contactState = Characteristic.ContactSensorState.CONTACT_DETECTED;
                if (this.status && this.status.send == "open") {
                    contactState = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
                }
                callback(null, contactState);
            }
        }, {
            key: 'getLeakStatus',
            value: function getLeakStatus(callback) {
                var leakState = Characteristic.LeakDetected.LEAK_NOT_DETECTED;
                if (this.status && this.status.send == "open") {
                    leakState = Characteristic.LeakDetected.LEAK_DETECTED;
                }
                callback(null, leakState);
            }
        }, {
            key: 'getSmokeStatus',
            value: function getSmokeStatus(callback) {
                var smokeState = Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
                if (this.status && this.status.send == "open") {
                    smokeState = Characteristic.SmokeDetected.SMOKE_DETECTED;
                }
                callback(null, smokeState);
            }
        }, {
            key: 'processAlarmState',
            value: function processAlarmState(nextEvent, callback) {
                var _this4 = this;

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
                        _nodealarmproxy2.default.manualCommand(command, function (msg) {
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

                                _this4.insertDelayedEvent('alarm', eventData, nextEvent.callback, 1000);
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
                var _this5 = this;

                var date = (0, _dateformat2.default)(new Date(), "HHMMmmddyy");
                this.log(`Setting the current time on the alarm system to: ${date}`);
                _nodealarmproxy2.default.manualCommand(`010${date}`, function (data) {
                    if (data) {
                        _this5.log("Time not set successfully.");
                    } else {
                        _this5.log("Time set successfully.");
                    }

                    callback();
                });
            }
        }, {
            key: 'insertDelayedEvent',
            value: function insertDelayedEvent(type, data, callback, delay, pushEndBool) {
                var _this6 = this;

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
                        _this6.processDelayedEvents();
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
                var _this7 = this;

                if (this.delayedEvents && this.delayedEvents.length > 0) {
                    var nextEvent = this.delayedEvents[0];
                    this.delayedEvents = this.delayedEvents.slice(1);
                    var callback = function callback() {
                        if (_this7.delayedEvents.length > 0) {
                            setTimeout(function () {
                                _this7.processDelayedEvents();
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

    homebridge.registerPlatform("homebridge-envisalink", "Envisalink", EnvisalinkPlatform);
};
