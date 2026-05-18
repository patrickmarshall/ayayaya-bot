
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
// mureminder - nyalain Manchester United match reminder
// munextmatch - pertandingan Manchester United terdekat
// mulastmatch - hasil pertandingan terbaru Manchester United
// worldcup - subscribe update & reminder Piala Dunia 2026
// wcnextmatch - pertandingan selanjutnya dari tim yang kamu ikutin
// randomhero - kalau kamu bingung mau pick apa pas main dota
// raceupdate - subscribe hasil race Formula 1
// lastrace - dapetin hasil race Formula 1 terakhir
// lastqualifying - dapetin hasil kualifikasi Formula 1 terakhir
// nextrace - balapan Formula 1 selanjutnya
// playgame - dapatkan game game menarik
// help - list command yang ada

function help(ctx) {
    var text = `/pemudatersesat - quote keren dari agama pilihan anda\n` +
    `/ayatharian - minta dikirimin ayat sesuai agama kamu di jam yang kamu pilih\n` +
    `/mureminder - nyalain Manchester United match reminder\n` +
    `/munextmatch - pertandingan Manchester United terdekat\n` +
    `/mulastmatch - hasil pertandingan terbaru Manchester United\n` +
    `/worldcup - subscribe update & reminder Piala Dunia 2026\n` +
    `/wcnextmatch - pertandingan selanjutnya dari tim yang kamu ikutin\n` +
    `/randomhero - kalau kamu bingung mau pick apa pas main dota\n` +
    `/raceupdate - subscribe hasil race Formula 1\n` +
    `/lastrace - dapetin hasil race Formula 1 terakhir\n` +
    `/lastqualifying - dapetin hasil kualifikasi Formula 1 terakhir\n` +
    `/nextrace - balapan Formula 1 selanjutnya\n` +
    `/playgame - dapatkan game game menarik\n` +
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