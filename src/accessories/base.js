const buildBaseAccessory = (Service, Characteristic, Accessory, uuid, log) => {

    class EnvisalinkAccessory extends Accessory {
        constructor(log, accessoryType, config, partition, zone) {
            let id = `envisalink.${partition}`;
            if (zone) {
                id += `.${zone}`;
            }
            let uuid_base = uuid.generate(id);
            super(config.name, uuid_base);

            this.Service = Service;
            this.Characteristic = Characteristic;
            this.Accessory = Accessory;

            this.uuid_base = uuid_base;
            this.log = log;
            this.name = config.name;
            this.accessoryType = accessoryType;
            this.partition = partition;
            this.pin = config.pin;
            this.zone = zone;
            this.status = null;

            this.services = [];
            if (this.accessoryType == "partition") {
                let service = new Service.SecuritySystem(this.name);
                service
                    .getCharacteristic(Characteristic.SecuritySystemCurrentState)
                    .on('get', this.getAlarmState.bind(this));
                service
                    .getCharacteristic(Characteristic.SecuritySystemTargetState)
                    .on('get', this.getAlarmState.bind(this))
                    .on('set', this.setAlarmState.bind(this));
                service
                    .addCharacteristic(Characteristic.ObstructionDetected)
                    .on('get', this.getReadyState.bind(this));
                this.services.push(service);
            } else if (this.accessoryType == "motion") {
                let service = new Service.MotionSensor(this.name);
                service
                    .getCharacteristic(Characteristic.MotionDetected)
                    .on('get', this.getMotionStatus.bind(this));
                this.services.push(service);
            } else if (this.accessoryType == "door") {
                let service = new Service.ContactSensor(this.name);
                service
                    .getCharacteristic(Characteristic.ContactSensorState)
                    .on('get', this.getContactSensorState.bind(this));
                this.services.push(service);
            } else if (this.accessoryType == "window") {
                let service = new Service.ContactSensor(this.name);
                service
                    .getCharacteristic(Characteristic.ContactSensorState)
                    .on('get', this.getContactSensorState.bind(this));
                this.services.push(service);
            } else if (this.accessoryType == "leak") {
                let service = new Service.LeakSensor(this.name);
                service
                    .getCharacteristic(Characteristic.LeakDetected)
                    .on('get', this.getLeakStatus.bind(this));
                this.services.push(service);
            } else if (this.accessoryType == "smoke") {
                let service = new Service.SmokeSensor(this.name);
                service
                    .getCharacteristic(Characteristic.SmokeDetected)
                    .on('get', this.getSmokeStatus.bind(this));
                this.services.push(service);
            }
        }

        getServices() {
            return this.services;
        }

        getMotionStatus(callback) {
            let motionDetected = this.status && this.status.send === "open";
            callback(null, motionDetected);
        }

        getReadyState(callback) {
            let currentState = this.status;
            let status = true;
            if (currentState && currentState.bytes === this.partition) {
                if (currentState.send === "ready" || currentState.send === "readyforce") {
                    status = false;
                }
            }
            callback(null, status);
        }

        getAlarmState(callback) {
            let currentState = this.status;
            let status = Characteristic.SecuritySystemCurrentState.DISARMED;

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

        setAlarmState(state, callback) {
            this.addDelayedEvent('alarm', state, callback);
        }

        getContactSensorState(callback) {
            let contactState = Characteristic.ContactSensorState.CONTACT_DETECTED;
            if (this.status && this.status.send == "open") {
                contactState = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
            }
            callback(null, contactState);
        }

        getLeakStatus(callback) {
            let leakState = Characteristic.LeakDetected.LEAK_NOT_DETECTED;
            if (this.status && this.status.send == "open") {
                leakState = Characteristic.LeakDetected.LEAK_DETECTED;
            }
            callback(null, leakState);
        }

        getSmokeStatus(callback) {
            let smokeState = Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
            if (this.status && this.status.send == "open") {
                smokeState = Characteristic.SmokeDetected.SMOKE_DETECTED;
            }
            callback(null, smokeState);
        }

        processAlarmState(nextEvent, callback) {
            if (nextEvent.enableSet == true) {
                if (nextEvent.data !== Characteristic.SecuritySystemCurrentState.DISARMED && this.status && this.status.code === '651') {
                    let accservice = this.getServices()[0];
                    accservice.getCharacteristic(Characteristic.SecuritySystemTargetState).setValue(Characteristic.SecuritySystemCurrentState.DISARMED);
                    nextEvent.callback(null, Characteristic.SecuritySystemCurrentState.DISARMED);
                    return;
                }

                this.log(`Attempting to set alarm state to: ${nextEvent.data}`);
                let command = null;
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
                    nap.manualCommand(command, (msg) => {
                        if (msg === '024') {
                            if (nextEvent.attempts > 5) {
                                nextEvent.callback(null);
                                callback();
                                return;
                            }
                            let eventData = {
                                data: nextEvent.data,
                                enableSet: nextEvent.enableSet,
                                attempts: (nextEvent.attempts || 0) + 1
                            };

                            this.insertDelayedEvent('alarm', eventData, nextEvent.callback, 1000);
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

        processTimeChange(nextEvent, callback) {
            let date = dateFormat(new Date(), "HHMMmmddyy");
            this.log(`Setting the current time on the alarm system to: ${date}`);
            nap.manualCommand(`010${date}`, (data) => {
                if (data) {
                    this.log("Time not set successfully.");
                } else {
                    this.log("Time set successfully.");
                }

                callback();

            });
        }

        insertDelayedEvent(type, data, callback, delay, pushEndBool) {
            let eventData;
            if (typeof data === 'object') {
                eventData = data;
                eventData.type = type;
                eventData.callback = callback;
            } else {
                eventData = {
                    id: Math.floor((Math.random() * 10000) + 1),
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
                setTimeout(() => {
                    this.processDelayedEvents();
                }, delay || 0);
            }
        }

        addDelayedEvent(type, data, callback, delay) {
            // TODO: Does this need to be called with .call(this)?
            this.insertDelayedEvent(type, data, callback, delay, true);
        }

        processDelayedEvents() {
            if (this.delayedEvents && this.delayedEvents.length > 0) {
                let nextEvent = this.delayedEvents[0];
                this.delayedEvents = this.delayedEvents.slice(1);
                let callback = () => {
                    if (this.delayedEvents.length > 0) {
                        setTimeout(() => {
                            this.processDelayedEvents();
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
    }

    return EnvisalinkAccessory;
}
export default buildBaseAccessory;