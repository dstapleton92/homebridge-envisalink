import elink from 'nodealarmproxy/envisalink';
import dateFormat from 'dateformat';
import { initializeNAP, manualNAPCommand } from './nap';
import { Partition, ContactSensor, LeakSensor, MotionSensor, SmokeSensor } from './accessories';

class EnvisalinkPlatform {
    constructor(log, config) {
        this.initialLaunch = true;
        this.log = log;
        if (!config.zones) {
            config.zones = [];
        }
        this.userPrograms = config.userPrograms ? config.userPrograms : [];

        this.log(`Configuring Envisalink platform,  Host: ${config.host}, port: ${config.port}, type: ${config.deviceType}`);

        this.platformPartitionAccessories = [];
        for (let i = 0; i < config.partitions.length; i++) {
            let partition = config.partitions[i];
            let accessory = new Partition(this.log, partition.name, i + 1, config.pin);
            this.platformPartitionAccessories.push(accessory);
        }
        this.platformZoneAccessoryMap = new Map();

        /*
        * maxZone variable is very important for two reasons
        * (1) Prevents UUID collisions when userPrograms are initialized
        * (2) This variable tells Node Alarm Proxy the maximum zone number to monitor
        */
        let maxZone = config.zones.length;
        if (!config.suppressZoneAccessories) {
            for (let i = 0; i < config.zones.length; i++) {
                let zone = config.zones[i];
                let zoneNum = zone.zoneNumber ? zone.zoneNumber : (i + 1);
                if (zoneNum > maxZone) {
                    maxZone = zoneNum;
                }
                let accessory;
                switch (zone.type) {
                    case 'motion':
                        accessory = new MotionSensor(this.log, zone.name, zone.partition, zoneNum);
                        break;
                    case 'window':
                    case 'door':
                        accessory = new ContactSensor(this.log, zone.name, zone.partition, zoneNum);
                        break;
                    case 'leak':
                        accessory = new LeakSensor(this.log, zone.name, zone.partition, zoneNum);
                        break;
                    case 'smoke':
                        accessory = new SmokeSensor(this.log, zone.name, zone.partition, zoneNum);
                        break;
                    default:
                        this.log(`Unhandled accessory type: ${zone.type}`);
                }
                if (accessory) {
                    this.platformZoneAccessoryMap.set(`z.${zoneNum}`, accessory);
                }
            }
        }
        this.platformProgramAccessories = [];
        for (let i = 0; i < this.userPrograms.length; i++) {
            let program = this.userPrograms[i];
            if (program.type === "smoke") {
                let accessory = new SmokeSensor(this.log, program.name, program.partition, maxZone + i + 1);
                this.platformProgramAccessories.push(accessory);
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
        this.alarm = initializeNAP(this.alarmConfig);
        this.log(`Node alarm proxy started.  Listening for connections at: ${this.alarmConfig.serverhost}:${this.alarmConfig.serverport}`);
        this.alarm.on('data', this.systemUpdate.bind(this));
        this.alarm.on('zoneupdate', this.zoneUpdate.bind(this));
        this.alarm.on('partitionupdate', this.partitionUpdate.bind(this));
        this.alarm.on('partitionuserupdate', this.partitionUserUpdate.bind(this));
        this.alarm.on('systemupdate', this.systemUpdate.bind(this));

        if (!config.suppressClockReset) {
            let nextSetTime = () => {
                let date = dateFormat(new Date(), "HHMMmmddyy");
                this.log(`Setting the current time on the alarm system to: ${date}`);
                manualNAPCommand(`010${date}`, (data) => {
                    if (data) {
                        this.log("Time not set successfully.");
                    } else {
                        this.log("Time set successfully.");
                    }
                });
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
                if (programAccessory instanceof SmokeSensor && systemStatus.code) {
                    let code = systemStatus.code.substring(0, 3);
                    if (code === '631') {
                        programAccessory.trigger();
                    } else if (code === '632') {
                        programAccessory.reset();
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
                    // partitionAccessory.systemStatus = elink.tpicommands[code];
                    // partitionAccessory.systemStatus.code = code;
                    if (this.initialLaunch) {
                        this.initialLaunch = false;
                        let mode = code === '652' ? systemStatus.code.substring(3, 4) : undefined;
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
        if (data.zone) {
            let accessory = this.platformZoneAccessoryMap.get(`z.${data.zone}`);
            if (accessory) {
                accessory.handleEnvisalinkData({
                    ...elink.tpicommands[data.code],
                    code: data.code,
                    mode: data.mode
                });
            }
        }
    }

    partitionUpdate(data) {
        let watchevents = ['601', '602', '609', '610', '650', '651', '652', '654', '656', '657'];

        let partition = this.platformPartitionAccessories[data.partition - 1];
        if (partition) {
            partition.handleEnvisalinkData({
                ...elink.tpicommands[data.code],
                code: data.code,
                mode: data.mode,
                partition: data.partition
            });
        }
    }

    accessories(callback) {
        callback([
            ...this.platformPartitionAccessories,
            ...this.platformZoneAccessoryMap.values(),
            ...this.platformProgramAccessories
        ]);
    }
}

export { EnvisalinkPlatform };
