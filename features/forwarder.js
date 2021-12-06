const Database = require("easy-json-database")
const e = require("express")

const chatlist_db = new Database("./chatlist.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

var inline_menu = []
var jsonList = []

function inline(message, type) {
    const mutual= chatlist_db.get("mutual_group_list")
    inline_menu = []

    mutual.forEach((object) => {
        var json = JSON.stringify({
            "object": object,
            "type": type,
            "message": message
        })
        jsonList.push(json)
        inline_menu.push([{ text: object.name, callback_data: `${jsonList.length - 1}` }])
    })
    return inline_menu
}

function hears(ctx) {
    const group_list = chatlist_db.get("mutual_group_list")
    
    if (typeof group_list !== "undefined") {
        if (!group_list.some(group => group.id === ctx.chat.id) && ctx.chat.type.includes("group")) {
            chatlist_db.push("mutual_group_list", {"name": ctx.chat.title, "id": ctx.chat.id})
        }
    } else {
        chatlist_db.push("mutual_group_list", {"name": ctx.chat.title, "id": ctx.chat.id})
    }

    if (ctx.chat.type.includes("group")) {

    } else if (ctx.from.id != process.env.MY_ACCOUNT) {
        // bot.telegram.sendMessage(ctx.chat.id, "Lu siapa anjeng", {})
    } else {
        ctx.reply("Pilih ke grup mana", {
            reply_markup: {
                inline_keyboard: inline(ctx, "message")
            }
        })
    }
}

function photo(ctx) {
    if (ctx.chat.type.includes("group")) {

    } else if (ctx.from.id != process.env.MY_ACCOUNT) {
        ctx.replyWithPhoto(ctx.message.photo[ctx.message.photo.length - 1].file_id, { caption: ctx.message.caption })
    } else {
        ctx.reply("Pilih ke grup mana", {
            reply_markup: {
                inline_keyboard: inline(ctx, "photo")
            }
        })
    }
}

function video(ctx) {
    if (ctx.chat.type.includes("group")) {

    } else if (ctx.from.id != process.env.MY_ACCOUNT) {
        ctx.replyWithVideo(ctx.message.video.file_id, { caption: ctx.message.caption })
    } else {
        ctx.reply("Pilih ke grup mana", {
            reply_markup: {
                inline_keyboard: inline(ctx, "video")
            }
        })
    }
}

function animation(ctx) {
    if (ctx.chat.type.includes("group")) {

    } else if (ctx.from.id != process.env.MY_ACCOUNT) {
        // ctx.replyWithVideo(ctx.message.video.file_id, { caption: ctx.message.caption })
    } else {
        ctx.reply("Pilih ke grup mana", {
            reply_markup: {
                inline_keyboard: inline(ctx, "animation")
            }
        })
    }
}

function sticker(ctx) {
    if (ctx.chat.type.includes("group")) {

    } else if (ctx.from.id != process.env.MY_ACCOUNT) {
        // ctx.replyWithVideo(ctx.message.video.file_id, { caption: ctx.message.caption })
    } else {
        ctx.reply("Pilih ke grup mana", {
            reply_markup: {
                inline_keyboard: inline(ctx, "sticker")
            }
        })
    }
}

function processQuery(bot, ctx) {
    const data = JSON.parse(jsonList[ctx.callbackQuery.data])
    const message = data.message.update

    switch (data.type) {
        case "message":
            bot.telegram.sendMessage(data.object.id, message.message.text, {})
            break
        case "video":
            if (typeof message.message.video !== "undefined") {
                bot.telegram.sendVideo(data.object.id, message.message.video.file_id, { caption: message.message.caption })
            }
            break
        case "photo":
            if (typeof message.message.photo !== "undefined") {
                bot.telegram.sendPhoto(data.object.id, message.message.photo[message.message.photo.length - 1].file_id, { caption: message.message.caption })
            }
            break
        case "animation":
            if (typeof message.message.animation !== "undefined") {
                bot.telegram.sendAnimation(data.object.id, message.message.animation.file_id)
            }
            break
        case "sticker":
            if (typeof message.message.sticker !== "undefined") {
                bot.telegram.sendSticker(data.object.id, message.message.sticker.file_id)
            }
            break
    }

    ctx.editMessageText("Udah dikirim!")
}

module.exports = { hears, photo, video, animation, sticker, processQuery }