const fetch = require("node-fetch")
const cron = require('node-cron')
const Database = require("easy-json-database")
const { JSDOM } = require('jsdom');
const fs = require('fs');

var _bot

// const result_db = new Database("./badminton.json", {
//     snapshots: {
//         enabled: true,
//         interval: 24 * 60 * 60 * 1000,
//         folder: './backups/'
//     }
// })

// const chat_db = new Database("./chatlist.json", {
//     snapshots: {
//         enabled: true,
//         interval: 24 * 60 * 60 * 1000,
//         folder: './backups/'
//     }
// })

function getResult(ctx) {
    const url = 'https://bwfworldtour.bwfbadminton.com/tournament/4747/kff-singapore-badminton-open-2024/results/2024-05-28';

    const options = {
        method: 'GET',
        headers: {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9,fr;q=0.8,en-GB;q=0.7,id;q=0.6',
            'cookie': 'cf_clearance=kM0VqySp0NEee9HzCCdFiJuJSg_lYCDK_CoRgo6yxFo-1714630809-1.0.1.1-LQbMMeBq9ajmJ8FVWNRccXt07xRMvIvVkP6qEynqbEOcrs57DYXhf0F_1tKYudzeBGSt40SUvtV6sECSsm_Odw; CookieConsent={stamp:%27vejD+j5aI23Za3L0v37g6Cyd7mJKxjCChlh35hqStRkj2W/iZ/MzJQ==%27%2Cnecessary:true%2Cpreferences:true%2Cstatistics:true%2Cmarketing:true%2Cmethod:%27explicit%27%2Cver:1%2Cutc:1714630819702%2Cregion:%27id%27}; _gid=GA1.2.964804785.1717084527; cf_clearance=F1Ry1s5d.ERc7eKvCNHPk1R4vKbOv1O.xGeKhIpkM2w-1717119722-1.0.1.1-vxn3t.T5NInrMUiCCy0lUXgZHkvxbZzXos8C1ieDPWLEXIDEuaARo1MkVlUB18mrucDKiKKklZqAAKr9Ke5j8w; _ga=GA1.2.1337385662.1714630820; _ga_HMB879WPYW=GS1.1.1717119717.4.1.1717119733.0.0.0',
            'priority': 'u=1, i',
            'referer': 'https://bwfworldtour.bwfbadminton.com/tournament/4747/kff-singapore-badminton-open-2024/results/2024-05-31',
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
        .then(data => parseMatchDetails(data))
        .catch(error => console.error('Error:', error));
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
    const jsonString = JSON.stringify(finalData, null, 2);

    // Write JSON string to file
    fs.writeFileSync('output28.json', jsonString);
    console.log('Data has been written to output.json');
}
