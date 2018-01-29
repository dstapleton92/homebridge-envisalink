const buildLeakSensor = (Base) => {
    class LeakSensor extends Base {
        constructor(log, name, partitionNumber, zoneNumber) {
            super(
                log,
                name,
                partitionNumber,
                zoneNumber
            );
            this.initializeZoneService(
                this.Service.LeakSensor,
                this.Characteristic.LeakDetected,
                this.Characteristic.LeakDetected.LEAK_NOT_DETECTED,
                this.Characteristic.LeakDetected.LEAK_DETECTED
            );
        }
    }

    return LeakSensor;
}
export default buildLeakSensor;