const fetch = require("node-fetch")
const { getCurrentDate, sleep } = require("../core/helper")
const cron = require('node-cron')
const Database = require("easy-json-database")
const { JSDOM } = require('jsdom');
const fs = require('fs');

var _bot

const db = new Database("./badminton.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

// const chat_db = new Database("./chatlist.json", {
//     snapshots: {
//         enabled: true,
//         interval: 24 * 60 * 60 * 1000,
//         folder: './backups/'
//     }
// })

function getResult(ctx) {
    const url = getCurrentTournamentLink();

    const options = {
        method: 'GET',
        headers: {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9,fr;q=0.8,en-GB;q=0.7,id;q=0.6',
            'cookie': 'cf_clearance=kM0VqySp0NEee9HzCCdFiJuJSg_lYCDK_CoRgo6yxFo-1714630809-1.0.1.1-LQbMMeBq9ajmJ8FVWNRccXt07xRMvIvVkP6qEynqbEOcrs57DYXhf0F_1tKYudzeBGSt40SUvtV6sECSsm_Odw; CookieConsent={stamp:%27vejD+j5aI23Za3L0v37g6Cyd7mJKxjCChlh35hqStRkj2W/iZ/MzJQ==%27%2Cnecessary:true%2Cpreferences:true%2Cstatistics:true%2Cmarketing:true%2Cmethod:%27explicit%27%2Cver:1%2Cutc:1714630819702%2Cregion:%27id%27}; _gid=GA1.2.964804785.1717084527; cf_clearance=F1Ry1s5d.ERc7eKvCNHPk1R4vKbOv1O.xGeKhIpkM2w-1717119722-1.0.1.1-vxn3t.T5NInrMUiCCy0lUXgZHkvxbZzXos8C1ieDPWLEXIDEuaARo1MkVlUB18mrucDKiKKklZqAAKr9Ke5j8w; _ga=GA1.2.1337385662.1714630820; _ga_HMB879WPYW=GS1.1.1717119717.4.1.1717119733.0.0.0',
            'priority': 'u=1, i',
            'referer': url,
            'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'x-requested-with': 'XMLHttpRequest'
        }
    };

    fetch(url, options)
        .then(response => response.text())
        .then(data => {
            // getIndonesiaPlayerOnly(ctx, parseMatchDetails(data)) 
            const jsonData = parseMatchDetails(data);
            const filteredData = jsonData.filter(match => {
                return match.team1.player1Flag?.includes('indonesia') || match.team2.player3Flag?.includes('indonesia');
            });

            if (filteredData.length > 0) {
                sendMessage(ctx, filteredData);
            }
        })
        .catch(error => console.error('Error:', error));
}

async function sendMessage(ctx, data) {
    data.forEach(match => {
        match.court = parseInt(match.court);
    });

    // Sort filteredData by match.court
    data.sort((a, b) => a.court - b.court);

    for (const match of data) {
        let message = '';
        message += `${match.location}\n`;
        message += `${match.round} Match\n\n`;
        message += `${match.team1.player1} ${match.team1.player2 ? ' & ' + match.team1.player2 : ''}\n`;
        message += 'vs\n';
        message += `${match.team2.player3} ${match.team2.player4 ? ' & ' + match.team2.player4 : ''}\n\n`;
        message += `${match.score}\n`;
        message += `Duration: ${match.duration}\n\n`;
        ctx.reply(message);

        await sleep(100);
    }
}

function parseMatchDetails(htmlContent) {
    // Create a DOM from the HTML string
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    const getTextContent = (selector, element) => {
        const foundElement = element.querySelector(selector);
        return foundElement ? foundElement.textContent.trim() : null;
    };

    const getAttribute = (selector, attribute, element) => {
        const foundElement = element.querySelector(selector);
        return foundElement ? foundElement.getAttribute(attribute) : null;
    };

    // Check if an object has all null properties
    const isAllNull = obj => {
        return Object.values(obj).every(value => {
            if (value && typeof value === 'object') {
                return isAllNull(value); // Recursively check nested objects
            }
            return value === null;
        });
    };

    const matchElements = document.querySelectorAll('.list-sort-time > li:not(.location-name)');
    const matchData = Array.from(matchElements).map(match => {
        const locationElement = match.previousElementSibling && match.previousElementSibling.classList.contains('location-name') ? match.previousElementSibling : null;
        const location = locationElement ? getTextContent('strong', locationElement) : null;

        const time = getTextContent('.time', match);
        const round = getTextContent('.round', match);
        const court = getTextContent('.round-court', match);
        const team1 = {
            player1: getTextContent('.player1', match),
            player1Flag: getAttribute('.player1-wrap .flag img', 'src', match),
            player2: getTextContent('.player2', match),
            player2Flag: getAttribute('.player2-wrap .flag img', 'src', match),
        };
        const team2 = {
            player3: getTextContent('.player3', match),
            player3Flag: getAttribute('.player3-wrap .flag img', 'src', match),
            player4: getTextContent('.player4', match),
            player4Flag: getAttribute('.player4-wrap .flag img', 'src', match),
        };
        const score = getTextContent('.score', match);
        const duration = getTextContent('.timer1', match);

        return {
            location,
            time,
            round,
            court,
            team1,
            team2,
            score,
            duration
        };
    });

    // Filter out objects with all null properties
    const cleanedData = matchData.filter(match => !isAllNull(match));

    let currentLocation = null;
    for (let i = 0; i < cleanedData.length; i++) {
        const match = cleanedData[i];
        if (match.location) {
            currentLocation = match.location;
        } else {
            if (currentLocation) {
                match.location = currentLocation;
            }
        }
    }

    // Remove location-only objects
    const finalData = cleanedData.filter(match => match.time);
    // Convert to JSON string
    return finalData
}

function getCurrentTournamentLink() {
    let tournaments = db.get('tournaments');
    let _tournaments = tournaments[0].tournamentList

    const currentDate = new Date();

    for (const tournament of _tournaments) {
        const startDate = new Date(tournament.startDate);
        const endDate = new Date(tournament.endDate);

        if (currentDate >= startDate && currentDate <= endDate) {
            return tournament.link + '/results/' + getCurrentDate();
        }
    }

    return null; // No tournament currently running
}

module.exports = {
    getResult
}