const buildMotionSensor = (Base) => {
    class MotionSensor extends Base {
        constructor(log, name, partitionNumber, zoneNumber) {
            super(
                log,
                name,
                partitionNumber,
                zoneNumber
            );
            this.initializeZoneService(
                this.Service.MotionSensor,
                this.Characteristic.MotionDetected,
                false,
                true
            );
        }
    }

    return MotionSensor;
}
export default buildMotionDetector;