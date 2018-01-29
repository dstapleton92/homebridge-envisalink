import nap from 'nodealarmproxy';
import elink from 'nodealarmproxy/envisalink';
import buildAccessories from './accessories';
import 'babel-polyfill';
const buildPlatform = (Service, Characteristic, Accessory, uuid) => {
    const {
        ContactSensor,
        LeakSensor,
        MotionDetector,
        SmokeDetector,
        Partition
    } = buildAccessories(Service, Characteristic, Accessory, uuid);
    class EnvisalinkPlatform {
        constructor(log, config) {
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
            for (let i = 0; i < this.partitions.length; i++) {
                let partition = this.partitions[i];
                partition.pin = config.pin;
                let accessory = new EnvisalinkAccessory(this.log, "partition", partition, i + 1);
                this.platformPartitionAccessories.push(accessory);
            }
            this.platformZoneAccessories = [];
            this.platformZoneAccessoryMap = {};

            /*
            * maxZone variable is very important for two reasons
            * (1) Prevents UUID collisions when userPrograms are initialized
            * (2) This variable tells Node Alarm Proxy the maximum zone number to monitor
            */
            let maxZone = this.zones.length;
            if (!config.suppressZoneAccessories) {
                for (let i = 0; i < this.zones.length; i++) {
                    let zone = this.zones[i];
                    if (zone.type == "motion" || zone.type == "window" || zone.type == "door" || zone.type == "leak" || zone.type == "smoke") {
                        let zoneNum = zone.zoneNumber ? zone.zoneNumber : (i + 1);
                        if (zoneNum > maxZone) {
                            maxZone = zoneNum;
                        }
                        let accessory = new EnvisalinkAccessory(this.log, zone.type, zone, zone.partition, zoneNum);
                        let accessoryIndex = this.platformZoneAccessories.push(accessory) - 1;
                        this.platformZoneAccessoryMap[`z.${zoneNum}`] = accessoryIndex;
                    } else {
                        this.log(`Unhandled accessory type: ${zone.type}`);
                    }
                }
            }
            this.platformProgramAccessories = [];
            for (let i = 0; i < this.userPrograms.length; i++) {
                let program = this.userPrograms[i];
                if (program.type === "smoke") {
                    let accessory = new EnvisalinkAccessory(this.log, program.type, program, program.partition, maxZone + i + 1);
                    this.platformProgramAccessories.push(accessory);
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
            this.alarm = nap.initConfig(this.alarmConfig);
            this.log(`Node alarm proxy started.  Listening for connections at: ${this.alarmConfig.serverhost}:${this.alarmConfig.serverport}`);
            this.alarm.on('data', this.systemUpdate.bind(this));
            this.alarm.on('zoneupdate', this.zoneUpdate.bind(this));
            this.alarm.on('partitionupdate', this.partitionUpdate.bind(this));
            this.alarm.on('partitionuserupdate', this.partitionUserUpdate.bind(this));
            this.alarm.on('systemupdate', this.systemUpdate.bind(this));

            if (!config.suppressClockReset) {
                let nextSetTime = () => {
                    this.platformPartitionAccessories[0].addDelayedEvent('time');
                    setTimeout(nextSetTime, 60 * 60 * 1000);
                }

                setTimeout(nextSetTime, 5000);
            }
        }

        partitionUserUpdate(users) {
            this.log(`Partition User Update changed to: ${users}`);
        }

        systemUpdate(data) {
            this.log('System status changed to: ', data);

            let systemStatus = data.system;
            if (!systemStatus) {
                systemStatus = data;
            }

            if (systemStatus) {
                for (let i = 0; i < this.platformProgramAccessories.length; i++) {
                    let programAccessory = this.platformProgramAccessories[i];
                    let accservice = (programAccessory.getServices())[0];
                    if (accservice) {
                        let code = systemStatus.code && systemStatus.code.substring(0, 3);
                        if (programAccessory.accessoryType === 'smoke' && code === '631') {
                            accservice.getCharacteristic(Characteristic.SmokeDetected).setValue(Characteristic.SmokeDetected.SMOKE_DETECTED);

                            let partition = this.platformPartitionAccessories[parseInt(programAccessory.partition) - 1];
                            let partitionService = partition && (partition.getServices())[0];
                            partitionService && partitionService.getCharacteristic(Characteristic.SecuritySystemTargetState).getValue(function (context, value) {
                                partitionService.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(Characteristic.SecuritySystemTargetState.STAY_ARM);
                                partition.currentState = value;
                            });
                        } else if (programAccessory.accessoryType === 'smoke' && code === '632') {
                            accservice.getCharacteristic(Characteristic.SmokeDetected).setValue(Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
                            let partition = this.platformPartitionAccessories[parseInt(programAccessory.partition) - 1];
                            let partitionService = partition && (partition.getServices())[0];
                            if (partition && partition.currentState !== undefined) {
                                partitionService && partitionService.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(partition.currentState);
                                delete partition.currentState;
                            }
                        }
                    }
                }
            }
            if (data.partition) {
                for (let i = 0; i < this.platformPartitionAccessories.length; i++) {
                    let partitionAccessory = this.platformPartitionAccessories[i];
                    let systemStatus = data.partition[`${i + 1}`];
                    if (systemStatus) {
                        let code = systemStatus.code.substring(0, 3);
                        partitionAccessory.systemStatus = elink.tpicommands[code];
                        partitionAccessory.systemStatus.code = code;
                        if (this.initialLaunch) {
                            this.initialLaunch = false;
                            let mode = code === '652' ? systemStatus.code.substring(3,4) : undefined;
                            this.log(data);
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

        zoneUpdate(data) {
            let accessoryIndex = this.platformZoneAccessoryMap[`z.${data.zone}`];
            if (accessoryIndex !== undefined) {
                let accessory = this.platformZoneAccessories[accessoryIndex];
                if (accessory) {
                    accessory.setState({
                        ...elink.tpicommands[data.code],
                        code: data.code,
                        mode: data.mode
                    });
                }
            }
        }

        partitionUpdate(data) {
            let watchevents = ['601', '602', '609', '610', '650', '651', '652', '654', '656', '657'];
            if (data.code == "652") {
                //0: AWAY, 1: STAY, 2:  ZERO-ENTRY-AWAY, 3:  ZERO-ENTRY-STAY
                if (data.mode == '1' || data.mode == "3") {
                    this.awayStay = Characteristic.SecuritySystemCurrentState.STAY_ARM;
                } else {
                    this.awayStay = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                }
            }

            let partition = this.platformPartitionAccessories[data.partition - 1];
            if (partition) {
                partition.status = elink.tpicommands[data.code];
                partition.status.code = data.code;
                partition.status.mode = data.mode;
                partition.status.partition = data.partition;

                let accservice = (partition.getServices())[0];
                let accstatus;

                if (accservice) {
                    if (data.code == "656") { //exit delay
                        enableSet = false;
                        let armMode = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                        if (partition.lastTargetState != null) {
                            armMode = partition.lastTargetState;
                        }
                        partition.lastTargetState = null;
                        accservice.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(armMode);
                        enableSet = true;
                    } else if (data.code == "657") { //entry-delay
                    } else if (data.code == "652" || data.code == "654" || data.code == "655") { //Armed, Alarm, Disarmed
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
                    } else if (data.code == "626" || data.code == "650" || data.code == "651" || data.code == "653") { //Ready, Not Ready, Ready Force ARM
                        partition.getReadyState(function (nothing, resultat) {
                            console.log(`Setting Obstructed: ${resultat}`);
                            accservice.getCharacteristic(Characteristic.ObstructionDetected).setValue(resultat);
                        });
                    }
                }
            }
        }

        accessories(callback) {
            callback(this.platformPartitionAccessories.concat(this.platformZoneAccessories).concat(this.platformProgramAccessories));
        }
    }

    return EnvisalinkPlatform;
}

export default buildPlatform;