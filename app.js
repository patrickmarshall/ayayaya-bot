require('dotenv').config();
const { Telegraf } = require('telegraf')
const express = require("express");
const bot = new Telegraf(process.env.BOT_TOKEN)

const port = process.env.PORT || 3000;

const expressApp = express();

expressApp.get("/", (req, res) => {
  res.send("Working...");
});

expressApp.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

bot.command('start', ctx => {
    if (ctx.from.id != process.env.MY_ACCOUNT) {
        bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
    } else {
        console.log("hi pat")
    }
})

bot.command('who', ctx => {
    bot.telegram.sendMessage(ctx.chat.id, `${ctx.message.from.first_name} ${ctx.message.from.last_name}`, {})
})

bot.hears((msg,ctx) => {
    if (ctx.chat.id == process.env.GROUP_ANABEL_BAPAK_BAPAK) {
        // anabel bapak bapak
    } else {
        if (ctx.from.id != process.env.MY_ACCOUNT) {
            bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
        } else {
            console.log("hi pat")
        }
    }
})

bot.on('video', ctx => {
    if (ctx.from.id != process.env.MY_ACCOUNT) {
        bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
    } else {
        bot.telegram.forwardMessage(process.env.GROUP_J, ctx.chat.id, ctx.message.message_id, {})
    }
})

bot.launch()