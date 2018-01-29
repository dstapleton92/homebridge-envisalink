const buildSmokeDetector = (Base) => {
    class SmokeDetector extends Base {
        constructor(log) {
            super(log);
        }
    }

    return SmokeDetector;
}
export default buildSmokeDetector;