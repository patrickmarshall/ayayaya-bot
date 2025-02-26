const fetch = require("node-fetch")
const { getCurrentDate, sleep, promptOpenAI } = require("../core/helper")
const cron = require('node-cron')
const Database = require("easy-json-database")
const { JSDOM } = require('jsdom');
const fs = require('fs');
const { get } = require("http");
const puppeteer = require('puppeteer');
const os = require('os');

var _bot

const executablePath = os.platform() === 'linux' 
    ? '/usr/bin/chromium-browser'  // Linux VPS path
    : puppeteer.executablePath();   // Use Puppeteer's default on Mac


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

cron.schedule('*/15 * * * *', () => {
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

    try {
        if (url === null) {
            return [];
        }

        const browser = await puppeteer.launch({
            executablePath, 
            args: ['--no-sandbox']
        });
        const page = await browser.newPage();

        // Set the headers to match your cURL request
        await page.setExtraHTTPHeaders({
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en-US,en;q=0.9,id;q=0.8',
            'cache-control': 'max-age=0',
            'cookie': 'matchCardsLayout=list; CookieConsent={stamp:%27BBm6nMwASe4ynFNjPBHYSULqZm1wPYbH2haALceLzFOHMfZkAAOW2A==%27%2Cnecessary:true%2Cpreferences:true%2Cstatistics:true%2Cmarketing:true%2Cmethod:%27explicit%27%2Cver:1%2Cutc:1728472141976%2Cregion:%27id%27}; cf_clearance=63oYWnmtwQs_hZzd.N1usDapfvW9F4dcx1rlpvg.4oQ-1740583567-1.2.1.1-AWutaSV8ws8hyZ1P9sK.zdAITEdpDonqfK_kfeWniN4.WEU2UnqmJgsDWeJjgPv8oEvJTvl0fFXDueyUWbfYiqognlAihA13DcjvJ9y8z_YqsFdl_RM_0Eko2uWKfWuMASbD5ky0NTrojzxAsdBLKRBsA9RH9MbTa6qj_HjUE_qFRHrPbNCYxWqcv3d742Vj0FA2eXHYt.xEi82kujfjS6W5BeUDtxPGFPi0qLV8NU32dTLAivQRRGZS0.Rn9Ksmb7nl1GTixCsjwyveQGInZHvmUuFIvQfnEkMCStrhf34',
            'dnt': '1',
            'priority': 'u=0, i',
            'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
        });        

        // Navigate to the URL
        await page.goto(url);
        await page.waitForSelector('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', { visible: true });
        await page.click('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
        // await page.waitForTimeout(3000); // Wait a few seconds for content to load
        const data = await page.content();

        // Close the browser
        await browser.close();

        // Parse the content and filter the results
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

async function fetchPage(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set the headers to match your cURL request
    await page.setExtraHTTPHeaders({
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-US,en;q=0.9,id;q=0.8',
        'cache-control': 'max-age=0',
        'cookie': 'cf_clearance=is9ewkfMjLlZE1CndaQKEtY0NPGr6yG0sgnLg9DVG_A-1728472091-1.2.1.1-muLxKNslq8Rnk2vLJjn.Hde3BsQLaYOgViLsQMfMpiAdwsEx6b86wRBvXfr4lQvVHAP3Qt0VbX3tH429wiWeOK_C6E8ATI8qoXwyegUNnxZtEZ5AV361098t40ECv.FClb5Oe7IFF411rSOYsFZZyNT0Nm.wn_EbAoN6NQUJhWnhCpSoLeKZqXZFATrHJMRrNoBkhO1SKAR4QtrFU3i6.IY0k1hNQ7yKNgF8ZcG1lxxPk3e6wx6ZC61Jam7HXgj67PyQzZn4EOF29j.McziGP0fJD853hmUDbQ0vpqvW_PohIQ.xTKqAXoI1RbWnBMdSRZ_y6D1z_PBjG9Gbimmw3t2Stw4rymAKLd915867vAxvGLvt3Xyn5gtX8kYahRZGcl_fsUGkuGG5mJjEj5rVvQ; CookieConsent={stamp:%27BBm6nMwASe4ynFNjPBHYSULqZm1wPYbH2haALceLzFOHMfZkAAOW2A==%27%2Cnecessary:true%2Cpreferences:true%2Cstatistics:true%2Cmarketing:true%2Cmethod:%27explicit%27%2Cver:1%2Cutc:1728472141976%2Cregion:%27id%27}',
        'dnt': '1',
        'priority': 'u=0, i',
        'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    });

    // Navigate to the URL
    const response = await page.goto(url);

    // Check if the response is successful
    if (response.ok()) {
        console.log('Page loaded successfully');
        const content = await page.content();
        await browser.close();
        return content; // Return the page content
    } else {
        console.log('Failed to load page:', response.status());
        await browser.close();
        throw new Error(`Failed to fetch page: ${response.status()}`);
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

function getCurrentTournamentLink() {
    const currentDate = new Date();
    let tournaments = db.get('tournaments');
    let array = currentDate.getFullYear() - 2024;
    let _tournaments = tournaments[array].tournamentList

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