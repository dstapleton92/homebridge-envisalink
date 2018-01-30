'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.EnvisalinkPlatform = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _envisalink = require('nodealarmproxy/envisalink');

var _envisalink2 = _interopRequireDefault(_envisalink);

var _dateformat = require('dateformat');

var _dateformat2 = _interopRequireDefault(_dateformat);

var _nap = require('./nap');

var _accessories = require('./accessories');

require('babel-polyfill');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EnvisalinkPlatform = function () {
    function EnvisalinkPlatform(log, config) {
        var _this = this;

        _classCallCheck(this, EnvisalinkPlatform);

        this.initialLaunch = true;
        this.log = log;
        if (!config.zones) {
            config.zones = [];
        }
        this.userPrograms = config.userPrograms ? config.userPrograms : [];

        this.log(`Configuring Envisalink platform,  Host: ${config.host}, port: ${config.port}, type: ${config.deviceType}`);

        this.platformPartitionAccessories = [];
        for (var i = 0; i < config.partitions.length; i++) {
            var partition = config.partitions[i];
            var accessory = new _accessories.Partition(this.log, partition.name, i + 1, config.pin);
            this.platformPartitionAccessories.push(accessory);
        }
        this.platformZoneAccessoryMap = new Map();

        /*
        * maxZone variable is very important for two reasons
        * (1) Prevents UUID collisions when userPrograms are initialized
        * (2) This variable tells Node Alarm Proxy the maximum zone number to monitor
        */
        var maxZone = config.zones.length;
        if (!config.suppressZoneAccessories) {
            for (var _i = 0; _i < config.zones.length; _i++) {
                var zone = config.zones[_i];
                var zoneNum = zone.zoneNumber ? zone.zoneNumber : _i + 1;
                if (zoneNum > maxZone) {
                    maxZone = zoneNum;
                }
                var _accessory = void 0;
                switch (zone.type) {
                    case 'motion':
                        _accessory = new _accessories.MotionSensor(this.log, zone.name, zone.partition, zoneNum);
                        break;
                    case 'window':
                    case 'door':
                        _accessory = new _accessories.ContactSensor(this.log, zone.name, zone.partition, zoneNum);
                        break;
                    case 'leak':
                        _accessory = new _accessories.LeakSensor(this.log, zone.name, zone.partition, zoneNum);
                        break;
                    case 'smoke':
                        _accessory = new _accessories.SmokeSensor(this.log, zone.name, zone.partition, zoneNum);
                        break;
                    default:
                        this.log(`Unhandled accessory type: ${zone.type}`);
                }
                if (_accessory) {
                    this.platformZoneAccessoryMap.set(`z.${zoneNum}`, _accessory);
                }
            }
        }
        this.platformProgramAccessories = [];
        for (var _i2 = 0; _i2 < this.userPrograms.length; _i2++) {
            var program = this.userPrograms[_i2];
            if (program.type === "smoke") {
                var _accessory2 = new _accessories.SmokeSensor(this.log, program.name, program.partition, maxZone + _i2 + 1);
                this.platformProgramAccessories.push(_accessory2);
            } else {
                this.log(`Unhandled user program accessory type: ${program.type}`);
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
            partition: config.partitions ? config.partitions.length : 1,
            proxyenable: true,
            atomicEvents: true
        };
        this.log(`Zones: ${this.alarmConfig.zone}`);
        this.log(`User Programs: ${this.alarmConfig.userPrograms}`);
        this.alarm = (0, _nap.initializeNAP)(this.alarmConfig);
        this.log(`Node alarm proxy started.  Listening for connections at: ${this.alarmConfig.serverhost}:${this.alarmConfig.serverport}`);
        this.alarm.on('data', this.systemUpdate.bind(this));
        this.alarm.on('zoneupdate', this.zoneUpdate.bind(this));
        this.alarm.on('partitionupdate', this.partitionUpdate.bind(this));
        this.alarm.on('partitionuserupdate', this.partitionUserUpdate.bind(this));
        this.alarm.on('systemupdate', this.systemUpdate.bind(this));

        if (!config.suppressClockReset) {
            var nextSetTime = function nextSetTime() {
                var date = (0, _dateformat2.default)(new Date(), "HHMMmmddyy");
                _this.log(`Setting the current time on the alarm system to: ${date}`);
                (0, _nap.manualNAPCommand)(`010${date}`, function (data) {
                    if (data) {
                        _this.log("Time not set successfully.");
                    } else {
                        _this.log("Time set successfully.");
                    }
                });
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
            this.log('System status changed to: ', data);

            var systemStatus = data.system;
            if (!systemStatus) {
                systemStatus = data;
            }

            // if (systemStatus) {
            //     for (let i = 0; i < this.platformProgramAccessories.length; i++) {
            //         let programAccessory = this.platformProgramAccessories[i];
            //         let accservice = (programAccessory.getServices())[0];
            //         if (accservice) {
            //             let code = systemStatus.code && systemStatus.code.substring(0, 3);
            //             if (programAccessory instanceof SmokeSensor && code === '631') {
            //                 accservice.getCharacteristic(Characteristic.SmokeDetected).setValue(Characteristic.SmokeDetected.SMOKE_DETECTED);

            //                 let partition = this.platformPartitionAccessories[parseInt(programAccessory.partition) - 1];
            //                 let partitionService = partition && (partition.getServices())[0];
            //                 partitionService && partitionService.getCharacteristic(Characteristic.SecuritySystemTargetState).getValue(function (context, value) {
            //                     partitionService.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(Characteristic.SecuritySystemTargetState.STAY_ARM);
            //                     partition.currentState = value;
            //                 });
            //             } else if (programAccessory.accessoryType === 'smoke' && code === '632') {
            //                 accservice.getCharacteristic(Characteristic.SmokeDetected).setValue(Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
            //                 let partition = this.platformPartitionAccessories[parseInt(programAccessory.partition) - 1];
            //                 let partitionService = partition && (partition.getServices())[0];
            //                 if (partition && partition.currentState !== undefined) {
            //                     partitionService && partitionService.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(partition.currentState);
            //                     delete partition.currentState;
            //                 }
            //             }
            //         }
            //     }
            // }
            if (data.partition) {
                for (var i = 0; i < this.platformPartitionAccessories.length; i++) {
                    var partitionAccessory = this.platformPartitionAccessories[i];
                    var _systemStatus = data.partition[`${i + 1}`];
                    if (_systemStatus) {
                        var code = _systemStatus.code.substring(0, 3);
                        // partitionAccessory.systemStatus = elink.tpicommands[code];
                        // partitionAccessory.systemStatus.code = code;
                        if (this.initialLaunch) {
                            this.initialLaunch = false;
                            var mode = code === '652' ? _systemStatus.code.substring(3, 4) : undefined;
                            this.partitionUpdate({
                                code,
                                mode,
                                partition: i + 1
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
            if (data.zone) {
                var accessory = this.platformZoneAccessoryMap.get(`z.${data.zone}`);
                if (accessory) {
                    accessory.handleEnvisalinkData(_extends({}, _envisalink2.default.tpicommands[data.code], {
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
                    this.awayStay = this.Characteristic.SecuritySystemCurrentState.STAY_ARM;
                } else {
                    this.awayStay = this.Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                }
            }

            var partition = this.platformPartitionAccessories[data.partition - 1];
            if (partition) {
                partition.handleEnvisalinkData(_extends({}, _envisalink2.default.tpicommands[data.code], {
                    code: data.code,
                    mode: data.mode,
                    partition: data.partition
                }));
            }
        }
    }, {
        key: 'accessories',
        value: function accessories(callback) {
            callback([].concat(_toConsumableArray(this.platformPartitionAccessories), _toConsumableArray(this.platformZoneAccessoryMap.values()), _toConsumableArray(this.platformProgramAccessories)));
        }
    }]);

    return EnvisalinkPlatform;
}();

exports.EnvisalinkPlatform = EnvisalinkPlatform;