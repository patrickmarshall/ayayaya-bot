const fetch = require("node-fetch")
const { getCurrentDate, sleep } = require("../core/helper")
const cron = require('node-cron')
const Database = require("easy-json-database")
const { JSDOM } = require('jsdom');
const fs = require('fs');
const { get } = require("http");

var _bot

const db = new Database("./badminton.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

const chat_db = new Database("./chatlist.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

const result_db = new Database("./result.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

cron.schedule('*/5 * * * *', () => {
    checkMatch()
});

function subscribeBadminton(ctx) {
    const newSubscriber = ctx.chat.id
    const subscribers = chat_db.get('badminton');
    const subscriberIndex = subscribers.findIndex(subscriber => subscriber === ctx.chat.id);
    if (subscriberIndex !== -1) {
        // Subscriber exists in the database
        subscribers.splice(subscriberIndex, 1);
        // Save the updated array back to the database
        chat_db.set('badminton', subscribers);
        ctx.reply("Oke gak kuingetin lagi hasil pemain Indonesia! 😠\nDasar ga cinta Indonesia.");
    } else {
        // Check if subscribers array exists and is an array
        if (subscribers && Array.isArray(subscribers)) {
            subscribers.push(newSubscriber);
            chat_db.set('badminton', subscribers);
        } else {
            // if subcribers not exist 
            chat_db.set('badminton', [newSubscriber]);
        }
        // Subscriber does not exist in the database
        ctx.reply("Yeeey!\n" +
            "Oke! Aku bakal kirimkan hasil pemain Bulutangkis Indonesia! \n" +
            "🇮🇩🇮🇩🇮🇩 INDONESIA JUARAAAA! 🇮🇩🇮🇩🇮🇩\n" +
            "IN - DO - NE - SIA! (prok prok prok prok prok) ✺◟(＾∇＾)◞✺\n" +
            "IN - DO - NE - SIA! (prok prok prok prok prok) ヾ( ˃ᴗ˂ )◞ •\n" +
            "IN - DO - NE - SIA! (prok prok prok prok prok) ᕙ( •̀ ᗜ •́ )ᕗ\n"
        );
    }
}

async function getResult(indonesiaOnly = true) {
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

    try {
        const response = await fetch(url, options);
        const data = await response.text();
        const jsonData = parseMatchDetails(data);

        const filteredData = jsonData.filter(match => {
            return match.team1.player1Flag?.includes('indonesia') || match.team2.player3Flag?.includes('indonesia');
        });

        if (indonesiaOnly) {
            return filteredData.length > 0 ? filteredData : [];
        } else {
            return jsonData;
        }
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

function checkMatch() {
    getResult().then(result => {
        if (result.length > 0) {
            result.forEach(match => {
                if (match.duration.includes('LIVEWATCH')) {
                    var listOngoingMatch = result_db.get("ongoing")
                    var isMatchInDB = false;
                    for (const ongoingMatch of listOngoingMatch) {
                        if (match.team1.player1 === ongoingMatch.team1.player1 || match.team1.player1 === ongoingMatch.team2.player3) {
                            isMatchInDB = true;
                        }
                    }
                    if (!isMatchInDB) {
                        listOngoingMatch.push(match);
                        result_db.set("ongoing", listOngoingMatch);
                        const subscribers = chat_db.get('badminton');
                        for (const chatId of subscribers) {
                            let message = '';
                            message += `📢 Teet teet teet~ Ada pemain Indonesia lagi tanding nih!!\n`;
                            message += `Yuk kita semangatin yukk!!\n`;
                            message += `✺◟(＾∇＾)◞✺  ヾ( ˃ᴗ˂ )◞  ᕙ( •̀ ᗜ •́ )ᕗ\n\n`;
                            message += `${getCurrentTournamentName()}\n`;
                            message += `${match.location}\n`;
                            message += `${match.round} Match\n\n`;
                            if (match.team1.player1Flag.includes('indonesia')) {
                                message += '🇮🇩 ';
                            }
                            message += `${match.team1.player1} ${match.team1.player2 ? '& ' + match.team1.player2 : ''}`;
                            if (match.team1.player1Flag.includes('indonesia')) {
                                message += ' 🇮🇩\n';
                            } else {
                                message += '\n';
                            }
                            message += 'vs\n';
                            if (match.team2.player3Flag.includes('indonesia')) {
                                message += '🇮🇩 ';
                            }
                            message += `${match.team2.player3} ${match.team2.player4 ? '& ' + match.team2.player4 : ''}`;
                            if (match.team2.player3Flag.includes('indonesia')) {
                                message += ' 🇮🇩\n\n';
                            } else {
                                message += '\n\n';
                            }

                            _bot.telegram.sendMessage(chatId, message);
                        }
                    }
                } else if (!match.duration.includes('0:00')) {
                    var listOngoingMatch = result_db.get("ongoing")
                    var isMatchInDB = false;
                    for (const ongoingMatch of listOngoingMatch) {

                        if (match.team1.player1 === ongoingMatch.team1.player1 || match.team1.player1 === ongoingMatch.team2.player3) {
                            isMatchInDB = true;
                        }
                    }
                    if (isMatchInDB) {
                        const matchIndex = listOngoingMatch.findIndex(ongoingMatch => ongoingMatch.team1.player1 === match.team1.player1 || ongoingMatch.team1.player1 === match.team2.player3);
                        if (matchIndex !== -1) {
                            listOngoingMatch.splice(matchIndex, 1);
                            result_db.set("ongoing", listOngoingMatch);
                        }
                        const subscribers = chat_db.get('badminton');
                        for (const chatId of subscribers) {
                            let message = '';
                            if (match.team1.player1Flag.includes('indonesia')) {
                                message += '🇮🇩 Horeeee! Pemain Indonesia menanggg! 🇮🇩\n';
                                message += `✺◟(＾∇＾)◞✺  ヾ( ˃ᴗ˂ )◞  ᕙ( •̀ ᗜ •́ )ᕗ\n\n`;
                            } else {
                                message += '😭 Yahhh! Pemain Indonesia kalah huhuhu 😭\n\n';
                            }

                            message += `${getCurrentTournamentName()}\n`;
                            message += `${match.location}\n`;
                            message += `${match.round} Match\n\n`;
                            if (match.team1.player1Flag.includes('indonesia')) {
                                message += '🇮🇩 ';
                            }
                            message += `${match.team1.player1} ${match.team1.player2 ? '& ' + match.team1.player2 : ''}`;
                            if (match.team1.player1Flag.includes('indonesia')) {
                                message += ' 🇮🇩\n';
                            } else {
                                message += '\n';
                            }
                            message += 'vs\n';
                            if (match.team2.player3Flag.includes('indonesia')) {
                                message += '🇮🇩 ';
                            }
                            message += `${match.team2.player3} ${match.team2.player4 ? '& ' + match.team2.player4 : ''}`;
                            if (match.team2.player3Flag.includes('indonesia')) {
                                message += ' 🇮🇩\n\n';
                            } else {
                                message += '\n\n';
                            }
                            message += `${match.score}\n`;
                            message += `Duration: ${match.duration}`;

                            _bot.telegram.sendMessage(chatId, message);
                        }
                    }
                }
            });
        }
    });
    // check if in ongoing
    // if any, delete from ongoing 
    // should delete from ongoing 
    // and send message
}

async function hasilIndonesia(ctx) {
    const result = await getResult();
    const filteredData = result.filter(match => {
        return (!match.duration.includes('LIVEWATCH') && !match.duration.includes('0:00'));
    });
    sendMessage(ctx, filteredData);
}

async function hasilSemua(ctx) {
    const result = await getResult(indonesiaOnly = false);
    const filteredData = result.filter(match => {
        return (!match.duration.includes('LIVEWATCH') && !match.duration.includes('0:00'));
    });
    sendMessage(ctx, filteredData);
}

async function sendMessage(ctx, data) {
    data.forEach(match => {
        match.court = parseInt(match.court);
    });

    // Sort filteredData by match.court
    data.sort((a, b) => a.court - b.court);

    for (const match of data) {
        let message = '';

        if (match.team1.player1Flag.includes('indonesia') || match.team2.player3Flag.includes('indonesia')) {
            if (match.team1.player1Flag.includes('indonesia')) {
                message += '🇮🇩 Horeeee! Pemain Indonesia menanggg! 🇮🇩\n';
                message += `✺◟(＾∇＾)◞✺  ヾ( ˃ᴗ˂ )◞  ᕙ( •̀ ᗜ •́ )ᕗ\n\n`;
            } else {
                message += '😭 Yahhh! Pemain Indonesia kalah huhuhu 😭\n\n';
            }
        }

        message += `${getCurrentTournamentName()}\n`;
        message += `${match.location}\n`;
        message += `${match.round} Match\n\n`;
        if (match.team1.player1Flag.includes('indonesia')) {
            message += '🇮🇩 ';
        }
        message += `${match.team1.player1} ${match.team1.player2 ? '& ' + match.team1.player2 : ''}`;
        if (match.team1.player1Flag.includes('indonesia')) {
            message += ' 🇮🇩\n';
        } else {
            message += '\n';
        }
        message += 'vs\n';
        if (match.team2.player3Flag.includes('indonesia')) {
            message += '🇮🇩 ';
        }
        message += `${match.team2.player3} ${match.team2.player4 ? '& ' + match.team2.player4 : ''}`;
        if (match.team2.player3Flag.includes('indonesia')) {
            message += ' 🇮🇩\n\n';
        } else {
            message += '\n\n';
        }
        if (match.score) {
            message += `${match.score}\n`;
        }
        message += `Duration: ${match.duration}`;
        ctx.reply(message);

        await sleep(1000);
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

function getCurrentTournamentName() {
    let tournaments = db.get('tournaments');
    let _tournaments = tournaments[0].tournamentList

    const currentDate = new Date();

    for (const tournament of _tournaments) {
        const startDate = new Date(tournament.startDate);
        const endDate = new Date(tournament.endDate);

        if (currentDate >= startDate && currentDate <= endDate) {
            return tournament.name
        }
    }

    return null; // No tournament currently running
}

function setupBadmintonBot(bot) {
    _bot = bot
}

module.exports = {
    hasilIndonesia,
    hasilSemua,
    setupBadmintonBot,
    subscribeBadminton
}