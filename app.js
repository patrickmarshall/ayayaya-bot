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
            bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
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
    switch(Math.random() * 3){
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
        bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
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