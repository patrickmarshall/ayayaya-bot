const { getCurrentDate, sleep, promptOpenAI, chat_db } = require("../core/helper")
const cron = require('node-cron')
const Database = require("easy-json-database")
const { JSDOM } = require('jsdom')
const puppeteer = require('puppeteer')
const os = require('os')

var _bot

const executablePath = os.platform() === 'linux'
    ? '/usr/bin/chromium-browser'
    : puppeteer.executablePath()

const db = new Database("./badminton.json", {
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

cron.schedule('*/15 * * * *', () => {
    checkMatch()
})

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

async function fetchBWFPage(url) {
    let browser
    try {
        browser = await puppeteer.launch({
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
        const page = await browser.newPage()
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36')

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

        const cookieBtn = await page.$('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll')
        if (cookieBtn) {
            await cookieBtn.click()
            await sleep(1000)
        }

        const content = await page.content()
        return content
    } finally {
        if (browser) await browser.close()
    }
}

async function getResult(indonesiaOnly = true) {
    const url = getCurrentTournamentLink()
    if (!url) return []

    try {
        console.log(`[badminton] Fetching results from: ${url}`)
        const data = await fetchBWFPage(url)
        const jsonData = parseMatchDetails(data)

        if (indonesiaOnly) {
            return jsonData.filter(match => {
                return match.team1.player1Flag?.includes('indonesia') || match.team2.player3Flag?.includes('indonesia')
            })
        }
        return jsonData
    } catch (error) {
        console.error('[badminton] Error fetching results:', error.message)
        return []
    }
}

function checkMatch() {
    getResult().then(result => {
        if (result.length > 0) {
            result.forEach(async match => {
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
        } else {
            console.log("No match found");
        }
    });
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
        var prompt = await promptOpenAI(`berikan komentar singkatmu dengan bahasa ringan anak muda tentang jalannya pertandingan pertandingan ini, tentang lawannya misalnya riwayat pertemuan (bisa yang lain juga) ${message}`)
        message += `\n\n${prompt}`

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

function findCurrentTournament() {
    const currentDate = new Date()
    const tournaments = db.get('tournaments')
    const yearEntry = tournaments.find(t => t.year === currentDate.getFullYear())
    if (!yearEntry) return null

    for (const tournament of yearEntry.tournamentList) {
        const startDate = new Date(tournament.startDate)
        const endDate = new Date(tournament.endDate)
        endDate.setHours(23, 59, 59)

        if (currentDate >= startDate && currentDate <= endDate) {
            return tournament
        }
    }
    return null
}

function getCurrentTournamentLink() {
    const tournament = findCurrentTournament()
    if (!tournament) return null
    return tournament.link + '/results/' + getCurrentDate()
}

function getCurrentTournamentName() {
    const tournament = findCurrentTournament()
    return tournament ? tournament.name : null
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