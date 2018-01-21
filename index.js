
'use strict';

// require the NEEO SDK
const neeoapi = require('neeo-sdk');
// use the same structure as the multiple devices example
// this will allow keep this file unchange as we add more devices
const devices = require('./devices');

console.log('NEEO SDK Example "multipleDevices" adapter');
console.log('------------------------------------------');

// this function will be called from the main code once 
// the IP adress of the Brain has been ddetermined
function startSdkExample(brain) {
  console.log('- Start server');
  neeoapi.startServer({
    brain,
    port: 6336,
    name: 'multidevice-adapter',
    devices: devices
  })
  .then(() => {
    console.log('# READY! use the NEEO app to search for "Belkin WeMo Devices".');
  })
  .catch((error) => {
    //if there was any error, print message out to console
    console.error('ERROR!', error.message);
    process.exit(1);
  });
}

// this is the main code which will either pick up the IP adress
// of the Brain from an environment vaariable or discover a Brain
// this code does not allow processing on multiple Brains
const brainIp = process.env.BRAINIP;
if (brainIp) {
  console.log('- use NEEO Brain IP from env variable', brainIp);
  startSdkExample(brainIp);
} else {
  console.log('- discover one NEEO Brain...');
  neeoapi.discoverOneBrain()
    .then((brain) => {
      console.log('- Brain discovered:', brain.name);
      startSdkExample(brain);
    });
}
