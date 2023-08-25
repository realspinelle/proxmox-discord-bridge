const { proxmoxApi } = require("proxmox-api");
const { Client, GatewayIntentBits } = require('discord.js');
const proxmox = proxmoxApi({ host: 'YOUR_PROXMOX_IP_OR_DOMAIN', tokenID: 'USERNAME@pve!API_KEY_NAME', tokenSecret: 'TOKEN' });
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const fs = require("fs");

var config = require("./config.json");

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    setInterval(async () => {
        try {
            let channel = await client.channels.fetch("YOUR_GUILD_CHANNEL_ID");

            let log = (await filterArray(await proxmox.cluster.log.$get())).reverse();
            let filterredLog = log.filter(a => !config.lastLogs.find(b => a.id == b.id));
            if (channel && filterredLog.length >= 1) splitMessage(filterredLog.map(e => {
                let date = new Date(e.time * 1000);
                return "[" + date.toDateString() + "]" + " " + e.node + " | " + e.user + " | " + e.msg
            }).join("\n")).forEach(e => {
                channel.send({ content: e });
            });
            config.lastLogs = log;

            let tasks = (await filterArray(await proxmox.cluster.tasks.$get())).reverse();
            let filterredTasks = tasks.filter(a => !config.lastTasks.find(b => a.upid == b.upid));
            if (channel && filterredTasks.length >= 1) splitMessage(filterredTasks.map(e => {
                let date = new Date(e.starttime * 1000);
                return "[" + date.toDateString() + "]" + " " + e.node + " | " + e.user + " | " + e.type
            }).join("\n")).forEach(e => {
                channel.send({ content: e });
            });
            config.lastTasks = tasks;

            saveConfig();
        } catch (e) {}
    }, 5000);
});

client.login("YOUR_BOT_TOKEN");

let filterArray = async (array = []) => {
    return await Promise.all(array.map(async e => {
        let result = {};
        let keys = Object.keys(e);
        keys.sort(function (a, b) {
            return a.localeCompare(b);
        });
        for (let key of keys) {
            result[key] = e[key];
        }
        return result;
    }));
}

let splitMessage = (string = "") => {
    let split = string.split("\n");
    let result = [];
    let curText = "";
    for (text of split) {
        let futureText = (curText == "" ? curText : curText + "\n") + text;
        if (futureText.length >= 1500) {
            result.push(curText);
            curText = "";
        }
        curText = (curText == "" ? curText : curText + "\n") + text;
    }
    result.push(curText);
    return result;
}

let saveConfig = () => {
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 4));
}
