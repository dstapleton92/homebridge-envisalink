import { BaseAccessory } from './base';
import { manualNAPCommand } from '../nap';

class Partition extends BaseAccessory {
    constructor(log, name, partitionNumber, pin) {
        super(log, name, partitionNumber);
        this.pin = pin;
        this.lastTargetState = this.Characteristic.SecuritySystemTargetState.DISARM;
        let service = new this.Service.SecuritySystem(this.name);
        service
            .getCharacteristic(this.Characteristic.SecuritySystemCurrentState)
            .on('get', this.getCurrentState.bind(this));
        service
            .getCharacteristic(this.Characteristic.SecuritySystemTargetState)
            .on('get', this.getTargetState.bind(this))
            .on('set', this.setTargetState.bind(this));
        service
            .addCharacteristic(this.Characteristic.ObstructionDetected)
            .on('get', this.getReadyState.bind(this));
        this.services.push(service);
    }

    getCurrentState(callback) {
        let partitionState;
        if (this.state) {
            // TODO: switch to tpi codes
            switch (this.state.code) {
                case '654':
                    partitionState = this.Characteristic.SecuritySystemCurrentState.TRIGGERED;
                    break;
                case '652':
                    //0: AWAY, 1: STAY, 2:  ZERO-ENTRY-AWAY, 3:  ZERO-ENTRY-STAY
                    let mode = this.state.mode;
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

    getTargetState(callback) {
        callback(null, this.lastTargetState);
    }

    setTargetState(state, callback) {
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
        let command;
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
            manualNAPCommand(command, (msg) => {
                if (msg === '024') {
                    // TODO: Properly handle this!
                    callback(null);
                } else {
                    this.lastTargetState = state;
                    callback(null, this.lastTargetState);
                }
            });
        } else {
            callback(null);
        }
    }

    handleEnvisalinkData(state) {
        this.log(`Setting state from EVL: ${JSON.stringify(state)}`);
        if (state && state.code) {
            this.state = state;
            let service = this.getServices()[0];
            let currentStateCharacteristic = service.getCharacteristic(this.Characteristic.SecuritySystemCurrentState);
            let targetStateCharacteristic = service.getCharacteristic(this.Characteristic.SecuritySystemTargetState);

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

    getReadyState(callback) {
        // this is a hack for showing the ready state in HomeKit
        // If the partition is ready, it is not "obstructed"
        let obstructionDetected = true;
        if (this.state && this.state.send) {
            if (this.state.send === "ready" || this.state.send === "readyforce") {
                obstructionDetected = false;
            }
        }
        callback(null, obstructionDetected);
    }
}

export { Partition };
