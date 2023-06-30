const discord = require("discord.js");
const undici = require("undici");
const albion_data = require("../albion_data");
const prettyNumber = require("../helpers/prettyNumber");
const logger = require("../helpers/logger");
const unixTimestamp = require("../helpers/unixTimestamp");

const generateEmbeddedMarketData = (server, data) => {
    const messageEmbed = new discord.EmbedBuilder();

    messageEmbed.setColor("#f5bd05");
    messageEmbed.setTitle("🪙 Золото");
    messageEmbed.setDescription(`Сервер: ${server}\nПоследнее обновление данных: <t:${unixTimestamp(data.timestamp)}:F>`);
    messageEmbed.addFields(
        { name: "Цена", value: `${prettyNumber(data.price)} <:albion_silver:1123705360264466621>` }
    );
    messageEmbed.setTimestamp();

    return messageEmbed;
}

const executeCommand = async (interaction) => {
    await interaction.reply("⚙️ Отправляем запрос");

    const server = interaction.options.getString("сервер");

    if (!server)
        return await interaction.editReply("❌ Ошибка в параметрах");

    const apiRequestUrl = `http://${server}.albion-online-data.com/api/v2/stats/Gold.json`;
    const apiRequest = await undici.request(apiRequestUrl);

    logger.write(`[discord.Events.InteractionCreate] Sending API request using "${apiRequestUrl}" URL`);

    if (!apiRequest) {
        logger.write("[discord.Events.InteractionCreate] Error when executing API request");
        return await interaction.editReply("❌ Ошибка API");
    }

    let apiJson;

    try {
        apiJson = await apiRequest.body.json();
    }
    catch (error) {
        logger.write(`[discord.Events.InteractionCreate] Error when fetching API request: ${error}`);
        return await interaction.editReply("❌ Ошибка API");
    }

    if (!apiJson || apiJson.length < 1) {
        logger.write("[discord.Events.InteractionCreate] Error when fetching API request");
        return await interaction.editReply("❌ Ошибка API");
    }

    logger.saveApiRequest(apiRequestUrl, apiJson);

    const marketData = apiJson[0];

    if (!marketData) {
        logger.write("[discord.Events.InteractionCreate] Error when fetching API request");
        return await interaction.editReply("❌ Ошибка API");
    }

    const embed = generateEmbeddedMarketData(server, marketData);

    if (!embed) {
        logger.write("[discord.Events.InteractionCreate] Error when sending embedded message");
        return await interaction.editReply("❌ Ошибка discord.EmbedBuilder");
    }

    await interaction.editReply({ content: "✅ Данные загружены", embeds: [ embed ] });
}

const buildCommand = () => {
    const command = new discord.SlashCommandBuilder();

    command.setName("getexchangerate");
    command.setDescription("Отображает цены на обмены серебра на золото");

    command.addStringOption(option =>
        option.setName("сервер")
        .setDescription("Сервер альбиона")
        .setRequired(true)
        .addChoices({ name: albion_data.servers[0].name, value: albion_data.servers[0].tag }, { name: albion_data.servers[1].name, value: albion_data.servers[1].tag })
    );

    return command;
}

module.exports = {
    data: buildCommand(),
    execute: executeCommand
}