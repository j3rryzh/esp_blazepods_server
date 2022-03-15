const SERVICE_UUID = '299e1ad8-e2b0-4f85-9aeb-d884823b790f';
const TX_Characteristic = '9fdc5395-42de-47fe-b448-60a46e7c1194';
const RX_Characteristic = 'eb2064dc-84f7-4a33-8dfd-69e36718d7cd';
const devices = [];
var players = [{ rgb: [255, 0, 0], score: 0 },];
var game_mode = 0;

function print(data) {
    document.querySelector('#console').innerHTML += `<p>${data}</p>`;
}
function messageHandler(event) {
    const message = Array.from(new Uint8Array(event.target.value.buffer));
    if (message[0] == 2) {
        print(`Game mode is set to ${message[1]}`);
    }
    if (game_mode == 1 && message[0] == 1) {
        console.log(message);
        for (let player of players) {
            if (this.rgb.every((value, index) => value == player.rgb[index])) {
                player.score++;
                mole().ledSteady = player.rgb;
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

    set ledSteady(value) {
        try {
            this.rgb = value;
            this.sender.writeValue(new Uint8Array([6, 0, 0, ...this.rgb]));
        } catch (error) {
            console.log(error);
        }
    }
    set ledBlink(value) {
        try {
            this.rgb = value;
            this.sender.writeValue(new Uint8Array([6, 0, 1, ...this.rgb]));
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

    // Check if device is already in devices
    if (devices.every(d => d.device.name != device.name)) {
        let blazepod = new Device(device, rx_characteristic, tx_characteristic);
        devices.push(blazepod);
        print(`Device ${device.name} has connected`);
    }
    const devices_list = document.querySelector('#devices_list');
    let status_list = '';
    for (let device of devices) {
        let status = `<span style='color:red'>disconnected</span>`;
        if (device.device.gatt.connected == true) { status = `<span style='color:green'>connected</span>` }
        status_list += `<li>${device.device.name} -- ${status}</li>`;
    }
    devices_list.innerHTML = status_list;
};

document.querySelector('#connect').addEventListener('click', requestAndConnect);

document.querySelector('#game_mode').addEventListener('change', event => {
    setGameMode(event.target.value);
});

async function setGameMode(mode) {
    for (let device of devices) {
        await device.sender.writeValue(new Uint8Array([2, mode]));
    }
    game_mode = mode;
}

const player = document.querySelector('#player');
const p1_color = document.querySelector('#p1_color');
const p2_color = document.querySelector('#p2_color');

player.addEventListener('change', (event) => {
    if (event.target.value == "1") {
        let p1rgb = p1_color.value;
        players = [{ rgb: [Number(`0x${p1rgb.slice(1, 3)}`), Number(`0x${p1rgb.slice(3, 5)}`), Number(`0x${p1rgb.slice(5, 7)}`)], score: 0 },];
        p2_color.parentElement.style.display = "none";
    } else if (event.target.value == "2") {
        let p1rgb = p1_color.value;
        let p2rgb = p2_color.value;
        players = [{ rgb: [Number(`0x${p1rgb.slice(1, 3)}`), Number(`0x${p1rgb.slice(3, 5)}`), Number(`0x${p1rgb.slice(5, 7)}`)], score: 0 }, { rgb: [Number(`0x${p2rgb.slice(1, 3)}`), Number(`0x${p2rgb.slice(3, 5)}`), Number(`0x${p2rgb.slice(5, 7)}`)], score: 0 }];
        p2_color.parentElement.style.display = "inline";
    }
});
p1_color.addEventListener("change", (event) => {
    let str = event.target.value
    players[0].rgb = [Number(`0x${str.slice(1, 3)}`), Number(`0x${str.slice(3, 5)}`), Number(`0x${str.slice(5, 7)}`)];
}
);
p2_color.addEventListener("change", (event) => {
    let str = event.target.value
    players[1].rgb = [Number(`0x${str.slice(1, 3)}`), Number(`0x${str.slice(3, 5)}`), Number(`0x${str.slice(5, 7)}`)];
}
);


document.querySelector('#start').addEventListener('click', start);

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function mole() {
    let i = Math.floor(Math.random() * devices.length);
    if (devices[i].rgb.every(x => x == 0)) {
        return devices[i];
    }
    return mole();
}

async function start() {
    if (game_mode == 0) {
        print(`Please set the game mode.`);
    } else if (game_mode == 1) {
        for (let player of players) {
            player.score = 0;
        }
        // Starting signal: red, yellow, green
        for (let device of devices) {
            device.ledSteady = [55, 0, 0];
        }
        await sleep(1500);
        for (let device of devices) {
            device.ledSteady = [55, 55, 0];
        }
        await sleep(1500);
        for (let device of devices) {
            device.ledSteady = [0, 55, 0];
        }
        await sleep(1500);
        for (let device of devices) {
            device.ledSteady = [0, 0, 0];
        }
        await sleep(500);
        for (let player of players) {
            mole().ledSteady = player.rgb;
        }
        await sleep(60000);
        setGameMode(1);
        if (players[0].score > players[1].score) {
            for (let device of devices) {
                device.ledBlink = players[0].rgb;
            }
        } else if (players[0].score < players[1].score) {
            for (let device of devices) {
                device.ledBlink = players[1].rgb;
            }
        } else {
            for (let device of devices) {
                device.ledBlink = [255, 255, 255];
            }
        }
    }
}

