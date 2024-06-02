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
    list_chat.forEach(chatId => {
        // find winner
        var result = ""
        if (match.hometeamabbrevname_t == "MUN") {
            if (match.resultdata_t.HomeResult.Score > match.resultdata_t.AwayResult.Score) {
                result = `🎉🎉🎉🥳🥳🥳 YEY MU WINNER YEY 🥳🥳🥳🎉🎉🎉\n` +
                    `~ GLORY GLORY MAN UNITED ~\n` +
                    `~ GLORY GLORY MAN UNITED ~`
            } else if (match.resultdata_t.AwayResult.Score > match.resultdata_t.HomeResult.Score) {
                result = `😭😭😭😔😔😔 HUFT MU LOSE HUFT 😔😔😔😭😭😭`
            } else {
                result = `😐😐😐😬😬😬 HMMM MU DRAW HMMM 😬😬😬😐😐😐`
            }
        } else {
            if (match.resultdata_t.HomeResult.Score > match.resultdata_t.AwayResult.Score) {
                result = `😭😭😭😔😔😔 HUFT MU LOSE HUFT 😔😔😔😭😭😭`
            } else if (match.resultdata_t.AwayResult.Score > match.resultdata_t.HomeResult.Score) {
                result = `🎉🎉🎉🥳🥳🥳 YEY MU WINNER YEY 🥳🥳🥳🎉🎉🎉\n` +
                    `~ GLORY GLORY MAN UNITED ~\n` +
                    `~ GLORY GLORY MAN UNITED ~`
            } else {
                result = `😐😐😐😬😬😬 HMMM MU DRAW HMMM 😬😬😬😐😐😐`
            }
        }

        // Stadium
        var stadium = match.venuename_t
        if (!match.venuename_t.toLowerCase().includes("stadium")) {
            stadium += " Stadium"
        }

        // let homeGoals = [];
        // let awayGoals = [];

        // // Process home team goals
        // match.resultdata_t.HomeResult.GoalDetailEntityList.forEach((goal) => {
        //     if (goal.Player.FullName && goal.Time !== undefined) {
        //         homeGoals.push(`${goal.Player.FullName} ${goal.Time.padStart(2, '0')} ⚽️`);
        //     }
        // });

        // // Process away team goals
        // match.resultdata_t.AwayResult.GoalDetailEntityList.forEach((goal) => {
        //     if (goal.Player.FullName && goal.Time !== undefined) {
        //         awayGoals.push(`⚽️ ${goal.Time.padStart(2, '0')} ${goal.Player.FullName}`);
        //     }
        // });

        // // Calculate maximum width for home team goals
        // const maxHomeScorerWidth = homeGoals.reduce((maxWidth, goal) => Math.max(maxWidth, goal.split(' ')[0].length), 0);
        // const maxHomeMinuteWidth = homeGoals.reduce((maxWidth, goal) => Math.max(maxWidth, (goal.split(' ')[1] || '').length), 0);

        // // Calculate maximum width for away team goals
        // const maxAwayScorerWidth = awayGoals.reduce((maxWidth, goal) => Math.max(maxWidth, goal.split(' ')[2].length), 0);
        // const maxAwayMinuteWidth = awayGoals.reduce((maxWidth, goal) => Math.max(maxWidth, (goal.split(' ')[1] || '').length), 0);

        // // Combine goals side by side with proper alignment
        // let combinedGoals = [];
        // const maxLength = Math.max(homeGoals.length, awayGoals.length);

        // for (let i = 0; i < maxLength; i++) {
        //     const homeGoal = homeGoals[i] || '';
        //     const awayGoal = awayGoals[i] || '';

        //     const paddedHomeScorer = homeGoal.split(' ')[0].padEnd(maxHomeScorerWidth, ' ');
        //     const paddedHomeMinute = (homeGoal.split(' ')[1] || '').padStart(maxHomeMinuteWidth, ' ');

        //     const paddedAwayScorer = awayGoal.split(' ')[2].padEnd(maxAwayScorerWidth, ' ');
        //     const paddedAwayMinute = (awayGoal.split(' ')[1] || '').padStart(maxAwayMinuteWidth, ' ');

        //     combinedGoals.push(`${paddedHomeScorer} ${paddedHomeMinute} ⚽️ | ⚽️ ${paddedAwayMinute} ${paddedAwayScorer}`);
        // }

        // // Join the combined goals array into a single string with new line breaks
        // let formattedGoals = combinedGoals.join('\n');

        // Goal
        // Format home team goals
        const homeGoals = formatTeamGoals(`${match.hometeam_t}`, match.resultdata_t.HomeResult.GoalDetailEntityList);

        // Format away team goals
        const awayGoals = formatTeamGoals(`${match.awayteam_t}`, match.resultdata_t.AwayResult.GoalDetailEntityList);

        // Combine and output the formatted goals
        const formattedGoals = `${homeGoals}\n\n${awayGoals}`;
        // _bot.telegram.sendMessage(chatId, formattedGoals)

        _bot.telegram.sendMessage(
            chatId,
            `${result}\n\n` +
            `${match.competitionname_t}\n` +
            `${stadium}\n` +
            `${match.hometeam_t} vs ${match.awayteam_t}\n` +
            `${match.resultdata_t.HomeResult.Score} - ${match.resultdata_t.AwayResult.Score}\n\n` +
            `🥅 Goal Scorer 🥅\n` +
            `${formattedGoals}\n\n`
        )
    })
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
    new Promise((promise) => fetch("https://cdnapi.manutd.com/api/v1/en/id/all/web/list/matchresult/sid:2023~isMU:true/0/30", {
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