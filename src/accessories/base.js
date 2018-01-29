const buildBaseAccessory = (Service, Characteristic, Accessory, uuid, log) => {

    class EnvisalinkAccessory extends Accessory {
        constructor(log, accessoryType, config, partition, zone) {
            let id = `envisalink.${partition}`;
            if (zone) {
                id += `.${zone}`;
            }
            let uuid_base = uuid.generate(id);
            super(config.name, uuid_base);

            this.Service = Service;
            this.Characteristic = Characteristic;
            this.Accessory = Accessory;

            this.uuid_base = uuid_base;
            this.log = log;
            this.name = config.name;
            this.partition = partition;
            this.pin = config.pin;
            this.zone = zone;
            this.status = null;

            this.services = [];
        }

        getServices() {
            return this.services;
        }
    }

    return EnvisalinkAccessory;
}
export default buildBaseAccessory;