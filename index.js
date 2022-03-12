const SERVICE_UUID = '299e1ad8-e2b0-4f85-9aeb-d884823b790f';
const TX_Characteristic = '9fdc5395-42de-47fe-b448-60a46e7c1194';
const RX_Characteristic = 'eb2064dc-84f7-4a33-8dfd-69e36718d7cd';
const devices = [];
var players = [{ rgb: [155, 0, 0], score: 0 },];
var gameMode = 0;

function print(data) {
    document.querySelector('#console').innerHTML += `${data}\n`;
}
function messageHandler(event) {
    const message = Array.from(new Uint8Array(event.target.value.buffer));
    if (message[0] == 2) {
        print(`Game mode is set to ${message[1]}`);
    }
    if (gameMode == 1 && message[0] == 1) {
        console.log(message);
        for (let player of players) {
            console.log(this);
            if (this.rgb.every((value, index) => value == player.rgb[index])) {
                player.score++;
                mole().setRgbValue = player.rgb;
                this.rgb = [0, 0, 0];
            }
        }
    }
}

class Device {
    constructor(device, rx, tx) {
        this.device = device;
        this.sender = rx;
        this.receiver = tx;
        this.rgb = [0, 0, 0];
        this.receiver.addEventListener('characteristicvaluechanged', messageHandler.bind(this));
        this.device.addEventListener('gattserverdisconnected', this.handleDeviceDisconnect);
        this.receiver.startNotifications();
    }

    handleDeviceDisconnect(event) {
        print(`Device ${this.name} has disconnected`);
    }

    set setRgbValue(value) {
        try {
            this.rgb = value;
            this.sender.writeValue(new Uint8Array([6, 0, 0, ...this.rgb]));
        } catch (error) {
            console.log(error);
        }
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
        print(err)
    }

    let server = await device.gatt.connect();
    let service = await server.getPrimaryService(SERVICE_UUID);
    let tx_characteristic = await service.getCharacteristic(TX_Characteristic);
    let rx_characteristic = await service.getCharacteristic(RX_Characteristic);
    let blazepod = new Device(device, rx_characteristic, tx_characteristic);
    devices.push(blazepod);
    print(`Device ${device.name} has connected`);
};

const connect_button = document.querySelector('#connect');
connect_button.addEventListener('click', requestAndConnect);

const game_mode_01 = document.querySelector('#game_mode_01');
game_mode_01.addEventListener('click', setGameMode01);

async function setGameMode01() {
    for (let device of devices) {
        await device.sender.writeValue(new Uint8Array([2, 1]));
    }
    gameMode = 1;
}

const start_button = document.querySelector('#start');
start_button.addEventListener('click', start);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function mole() {
    let i = Math.floor(Math.random() * devices.length);
    if (devices[i].rgb.every(x => x == 0)) {
        return devices[i];
    }
    return mole();
}

async function start() {
    if (gameMode == 0) {
        print(`Please set the game mode.`);
    } else if (gameMode == 1) {
        for (let device of devices) {
            device.setRgbValue = [55, 0, 0];
        }
        await sleep(1500);
        for (let device of devices) {
            device.setRgbValue = [55, 55, 0];
        }
        await sleep(1500);
        for (let device of devices) {
            device.setRgbValue = [0, 55, 0];
        }
        await sleep(1500);
        for (let device of devices) {
            device.setRgbValue = [0, 0, 0];
        }
        await sleep(500);
        for (let player of players) {
            mole().setRgbValue = player.rgb;
        }
        // devices[0].setRgbValue = players[0].rgb;
    }

}