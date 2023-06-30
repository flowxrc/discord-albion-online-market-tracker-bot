const discord = require("discord.js");
const undici = require("undici");
const albion_data = require("../albion_data");
const prettyNumber = require("../helpers/prettyNumber");
const logger = require("../helpers/logger");
const unixTimestamp = require("../helpers/unixTimestamp");

const findItemData = (tier, enchantment, nameQuery) => {
    let item;

    for (let i = 0; i < albion_data.items.length; i++) {
        const itemIterator = albion_data.items[i];

        if (!itemIterator.LocalizationNameVariable || !itemIterator.LocalizedNames || !itemIterator.UniqueName || !itemIterator.LocalizationNameVariable.includes(`T${tier + 1}`))
            continue;
        
        if (itemIterator.LocalizationNameVariable.includes("LEVEL")) {
            if (enchantment > 0)
                if (!itemIterator.LocalizationNameVariable.includes(`LEVEL${enchantment}`))
                    continue;
            else
                continue;
        }
        else if (enchantment > 0 && !itemIterator.UniqueName.includes(`@${enchantment}`))
            continue;
        
        if (itemIterator.LocalizedNames["RU-RU"].includes(nameQuery)) {
            item = itemIterator;
            break;
        }
    }

    return item;
}

const verifyIntegerSetting = (test) => {
    return (!test && test != 0);
}

const generateEmbeddedMarketData = (tier, name, variableName, enchantment, server, data) => {
    const tierData = albion_data.tiers[tier];
    const messageEmbed = new discord.EmbedBuilder();

    const apiLogDates = [ unixTimestamp(data.sell_price_min_date), unixTimestamp(data.sell_price_max_date), unixTimestamp(data.buy_price_min_date), unixTimestamp(data.buy_price_max_date) ];

    messageEmbed.setColor(tierData.color);
    messageEmbed.setTitle(name);
    messageEmbed.setDescription(`Город: ${data.city}\nСервер: ${server}\nПоследнее обновление данных: <t:${Math.max(...apiLogDates)}:F>`);
    messageEmbed.setThumbnail(`https://render.albiononline.com/v1/item/${variableName}`);
    messageEmbed.addFields(
        { name: "Тир", value: tierData.name },
        { name: "Зачарование", value: albion_data.enchantments[enchantment] },
        { name: "Качество", value: albion_data.qualities[data.quality - 1] },
        { name: "Минимальная цена продажи: ", value: `${prettyNumber(data.sell_price_min)} <:albion_silver:1123705360264466621>` },
        { name: "Максимальная цена продажи: ", value: `${prettyNumber(data.sell_price_max)} <:albion_silver:1123705360264466621>` },
        { name: "Минимальный заказ на покупку: ", value: `${prettyNumber(data.buy_price_min)} <:albion_silver:1123705360264466621>` },
        { name: "Максимальный заказ на покупку: ", value: `${prettyNumber(data.buy_price_max)} <:albion_silver:1123705360264466621>` }
    );
    messageEmbed.setTimestamp();

    return messageEmbed;
}

const executeCommand = async (interaction) => {
    await interaction.reply("⚙️ Поиск предмета");

    const server = interaction.options.getString("сервер");
    const market = interaction.options.getString("город");
    const tier = interaction.options.getInteger("тир");
    const enchantment = interaction.options.getInteger("зачарование");
    const quality = interaction.options.getInteger("качество");
    const itemName = interaction.options.getString("предмет");

    if (!server || !market || verifyIntegerSetting(tier) || verifyIntegerSetting(enchantment) || verifyIntegerSetting(quality) || !itemName)
        return await interaction.editReply("❌ Ошибка в параметрах");

    const item = findItemData(tier, enchantment, itemName);

    if (!item)
        return await interaction.editReply("❌ Предмет не найден");
    
    let itemVariableName = item.LocalizationNameVariable.slice(7);

    if (enchantment > 0)
        if (!item.LocalizationNameVariable.includes("LEVEL"))
            itemVariableName = `${itemVariableName}@${enchantment}`;

    const apiRequestUrl = `http://${server}.albion-online-data.com/api/v2/stats/Prices/${itemVariableName}.json?locations=${market}&qualities=${quality + 1}`;
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

    console.log(apiRequest.body._read());
    logger.saveApiRequest(apiRequestUrl, apiJson);

    const marketData = apiJson[0];

    if (!marketData) {
        logger.write("[discord.Events.InteractionCreate] Error when fetching API request");
        return await interaction.editReply("❌ Ошибка API");
    }

    const embed = generateEmbeddedMarketData(tier, item.LocalizedNames["RU-RU"], itemVariableName, enchantment, server, marketData);

    if (!embed) {
        logger.write("[discord.Events.InteractionCreate] Error when sending embedded message");
        return await interaction.editReply("❌ Ошибка discord.EmbedBuilder");
    }

    await interaction.editReply({ content: "✅ Данные загружены", embeds: [ embed ] });
}

const buildCommand = () => {
    const command = new discord.SlashCommandBuilder();

    command.setName("getprice");
    command.setDescription("Отображает цены на выбранный предмет с выбранными параметрами");

    command.addStringOption(option =>
        option.setName("сервер")
        .setDescription("Сервер альбиона")
        .setRequired(true)
        .addChoices({ name: albion_data.servers[0].name, value: albion_data.servers[0].tag }, { name: albion_data.servers[1].name, value: albion_data.servers[1].tag })
    );

    command.addStringOption(option =>
        option.setName("город")
        .setDescription("Город в котором вы хотите yзнать цену")
        .setRequired(true)
        .addChoices({ name: albion_data.markets[0].displayName, value: albion_data.markets[0].gameName }, { name: albion_data.markets[1].displayName, value: albion_data.markets[1].gameName }, { name: albion_data.markets[2].displayName, value: albion_data.markets[2].gameName }, { name: albion_data.markets[3].displayName, value: albion_data.markets[3].gameName }, { name: albion_data.markets[4].displayName, value: albion_data.markets[4].gameName }, { name: albion_data.markets[5].displayName, value: albion_data.markets[5].gameName }, { name: albion_data.markets[6].displayName, value: albion_data.markets[6].gameName }, { name: albion_data.markets[7].displayName, value: albion_data.markets[7].gameName })
    );

    command.addIntegerOption(option =>
        option.setName("тир")
        .setDescription("Тир предмета")
        .setRequired(true)
        .addChoices({ name: albion_data.tiers[0].name, value: 0 }, { name: albion_data.tiers[1].name, value: 1 }, { name: albion_data.tiers[2].name, value: 2 }, { name: albion_data.tiers[3].name, value: 3 }, { name: albion_data.tiers[4].name, value: 4 }, { name: albion_data.tiers[5].name, value: 5 }, { name: albion_data.tiers[6].name, value: 6 }, { name: albion_data.tiers[7].name, value: 7 })
    );

    command.addIntegerOption(option =>
        option.setName("зачарование")
        .setDescription("Степень зачарования предмета")
        .setRequired(true)
        .addChoices({ name: albion_data.enchantments[0], value: 0 }, { name: albion_data.enchantments[1], value: 1 }, { name: albion_data.enchantments[2], value: 2 }, { name: albion_data.enchantments[3], value: 3 }, { name: albion_data.enchantments[4], value: 4 })
    );

    command.addIntegerOption(option =>
        option.setName("качество")
        .setDescription("Качество предмета")
        .addChoices({ name: albion_data.qualities[0], value: 0 }, { name: albion_data.qualities[1], value: 1 }, { name: albion_data.qualities[2], value: 2 }, { name: albion_data.qualities[3], value: 3 }, { name: albion_data.qualities[4], value: 4 })
        .setRequired(true)
    );

    command.addStringOption(option =>
        option.setName("предмет")
        .setDescription("Название предмета")
        .setRequired(true)
    );

    return command;
}

module.exports = {
    data: buildCommand(),
    execute: executeCommand
}