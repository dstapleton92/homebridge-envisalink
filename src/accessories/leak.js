import { ZoneAccessory } from './zone';

class LeakSensor extends ZoneAccessory {
    constructor(log, name, partitionNumber, zoneNumber) {
        super(log, name, partitionNumber, zoneNumber);
        this.initializeZoneService(
            this.Service.LeakSensor,
            this.Characteristic.LeakDetected,
            this.Characteristic.LeakDetected.LEAK_NOT_DETECTED,
            this.Characteristic.LeakDetected.LEAK_DETECTED
        );
    }
}

export { LeakSensor };
