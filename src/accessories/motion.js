import { ZoneAccessory } from './zone';

class MotionSensor extends ZoneAccessory {
    constructor(log, name, partitionNumber, zoneNumber) {
        super(log, name, partitionNumber, zoneNumber);
        this.initializeZoneService(
            this.Service.MotionSensor,
            this.Characteristic.MotionDetected,
            false,
            true
        );
    }
}

export { MotionSensor };
