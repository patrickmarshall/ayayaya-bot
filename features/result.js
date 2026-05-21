const cron = require('node-cron')
const Database = require("easy-json-database")
const { chat_db } = require("../core/helper")
const { getResults } = require("../core/mu-scraper")
const { register } = require("./reminder")

var _bot
var _ctx

const result_db = new Database("./result.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

cron.schedule('*/15 * * * *', () => {
    getLastMatch()
})

async function getLastMatch(ctx = null) {
    _ctx = ctx
    try {
        const results = await getResults()
        if (results.length > 0) {
            compareMatch(results[0])
        }
    } catch (error) {
        console.log("[result] Failed to fetch results:", error.message)
        if (_ctx) _ctx.reply("Gagal ambil data hasil pertandingan, coba lagi nanti ya.")
    }
}

function compareMatch(match) {
    var lastMatch = result_db.get("list")
    var listChat = chat_db.get("list")

    if (_ctx) {
        sendMessage(match, [_ctx.update.message.chat.id])
    } else {
        if (lastMatch && lastMatch.matchdate_tdt === match.matchdate_tdt) {
            // same match, no update
        } else {
            result_db.set("list", match)
            if (listChat && listChat.length > 0) {
                sendMessage(match, listChat)
            }
        }
    }
}

function sendMessage(match, list_chat) {
    const homeScore = match.homeScore
    const awayScore = match.awayScore
    let result = ""
    let penaltyDetail = ""

    const isMUHome = match.hometeamabbrevname_t === "MUN"

    if (match.homePenaltyScore != null && match.awayPenaltyScore != null) {
        const homePenalties = match.homePenaltyScore
        const awayPenalties = match.awayPenaltyScore
        penaltyDetail = `⚽ Penalty Shootout ⚽\n${match.hometeam_t}: ${homePenalties}\n${match.awayteam_t}: ${awayPenalties}\n\n`

        const isMUWinner = isMUHome ? homePenalties > awayPenalties : awayPenalties > homePenalties
        result = isMUWinner
            ? `🎉🎉🎉🥳🥳🥳 YEY MU WINNER YEY 🥳🥳🥳🎉🎉🎉\n~ GLORY GLORY MAN UNITED ~\n~ GLORY GLORY MAN UNITED ~`
            : `😭😭😭😔😔😔 HUFT MU LOSE HUFT 😔😔😔😭😭😭`
    } else {
        const homeWin = homeScore > awayScore
        const awayWin = awayScore > homeScore

        if (isMUHome) {
            result = homeWin
                ? `🎉🎉🎉🥳🥳🥳 YEY MU WINNER YEY 🥳🥳🥳🎉🎉🎉\n~ GLORY GLORY MAN UNITED ~\n~ GLORY GLORY MAN UNITED ~`
                : awayWin
                    ? `😭😭😭😔😔😔 HUFT MU LOSE HUFT 😔😔😔😭😭😭`
                    : `😐😐😐😬😬😬 HMMM MU DRAW HMMM 😬😬😬😐😐😐`
        } else {
            result = homeWin
                ? `😭😭😭😔😔😔 HUFT MU LOSE HUFT 😔😔😔😭😭😭`
                : awayWin
                    ? `🎉🎉🎉🥳🥳🥳 YEY MU WINNER YEY 🥳🥳🥳🎉🎉🎉\n~ GLORY GLORY MAN UNITED ~\n~ GLORY GLORY MAN UNITED ~`
                    : `😐😐😐😬😬😬 HMMM MU DRAW HMMM 😬😬😬😐😐😐`
        }
    }

    let stadium = match.venuename_t
    if (stadium && !stadium.toLowerCase().includes("stadium")) {
        stadium += " Stadium"
    }

    const message = `${result}\n\n` +
        `${match.competitionname_t}\n${stadium}\n${match.hometeam_t} vs ${match.awayteam_t}\n` +
        `${homeScore} - ${awayScore}\n\n${penaltyDetail}`

    list_chat.forEach(chatId => _bot.telegram.sendMessage(chatId, message))
}

const register_result = register

function setupBot(bot) {
    _bot = bot
}

module.exports = {
    getLastMatch,
    register_result,
    setupBot
}
