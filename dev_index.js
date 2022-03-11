const database = [];
const SERVICE_UUID = '299e1ad8-e2b0-4f85-9aeb-d884823b790f';
const TX_Characteristic = '9fdc5395-42de-47fe-b448-60a46e7c1194';
const RX_Characteristic = 'eb2064dc-84f7-4a33-8dfd-69e36718d7cd';
const connect_button = document.querySelector('#connect');
let device = null;
let server = null;
let service = null;
let tx_characteristic = null;
let rx_characteristic = null;

function messageHandler(event) {
    let buffer = event.target.value.buffer;
    let message = Array.from(new Uint8Array(buffer));
    console.log(message);
}


class Device {
    constructor(device, rx, tx) {
        this.device = device;
        this.rgb = [0, 0, 0];
        this.send = rx;
        this.receive = tx;
        this.receive.addEventListener('characteristicvaluechanged', messageHandler);
    }
}

async function requestAndConnect() {
    try {
        device = await navigator.bluetooth.requestDevice({
            filters: [
                {
                    namePrefix: 'BP'
                }
            ],
            optionalServices: [SERVICE_UUID]
        })
    } catch (err) {
        console.log(err)
    }

    device.addEventListener('gattserverdisconnected', handleDeviceDisconnect);

    server = await device.gatt.connect();
    service = await server.getPrimaryService(SERVICE_UUID);
    tx_characteristic = await service.getCharacteristic(TX_Characteristic);
    rx_characteristic = await service.getCharacteristic(RX_Characteristic);
    tx_characteristic.addEventListener('characteristicvaluechanged', messageHandler);
    tx_characteristic.startNotifications();
    await gameMode01();

    function handleDeviceDisconnect(event) {
        console.log('Device Disconnected');
        device = null;
        server = null;
        service = null;
        tx_characteristic = null;
        rx_characteristic = null;
    }

    function messageHandler(event) {
        let buffer = event.target.value.buffer;
        let message = Array.from(new Uint8Array(buffer));
        console.log(message);
    }

    async function gameMode01() {
        let buffer = new Uint8Array([2, 1]);
        await rx_characteristic.writeValue(buffer);
    }

};