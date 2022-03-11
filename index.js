const SERVICE_UUID = '299e1ad8-e2b0-4f85-9aeb-d884823b790f';
const TX_Characteristic = '9fdc5395-42de-47fe-b448-60a46e7c1194';
const RX_Characteristic = 'eb2064dc-84f7-4a33-8dfd-69e36718d7cd';
const database = [];

function messageHandler(event) {
    const message = Array.from(new Uint8Array(event.target.value.buffer));
    console.log(this.name);
    console.log(message);
}

class Device {
    constructor(device, rx, tx) {
        this.device = device;
        this.sender = rx;
        this.receiver = tx;
        this.rgb = [0, 0, 0];
        this.receiver.addEventListener('characteristicvaluechanged', messageHandler.bind(this.device));
        this.device.addEventListener('gattserverdisconnected', this.handleDeviceDisconnect);
        this.receiver.startNotifications();
    }

    handleDeviceDisconnect(event) {
        console.log(`Device ${this.name} has disconnected`);
    }
    set newRGB(value) {
        this.rgb = value;
        this.sender.writeValue(new Uint8Array([6, 0, 0, ...this.rgb]));
    }
}

async function requestAndConnect() {
    try {
        var device = await navigator.bluetooth.requestDevice({
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

    let server = await device.gatt.connect();
    let service = await server.getPrimaryService(SERVICE_UUID);
    let tx_characteristic = await service.getCharacteristic(TX_Characteristic);
    let rx_characteristic = await service.getCharacteristic(RX_Characteristic);
    let blazepod = new Device(device, rx_characteristic, tx_characteristic);
    database.push(blazepod);
    console.log(`Device ${device.name} has connected`);
};

const connect_button = document.querySelector('#connect');
connect_button.addEventListener('click', requestAndConnect);

const game_mode_01 = document.querySelector('#game_mode_01');
game_mode_01.addEventListener('click', setGameMode01);

async function setGameMode01() {
    for (let i of database) {
        await i.sender.writeValue(new Uint8Array([2, 1]));
    }
}

const start_button = document.querySelector('#start');
start_button.addEventListener('click', start);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function start() {
    for (let i of database) {
        i.newRGB = [55, 0, 0];
    }
    await sleep(1500);
    for (let i of database) {
        i.newRGB = [55, 55, 0];
    }
    await sleep(1500);
    for (let i of database) {
        i.newRGB = [0, 55, 0];
    }
    await sleep(1500);
    for (let i of database) {
        i.newRGB = [0, 0, 0];
    }
}