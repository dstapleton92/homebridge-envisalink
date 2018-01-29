'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _nodealarmproxy = require('nodealarmproxy');

var _nodealarmproxy2 = _interopRequireDefault(_nodealarmproxy);

var _envisalink = require('nodealarmproxy/envisalink');

var _envisalink2 = _interopRequireDefault(_envisalink);

var _accessories = require('./accessories');

var _accessories2 = _interopRequireDefault(_accessories);

require('babel-polyfill');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var buildPlatform = function buildPlatform(Service, Characteristic, Accessory, uuid) {
    var _buildAccessories = (0, _accessories2.default)(Service, Characteristic, Accessory, uuid),
        ContactSensor = _buildAccessories.ContactSensor,
        LeakSensor = _buildAccessories.LeakSensor,
        MotionSensor = _buildAccessories.MotionSensor,
        SmokeDetector = _buildAccessories.SmokeDetector,
        Partition = _buildAccessories.Partition;

    var EnvisalinkPlatform = function () {
        function EnvisalinkPlatform(log, config) {
            var _this = this;

            _classCallCheck(this, EnvisalinkPlatform);

            this.initialLaunch = true;
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
                            if (this.initialLaunch) {
                                this.initialLaunch = false;
                                var mode = _code === '652' ? _systemStatus.code.substring(3, 4) : undefined;
                                this.log(data);
                                this.partitionUpdate({
                                    code: _code,
                                    mode,
                                    partition: _i3 + 1
                                });
                            }
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
                        accessory.setState(_extends({}, _envisalink2.default.tpicommands[data.code], {
                            code: data.code,
                            mode: data.mode
                        }));
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
                                // TODO: This is incorrect (results in target state being set to Triggered)
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

    return EnvisalinkPlatform;
};

exports.default = buildPlatform;