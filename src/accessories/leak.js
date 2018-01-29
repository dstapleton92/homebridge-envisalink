const buildLeakSensor = (Base) => {
    class LeakSensor extends Base {
        constructor(log) {
            super(log);
        }
    }

    return LeakSensor;
}
export default buildLeakSensor;