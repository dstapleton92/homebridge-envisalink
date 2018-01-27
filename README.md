# homebridge-envisalink

This is a homebridge plugin leverages Node Alarm Proxy (https://www.npmjs.com/package/nodealarmproxy) in order to HomeKit/HomeBridge enable the Envisalink device.  
Example configuration is below:

Added support for Leak and Smoke Detectors.

```javascript
 "platforms": [
    {
      "platform": "Envisalink",
      "host": "192.168.0.XXX",
      "deviceType": "DSC",
      "password": "---envisalink password (default is user)---",
      "pin": "---panel pin for disarming---",
      "suppressZoneAccessories": false,
      "suppressClockReset": false,
      "partitions": [
        {
          "name": "Alarm"
        }
      ],
      "zones": [
        {
          "name": "Front Door",
          "type": "door",
          "partition": 1
        },
        {
          "name": "Master Bedroom Door",
          "type": "door",
          "partition": 1
        },
        {
          "name": "Downstairs Windows",
          "type": "window",
          "partition": 1
        },
        {
          "name": "Basement Leak",
          "type": "leak",
          "partition": 1
        },
        {
          "name": "Upstairs Smoke",
          "type": "smoke",
          "partition": 1
        },
        {
          "name": "Living Room Motion",
          "type": "motion",
          "partition": 1
        }
      ],
      "userPrograms": [
        {
          "name": "Basement Smoke",
          "type": "smoke",
          "partition": 1
        }
      ]
    }
  ]
```

## Disabling Clock Reset
This plugin will update the date/time of your alarm system hourly unless you set "suppressClockReset" to true in the config.

## Non-Consecutive Zones
If your system has unused zones, simply include a *zoneNumber* integer property on ***each*** zone you have in the config. Make sure you put the property on each zone.

Ex:
```javascript
...
"zones": [
  {
    "name": "Front Entry",
    "type": "door",
    "partition": 1,
    "zoneNumber": 1
  },
  {
    "name": "Patio Door",
    "type": "door",
    "partition": 1,
    "zoneNumber": 2
  },
  {
    "name": "Garage Door",
    "type": "door",
    "partition": 1,
    "zoneNumber": 5
  }
]
...
```

Only DSC panels have been tested thus far.  If you'd like to provide a Honeywell device for testing, I'd be glad to add support for this device and ship it back to you.

## Note for Developers
This project has been updated to use ES6 Classes and other features for improved readability and convenience. To continue supporting older versions of Node, this project has been set up to use Babel. Run `npm install` to install the development dependences. Be sure you make your changes to the source files in `src`, and then run `npm run build` to recompile the changes to the `lib` folder.