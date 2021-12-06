
function greetings(ctx) {
    if (ctx.from.id == process.env.MY_ACCOUNT) {
        ctx.reply("Hellow Master 🙏🏻")
    } else {
        if (!ctx.chat.type.includes("group")) {
            ctx.reply("Hai namaku ayaya dan aku adalah bot terkeren sepanjang masa.")
        }
    }
}

function help(ctx) {
    var text = `/pemudatersesat - quote keren dari agama pilihan anda\n` +
    `/reminder - nyalain Manchester United match reminder\n` +
    `/nextfixture - pertandingan Manchester United terdekat\n` +
    `/playgame - dapatkan game game menarik\n` +
    `/lastmatch - hasil pertandingan terbaru Manchester United\n`+
    `/matchupdates - nyalain update hasil pertandingan Manchester United\n`+
    `/help - this\n\n` +

    `Kamu juga bisa kirim foto, video, gif, etc. nanti aku bakal kirim balik ke kalian`

    ctx.reply(text)

    if (ctx.from.id == process.env.MY_ACCOUNT) {
        ctx.reply(`~Admin command~\n\n` +
        `/who - dapetin user id dan nama telegram kamu\n` +
        `/updatehero - update database dota hero\n` +
        `/updatefixtures - update database MU fixture`
        )
    }
}

function who(ctx) {
    ctx.reply(
        `UserId: ${ctx.message.from.id}\n` + 
        `Nama: ${ctx.message.from.first_name} ${ctx.message.from.last_name}`
    )
}

module.exports = { greetings, help, who }