'use strict';

const neeoapi = require('neeo-sdk');

// The NEEO WeMO driver is using the WeMo client by Timon Reinhart
// https://github.com/timonreinhard/wemo-client
// To install WeMo Client package: npm install wemo-client
// The WeMo Client package is governe by the MIT license

var Wemo = require('wemo-client');
var wemo = new Wemo();

// Table of all discovered WeMo devices
let discoveredWeMoDevices = [];
// List of WeMo clients for each WeMo device associated with a MAC address
let wemoClients = [];
// This is the registered function for device state updates
let sendComponentUpdate;

const controller = {
  discoverWeMoLightSwitch: function discoverWeMoLightSwitch() {
    console.log('[CONTROLLER] WeMo discovery started');
    let discoveredWeMoLightSwitches = discoveredWeMoDevices.filter((dev) => dev.deviceType === 'urn:Belkin:device:lightswitch:1');
    return discoveredWeMoLightSwitches.map((dev) => ({
      id: dev.macAddress,
      name: dev.friendlyName,
      reachable: true,
    }));
    wemo.discover(foundWeModevice);
  },

  initialise: function initialise() {
    console.log('[CONTROLLER] initialise called');
  },

  onButtonPressed: function onButtonPressed(name, deviceid) {
    let client = wemoClients[deviceid];
    if (client) {
      switch (name) {
      case "POWER ON":
        client.setBinaryState(1);
        break;
      case "POWER OFF":
        client.setBinaryState(0);
        break;
      }
    } else {
      wemo.discover(foundWeMoDevice);
    }
  },

  switchSet: function switchSet(deviceid, value) {
    wemoClients[deviceid].setBinaryState(value === 'true' ? 1 : 0)
  },

  switchGet: function switchGet(deviceid) {
    let client = wemoClients[deviceid];
    if (client) {
      client.getBinaryState(function(err, value) {
        return value === '1' ? true : false;
      });
    } else {
      wemo.discover(foundWeMoDevice);
    }
  },

  registerStateUpdateCallback: function registerStateUpdateCallback(updateFunction, optionalCallbackFunctions) {
    console.log('[CONTROLLER] register state update function');
    sendComponentUpdate = updateFunction;
  }
};

// Create device
const WeMoLightSwitch = neeoapi.buildDevice('WeMo LightSwitch')
  .setManufacturer('Belkin')
  .addAdditionalSearchToken('wemo')
  .setType('LIGHT')
  // Dynamically discover the WeMo devices on the network
  .enableDiscovery({headerText: 'Belkin WeMo Discovery', description: 'Press NEXT to discover Belkin WeMo LightSwitches'}, controller.discoverWeMoLightSwitch)
  // Register the callback function which will be called to initialie the WeMo client
  .registerInitialiseFunction(controller.initialise)
  // Allow the driver to register the functions to call the SDK with notifications
  .registerSubscriptionFunction(controller.registerStateUpdateCallback)
  // Add POWER ON and OFF comands to be used as shortcuts or in Recipes
  .addButton({ name: 'POWER ON', label: 'Power On' })
  .addButton({ name: 'POWER OFF', label: 'Power Off' })
  .addButtonHandler(controller.onButtonPressed)
  // A device of type LIGHT will create a page which will be empty unless a switch is added
  .addSwitch({ name: 'wemoSwitch', label: 'Power' },
  { setter: controller.switchSet, getter: controller.switchGet } )
  ;
  
// function binaryStatusWeMoDevice() is called by the WeMo client to report a status change
function binaryStatusWeMoDevice(val, deviceid, devicetype) {
  switch (devicetype) {
    case "urn:Belkin:device:lightswitch:1":
      if (sendComponentUpdate) {
        sendComponentUpdate({uniqueDeviceId: deviceid, component: 'wemoSwitch', value: val === 1 ? true : false});
        console.log('sendComponentUpdate', deviceid, devicetype, val);
      }
      break;
  }
}

// function foundWeMoDevice() called by wemo.discover() when a WeMo device is found
function foundWeMoDevice(err, device) {
  let foundmac = discoveredWeMoDevices.filter((dev) => dev.macAddress === device.macAddress);
  if (foundmac.length === 0) {
    console.log('will add new wemo to discovered devices', device.macAddress, device.deviceType);
    discoveredWeMoDevices.push(device);
    let client = wemoClients[device.macAddress] = wemo.client(device); 
    // You definitely want to listen to error events (e.g. device went offline),
    // Node will throw them as an exception if they are left unhandled  
    client.on('error', function(err) {
      console.log('Error: %s', err.code);
    });
    // Handle BinaryState events
    client.on('binaryState', function(value) {
      binaryStatusWeMoDevice(value, device.macAddress, device.deviceType);
    });
  }
}

wemo.discover(foundWeMoDevice);

// export the WeMo device
module.exports = WeMoLightSwitch;
