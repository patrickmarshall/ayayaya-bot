
function greetings(ctx) {
    if (ctx.from.id == process.env.MY_ACCOUNT) {
        ctx.reply("Hellow Master 🙏🏻")
    } else {
        if (!ctx.chat.type.includes("group")) {
            ctx.reply("Hai namaku ayaya dan aku adalah bot terkeren sepanjang masa.")
        }
    }
}

// pemudatersesat - quote keren dari agama pilihan anda
// ayatharian - minta dikirimin ayat sesuai agama kamu di jam yang kamu pilih
// reminder - nyalain Manchester United match reminder
// nextfixture - pertandingan Manchester United terdekat
// lastmatch - hasil pertandingan terbaru Manchester United
// matchupdate - nyalain update hasil pertandingan Manchester United
// playgame - dapatkan game game menarik
// randomhero - kalau kamu bingung mau pick apa pas main dota
// help - list command yang ada

function help(ctx) {
    var text = `/pemudatersesat - quote keren dari agama pilihan anda\n` +
    `/ayatharian - minta dikirimin ayat sesuai agama kamu di jam yang kamu pilih\n` +
    `/reminder - nyalain Manchester United match reminder\n` +
    `/nextfixture - pertandingan Manchester United terdekat\n` +
    `/playgame - dapatkan game game menarik\n` +
    `/lastmatch - hasil pertandingan terbaru Manchester United\n`+
    `/matchupdate - nyalain update hasil pertandingan Manchester United\n`+
    `/randomhero - kalau kamu bingung mau pick apa pas main dota\n` +
    `/hasilbadminton - hasil pertandingan badminton hari ini\n` +
    `/hasilbadmintonindonesia - hasil pertandingan badminton pemain Indonesia hari ini\n` +
    `/subscribebadminton - subscribe hasil pertandingan badminton pemain Indonesia\n` +
    `/help - this\n\n` +

    `Kamu juga bisa kirim foto, video, gif, etc. nanti aku bakal kirim balik ke kalian`

    ctx.reply(text)

    if (ctx.from.id == process.env.MY_ACCOUNT) {
        ctx.reply(`~Admin command~\n\n` +
        `/who - dapetin user id dan nama telegram kamu\n` +
        `/updatehero - update database dota hero\n` +
        `/updatefixtures - update database MU fixture\n` +
        `/vote - go boom your slido event with format /vote <event_code> <question_id> <number_of_like>`
        )
    }
}

function who(ctx) {
    ctx.reply(
        `UserId: ${ctx.message.from.id}\n` + 
        `Nama: ${ctx.message.from.first_name} ${ctx.message.from.last_name}`
    )
}

module.exports = { 
    greetings, 
    help, 
    who 
}