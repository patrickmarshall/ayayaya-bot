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
const { getData, sleep, addZero, msToTime } = require("./core/helper")
const { hears, photo, video, processQuery } = require("./features/forwarder")

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

bot.command('nextfixture', ctx => {
    checkDifferences(ctx, true)
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

// Start of Forwarder

bot.hears((msg, ctx) => {
    hears(ctx)
})

bot.on('video', ctx => {
    video(ctx)
})

bot.on('photo', ctx => {
    photo(ctx)
    // No need to download now
    // bot.telegram.getFileLink(ctx.message.photo[ctx.message.photo.length - 1].file_id).then((url) => {
    //     var photo_url = `https://api.telegram.org${url.pathname}`
    //     ctx.replyWithPhoto({url: photo_url})
    // }).catch((err) => {
    //     console.log(err)
    // })
})

bot.on('callback_query', ctx => {
    processQuery(bot, ctx)
})

// End of Forwarder

bot.command('who', ctx => {
    ctx.reply(`${ctx.message.from.first_name} ${ctx.message.from.last_name}`)
})

bot.startPolling()
