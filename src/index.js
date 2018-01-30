import 'babel-polyfill';
import { EnvisalinkPlatform } from './platform';

let enableSet = true;
let initialLaunch = true;

/* Register the plugin with homebridge */
module.exports = function (homebridge) {
    homebridge.registerPlatform(
        "homebridge-envisalink",
        "Envisalink",
        EnvisalinkPlatform
    );
}
