const buildZoneBase = (Base) => {
    class ZoneAccessory extends Base {
        constructor(log, name, partitionNumber, zoneNumber) {
            super(log, name, partitionNumber, zoneNumber);
        }

        initializeZoneService(ZoneService, zoneCharacteristic, closedState, openState) {
            let service = new ZoneService(this.name);
            this.zoneCharacteristic = zoneCharacteristic;
            this.closedState = closedState;
            this.openState = openState;
            service
                .getCharacteristic(zoneCharacteristic)
                .on('get', this.getState.bind(this));
            this.services.push(service);
        }

        getState(callback) {
            let currentState = this.closedState;
            if (this.state && this.state.send == "open") {
                currentState = this.openState;
            }
            callback(null, currentState);
        }

        handleEnvisalinkData(state) {
            this.state = state;
            let service = this.getServices()[0];
            this.getState((noarg, state) => {
                service.getCharacteristic(this.zoneCharacteristic).setValue(state);
            });
            console.log(`Set state on accessory ${this.name} to ${JSON.stringify(this.state)}`);
        }
    }

    return ZoneAccessory;
}
export default buildZoneBase;