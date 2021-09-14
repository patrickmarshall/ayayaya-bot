require('dotenv').config()
const { Telegraf, Markup } = require('telegraf')
const bot = new Telegraf(process.env.BOT_TOKEN)
const port = process.env.PORT || 3000
const express = require("express")
const expressApp = express()

const { pemudatersesat, christian, buddha, moslem, random } = require("./features/pemudatersesat")
const { sendReminder, register, updateFixtures, checkDifferences } = require("./features/reminder")
const { greetings } = require("./features/greetings")
const { vote } = require("./features/voters")

expressApp.get("/", (req, res) => {
    res.send("Working...")
})

expressApp.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

bot.command('start', ctx => {
    greetings(ctx)
})

// Start of Manchester United Reminder

updateFixtures(null, bot)

bot.command('test', ctx => {
    checkDifferences()
})

bot.command('updatefixtures', ctx => {
    updateFixtures(ctx, bot)
})

bot.command('reminder', ctx => {
    register(ctx)
})

// End of Manchester United Schedule

// Start of Pemuda Tersesat

bot.command('pemudatersesat', ctx => {
    pemudatersesat(ctx)
})

bot.action('moslem', ctx => {
    moslem(ctx)
})
bot.action('christian', ctx => {
    christian(ctx)
})
bot.action('buddha', ctx => {
    buddha(ctx)
})
bot.action('random', ctx => {
    random(ctx)
})

// End of Pemuda Tersesat

// Start of Sli.do Voters

bot.command('vote', ctx => {
    vote(ctx)
})

// End of Sli.do Voters

bot.command('who', ctx => {
    ctx.reply(`${ctx.message.from.first_name} ${ctx.message.from.last_name}`)
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
    ctx.editMessageText("Udah dikirim!")
})

bot.action('ANABEL_send', ctx => {
    if (typeof chatCtx.message.video !== "undefined") {
        bot.telegram.sendVideo(process.env.GROUP_ANABEL_BAPAK_BAPAK, chatCtx.message.video.file_id, { caption: chatCtx.message.caption })
    } else if (typeof chatCtx.message.photo !== "undefined") {
        bot.telegram.sendPhoto(process.env.GROUP_ANABEL_BAPAK_BAPAK, chatCtx.message.photo[chatCtx.message.photo.length - 1].file_id, { caption: chatCtx.message.caption })
    } else {
        bot.telegram.sendMessage(process.env.GROUP_ANABEL_BAPAK_BAPAK, chatCtx.message.text, {})
    }
    ctx.editMessageText("Udah dikirim!")
})

bot.startPolling()

