const discord = require("discord.js");
const filesystem = require("fs");
const logger = require("./logger");
const config = require("../config.json");

const getCommandCollection = () => {
    const collection = new discord.Collection();

    const commandsFolderPath = "bot/commands";
    const commandFiles = filesystem.readdirSync(commandsFolderPath).filter(file => file.endsWith(".js"));

    for (const fileName of commandFiles) {
        const filePath = `../commands/${fileName}`;
        const command = require(filePath);

        if (!command.data) {
            logger.write(`[${fileName}] Command missing "data" property`);
            continue;
        }

        if (!command.execute) {
            logger.write(`[${fileName}] Command missing "execute" function`);
            continue;
        }

        collection.set(command.data.name, command);
    }

    return collection;
}

module.exports = {
    registerCommands: (client) => {
        client.commands = getCommandCollection();

        const rest = new discord.REST().setToken(config.token);

        (async () => {
            try {
                const commands = [];

                client.commands.forEach((command) => {
                    commands.push(command.data.toJSON());
                    logger.write(`[discord.Events.ClientReady] [${command.data.name}] Setting up`);
                });

                await rest.put(discord.Routes.applicationCommands(config.applicationId), { body: commands });
            } catch (error) {
                console.error(error);
            }
        })();

        logger.write(`[discord.Events.ClientReady] Commands ready`);
    },
    handleCommands: (client) => {
        client.on(discord.Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand())
                return;
            
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command)
                return logger.write(`[discord.Events.InteractionCreate] [${interaction.commandName}] No matching command was found`);
            
            try {
                await command.execute(interaction);
            } catch (error) {
                logger.write(`[discord.Events.InteractionCreate] [${interaction.commandName}] Failed to execute with error: ${error}`);
            }
        });
    }
}