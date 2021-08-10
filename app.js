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
    if (ctx.from.id == process.env.MY_ACCOUNT ) {
        console.log(ctx)
        bot.telegram.sendMessage(ctx.chat.id, "Hellow Master 🙏🏻", {})
    } else {
        console.log(ctx)
        if (ctx.chat.type != "group" || ctx.chat.type != "supergroup") {
            bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
        }
    }
})

bot.command('who', ctx => {
    bot.telegram.sendMessage(ctx.chat.id, `${ctx.message.from.first_name} ${ctx.message.from.last_name}`, {})
})

var chatCtx
var pathname

bot.hears((msg,ctx) => {
    if (ctx.chat.type == "group" || ctx.chat.type == "supergroup") {
        // do nothing
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
    if (ctx.from.id != process.env.MY_ACCOUNT && ctx.chat.type == "group" || ctx.chat.type == "supergroup") {
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

bot.on('photo', ctx => {
    if (ctx.from.id != process.env.MY_ACCOUNT && ctx.chat.type == "group" || ctx.chat.type == "supergroup") {
        bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
    } else {
        chatCtx = ctx
        bot.telegram.getFileLink(ctx.message.photo[2].file_id).then((url) => {
            var photo_url = `https://api.telegram.org${url.pathname}`
            ctx.replyWithPhoto({url: photo_url})
        }).catch((err) => {
            console.log(err)
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

// bot.action('J_send_images', _ => {

// })

bot.startPolling()
