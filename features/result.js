const fetch = require("node-fetch")
const cron = require('node-cron')
const Database = require("easy-json-database")

var _bot
var _ctx

const result_db = new Database("./result.json", {
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

cron.schedule('*/15 * * * *', () => {
    getLastMatch()
})

function getLastMatch(ctx = null) {
    var token = "RySFXMCM0K1cmM7CyQb4v5iREoFooHXV9CyeKK3o"
    _ctx = ctx
    getResult(token)
}

function compareMatch(match) {
    var lastMatch = result_db.get("list")
    var listChat = chat_db.get("result_list")

    if (_ctx) {
        sendMessage(match, [_ctx.update.message.chat.id])
    } else {
        if (lastMatch.matchdate_tdt === match.matchdate_tdt) {

        } else {
            result_db.set("list", match)
            sendMessage(match, listChat)
        }
    }
}

function sendMessage(match, list_chat) {
    // Extract scores
    const homeScore = match.resultdata_t.HomeResult.Score;
    const awayScore = match.resultdata_t.AwayResult.Score;
    let result = "";
    let penaltyShootoutDetail = "";

    // Check if the match was decided by penalty shootout
    if (match.resultdata_t.IsMatchExtendedToShootOut) {
        const homePenalties = match.resultdata_t.HomeResult.PenaltyShootEntityList || [];
        const awayPenalties = match.resultdata_t.AwayResult.PenaltyShootEntityList || [];

        const homePenaltiesFormatted = homePenalties.map(p => p.Outcome === "Scored" ? "🟩" : "🟥").join(" ");
        const awayPenaltiesFormatted = awayPenalties.map(p => p.Outcome === "Scored" ? "🟩" : "🟥").join(" ");

        const homePenaltiesScored = homePenalties.filter(p => p.Outcome === "Scored").length;
        const awayPenaltiesScored = awayPenalties.filter(p => p.Outcome === "Scored").length;

        penaltyShootoutDetail = `⚽ Penalty Shootout ⚽\n${match.hometeam_t}: ${homePenaltiesFormatted} (${homePenaltiesScored})\n${match.awayteam_t}: ${awayPenaltiesFormatted} (${awayPenaltiesScored})\n\n`;

        const isHomeWinner = homePenaltiesScored > awayPenaltiesScored;
        if (match.hometeamabbrevname_t === "MUN") {
            if (isHomeWinner) {
                result = `🎉🎉🎉🥳🥳🥳 YEY MU WINNER YEY 🥳🥳🥳🎉🎉🎉\n~ GLORY GLORY MAN UNITED ~\n~ GLORY GLORY MAN UNITED ~`;
            } else {
                result = `😭😭😭😔😔😔 HUFT MU LOSE HUFT 😔😔😔😭😭😭`;
            }
        } else {
            if (isHomeWinner) {
                result = `😭😭😭😔😔😔 HUFT MU LOSE HUFT 😔😔😔😭😭😭`;
            } else {
                result = `🎉🎉🎉🥳🥳🥳 YEY MU WINNER YEY 🥳🥳🥳🎉🎉🎉\n~ GLORY GLORY MAN UNITED ~\n~ GLORY GLORY MAN UNITED ~`;
            }
        }
    
    } else {
        // Determine result in normal time
        const homeWin = homeScore > awayScore;
        const awayWin = awayScore > homeScore;

        if (match.hometeamabbrevname_t === "MUN") {
            result = homeWin
                ? `🎉🎉🎉🥳🥳🥳 YEY MU WINNER YEY 🥳🥳🥳🎉🎉🎉\n~ GLORY GLORY MAN UNITED ~\n~ GLORY GLORY MAN UNITED ~`
                : awayWin
                    ? `😭😭😭😔😔😔 HUFT MU LOSE HUFT 😔😔😔😭😭😭`
                    : `😐😐😐😬😬😬 HMMM MU DRAW HMMM 😬😬😬😐😐😐`;
        } else {
            result = homeWin
                ? `😭😭😭😔😔😔 HUFT MU LOSE HUFT 😔😔😔😭😭😭`
                : awayWin
                    ? `🎉🎉🎉🥳🥳🥳 YEY MU WINNER YEY 🥳🥳🥳🎉🎉🎉\n~ GLORY GLORY MAN UNITED ~\n~ GLORY GLORY MAN UNITED ~`
                    : `😐😐😐😬😬😬 HMMM MU DRAW HMMM 😬😬😬😐😐😐`;
        }
    }

    // Format stadium name
    let stadium = match.venuename_t.toLowerCase().includes("stadium") ? match.venuename_t : `${match.venuename_t} Stadium`;

    // Format goal details
    let homeGoals = homeScore > 0 ? formatTeamGoals(`${match.hometeam_t}`, match.resultdata_t.HomeResult.GoalDetailEntityList) : '';
    let awayGoals = awayScore > 0 ? formatTeamGoals(`${match.awayteam_t}`, match.resultdata_t.AwayResult.GoalDetailEntityList) : '';

    let formattedGoals = homeGoals || awayGoals ? `🥅 Goal Scorer 🥅\n${homeGoals}\n\n${awayGoals}`.trim() : '';

    // Construct the message once
    const message = `${result}\n\n` +
        `${match.competitionname_t}\n${stadium}\n${match.hometeam_t} vs ${match.awayteam_t}\n` +
        `${homeScore} - ${awayScore}\n\n${formattedGoals}\n\n${penaltyShootoutDetail}`;

    // Send message to all chat IDs
    list_chat.forEach(chatId => _bot.telegram.sendMessage(chatId, message));
}

// Function to format goals for a team
function formatTeamGoals(teamName, goals) {
    const formattedGoals = goals.map(goal => `⚽️ ${goal.Time}' ${goal.Player.FullName}`).join('\n');
    return `${teamName}:\n${formattedGoals}`;
}

function register_result(ctx) {
    var array = chat_db.get("result_list")
    if (typeof array !== "undefined") {
        if (!array.includes(ctx.chat.id)) {
            chat_db.push("result_list", ctx.chat.id)
            ctx.reply("Okeee! aku kabarin hasil pertandingan Manchester United ya disini.")
        } else {
            const index = array.indexOf(ctx.chat.id)
            array.splice(index, 1)
            chat_db.set("result_list", array)

            ctx.reply("Gamau dikabarin yaudah")
        }
    } else {
        chat_db.push("result_list", ctx.chat.id)
        ctx.reply("Okeee! aku kabarin hasil pertandingan Manchester United ya disini.")
    }
}

function getResult(token) {
    new Promise((promise) => fetch("https://cdnapi.manutd.com/api/v1/en/id/all/web/list/matchresult/sid:2025~team:Team%20Level%2FFirst%20Team~isMU:true/0/30", {
        "headers": {
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9,fr;q=0.8,en-GB;q=0.7,id;q=0.6",
            "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"96\", \"Google Chrome\";v=\"96\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "x-api-key": `${token}`,
            "Referer": "https://www.manutd.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    })
        .then((r) => r.json())
        .then((r) => {
            if (typeof r.ResultListResponse.response !== "undefined") {
                // for (let i = 0; i <= 5; i++) {
                //     compareMatch(r.ResultListResponse.response.docs[i])
                // }
                compareMatch(r.ResultListResponse.response.docs[0])
            }
        })
        .catch(error => {
            console.log(error)
        })
    )
}

function setupBot(bot) {
    _bot = bot
}

module.exports = {
    getLastMatch,
    register_result,
    setupBot
}