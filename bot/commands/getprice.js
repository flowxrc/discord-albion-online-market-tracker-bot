const discord = require("discord.js");
const http = require("http");

// albion_data
const items = require("../albion_data/items.json");
const tiers = require("../albion_data/tiers.json");
const qualities = require("../albion_data/qualities.json");

const prettyPrint = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = {
    data: new discord.SlashCommandBuilder()
        .setName("getprice")
        .setDescription("Displays the price of the selected item in the selected city")
        .addStringOption(option =>
            option.setName("сервер")
            .setDescription("Сервер альбиона на котором вы хотите узнать цены")
            .addChoices({ name: "Западный Альбион", value: "west" }, { name: "Восточный Альбион", value: "east" })
            .setRequired(true))
        .addIntegerOption(option =>
            option.setName("тир")
            .setDescription("Тир предмета")
            .addChoices({ name: tiers[0].name, value: 1 }, { name: tiers[1].name, value: 2 }, { name: tiers[2].name, value: 3 }, { name: tiers[3].name, value: 4 }, { name: tiers[4].name, value: 5 }, { name: tiers[5].name, value: 6 }, { name: tiers[6].name, value: 7 }, { name: tiers[7].name, value: 8 })
            .setRequired(true))
        .addIntegerOption(option =>
            option.setName("качество")
            .setDescription("Качество предмета")
            .addChoices({ name: qualities[0], value: 1 }, { name: qualities[1], value: 2 }, { name: qualities[2], value: 3 }, { name: qualities[3], value: 4 }, { name: qualities[4], value: 5 })
            .setRequired(true))
        .addStringOption(option =>
            option.setName("предмет")
            .setDescription("Название предмета")
            .setRequired(true))
        .addStringOption(option =>
            option.setName("город")
            .setDescription("Город в котором вы хотите yзнать цену")
            .addChoices({ name: "Thetford", value: "Thetford" }, { name: "Fort Sterling", value: "FortSterling" }, { name: "Lymhurst", value: "Lymhurst" }, { name: "Bridgewatch", value: "Bridgewatch" }, { name: "Martlock", value: "Martlock" }, { name: "Caerleon", value: "Caerleon" }, { name: "Brecilien", value: "Brecilien" }, { name: "Black Market", value: "BlackMarket" })
            .setRequired(true)),
    
    async execute(interaction) {
        const server = interaction.options.getString("сервер");
        const itemTier = interaction.options.getInteger("тир");
        const itemName = interaction.options.getString("предмет");
        const city = interaction.options.getString("город");
        const quality = interaction.options.getInteger("качество");

        // Find item
        let item;

        for (let i = 0; i < items.length; i++) {
            const itemIterator = items[i];

            if (!itemIterator.LocalizationNameVariable || !itemIterator.LocalizedNames || !itemIterator.LocalizationNameVariable.includes(`T${itemTier}`))
                continue;
            
            if (itemIterator.LocalizedNames["RU-RU"].includes(itemName)) {
                item = itemIterator;
                break;
            }
        }

        if (!item)
            return await interaction.reply("Предмет не найден");
        
        const itemVariableName = item.LocalizationNameVariable.slice(7);
        const inGameItemName = item.LocalizedNames["RU-RU"];

        const requestOptions = {
            hostname: `${server}.albion-online-data.com`,
            path: `/api/v2/stats/Prices/${itemVariableName}.json?locations=${city}&qualities=${quality}`,
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            }
        };

        const request = await http.request(requestOptions, (response) => {
            response.setEncoding("utf8");

            let data = "";

            response.on("data", (chunk) => {
                data += chunk;
            });
          
            response.on("end", () => {
                data = JSON.parse(data)[0];

                const tier = tiers[itemTier - 1];

                const messageEmbed = new discord.EmbedBuilder()
                    .setColor(tier.color)
                    .setTitle(inGameItemName)
                    .setDescription(`Город: ${city}\nСервер: ${server}`)
                    .addFields(
                        { name: "Тир", value: tier.name },
                        { name: "Качество", value: qualities[data.quality - 1] },
                        { name: "Минимальная цена продажи: ", value: `${prettyPrint(data.sell_price_min)} Серебра` },
                        { name: "Максимальная цена продажи: ", value: `${prettyPrint(data.sell_price_max)} Серебра` },
                        { name: "Минимальный заказ на покупку: ", value: `${prettyPrint(data.buy_price_min)} Серебра` },
                        { name: "Максимальный заказ на покупку: ", value: `${prettyPrint(data.buy_price_max)} Серебра` }
                    )
                    .setTimestamp()

                interaction.reply({ embeds: [ messageEmbed ] });
            });
        });

        await request.end();
    }
}