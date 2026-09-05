const cron = require('node-cron')
const Database = require("easy-json-database")

const { msToTime, chat_db } = require("../core/helper")
const { getFixtures } = require("../core/mu-matches")

var copy_bot

var listChat = []
var listFixtures
const hourInMilisecond = 3600000
const minuteInMilisecond = 60000

cron.schedule('*/15 * * * *', () => {
    checkDifferences()
})

cron.schedule('0 */6 * * *', () => {
    refreshFixtures()
})

const fixtures_db = new Database("./fixtures.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

async function refreshFixtures() {
    try {
        const fixtures = await getFixtures()
        if (fixtures.length > 0) {
            fixtures_db.set("list", fixtures)
            console.log(`[reminder] Fixtures updated: ${fixtures.length} matches`)
        }
    } catch (error) {
        console.log("[reminder] Failed to refresh fixtures:", error.message)
    }
}

function nextMatch(fixtures) {
    const now = new Date().getTime()

    return fixtures
        .filter(fixture => fixture.matchStatus !== "Postponed" && fixture.matchStatus !== "Cancelled")
        .filter(fixture => new Date(fixture.matchdate_tdt).getTime() > now)
        .sort((a, b) => new Date(a.matchdate_tdt) - new Date(b.matchdate_tdt))[0]
}

function checkDifferences(ctx = null, demand = false) {
    listFixtures = fixtures_db.get("list")
    listChat = chat_db.get("list")

    const match = listFixtures && listFixtures.length > 0 ? nextMatch(listFixtures) : null

    if (!match) {
        if (demand) ctx.reply("Jadwal pertandingan berikutnya belum ada nih, coba lagi nanti ya.")
        return
    }

    const diff = new Date(match.matchdate_tdt).getTime() - new Date().getTime()

    if (demand) {
        sendReminder(msToTime(diff), match, [ctx.chat.id])
    } else {
        if (diff < hourInMilisecond && diff > (hourInMilisecond - 15 * minuteInMilisecond)) {
            sendReminder("1 jam", match, listChat)
        } else if (diff < (12 * hourInMilisecond) && diff > (12 * hourInMilisecond - 15 * minuteInMilisecond)) {
            sendReminder("12 jam", match, listChat)
        }
    }
}

function sendReminder(time, fixture, _listChat) {
    _listChat.forEach(chatId => {
        const matchDate = new Date(fixture.matchdate_tdt);
        const day = matchDate.toLocaleDateString("id-ID", {
            timeZone: "Asia/Jakarta",
            weekday: "long"
        });

        const timeString = matchDate.toLocaleString("en-US", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        });

        var dates = "";
        const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);

        if (time.includes("hari")) {
            dates += `${capitalizedDay}, `;
        }
        dates += `${timeString} WIB`;

        copy_bot.telegram.sendMessage(
            chatId,
            `📢 Teet teet teet~ ${time} sebelum Manchester United main~\n\n` +
            `${fixture.competitionname_t}\n` +
            `${fixture.hometeam_t} vs ${fixture.awayteam_t}\n` +
            (fixture.venuename_t ? `${fixture.venuename_t}\n` : "") +
            dates
        );
    });
}

function register(ctx) {
    var array = chat_db.get("list")

    if (typeof array !== "undefined") {
        if (!array.includes(ctx.chat.id)) {
            chat_db.push("list", ctx.chat.id)
            ctx.reply("Iy bgst. Kuingetin disini ya kalo Manchester United mau main, sekalian aku kabarin juga hasil pertandingannya nanti.")
        } else {
            const index = array.indexOf(ctx.chat.id)
            array.splice(index, 1)
            chat_db.set("list", array)

            ctx.reply("Gamau diingetin yaudah")
        }
    } else {
        chat_db.push("list", ctx.chat.id)
        ctx.reply("Iy bgst. Kuingetin disini ya kalo Manchester United mau main, sekalian aku kabarin juga hasil pertandingannya nanti.")
    }
}

function updateFixtures(ctx, bot) {
    copy_bot = bot
    refreshFixtures()
}

module.exports = {
    checkDifferences,
    register,
    updateFixtures
}
