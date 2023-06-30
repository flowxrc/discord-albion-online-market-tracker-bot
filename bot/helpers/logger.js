const filesystem = require("fs");

const write = (log) => {
    const datetime = new Date().toLocaleString();
    const content = `[${datetime}] ${log}`;

    filesystem.writeFile("log.txt", content + "\n", { flag: "a+" }, (err) => {
        if (err)
            return console.error(err);
        
        console.log(content);
    });
}

const fixDate = (object) => {
    return String(object).padStart(2, "0");
}

const saveApiRequest = (link, json) => {
    if (!filesystem.existsSync("api_request_logs"))
        filesystem.mkdirSync("api_request_logs");

    const date = new Date();
    const day = fixDate(date.getDate());
    const month = fixDate(date.getMonth());
    const year = fixDate(date.getFullYear());
    const hours = fixDate(date.getHours());
    const minutes = fixDate(date.getMinutes());
    const seconds = fixDate(date.getSeconds());
    const datetime = `D${day}_M${month}_Y${year}_H${hours}_M${minutes}_S${seconds}`;
    
    const filename = `api_request_${datetime}.json`;

    filesystem.writeFile(`api_request_logs/${filename}`,  `{\n    "link": "${link}",\n    "datetime": "${datetime}",\n    "data": ${JSON.stringify(json)}\n}`, { flag: "w" }, (err) => {
        if (err)
            return console.error(err);
    });
}

module.exports = {
    write,
    saveApiRequest
}