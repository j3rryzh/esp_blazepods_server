const SERVICE_UUID = '299e1ad8-e2b0-4f85-9aeb-d884823b790f';
const TX_Characteristic = '9fdc5395-42de-47fe-b448-60a46e7c1194';
const RX_Characteristic = 'eb2064dc-84f7-4a33-8dfd-69e36718d7cd';
const devices = [];
var players = [{ rgb: [255, 0, 0], score: 0 },];
var gameMode = 0;

function print(data) {
    document.querySelector('#console').innerHTML += `${data}
    `;
}
function messageHandler(event) {
    const message = Array.from(new Uint8Array(event.target.value.buffer));
    if (message[0] == 2) {
        print(`Game mode is set to ${message[1]}`);
    }
    if (gameMode == 1 && message[0] == 1) {
        console.log(message);
        for (let player of players) {
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

const player = document.querySelector('#player');
const p1 = document.querySelector('#p1');
const p2 = document.querySelector('#p2');

player.addEventListener('change', (event) => {
    if (event.target.value == "1") {
        let p1rgb = p1.value;
        players = [{ rgb: [Number(`0x${p1rgb.slice(1, 3)}`), Number(`0x${p1rgb.slice(3, 5)}`), Number(`0x${p1rgb.slice(5, 7)}`)], score: 0 },];
        p2.parentElement.style.display = "none";
    } else if (event.target.value == "2") {
        let p1rgb = p1.value;
        let p2rgb = p2.value;
        players = [{ rgb: [Number(`0x${p1rgb.slice(1, 3)}`), Number(`0x${p1rgb.slice(3, 5)}`), Number(`0x${p1rgb.slice(5, 7)}`)], score: 0 }, { rgb: [Number(`0x${p2rgb.slice(1, 3)}`), Number(`0x${p2rgb.slice(3, 5)}`), Number(`0x${p2rgb.slice(5, 7)}`)], score: 0 }];
        p2.parentElement.style.display = "inline";
    }
});
p1.addEventListener("change", (event) => {
    let str = event.target.value
    players[0].rgb = [Number(`0x${str.slice(1, 3)}`), Number(`0x${str.slice(3, 5)}`), Number(`0x${str.slice(5, 7)}`)];
}
);
p2.addEventListener("change", (event) => {
    let str = event.target.value
    players[1].rgb = [Number(`0x${str.slice(1, 3)}`), Number(`0x${str.slice(3, 5)}`), Number(`0x${str.slice(5, 7)}`)];
}
);


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
        for (let player of players) {
            player.score = 0;
        }
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
        await sleep(60000);
        if (players[0].score > players[1].score) {
            for (let device of devices) {
                device.setRgbValue = players[0].rgb;
            }
        } else if (players[0].score < players[1].score) {
            for (let device of devices) {
                device.setRgbValue = players[1].rgb;
            }
        } else {
            for (let device of devices) {
                device.setRgbValue = [255, 255, 255];
            }
        }
    }
}
