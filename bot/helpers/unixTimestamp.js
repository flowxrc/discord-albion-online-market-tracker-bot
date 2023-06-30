module.exports = (timestamp) => {
    return Math.floor(new Date(timestamp).getTime() / 1000);
}