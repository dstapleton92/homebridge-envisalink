import { ZoneAccessory } from './zone';

class ContactSensor extends ZoneAccessory {
    constructor(log, name, partitionNumber, zoneNumber) {
        super(log, name, partitionNumber, zoneNumber);
        this.initializeZoneService(
            this.Service.ContactSensor,
            this.Characteristic.ContactSensorState,
            this.Characteristic.ContactSensorState.CONTACT_DETECTED,
            this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
        );
    }
}

export { ContactSensor };
