require('dotenv').config()
const { Telegraf, Markup } = require('telegraf')
const express = require("express")
const fetch = require("node-fetch")
const bot = new Telegraf(process.env.BOT_TOKEN)
const port = process.env.PORT || 3000
const expressApp = express()

expressApp.get("/", (req, res) => {
    res.send("Working...")
})

expressApp.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

bot.command('start', ctx => {
    console.log(ctx.chat.type)
    // console.log(ctx)
    if (ctx.from.id == process.env.MY_ACCOUNT) {
        bot.telegram.sendMessage(ctx.chat.id, "Hellow Master 🙏🏻", {})
    } else {
        if (!ctx.chat.type.includes("group")) {
            bot.telegram.sendMessage(ctx.chat.id, "Hai namaku ayaya dan aku adalah bot terkeren sepanjang masa.", {})
        }
    }
})

bot.command('pemudatersesat', ctx => {
    bot.telegram.sendMessage(ctx.chat.id, "Choose y̶o̶u̶r̶ religion", {
        reply_markup: {
            inline_keyboard: [[{ text: "Moslem", callback_data: `moslem` },
            { text: "Christian", callback_data: `christian` }],
            [{ text: "Buddha", callback_data: `buddha` }],
            [{ text: "Random", callback_data: `random` }]]
        }
    })
})

bot.action('moslem', ctx => {
    moslem(ctx.callbackQuery.message.chat.id)
    ctx.deleteMessage()
})
bot.action('christian', ctx => {
    christian(ctx.callbackQuery.message.chat.id)
    ctx.deleteMessage()
})
bot.action('buddha', ctx => {
    buddha(ctx.callbackQuery.message.chat.id)
    ctx.deleteMessage()
})
bot.action('random', ctx => {
    switch (Math.random() * 3) {
        case 0:
            buddha(ctx.callbackQuery.message.chat.id)
            break
        case 1:
            christian(ctx.callbackQuery.message.chat.id)
            break
        default:
            moslem(ctx.callbackQuery.message.chat.id)
    }
    ctx.deleteMessage()
})

function christian(chat_id) {
    getData("https://labs.bible.org/api/?passage=random&type=json")
        .then(data => {
            var message = `✝ tersesat~ oh tersesaat~ halle?..luuuya ✝ \n\n${data[0].text} \n\n${data[0].bookname} ${data[0].chapter}:${data[0].verse}`
            bot.telegram.sendMessage(chat_id, message, {})
        })
}

function buddha(chat_id) {
    getData("https://quotable.io/random?author=buddha|daisaku-ikeda|dalai-lama|bodhidharma|chen-yeng&limit=1")
        .then(data => {
            var message = `☸️🧘 tersesat~ oh tersesaat~ namo buuu?..ddhaya 🧘☸️ \n\n${data.content} \n\n${data.author}`
            bot.telegram.sendMessage(chat_id, message, {})
        })
}

function moslem(chat_id) {
    let rand = Math.floor(Math.random() * 6326) + 1
    getData(`https://api.alquran.cloud/v1/ayah/${rand}/editions/quran-simple,en.asad`)
        .then(data => {
            var message = `🕋☪🕌 tersesat~ oh tersesaat~ astagfi?..rullah 🕋☪🕌 \n\n${data.data[0].text}\n${data.data[1].text} \n\nQS ${data.data[0].surah.englishName}:${data.data[0].numberInSurah}`
            bot.telegram.sendMessage(chat_id, message, {})
        })
}

bot.command('vote', ctx => {
    let messages = ctx.message.text.split(" ")
    if (!messages[1]) {
        ctx.reply(`Please provide Event Code! \nex: https://app.sli.do/event/ur74ymwf/live/questions\n"ur74ymwf" is your Event Code`)
    } else if (!messages[2]) {
        ctx.reply(`Please provide Question Id! \nYou can get your question id by inspecting network when you click on like icon. \nex: https://app.sli.do/api/v0.5/events/88d26f91-0eab-4af8-a74e-2c4c6eeb195f/questions/40213496/like \n"40213496" is your question id`)
    } else if (!messages[3]) {
        ctx.reply("Please provide your like number, between 1 - 50")
    } else {
        getEventId(messages[1], messages[2], messages[3])
    }
})

function getEventId(hash, question_id, times) {
    getData(`https://app.sli.do/api/v0.5/app/events?hash=${hash}`)
        .then(data => {
            for (let i = 0; i < times; i++) {
                getToken(data.uuid, question_id)
              }
        })
}

function getToken(event_id, question_id) {
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
            vote(event_id, r.access_token, question_id)
        })
}

function vote(event_id, bearer, question_id) {
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
}

bot.command('who', ctx => {
    bot.telegram.sendMessage(ctx.chat.id, `${ctx.message.from.first_name} ${ctx.message.from.last_name}`, {})
})

var chatCtx
var pathname
var inline_keyboard_send = [[{ text: "J", callback_data: `J_send`, index: 34024923490230324932 },
{ text: "ANABEL BAPAK BAPAK", callback_data: `ANABEL_send` }]]
var inline_menu = [[{ text: "J", callback_data: `J_forward` },
{ text: "ANABEL BAPAK BAPAK", callback_data: `ANABEL_forward` }]]

bot.hears((msg, ctx) => {
    if (ctx.chat.type.includes("group")) {

    } else if (ctx.from.id != process.env.MY_ACCOUNT) {
        // bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
    } else {
        console.log(ctx)
        chatCtx = ctx
        bot.telegram.sendMessage(ctx.chat.id, "Pilih ke grup mana", {
            reply_markup: {
                inline_keyboard: inline_keyboard_send
            }
        })
    }
})

bot.on('video', ctx => {
    if (ctx.chat.type.includes("group")) {

    } else if (ctx.from.id != process.env.MY_ACCOUNT) {
        ctx.replyWithVideo(ctx.message.video.file_id, { caption: ctx.message.caption })
    } else {
        chatCtx = ctx
        bot.telegram.sendMessage(ctx.chat.id, "Pilih ke grup mana", {
            reply_markup: {
                inline_keyboard: inline_keyboard_send
            }
        })
    }
})

bot.on('photo', ctx => {
    if (ctx.chat.type.includes("group")) {

    } else if (ctx.from.id != process.env.MY_ACCOUNT) {
        ctx.replyWithPhoto(ctx.message.photo[ctx.message.photo.length - 1].file_id, { caption: ctx.message.caption })
    } else {
        chatCtx = ctx
        bot.telegram.sendMessage(ctx.chat.id, "Pilih ke grup mana", {
            reply_markup: {
                inline_keyboard: inline_keyboard_send
            }
        })
        // No need to download now
        // bot.telegram.getFileLink(ctx.message.photo[ctx.message.photo.length - 1].file_id).then((url) => {
        //     var photo_url = `https://api.telegram.org${url.pathname}`
        //     ctx.replyWithPhoto({url: photo_url})
        // }).catch((err) => {
        //     console.log(err)
        // })
    }
})

bot.action('J_forward', ctx => {
    bot.telegram.forwardMessage(process.env.GROUP_J, chatCtx.chat.id, chatCtx.message.message_id, {})
    ctx.editMessageText("Udah diforward!", {})
})

bot.action('ANABEL_forward', ctx => {
    bot.telegram.forwardMessage(process.env.GROUP_ANABEL_BAPAK_BAPAK, chatCtx.chat.id, chatCtx.message.message_id, {})
    ctx.editMessageText("Udah diforward!", {})
})

bot.action('J_send', ctx => {
    console.log(chatCtx.message)
    if (typeof chatCtx.message.video !== "undefined") {
        bot.telegram.sendVideo(process.env.GROUP_J, chatCtx.message.video.file_id, { caption: chatCtx.message.caption })
    } else if (typeof chatCtx.message.photo !== "undefined") {
        bot.telegram.sendPhoto(process.env.GROUP_J, chatCtx.message.photo[chatCtx.message.photo.length - 1].file_id, { caption: chatCtx.message.caption })
    } else {
        bot.telegram.sendMessage(process.env.GROUP_J, chatCtx.message.text, {})
    }
    ctx.editMessageText("Udah dikirim!", {})
})

bot.action('ANABEL_send', ctx => {
    if (typeof chatCtx.message.video !== "undefined") {
        bot.telegram.sendVideo(process.env.GROUP_ANABEL_BAPAK_BAPAK, chatCtx.message.video.file_id, { caption: chatCtx.message.caption })
    } else if (typeof chatCtx.message.photo !== "undefined") {
        bot.telegram.sendPhoto(process.env.GROUP_ANABEL_BAPAK_BAPAK, chatCtx.message.photo[chatCtx.message.photo.length - 1].file_id, { caption: chatCtx.message.caption })
    } else {
        bot.telegram.sendMessage(process.env.GROUP_ANABEL_BAPAK_BAPAK, chatCtx.message.text, {})
    }
    ctx.editMessageText("Udah dikirim!", {})
})

bot.startPolling()

async function getData(url = '') {
    const response = await fetch(url)
    return response.json()
}