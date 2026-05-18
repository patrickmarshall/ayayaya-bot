const fetch = require('node-fetch');
const cron = require('node-cron');
const Database = require('easy-json-database');
const { chat_db } = require('../core/helper');

const WC_API_URL = 'https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023';
const WC_API_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://www.fifa.com',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
};

const hourInMs = 3600000;
const minuteInMs = 60000;

const STAGE_MAP = {
    'First Stage': 'Group Stage',
    'Round of 32': 'Round of 32',
    'Round of 16': 'Round of 16',
    'Quarter-final': 'Quarter-final',
    'Semi-final': 'Semi-final',
    'Play-off for third place': '3rd Place Play-off',
    'Final': '🏆 Final'
};

// 48 WC 2026 teams sorted alphabetically, 6 per row
const TEAM_ROWS = [
    ['ALG', 'ARG', 'AUS', 'AUT', 'BEL', 'BIH'],
    ['BRA', 'CPV', 'CAN', 'CIV', 'COL', 'COD'],
    ['CRO', 'CUW', 'CZE', 'ECU', 'EGY', 'ENG'],
    ['FRA', 'GER', 'GHA', 'HAI', 'IRN', 'IRQ'],
    ['JOR', 'JPN', 'KOR', 'KSA', 'MAR', 'MEX'],
    ['NED', 'NZL', 'NOR', 'PAN', 'PAR', 'POR'],
    ['QAT', 'RSA', 'SCO', 'SEN', 'ESP', 'SUI'],
    ['SWE', 'TUN', 'TUR', 'URU', 'USA', 'UZB']
];

const wc_db = new Database('./wc_data.json', {
    snapshots: { enabled: true, interval: 24 * 60 * 60 * 1000, folder: './backups/' }
});

var _bot;

cron.schedule('*/15 * * * *', async () => {
    let matches;
    try {
        matches = await fetchWCMatches();
    } catch (e) {
        console.error('[WC] Failed to fetch matches:', e.message);
        return;
    }
    await checkWCReminders(matches);
    await checkWCResults(matches);
});

// --- Helpers ---

async function fetchWCMatches() {
    const res = await fetch(WC_API_URL, { headers: WC_API_HEADERS });
    if (!res.ok) throw new Error(`FIFA API returned ${res.status}`);
    const data = await res.json();
    return data.Results || [];
}

function getTeamName(team) {
    const names = team?.TeamName || [];
    return names[0]?.Description || team?.Abbreviation || 'TBD';
}

function getStageName(match) {
    const stage = (match.StageName || [])[0]?.Description || '';
    const group = (match.GroupName || [])[0]?.Description || '';
    const mapped = STAGE_MAP[stage] || stage;
    return group ? `${mapped} - ${group}` : mapped;
}

function getVenue(match) {
    return (match.Stadium?.Name || [])[0]?.Description || '';
}

function formatMatchTime(dateStr) {
    const date = new Date(dateStr);
    const day = date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' });
    const time = date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day.charAt(0).toUpperCase() + day.slice(1)}, ${time} WIB`;
}

function getSubscribersForMatch(homeAbbr, awayAbbr) {
    const subscribers = chat_db.get('wc_subscribers') || [];
    const chatIds = new Set();
    for (const sub of subscribers) {
        if (sub.all || sub.countries.includes(homeAbbr) || sub.countries.includes(awayAbbr)) {
            chatIds.add(sub.id);
        }
    }
    return chatIds;
}

// --- Keyboard ---

function buildCountryKeyboard(selectedCountries, isAll) {
    const keyboard = TEAM_ROWS.map(row =>
        row.map(abbr => ({
            text: (isAll || selectedCountries.includes(abbr)) ? `${abbr} ✅` : abbr,
            callback_data: `wc_t_${abbr}`
        }))
    );
    keyboard.push([{
        text: isAll ? '🌍 Semua Pertandingan ✅' : '🌍 Semua Pertandingan',
        callback_data: 'wc_t_ALL'
    }]);
    keyboard.push([{ text: '✅ Simpan', callback_data: 'wc_save' }]);
    return keyboard;
}

// --- Subscriber state ---

function getSubscriberState(chatId) {
    const subscribers = chat_db.get('wc_subscribers') || [];
    return subscribers.find(s => s.id === chatId) || { countries: [], all: false };
}

function toggleWCCountry(chatId, countryCode) {
    let subscribers = chat_db.get('wc_subscribers') || [];
    let sub = subscribers.find(s => s.id === chatId);
    if (!sub) {
        sub = { id: chatId, countries: [], all: false };
        subscribers.push(sub);
    }
    if (countryCode === 'ALL') {
        sub.all = !sub.all;
        if (sub.all) sub.countries = [];
    } else {
        sub.all = false;
        const idx = sub.countries.indexOf(countryCode);
        if (idx !== -1) sub.countries.splice(idx, 1);
        else sub.countries.push(countryCode);
    }
    chat_db.set('wc_subscribers', subscribers);
    return sub;
}

// --- Commands ---

function subscribeWC(ctx) {
    const sub = getSubscriberState(ctx.chat.id);
    ctx.reply('🌍 FIFA World Cup 2026\nPilih negara yang mau kamu ikutin:\n\nTap untuk pilih/batalin, tekan Simpan kalau udah selesai!', {
        reply_markup: { inline_keyboard: buildCountryKeyboard(sub.countries, sub.all) }
    });
}

async function handleWCToggle(ctx, countryCode) {
    const sub = toggleWCCountry(ctx.chat.id, countryCode);
    await ctx.editMessageReplyMarkup({
        inline_keyboard: buildCountryKeyboard(sub.countries, sub.all)
    });
}

async function handleWCSave(ctx) {
    const sub = getSubscriberState(ctx.chat.id);
    let msg;
    if (sub.all) {
        msg = '✅ Siap bos! Kamu bakal dapet update & reminder untuk *semua pertandingan* Piala Dunia 2026! ⚽🌍\nKetik /worldcup lagi buat ubah pilihan!';
    } else if (sub.countries.length === 0) {
        msg = 'Oke, kamu gak subscribe ke update Piala Dunia.\nKetik /worldcup lagi kalau mau daftar!';
    } else {
        msg = `✅ Siap bos! Kamu bakal dapet update & reminder untuk:\n*${sub.countries.join(', ')}* ⚽\nKetik /worldcup lagi buat ubah pilihan!`;
    }
    await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
}

async function wcNextMatch(ctx) {
    let matches;
    try {
        matches = await fetchWCMatches();
    } catch {
        return ctx.reply('Aduh, gagal ngambil data Piala Dunia nih 😭 Coba lagi nanti ya!');
    }

    const sub = getSubscriberState(ctx.chat.id);
    if (sub.countries.length === 0 && !sub.all) {
        return ctx.reply('Kamu belum subscribe ke tim manapun! Ketik /worldcup dulu ya bos.');
    }

    const now = new Date();
    const upcoming = matches.filter(m => m.MatchStatus === 1 && new Date(m.Date) > now);
    const countries = sub.all ? TEAM_ROWS.flat() : sub.countries;

    const seenIds = new Set();
    const nextMatches = [];

    for (const abbr of countries) {
        const next = upcoming.find(m =>
            m.Home?.Abbreviation === abbr || m.Away?.Abbreviation === abbr
        );
        if (next && !seenIds.has(next.IdMatch)) {
            seenIds.add(next.IdMatch);
            nextMatches.push(next);
        }
    }

    if (nextMatches.length === 0) {
        return ctx.reply('Gak ada pertandingan mendatang untuk tim yang kamu ikutin 😭');
    }

    nextMatches.sort((a, b) => new Date(a.Date) - new Date(b.Date));

    let message = '📅 *Pertandingan Selanjutnya - Piala Dunia 2026*\n\n';
    for (const m of nextMatches) {
        const home = getTeamName(m.Home);
        const away = getTeamName(m.Away);
        const stage = getStageName(m);
        const time = formatMatchTime(m.Date);
        const venue = getVenue(m);
        message += `*${stage}*\n${home} vs ${away}\n🏟️ ${venue}\n🕐 ${time}\n\n`;
    }

    ctx.reply(message, { parse_mode: 'Markdown' });
}

// --- Cron: Reminders ---

async function checkWCReminders(matches) {
    const now = new Date();
    const sentReminders = wc_db.get('sent_reminders') || [];
    let changed = false;

    for (const match of matches) {
        if (match.MatchStatus !== 1) continue;

        const diff = new Date(match.Date).getTime() - now.getTime();
        if (!(diff <= hourInMs && diff > hourInMs - 15 * minuteInMs)) continue;
        if (sentReminders.includes(match.IdMatch)) continue;

        const homeAbbr = match.Home?.Abbreviation || '';
        const awayAbbr = match.Away?.Abbreviation || '';
        const chatIds = getSubscribersForMatch(homeAbbr, awayAbbr);
        if (chatIds.size === 0) continue;

        const home = getTeamName(match.Home);
        const away = getTeamName(match.Away);
        const stage = getStageName(match);
        const time = formatMatchTime(match.Date);
        const venue = getVenue(match);

        const message =
            `📢 Teet teet teet~ *PENGINGAT PIALA DUNIA* ⚽🌍\n` +
            `*1 jam* lagi kickoff!!\n\n` +
            `*${stage}*\n` +
            `*${home}* vs *${away}*\n` +
            `🏟️ ${venue}\n` +
            `🕐 ${time}\n\n` +
            `Yuk siapin cemilan! ✺◟(＾∇＾)◞✺`;

        for (const chatId of chatIds) {
            try {
                await _bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.error(`[WC] Reminder failed for ${chatId}:`, e.message);
            }
        }

        sentReminders.push(match.IdMatch);
        changed = true;
        console.log(`[WC] Reminder sent: ${home} vs ${away}`);
    }

    if (changed) wc_db.set('sent_reminders', sentReminders);
}

// Fetch full match detail — used for goal scorers once tournament starts.
// API: GET https://api.fifa.com/api/v3/calendar/{matchId}?language=en
// TODO: parse GoalDetailEntityList from Home/Away once we confirm the field name from a real finished match.
async function fetchMatchDetail(matchId) {
    const res = await fetch(`https://api.fifa.com/api/v3/calendar/${matchId}?language=en`, { headers: WC_API_HEADERS });
    if (!res.ok) throw new Error(`Match detail API returned ${res.status}`);
    return res.json();
}

// --- Cron: Results ---

async function checkWCResults(matches) {
    const sentResults = wc_db.get('sent_results') || {};
    let changed = false;

    for (const match of matches) {
        // MatchStatus 0 = finished
        if (match.MatchStatus !== 0) continue;
        if (match.HomeTeamScore === null || match.AwayTeamScore === null) continue;
        if (sentResults[match.IdMatch]) continue;

        // Fetch full detail for future goal scorer support — not used yet.
        // TODO: replace matchDetail stub with real goal scorer formatting once confirmed.
        try {
            const matchDetail = await fetchMatchDetail(match.IdMatch);
            console.log(`[WC] Match detail fetched for ${match.IdMatch} (goal scorers pending implementation)`);
            // matchDetail will contain GoalDetailEntityList inside Home/Away once available
            void matchDetail;
        } catch (e) {
            console.error(`[WC] Could not fetch match detail for ${match.IdMatch}:`, e.message);
        }

        const homeAbbr = match.Home?.Abbreviation || '';
        const awayAbbr = match.Away?.Abbreviation || '';
        const chatIds = getSubscribersForMatch(homeAbbr, awayAbbr);

        // Always mark as sent even if no subscribers, so we don't reprocess
        sentResults[match.IdMatch] = { homeScore: match.HomeTeamScore, awayScore: match.AwayTeamScore };
        changed = true;

        if (chatIds.size === 0) continue;

        const home = getTeamName(match.Home);
        const away = getTeamName(match.Away);
        const stage = getStageName(match);
        const venue = getVenue(match);

        let message = `⚽ *HASIL PIALA DUNIA 2026* 🌍\n\n`;
        message += `*${stage}*\n`;
        message += `*${home}* 🆚 *${away}*\n`;
        message += `Skor: *${match.HomeTeamScore} - ${match.AwayTeamScore}*\n`;
        if (venue) message += `🏟️ ${venue}\n`;

        if (match.HomeTeamPenaltyScore || match.AwayTeamPenaltyScore) {
            message += `\n⚽ Adu Penalti: ${match.HomeTeamPenaltyScore} - ${match.AwayTeamPenaltyScore}\n`;
        }

        message += `\n=========================\n`;
        message += `Gimana pertandingannya? Seru kan?! 🔥`;

        for (const chatId of chatIds) {
            try {
                await _bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.error(`[WC] Result failed for ${chatId}:`, e.message);
            }
        }

        console.log(`[WC] Result sent: ${home} vs ${away} (${match.HomeTeamScore}-${match.AwayTeamScore})`);
    }

    if (changed) wc_db.set('sent_results', sentResults);
}

function setupWCBot(bot) {
    _bot = bot;
}

module.exports = {
    subscribeWC,
    wcNextMatch,
    handleWCToggle,
    handleWCSave,
    setupWCBot
};
