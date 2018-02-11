import { ZoneAccessory } from './zone';

class SmokeSensor extends ZoneAccessory {
    constructor(log, name, partitionNumber, zoneNumber) {
        super(log, name, partitionNumber, zoneNumber);
        this.initializeZoneService(
            this.Service.SmokeSensor,
            this.Characteristic.SmokeDetected,
            this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED,
            this.Characteristic.SmokeDetected.SMOKE_DETECTED
        );
    }

    // This method is called by the Platform to "trigger" the smoke detector accessory when it is actually part of a user program (PGM-2, for example)
    trigger() {
        this.handleEnvisalinkData({ send: "open" });
    }

    // This method is called by the Platform to reset the smoke detector accessory when the system is disarmed after a user program activates
    reset() {
        this.handleEnvisalinkData({ send: "closed" });
    }
}

export { SmokeSensor };
