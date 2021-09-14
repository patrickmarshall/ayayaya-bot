const fetch = require("node-fetch")

async function getData(url = '') {
    const response = await fetch(url)
    return response.json()
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function addZero(i) {
    if (i < 10) {
      i = "0" + i;
    }
    return i;
}

module.exports = { getData, sleep, addZero }