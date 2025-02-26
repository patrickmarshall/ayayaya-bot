const fetch = require("node-fetch")
const cron = require('node-cron')
const Database = require("easy-json-database")

const { sleep, addZero, msToTime, daysToString } = require("../core/helper")

var copy_bot

var listChat = []
var listFixtures
const hourInMilisecond = 3600000
const minuteInMilisecond = 60000

cron.schedule('*/15 * * * *', () => {
    checkDifferences()
})

const chat_db = new Database("./chatlist.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

const fixtures_db = new Database("./fixtures.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

function getFixtures(token) {
    let year = new Date().getFullYear();
    new Promise(() => fetch(`https://cdnapi.manutd.com/api/v1/en/id/all/web/list/matchfixture/sid:2024~team:Team%20Level%2FFirst%20Team~isMU:true/0/60`, {
        "headers": {
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9",
            "sec-ch-ua": "\"Google Chrome\";v=\"93\", \" Not;A Brand\";v=\"99\", \"Chromium\";v=\"93\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "x-api-key": `${token}`
        },
        "referrer": "https://www.manutd.com/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors"
    })
        .then((r) => r.json())
        .then((r) => {
            if (typeof r.FixtureListResponse.response !== "undefined") {
                fixtures_db.set("list", r.FixtureListResponse.response.docs)
            }
        })
        .catch(error => {
            console.log(error)
        })
    )
}

function checkDifferences(ctx = null, demand = false) {
    listFixtures = fixtures_db.get("list")
    listChat = chat_db.get("list")

    var match

    sleep(2000)
    var diff = new Date(listFixtures[0].matchdate_tdt).getTime() - new Date().getTime()

    if (diff <= 0) {
        listFixtures.splice(0, 1)
        fixtures_db.set("list", listFixtures)
    }

    for (let i = 0; i < listFixtures.length; i++) {
        if (listFixtures[i].resultdata_t.Period != "Postponed") {
            match = listFixtures[i]
            diff = new Date(match.matchdate_tdt).getTime() - new Date().getTime()
            break
        }
    }

    if (demand) {
        sendReminder(msToTime(diff), match, [ctx.chat.id])
    } else {
        if (diff < hourInMilisecond && diff > (hourInMilisecond - 15 * minuteInMilisecond)) { // 1 hour before
            sendReminder("1 jam", match, listChat)
        } else if (diff < (12 * hourInMilisecond) && diff > (12 * hourInMilisecond - 15 * minuteInMilisecond)) { // 12 hours before
            sendReminder("12 jam", match, listChat)
        }
    }
}

function sendReminder(time, fixture = listFixtures[0], _listChat) {
    _listChat.forEach(chatId => {
        var stadium = fixture.venuename_t
        if (!fixture.venuename_t.toLowerCase().includes("stadium")) {
            stadium += " Stadium"
        }
        const day = daysToString(new Date(fixture.matchdate_tdt))
        const date = new Date(fixture.matchdate_tdt).toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

        var dates = ""
        if (time.includes("hari")) {
            dates += `${day}, `
        }
        dates += `${date} WIB`

        copy_bot.telegram.sendMessage(
            chatId,
            `📢 Teet teet teet~ ${time} sebelum Manchester United main~\n\n` +
            `${fixture.competitionname_t}\n` +
            `${fixture.hometeam_t} vs ${fixture.awayteam_t}\n` +
            `${stadium}\n` +
            dates
        )
    })
}

function register(ctx) {
    var array = chat_db.get("list")

    if (typeof array !== "undefined") {
        if (!array.includes(ctx.chat.id)) {
            chat_db.push("list", ctx.chat.id)
            ctx.reply("Iy bgst. Kuingetin disini ya kalo Manchester United mau main.")
        } else {
            const index = array.indexOf(ctx.chat.id)
            array.splice(index, 1)
            chat_db.set("list", array)
    
            ctx.reply("Gamau diingetin yaudah")
        }
    } else {
        chat_db.push("list", ctx.chat.id)
        ctx.reply("Iy bgst. Kuingetin disini ya kalo Manchester United mau main.")
    }
}

function updateFixtures(ctx, bot) {
    copy_bot = bot
    var token = "RySFXMCM0K1cmM7CyQb4v5iREoFooHXV9CyeKK3o"
    if (ctx?.update?.message?.text.split(' ')[1]) {
        token = ctx.update.message.text.split(' ')[1]
    }
    getFixtures(token)
}

module.exports = { 
    checkDifferences,
    register, 
    updateFixtures
}