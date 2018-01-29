import nap from 'nodealarmproxy';
import elink from 'nodealarmproxy/envisalink';
import dateFormat from 'dateformat';
import buildPlatform from './platform';

import 'babel-polyfill';

let enableSet = true;
let initialLaunch = true;

/* Register the plugin with homebridge */
module.exports = function (homebridge) {
    const Service = homebridge.hap.Service;
    const Characteristic = homebridge.hap.Characteristic;
    const Accessory = homebridge.hap.Accessory;
    const uuid = homebridge.hap.uuid;

    homebridge.registerPlatform(
        "homebridge-envisalink",
        "Envisalink",
        buildPlatform(Service, Characteristic, Accessory, uuid)
    );
}
