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
}

export { SmokeSensor };
