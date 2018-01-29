import buildBaseAccessory from './base';
import buildBaseZoneAccessory from './zone';
import buildContactSensor from './contact';
import buildLeakSensor from './leak';
import buildMotionDetector from './motion';
import buildSmokeDetector from './smoke';
import buildPartition from './partition';

const buildAccessories = (Service, Characteristic, Accessory, uuid) => {
    const Base = buildBaseAccessory(Service, Characteristic, Accessory, uuid);
    const ZoneBase = buildBaseZoneAccessory(Base);
    return {
        ContactSensor: buildContactSensor(ZoneBase),
        LeakSensor: buildLeakSensor(ZoneBase),
        MotionDetector: buildMotionDetector(ZoneBase),
        SmokeDetector: buildSmokeDetector(ZoneBase),
        Partition: buildPartition(Base)
    }
}
export default buildAccessories;