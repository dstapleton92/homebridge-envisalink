const buildBaseAccessory = (Service, Characteristic, Accessory, uuid, log) => {

    class EnvisalinkAccessory extends Accessory {
        constructor(log, name, partitionNumber, zoneNumber) {
            let id = `envisalink.${partitionNumber}`;
            if (zoneNumber) {
                id += `.${zoneNumber}`;
            }
            let uuid_base = uuid.generate(id);
            super(name, uuid_base);

            this.Service = Service;
            this.Characteristic = Characteristic;
            this.Accessory = Accessory;

            this.uuid_base = uuid_base;
            this.log = log;
            this.name = name;
            this.partitionNumber = partitionNumber;
            this.zoneNumber = zoneNumber;

            this.services = [];
        }

        getServices() {
            return this.services;
        }
    }

    return EnvisalinkAccessory;
}
export default buildBaseAccessory;