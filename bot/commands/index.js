const discord = require("discord.js");

const getprice = require("./getprice");

module.exports = {
    setup: (client, token, applicationId) => {
        client.commands = new discord.Collection();
        client.commands.set(getprice.data.name, getprice);

        const rest = new discord.REST().setToken(token);

        (async () => {
            try {
                const commands = [];

                client.commands.forEach((command) => {
                    commands.push(command.data.toJSON());
                    console.log(`[Event: ClientReady] [Command: ${command.data.name}] Setting up`);
                });

                await rest.put(discord.Routes.applicationCommands(applicationId), { body: commands });
            } catch (error) {
                console.error(error);
            }
        })();

        console.log(`[Event: ClientReady] Commands ready`);
    },
    handle: (client) => {
        client.on(discord.Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand())
                return;
            
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command)
                return console.error(`[Event: InteractionCreate] [Command: ${interaction.commandName}] No matching command was found`);
            
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
            }
        });
    }
}