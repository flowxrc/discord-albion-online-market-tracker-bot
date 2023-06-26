const discord = require("discord.js");
const config = require("./config.json");
const commands = require("./commands");

const client = new discord.Client({ intents: [discord.GatewayIntentBits.Guilds] });

client.once(discord.Events.ClientReady, (c) => {
    console.log(`[Event: ClientReady] Logged in as ${c.user.tag}`);
    commands.setup(client, config.token, config.applicationId);
});

commands.handle(client);

client.login(config.token);

/*
* config.json is ignored with git, to protect original's bot keys
* structure:

{
    "token": "DISCORD_BOT_TOKEN",
    "applicationId": "APP_ID"
}
*/