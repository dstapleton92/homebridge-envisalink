const buildMotionDetector = (Base) => {
    class MotionDetector extends Base {
        constructor(log) {
            super(log);
        }
    }

    return MotionDetector;
}
export default buildMotionDetector;