const cron = require('node-cron')
const Database = require("easy-json-database")
const { chat_db, sendToChats } = require("../core/helper")
const { getResults } = require("../core/mu-matches")
const { register } = require("./reminder")

var _bot

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
    try {
        const results = await getResults()

        if (results.length === 0) {
            console.log("[result] No finished match returned")
            if (ctx) ctx.reply("Belum ada hasil pertandingan nih, coba lagi nanti ya.")
            return
        }

        compareMatch(results[0], ctx)
    } catch (error) {
        console.log("[result] Failed to fetch results:", error.message)
        if (ctx) ctx.reply("Gagal ambil data hasil pertandingan, coba lagi nanti ya.")
    }
}

function compareMatch(match, ctx = null) {
    if (ctx) {
        sendMessage(match, [ctx.chat.id])
        return
    }

    const lastMatch = result_db.get("list")
    if (lastMatch && lastMatch.id === match.id) return

    result_db.set("list", match)

    const listChat = chat_db.get("list")
    if (listChat && listChat.length > 0) {
        console.log(`[result] Broadcasting ${match.hometeam_t} vs ${match.awayteam_t} to ${listChat.length} chats`)
        sendMessage(match, listChat)
    }
}

function sendMessage(match, list_chat) {
    const homeScore = match.homeScore
    const awayScore = match.awayScore
    let result = ""
    let penaltyDetail = ""

    const isMUHome = match.muIsHome

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

    const message = `${result}\n\n` +
        `${match.competitionname_t}\n` +
        (match.venuename_t ? `${match.venuename_t}\n` : "") +
        `${match.hometeam_t} vs ${match.awayteam_t}\n` +
        `${homeScore} - ${awayScore}\n\n${penaltyDetail}`

    sendToChats(_bot, list_chat, message)
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
