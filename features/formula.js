const cron = require('node-cron');
const Database = require("easy-json-database");
const { JSDOM } = require('jsdom');
const puppeteer = require('puppeteer');
const os = require('os');
const { chat_db } = require("../core/helper");

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
    checkF1Reminders();
    checkF1Qualifying();
    checkF1Race();
});

const hourInMilisecond = 3600000
const minuteInMilisecond = 60000
var _bot;

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

async function checkF1Qualifying() {
    const currentRace = getCurrentF1Race();

    // 1. If there's no race this weekend, do nothing
    if (!currentRace) return;

    // 2. Check if we already broadcasted the QUALIFYING for THIS race
    const lastAnnouncedQualyId = f1_result_db.get("last_announced_qualy_id");
    if (lastAnnouncedQualyId === currentRace.id) {
        // Udah pernah broadcast kualifikasi minggu ini, stop biar hemat CPU!
        return; 
    }

    console.log(`[F1 Bot] Checking QUALIFYING results for: ${currentRace.name}...`);
    
    try {
        const currentDate = new Date();
        
        // Panggil fungsi scraper Kualifikasi (yang path-nya /qualifying)
        const results = await getF1QualifyingResult(currentDate.getFullYear(), currentRace.id, currentRace.country);

        // 3. Kalau hasil kosong, berarti Kualifikasi belum beres
        if (!results || results.length === 0) {
            console.log("[F1 Bot] Qualifying results not available yet. Retrying in 15 mins.");
            return;
        }

        // 4. Kalau udah rilis, format pesannya pakai formatter khusus kualifikasi
        const message = formatF1QualifyingMessage(results, currentRace.country);

        // 5. Kasih tanda di DB kalau kualifikasi race ini udah di-broadcast!
        f1_result_db.set("last_announced_qualy_id", currentRace.id);

        // 6. Broadcast ke subscriber
        const listChat = chat_db.get("f1_list") || [];
        for (const chatId of listChat) {
            _bot.telegram.sendMessage(chatId, message);
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`[F1 Bot] Successfully broadcasted QUALIFYING results for ${currentRace.name}!`);

    } catch (error) {
        console.error("[F1 Bot] Error during automated qualifying check:", error);
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
        // Start looking 2 hours BEFORE the race starts (to catch early prep)
        // and keep looking until 12 hours AFTER the race ends.
        const startTime = new Date(race.raceTime).getTime() - (2 * hourInMilisecond);
        const endTime = new Date(race.raceTime).getTime() + (12 * hourInMilisecond);
        const now = currentDate.getTime();

        if (now >= startTime && now <= endTime) {
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
    let browser;
    try {
        browser = await puppeteer.launch({
            dumpio: true,
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
        return parseF1Results(data);
    } catch (error) {
        console.error('Error fetching F1 results:', error);
        return [];
    } finally {
        if (browser) await browser.close();
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
            driver: driverName.slice(0, -3),
            team: cells[3].textContent.trim()
        };
    });

    return results.filter(driver => driver !== null && driver.position);
}

/**
 * Format to Telegram string
 */
function formatF1TelegramMessage(results, country) {
    const capitalizedCountry = country.charAt(0).toUpperCase() + country.slice(1).replaceAll('-', ' ');

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

async function getF1QualifyingResult(year, meetingKey, country) {
    const url = `https://www.formula1.com/en/results/${year}/races/${meetingKey}/${country}/qualifying`;
    let browser;
    try {
        browser = await puppeteer.launch({
            dumpio: true,
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
        return parseF1Qualifying(data);
    } catch (error) {
        console.error('Error fetching F1 qualifying:', error);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

function parseF1Qualifying(htmlContent) {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    const tableRows = document.querySelectorAll('table tbody tr');
    
    if (!tableRows || tableRows.length === 0) return [];

    const results = Array.from(tableRows).map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return null; // Safety check

        const nameSpans = cells[2].querySelectorAll('span > span');
        let driverName = "Unknown";
        if (nameSpans.length >= 2) {
            driverName = `${nameSpans[0].textContent.trim()} ${nameSpans[1].textContent.trim()}`;
        } else {
            driverName = cells[2].textContent.trim(); 
        }

        return {
            position: cells[0].textContent.trim(),
            driver: driverName.slice(0, -3),
            team: cells[3].textContent.trim(),
            // Cek apakah cell-nya ada isinya (karena ada pembalap yg cuma sampai Q1)
            q1: cells[4] ? cells[4].textContent.trim() : "",
            q2: cells[5] ? cells[5].textContent.trim() : "",
            q3: cells[6] ? cells[6].textContent.trim() : ""
        };
    });

    return results.filter(driver => driver !== null && driver.position);
}

function formatF1QualifyingMessage(results, country) {
    const capitalizedCountry = country.charAt(0).toUpperCase() + country.slice(1).replaceAll('-', ' ');

    let message = `⏱️💨 Ngeeeng!! Hasil Kualifikasi F1 ${capitalizedCountry} GP udah keluar nih!! 🏁🔥\n`;
    message += `Siapa yang dapet Pole Position? 👇\n\n`;

    results.forEach(driver => {
        let posEmoji = "🏎️";
        let posText = `${driver.position}. `;

        if (driver.position === "1") {
            posEmoji = "🥇";
            posText = `1. (POLE)`;
        } else if (driver.position === "2") posEmoji = "🥈";
        else if (driver.position === "3") posEmoji = "🥉";
        else if (driver.position === "NC" || driver.position === "DQ" || driver.position === "RT") {
            posEmoji = "💥";
            posText = `${driver.position} `;
        }

        // Cari waktu terbaik (Kalau dia masuk Q3, ambil Q3. Kalau cuma Q2, ambil Q2, dst)
        let bestTime = driver.q3 || driver.q2 || driver.q1 || "No Time";

        message += `${posEmoji} ${posText} ${driver.driver} | ⏱️ ${bestTime}\n`;
    });

    message += `\n=========================\n`;
    message += `Makin gak sabar nunggu racenya besok! 🤯🔥🔥\n`;
    message += `Tungguin update balapannya ya! ヾ( ˃ᴗ˂ )◞ •`;

    return message;
}

async function sendLastF1Qualifying(ctx) {
    try {
        // 1. Cari tahu dulu balapan terakhir/terkini menurut kalender
        const lastRaceFromCalendar = getLastCompletedF1Race();

        if (!lastRaceFromCalendar) {
            return ctx.reply("Belum ada data balapan di tahun ini nih bos! 😭 Tunggu seri pertama ya!");
        }

        // 2. Cek DB: Apakah ID di DB SAMA dengan ID balapan minggu ini?
        // PERUBAHAN: Gunakan key "last_qualy_data" agar tidak bentrok dengan data Race utama
        const lastSavedQualy = f1_result_db.get("last_qualy_data");
        if (lastSavedQualy && lastSavedQualy.id === lastRaceFromCalendar.id && lastSavedQualy.message) {
            // Valid! Data up-to-date, tembak langsung! 🔫
            return ctx.reply(lastSavedQualy.message);
        }

        // 3. Kalau ID beda (kualifikasi baru) atau DB kosong, baru jalanin Scraper
        ctx.reply(`Bentar ya, lagi ngebut ke sirkuit ${lastRaceFromCalendar.name} dulu buat ngambil data kualifikasi terbaru... ⏱️💨`);

        const currentDate = new Date();
        
        // PERUBAHAN: Panggil fungsi scraper khusus Kualifikasi
        const results = await getF1QualifyingResult(currentDate.getFullYear(), lastRaceFromCalendar.id, lastRaceFromCalendar.country);

        if (!results || results.length === 0) {
            return ctx.reply(`Sabar ngab, sesi kualifikasi ${lastRaceFromCalendar.name} kayaknya belum beres atau hasilnya belum rilis di web resmi! ⏳🏁`);
        }

        // 4. Format pesan
        // PERUBAHAN: Pakai formatter khusus Kualifikasi
        const message = formatF1QualifyingMessage(results, lastRaceFromCalendar.country);

        // 5. Update DB dengan data kualifikasi yang BARU
        f1_result_db.set("last_qualy_data", {
            id: lastRaceFromCalendar.id,
            message: message
        });

        ctx.reply(message);

    } catch (error) {
        console.error("[F1 Bot] Error fetching last qualifying result:", error);
        ctx.reply("Aduh, botnya nabrak dinding sirkuit pas ngambil data kualifikasi 💥 Coba lagi nanti ya!");
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
        const raceTime = new Date(race.raceTime);
        // If the race time has passed, it's a candidate for "Last Race"
        if (currentDate > raceTime) {
            lastRace = race;
        } else {
            break; 
        }
    }
    return lastRace;
}

function checkF1Reminders() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    let tournaments = calendar_db.get('tournaments');
    let seasonData = tournaments.find(t => t.year === currentYear);
    
    if (!seasonData) return;

    const listChat = chat_db.get("f1_list") || [];
    if (listChat.length === 0) return;

    for (const race of seasonData.tournamentList) {
        if (!race.raceTime) continue; 

        const raceDate = new Date(race.raceTime);
        const qualiDate = new Date(race.qualyTime);

        const now = currentDate.getTime();
        const raceDiff = raceDate.getTime() - now;
        const qualyDiff = qualiDate.getTime() - now;

        if (qualyDiff <= hourInMilisecond && qualyDiff > (hourInMilisecond - 15 * minuteInMilisecond)) {
            sendF1Reminder("qualifying", race, listChat, qualiDate);
        }

        if (raceDiff <= hourInMilisecond && raceDiff > (hourInMilisecond - 15 * minuteInMilisecond)) {
            sendF1Reminder("race", race, listChat, raceDate);
        }
    }
}

async function sendF1Reminder(sessionName, race, listChat, sessionDate, timeDiff = "1 jam") {
    // 1. Ambil Nama Hari dalam Bahasa Indonesia & Timezone Jakarta
    const dayName = sessionDate.toLocaleDateString("id-ID", { 
        timeZone: "Asia/Jakarta", 
        weekday: "long" 
    });
    
    // 2. Ambil Jam dalam format HH:mm WIB
    const timeString = sessionDate.toLocaleString("id-ID", { 
        timeZone: "Asia/Jakarta", 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: false
    });

    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    const message = 
        `📢 Teet teet teet~ *PENGINGAT BALAPAN F1* 🏎️💨\n` +
        `*${timeDiff}* lagi sampe *${sessionName}* berikutnyaa!!\n\n` +
        `*${race.name}*\n` +
        `${race.circuit}\n` +
        `${capitalizedDay}, ${timeString} WIB\n\n` +
        `Siapin cemilan bos, jangan sampai kelewatan racenya! ✺◟(＾∇＾)◞✺`;

    for (const chatId of listChat) {
        try {
            await _bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            await new Promise(r => setTimeout(r, 500));
        } catch (e) {
            console.error(`Gagal kirim reminder ke ${chatId}:`, e.message);
        }
    }
}

async function nextRace(ctx) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    let tournaments = calendar_db.get('tournaments');
    let seasonData = tournaments.find(t => t.year === currentYear);
    
    if (!seasonData) return ctx.reply("Kalender balapan belum tersedia untuk tahun ini.");

    let nearestRace = null;
    let minDiff = Infinity;

    for (const race of seasonData.tournamentList) {
        // Lewati jika data raceTime belum ada
        if (!race.raceTime) continue;

        const raceDate = new Date(race.raceTime);
        const diff = raceDate.getTime() - currentDate.getTime();
        
        // Cari balapan yang akan datang (> 0) dengan selisih waktu terkecil
        if (diff > 0 && diff < minDiff) {
            minDiff = diff;
            nearestRace = { ...race, sessionTime: raceDate };
        }
    }

    if (nearestRace) {
        const remainingTimeText = formatDuration(minDiff); 
        // Langsung panggil reminder dengan label "Balapan Utama 🏁"
        sendF1Reminder("race", nearestRace, [ctx.chat.id], nearestRace.sessionTime, remainingTimeText);
    } else {
        ctx.reply("Musim balap tahun ini sudah selesai! Sampai jumpa di musim depan. 🏎️👋");
    }
}

/**
 * Helper sederhana untuk mengubah milidetik ke teks (Jam/Hari)
 */
function formatDuration(ms) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days} hari ${hours} jam`;
    if (hours > 0) return `${hours} jam ${minutes} menit`;
    return `${minutes} menit`;
}

function setupF1Bot(bot) {
    _bot = bot;
}

module.exports = {
    subscribeF1,
    setupF1Bot,
    sendLastF1Result,
    sendLastF1Qualifying,
    nextRace
};
