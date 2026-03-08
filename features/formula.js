const cron = require('node-cron');
const Database = require("easy-json-database");
const { JSDOM } = require('jsdom');
const puppeteer = require('puppeteer');
const os = require('os');
const { chat_db } = require("../core/helper");

const executablePath = os.platform() === 'linux' 
    ? '/usr/bin/chromium-browser'  // Linux VPS path
    : puppeteer.executablePath();   // Use Puppeteer's default on Mac

// F1 Calendar Database (The JSON you provided)
const calendar_db = new Database("./f1_calendar.json");

// Database to store the last race we successfully broadcasted
const f1_result_db = new Database("./f1_result.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
});

// Run every 15 minutes
cron.schedule('*/15 * * * *', () => {
    checkF1Race();
});

/**
 * Core automation logic
 */
async function checkF1Race() {
    const currentRace = getCurrentF1Race();

    // 1. If there's no race this weekend, do nothing
    if (!currentRace) return;

    // 2. Check if we already broadcasted the results for THIS race
    const lastSavedRace = f1_result_db.get("last_race_data");
    if (lastSavedRace && lastSavedRace.id === currentRace.id) {
        // Already sent to users, skip scraping to save server CPU!
        return; 
    }

    console.log(`[F1 Bot] Checking results for: ${currentRace.name}...`);
    
    try {
        const currentDate = new Date();
        const results = await getF1RaceResult(currentDate.getFullYear(), currentRace.id, currentRace.country);

        // 3. If results array is empty, the race hasn't finished yet (table doesn't exist)
        if (!results || results.length === 0) {
            console.log("[F1 Bot] Race results not available yet. Retrying in 15 mins.");
            return;
        }

        // 1. Format the message now
        const message = formatF1TelegramMessage(results, currentRace.country);

        f1_result_db.set("last_race_data", {
            id: currentRace.id,
            message: message 
        });

        // 3. Broadcast ke subscriber
        const listChat = chat_db.get("f1_list") || [];
        for (const chatId of listChat) {
            _bot.telegram.sendMessage(chatId, message);
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`[F1 Bot] Successfully broadcasted results for ${currentRace.name}!`);

    } catch (error) {
        console.error("[F1 Bot] Error during automated check:", error);
    }
}

/**
 * Handle user subscription (Toggle logic)
 */
function subscribeF1(ctx) {
    var array = chat_db.get("f1_list") || [];

    if (!array.includes(ctx.chat.id)) {
        array.push(ctx.chat.id);
        chat_db.set("f1_list", array);
        ctx.reply("Siap Bos! Nanti kuingetin hasil balapan F1 pas udah beres! 🏎️💨 Ngeeeng!");
    } else {
        const index = array.indexOf(ctx.chat.id);
        array.splice(index, 1);
        chat_db.set("f1_list", array);
        ctx.reply("Yah, penonton kecewa. Oke deh, ga dikabarin lagi F1-nya 😔🏁");
    }
}

/**
 * Finds if there is a race happening this weekend
 */
function getCurrentF1Race() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    let tournaments = calendar_db.get('tournaments');
    let seasonData = tournaments.find(t => t.year === currentYear);
    
    if (!seasonData) return null;

    for (const race of seasonData.tournamentList) {
        const startDate = new Date(race.startDate);
        let endDate = new Date(race.endDate);
        
        // Add 1 day to the endDate. F1 races are on Sunday, 
        // this ensures we can fetch results on Monday morning WIB!
        endDate.setDate(endDate.getDate() + 1);

        if (currentDate >= startDate && currentDate <= endDate) {
            return race;
        }
    }
    return null;
}

/**
 * Puppeteer Scraper
 */
async function getF1RaceResult(year, meetingKey, country) {
    const url = `https://www.formula1.com/en/results/${year}/races/${meetingKey}/${country}/race-result`;

    try {
        const browser = await puppeteer.launch({
            executablePath, 
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setExtraHTTPHeaders({
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': 'en-US,en;q=0.9',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
        });
        
        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.waitForSelector('table tbody tr', { timeout: 5000 }).catch(() => {});

        const data = await page.content();
        await browser.close();

        return parseF1Results(data);
    } catch (error) {
        console.error('Error fetching F1 results:', error);
        return [];
    }
}

/**
 * Parse HTML to JSON
 */
function parseF1Results(htmlContent) {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    const tableRows = document.querySelectorAll('table tbody tr');
    
    if (!tableRows || tableRows.length === 0) return [];

    const results = Array.from(tableRows).map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return null;

        const nameSpans = cells[2].querySelectorAll('span > span');
        let driverName = "Unknown";
        if (nameSpans.length >= 2) {
            driverName = `${nameSpans[0].textContent.trim()} ${nameSpans[1].textContent.trim()}`;
        } else {
            driverName = cells[2].textContent.trim(); 
        }

        return {
            position: cells[0].textContent.trim(),
            driver: driverName,
            team: cells[3].textContent.trim()
        };
    });

    return results.filter(driver => driver !== null && driver.position);
}

/**
 * Format to Telegram string
 */
function formatF1TelegramMessage(results, country) {
    const capitalizedCountry = country.charAt(0).toUpperCase() + country.slice(1).replace('-', ' ');

    let message = `🏎️💨 Ngeeeng!! Hasil Balapan F1 ${capitalizedCountry} GP udah keluar nih!! 🏁🏆\n`;
    message += `Yuk cek siapa aja yang naik podium! 👇\n\n`;

    results.forEach(driver => {
        let posEmoji = "🏎️";
        if (driver.position === "1") posEmoji = "🥇";
        else if (driver.position === "2") posEmoji = "🥈";
        else if (driver.position === "3") posEmoji = "🥉";
        else if (driver.position === "NC" || driver.position === "DQ") posEmoji = "💥"; 

        let posText = (driver.position === "NC" || driver.position === "DQ") ? `DNF ` : `${driver.position}. `;
        message += `${posEmoji} ${posText} ${driver.driver} | ${driver.team}\n`;
    });

    message += `\n=========================\n`;
    message += `Gimana hasil jagoan kamu? Seru banget kannn?! 🤯🔥🔥\n`;
    message += `Tungguin update balapan selanjutnya ya! ヾ( ˃ᴗ˂ )◞ •`;

    return message;
}

async function sendLastF1Result(ctx) {
    try {
        // 1. Cari tahu dulu balapan terakhir/terkini menurut kalender
        const lastRaceFromCalendar = getLastCompletedF1Race();

        if (!lastRaceFromCalendar) {
            return ctx.reply("Belum ada data balapan di tahun ini nih bos! 😭 Tunggu seri pertama ya!");
        }

        // 2. Cek DB: Apakah ID di DB SAMA dengan ID balapan minggu ini?
        const lastSavedRace = f1_result_db.get("last_race_data");
        if (lastSavedRace && lastSavedRace.id === lastRaceFromCalendar.id && lastSavedRace.message) {
            // Valid! Data up-to-date, tembak langsung! 🔫
            return ctx.reply(lastSavedRace.message);
        }

        // 3. Kalau ID beda (balapan baru) atau DB kosong, baru jalanin Scraper
        ctx.reply(`Bentar ya, lagi ngebut ke sirkuit ${lastRaceFromCalendar.name} dulu buat ngambil data terbaru... 🏎️💨`);

        const currentDate = new Date();
        const results = await getF1RaceResult(currentDate.getFullYear(), lastRaceFromCalendar.id, lastRaceFromCalendar.country);

        if (!results || results.length === 0) {
            return ctx.reply(`Sabar ngab, balapan ${lastRaceFromCalendar.name} kayaknya belum beres atau hasilnya belum rilis di web resmi! ⏳🏁`);
        }

        // 4. Format pesan
        const message = formatF1TelegramMessage(results, lastRaceFromCalendar.country);

        // 5. Update DB dengan data balapan yang BARU
        f1_result_db.set("last_race_data", {
            id: lastRaceFromCalendar.id,
            message: message
        });

        ctx.reply(message);

    } catch (error) {
        console.error("[F1 Bot] Error fetching last result:", error);
        ctx.reply("Aduh, botnya nabrak dinding sirkuit pas ngambil data 💥 Coba lagi nanti ya!");
    }
}

function getLastCompletedF1Race() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    let tournaments = calendar_db.get('tournaments');
    let seasonData = tournaments.find(t => t.year === currentYear);
    
    if (!seasonData) return null;

    let lastRace = null;
    
    for (const race of seasonData.tournamentList) {
        const startDate = new Date(race.startDate);
        
        if (currentDate >= startDate) {
            lastRace = race;
        } else {
            break; 
        }
    }
    
    return lastRace;
}

function setupF1Bot(bot) {
    _bot = bot;
}

module.exports = {
    checkF1Race,
    subscribeF1,
    setupF1Bot,
    sendLastF1Result
};