const buildSmokeSensor = (Base) => {
    class SmokeSensor extends Base {
        constructor(log, name, partitionNumber, zoneNumber) {
            super(
                log,
                name,
                partitionNumber,
                zoneNumber
            );
            this.initializeZoneService(
                this.Service.SmokeSensor,
                this.Characteristic.SmokeDetected,
                this.Characteristic.SmokeDetected.SMOKE_NOT_DETECTED,
                this.Characteristic.SmokeDetected.SMOKE_DETECTED
            );
        }
    }

    return SmokeSensor;
}
export default buildSmokeSensor;