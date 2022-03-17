const SERVICE_UUID = '299e1ad8-e2b0-4f85-9aeb-d884823b790f';
const TX_Characteristic = '9fdc5395-42de-47fe-b448-60a46e7c1194';
const RX_Characteristic = 'eb2064dc-84f7-4a33-8dfd-69e36718d7cd';
const devices = [];
var players = [{ rgb: [255, 0, 0], score: 0 },];
var game_mode = 1;

function print(data) {
    document.querySelector('#console').innerHTML += `<p>${data}</p>`;
}
function messageHandler(event) {
    const message = Array.from(new Uint8Array(event.target.value.buffer));
    if (message[0] == 2) {
        print(`Game mode is set to ${message[1]}`);
    }
    if (game_mode == 2 && message[0] == 1) {
        console.log(message);
        for (let player of players) {
            if (this.rgb.every((value, index) => value == player.rgb[index])) {
                player.score++;
                mole().ledSteady(player.rgb);
                this.rgb = [0, 0, 0];
            }
        }
    }
}

class Device {
    constructor(bluetooth_device, rx, tx) {
        this.bluetooth_device = bluetooth_device;
        this.sender = rx;
        this.receiver = tx;
        this.rgb = [0, 0, 0];
        this.receiver.addEventListener('characteristicvaluechanged', messageHandler.bind(this));
        this.receiver.startNotifications();
    }

    ledSteady(value) {
        this.rgb = value;
        this.sender.writeValue(new Uint8Array([6, 0, 0, ...this.rgb]));
    }

    ledBlink(value) {
        this.rgb = value;
        this.sender.writeValue(new Uint8Array([6, 0, 1, ...this.rgb]));
    }
}

async function requestAndConnect() {
    try {
        var bluetooth_device = await navigator.bluetooth.requestDevice({
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

    let server = await bluetooth_device.gatt.connect();
    let service = await server.getPrimaryService(SERVICE_UUID);
    let tx_characteristic = await service.getCharacteristic(TX_Characteristic);
    let rx_characteristic = await service.getCharacteristic(RX_Characteristic);

    // Check if device is already in devices
    if (devices.every(device => device.bluetooth_device.name != bluetooth_device.name)) {
        let blazepod = new Device(bluetooth_device, rx_characteristic, tx_characteristic);
        blazepod.bluetooth_device.ongattserverdisconnected = disconnectHandler;
        devices.push(blazepod);
        refleshDevicesList();
    }
};

async function disconnectHandler() {
    if (confirm(`${this.name} is disconnected, reconnect?`)) {
        this.gatt.connect();
    } else {
        return;
    }
}

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
    if (game_mode == 1) {
        print(`Please set the game mode.`);
    } else if (game_mode == 2) {
        for (let player of players) {
            player.score = 0;
        }
        // Starting signal: red, yellow, green
        for (let device of devices) {
            device.ledSteady([55, 0, 0]);
        }
        await sleep(1500);
        for (let device of devices) {
            device.ledSteady([55, 55, 0]);
        }
        await sleep(1500);
        for (let device of devices) {
            device.ledSteady([0, 55, 0]);
        }
        await sleep(1500);
        for (let device of devices) {
            device.ledSteady([0, 0, 0]);
        }
        await sleep(500);
        for (let player of players) {
            mole().ledSteady(player.rgb);
        }
        // TODO: set game time
        await sleep(2000);
        setGameMode(1);
        var highest_score = 0;
        var winner = null;
        for (let player of players) {
            if (player.score > highest_score) {
                highest_score = player.score;
                winner = player;
            }
        }
        if (highest_score == 0) {
            for (let device of devices) {
                device.ledBlink([255, 255, 255]);
            }
        } else {
            for (let device of devices) {
                device.ledBlink(winner.rgb);
            }
        }
    }
}

// TODO: When to reflesh devices list? (use proxy object)
async function refleshDevicesList() {
    const devices_list = document.querySelector('#devices_list');
    devices_list.innerHTML = ``;
    const status_lists = document.createElement('ul');
    for (let device of devices) {
        let status = `<span style='color:red'>disconnected</span>`;
        if (device.bluetooth_device.gatt.connected == true) status = `<span style='color:green'>connected</span>`;
        const reconnect_btn = document.createElement('button');
        reconnect_btn.innerText = `Reconnect`;
        reconnect_btn.addEventListener('click', async () => { device.bluetooth_device.gatt.connect(); });
        const status_list = document.createElement('li');
        status_list.innerHTML = `${device.bluetooth_device.name} -- ${status}    `;
        status_list.appendChild(reconnect_btn);
        status_lists.appendChild(status_list);
    }
    devices_list.appendChild(status_lists);
    const reflesh_btn = document.createElement('button');
    reflesh_btn.innerText = `Reflesh`;
    reflesh_btn.addEventListener('click', refleshDevicesList);
    devices_list.appendChild(reflesh_btn);
}