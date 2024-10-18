const { getData, sleep } = require("../core/helper")
const fetch = require("node-fetch")

function vote(ctx) {
    let messages = ctx.message.text.split(" ")
    if (!messages[1]) {
        ctx.reply(`Please provide Event Code! \nex: https://app.sli.do/event/ur74ymwf/live/questions\n"ur74ymwf" is your Event Code`)
    } else if (!messages[2]) {
        ctx.reply(`Please provide Question Id! \nYou can get your question id by inspecting network when you click on like icon. \nex: https://app.sli.do/api/v0.5/events/88d26f91-0eab-4af8-a74e-2c4c6eeb195f/questions/40213496/like \n"40213496" is your question id`)
    } else if (!messages[3]) {
        ctx.reply("Please provide your like number, between 1 - 50")
    } else {
        getEventId(ctx, messages[1], messages[2], messages[3])
    }
}

var counter = [0]

function getEventId(ctx, hash, question_id, times) {
    getData(`https://app.sli.do/api/v0.5/app/events?hash=${hash}`)
        .then(data => {
            let index = counter.length
            counter.push(0)
            for (let i = 0; i < times; i++) {
                var end = false
                if (i == times - 1) {
                    end = true
                }
                getToken(data.uuid, question_id, index, ctx, end)
            }
        })
        .catch(error => {
            console.error(error)
        })
}

function getToken(event_id, question_id, index, ctx, end) {
    new Promise((resolve) => setTimeout(resolve, 500))
        .then((_) =>
            fetch(`https://app.sli.do/api/v0.5/events/${event_id}/auth?attempt=1`, {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "no-cache, no-store",
                    "content-type": "application/json;charset=UTF-8",
                    "sec-ch-ua": "\"Chromium\";v=\"92\", \" Not A;Brand\";v=\"99\", \"Google Chrome\";v=\"92\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-client-id": "rTRdrE0EAKWkokN",
                    "x-slidoapp-version": "SlidoParticipantApp/11.43.1 (web)"
                },
                "referrer": "https://app.sli.do/event/ur74ymwf/live/questions",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": "{\"initialAppViewer\":\"browser--other\",\"granted_consents\":[\"StoreEssentialCookies\",\"StoreAnalyticalCookies\"]}",
                "method": "POST",
                "mode": "cors",
                "credentials": "omit"
            })
        )
        .then((r) => r.json())
        .then((r) => {
            voting(event_id, r.access_token, question_id, index, ctx, end)
        })
        .catch(error => {
            console.error(error)
        })
}

function voting(event_id, bearer, question_id, index, ctx, end) {
    new Promise((resolve) => setTimeout(resolve, 2000))
        .then((_) =>
            fetch(`https://app.sli.do/api/v0.5/events/${event_id}/questions/${question_id}/like`, {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-US,en;q=0.9",
                    "authorization": `Bearer ${bearer}`,
                    "cache-control": "no-cache, no-store",
                    "content-type": "application/json;charset=UTF-8",
                    "sec-ch-ua": "\"Chromium\";v=\"92\", \" Not A;Brand\";v=\"99\", \"Google Chrome\";v=\"92\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-client-id": "rTRdrE0EAKWkokN",
                    "x-slidoapp-version": "SlidoParticipantApp/11.43.1 (web)",
                    "cookie": "_ga=GA1.2.2050318450.1630094122; _gid=GA1.2.326193600.1630094122; Slido.EventAuthTokens=\"88d26f91-0eab-4af8-a74e-2c4c6eeb195f,06ed9e76b4b4007bf4200b15c14cd8f242d39857\"; __exponea_etc__=da51a032-69c5-4665-a842-2b7fdb1a100d; __exponea_time2__=-0.1868896484375; AWSALB=Bu8TiHqU/OFnvZ1Wf4UjzlJDGq//qYwc10DwfrkRcAwnSkoDAT00pqCwoxcY7sFm5b8CwFMjSQuNiDNxHyBEZ4C4UZzPwRsO4ZwzeOVDGvEYWETTjFNU2fOihB0p; AWSALBCORS=Bu8TiHqU/OFnvZ1Wf4UjzlJDGq//qYwc10DwfrkRcAwnSkoDAT00pqCwoxcY7sFm5b8CwFMjSQuNiDNxHyBEZ4C4UZzPwRsO4ZwzeOVDGvEYWETTjFNU2fOihB0p"
                },
                "referrer": "https://app.sli.do/event/ur74ymwf/live/questions",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": "{\"score\":1}",
                "method": "POST",
                "mode": "cors"
            })
        )
        .then((_) => {
            counter[index] += 1
            if (end) {
                sleep(2000).then(() => {
                    ctx.reply(`Success ${counter[index]} times.`, { reply_to_message_id: ctx.message.message_id })
                })
            }
        })
        .catch(error => {
            console.error(error)
            if (end) {
                sleep(2000).then(() => {
                    ctx.reply(`Success ${counter[index]} times.`, { reply_to_message_id: ctx.message.message_id })
                })
            }
        })
}

module.exports = { 
    vote 
}