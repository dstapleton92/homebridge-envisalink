import buildBaseAccessory from './base';
import buildBaseZoneAccessory from './zone';
import buildContactSensor from './contact';
import buildLeakSensor from './leak';
import buildMotionSensor from './motion';
import buildSmokeSensor from './smoke';
import buildPartition from './partition';

const buildAccessories = (Service, Characteristic, Accessory, uuid) => {
    const Base = buildBaseAccessory(Service, Characteristic, Accessory, uuid);
    const ZoneBase = buildBaseZoneAccessory(Base);
    return {
        ContactSensor: buildContactSensor(ZoneBase),
        LeakSensor: buildLeakSensor(ZoneBase),
        MotionSensor: buildMotionSensor(ZoneBase),
        SmokeSensor: buildSmokeSensor(ZoneBase),
        Partition: buildPartition(Base)
    }
}
export default buildAccessories;