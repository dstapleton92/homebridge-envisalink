const buildPartition = (Base) => {
    class Partition extends Base {
        constructor(log) {
            super(log);
        }
    }

    return Partition;
}
export default buildPartition;