import 'babel-polyfill';
import { EnvisalinkPlatform } from './platform';

/* Register the plugin with homebridge */
module.exports = function (homebridge) {
    homebridge.registerPlatform(
        "homebridge-envisalink",
        "Envisalink",
        EnvisalinkPlatform
    );
}
