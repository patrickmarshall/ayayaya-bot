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
        console.log(ctx)
    }
})

bot.command('who', ctx => {
    bot.telegram.sendMessage(ctx.chat.id, `${ctx.message.from.first_name} ${ctx.message.from.last_name}`, {})
})

var chatCtx

bot.hears((msg,ctx) => {
    if (ctx.chat.id == process.env.GROUP_ANABEL_BAPAK_BAPAK) {
        // anabel bapak bapak
    } else {
        if (ctx.from.id != process.env.MY_ACCOUNT) {
            bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
        } else {
            chatCtx = ctx
            bot.telegram.sendMessage(ctx.chat.id, "Pilih ke grup mana", {
                reply_markup: {
                    inline_keyboard: [
                        [{
                                text: "J",
                                callback_data: `J_send`
                            },
                            {
                                text: "ANABEL BAPAK BAPAK",
                                callback_data: `ANABEL_send`
                            }
                        ]
                    ]
                }
            })
        }
    }
})

bot.on('video', ctx => {
    if (ctx.from.id != process.env.MY_ACCOUNT && ctx.chat.id == process.env.GROUP_ANABEL_BAPAK_BAPAK) {
        bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
    } else {
        chatCtx = ctx
        bot.telegram.sendMessage(ctx.chat.id, "Pilih ke grup mana", {
            reply_markup: {
                inline_keyboard: [
                    [{
                            text: "J",
                            callback_data: `J`
                        },
                        {
                            text: "ANABEL BAPAK BAPAK",
                            callback_data: `ANABEL`
                        }
                    ]
                ]
            }
        })
    }
})

bot.action('J', _ => {
    bot.telegram.forwardMessage(process.env.GROUP_J, chatCtx.chat.id, chatCtx.message.message_id, {})
})

bot.action('ANABEL', _ => {
    bot.telegram.forwardMessage(process.env.GROUP_ANABEL_BAPAK_BAPAK, chatCtx.chat.id, chatCtx.message.message_id, {})
})

bot.action('J_send', _ => {
    bot.telegram.sendMessage(process.env.GROUP_J, chatCtx.message.text, {})
})

bot.action('ANABEL_send', _ => {
    bot.telegram.sendMessage(process.env.GROUP_ANABEL_BAPAK_BAPAK, chatCtx.message.text, {})
})

bot.startPolling()
