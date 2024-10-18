require('dotenv').config()
const { Telegraf, Markup } = require('telegraf')
const bot = new Telegraf(process.env.BOT_TOKEN)
const port = process.env.PORT || 3000
const express = require("express")
const expressApp = express()


const { pemudatersesat, christian, buddha, moslem, hindhu, random, prepare, subscribe, selectDetailHour, selectedReligion, selectedHour } = require("./features/pemudatersesat")
const { hears, photo, video, animation, sticker, processQuery, saveChatList } = require("./features/forwarder")
const { register, updateFixtures, checkDifferences } = require("./features/reminder")
const { greetings, help, who } = require("./features/greetings")
const { games, sendGames } = require("./features/game")
const { vote } = require("./features/voters")
const { updateDotaHeroes, randomhero } = require("./features/dota")
const { getLastMatch, setupBot, register_result } = require("./features/result")
const { currentFlashdeal, nextFlashdeal, insertComponent } = require("./features/tokopedia")
const { hasilIndonesia, hasilSemua, setupBadmintonBot, subscribeBadminton } = require("./features/badminton")

expressApp.get("/", (req, res) => {
    res.send("Working...")
})

expressApp.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

bot.use((ctx, next) => {
    saveChatList(ctx)
    return next();
});

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

prepare(bot)

bot.command('ayatharian', ctx => {
    subscribe(ctx)
})

bot.action((action, ctx) => {

    // Process Query for /pemudatersesat starts from here
    if (action === 'moslem') {
        moslem(ctx, null)
    } else if (action === 'christian') {
        christian(ctx, null)
    } else if (action === 'buddha') {
        buddha(ctx, null)
    }  else if (action === 'hindhu') {
        hindhu(ctx, null)
    } else if (action === 'random') {
        random(ctx, null)
    }

    // Process Query for /subscribe starts here
    else if (action.startsWith('subs_')) {
        const religion = action.substring(5); // Extracting the religion value after 'subs_'
        selectedReligion(ctx, religion)
    }

    else if (action.startsWith('hour_')) {
        if (action === 'hour_other') {
            selectDetailHour(ctx)
        } else {
            const hour = action.substring(5); // Extracting the hour value after 'hour_'
            selectedHour(ctx, hour)
        }
    }

    // Process Query of Forwarder.js starts from else
    else {
        if (ctx.callbackQuery?.message?.text && ctx.callbackQuery.message.text.includes("game")) {
            sendGames(bot, ctx)
        } else {
            processQuery(bot, ctx)
        }
    }
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

// Start of Tokopedia

// bot.command('insertComponent', ctx => {
//     insertComponent(ctx)
// })

bot.command('currentFlashdeal', ctx => {
    currentFlashdeal(ctx)
})

// End of Tokopedia

// Start of Badminton

bot.command('hasilbadmintonindonesia', ctx => {
    hasilIndonesia(ctx)
})

bot.command('hasilbadminton', ctx => {
    hasilSemua(ctx)
})

bot.command('subscribebadminton', ctx => {
    subscribeBadminton(ctx)
})

setupBadmintonBot(bot)

// End of Badminton

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

// End of Forwarder

// import OpenAI from "openai";
// const openai = new OpenAI();

// const completion = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [
//         {
//             role: "user",
//             content: "Write a haiku about recursion in programming.",
//         },
//     ],
// });

// console.log(completion.choices[0].message);

bot.startPolling()
