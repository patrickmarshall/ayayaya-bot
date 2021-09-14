
function greetings(ctx) {
    console.log(ctx.chat.type)
    // console.log(ctx)
    if (ctx.from.id == process.env.MY_ACCOUNT) {
        ctx.reply("Hellow Master 🙏🏻")
    } else {
        if (!ctx.chat.type.includes("group")) {
            ctx.reply("Hai namaku ayaya dan aku adalah bot terkeren sepanjang masa.")
        }
    }
}

module.exports = { greetings }