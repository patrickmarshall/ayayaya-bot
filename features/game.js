const Database = require("easy-json-database")

const game_db = new Database("./chatlist.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

var inline_menu = []

function inline() {
    const games= game_db.get("games")
    inline_menu = []

    games.forEach((object) => {
        inline_menu.push([{ text: object.name, callback_data: `${object.message}` }])
    })
    return inline_menu
}

function games(ctx) {
    ctx.reply("Aku suka bermain game! Ayo pilih game", {
        reply_markup: {
            inline_keyboard: inline()
        }
    })
}

function sendGames(bot, ctx) {
    bot.telegram.forwardMessage(ctx.callbackQuery.message.chat.id, process.env.MY_ACCOUNT, ctx.callbackQuery.data)
    ctx.editMessageText("Ayo bermain!")
}

module.exports = { games, sendGames }