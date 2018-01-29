import nap from 'nodealarmproxy';

let napConnection;

function initializeNAP(alarmConfig) {
    napConnection = nap.initConfig(alarmConfig);
    return napConnection;
}

export function getNAPConnection() {
    if (!napConnection) {
        throw new TypeError('Node Alarm Proxy not initialized!');
    } else {
        return napConnection;
    }
}

export function manualNAPCommand(command, callback) {
    return nap.manualCommand(command, callback);
}


export default initializeNAP;