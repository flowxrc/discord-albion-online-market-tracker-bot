const config = require("./config.json");
const discord = require("discord.js");
const logger = require("./helpers/logger");
const commandHelper = require("./helpers/commandHelper");

const client = new discord.Client({ intents: [discord.GatewayIntentBits.Guilds] });

client.once(discord.Events.ClientReady, (c) => {
    logger.write(`[discord.Events.ClientReady] Logged in as ${c.user.tag}`);
    commandHelper.registerCommands(client);
});

commandHelper.handleCommands(client);

client.login(config.token);