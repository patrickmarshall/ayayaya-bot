require('dotenv').config()
const { Telegraf, Markup } = require('telegraf')
const bot = new Telegraf(process.env.BOT_TOKEN)
const port = process.env.PORT || 3000
const express = require("express")
const expressApp = express()


const { pemudatersesat, christian, buddha, moslem, random } = require("./features/pemudatersesat")
const { hears, photo, video, animation, sticker, processQuery } = require("./features/forwarder")
const { register, updateFixtures, checkDifferences } = require("./features/reminder")
const { greetings, help, who } = require("./features/greetings")
const { games, sendGames } = require("./features/game")
const { vote } = require("./features/voters")
const { updateDotaHeroes, randomhero } = require("./features/dota")
const { getLastMatch, setupBot, register_result } = require("./features/result")


expressApp.get("/", (req, res) => {
    res.send("Working...")
})

expressApp.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

// Start of Greetings

bot.command('start', ctx => {
    greetings(ctx)
})

bot.command('help', ctx => {
    help(ctx)
})

bot.command('who', ctx => {
    who(ctx)
})

// End of Greetings

// Start of Game

bot.command('playgame', ctx => {
    games(ctx)
})

// End of Game

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

// Start of Manchester United Result

setupBot(bot)

bot.command('lastmatch', ctx => {
    getLastMatch(ctx)
})

bot.command('matchupdate', ctx => {
    register_result(ctx)
})

// End of Manchester United Result

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

// Start of Dota

updateDotaHeroes()

bot.command('updatehero', _ => {
    updateDotaHeroes()
})

bot.command('randomhero', ctx => {
    randomhero(ctx)
})

// End of Dota

// Start of Forwarder

bot.hears((msg, ctx) => {
    hears(ctx)
})

bot.on('video', ctx => {
    video(ctx)
})

bot.on('animation', ctx => {
    animation(ctx)
})

bot.on('sticker', ctx => {
    sticker(ctx)
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
    if (ctx.callbackQuery?.message?.text && ctx.callbackQuery.message.text.includes("game")) {
        sendGames(bot, ctx)
    } else {
        processQuery(bot, ctx)
    }
})

// End of Forwarder

bot.startPolling()
