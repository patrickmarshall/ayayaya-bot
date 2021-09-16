const { getData } = require("../core/helper")

function pemudatersesat(ctx) {
    ctx.reply("Choose y̶o̶u̶r̶ religion", {
        reply_markup: {
            inline_keyboard: [[{ text: "Moslem", callback_data: `moslem` },
            { text: "Christian", callback_data: `christian` }],
            [{ text: "Buddha", callback_data: `buddha` }],
            [{ text: "Random", callback_data: `random` }]]
        }
    })
}

function christian(ctx) {
    getData("https://labs.bible.org/api/?passage=random&type=json")
        .then(data => {
            var message = `✝ tersesat~ oh tersesaat~ halle?..luuuya ✝ \n\n${data[0].text} \n\n${data[0].bookname} ${data[0].chapter}:${data[0].verse}`
            sendAndDelete(ctx, message)
        })
}

function buddha(ctx) {
    getData("https://quotable.io/random?author=buddha|daisaku-ikeda|dalai-lama|bodhidharma|chen-yeng&limit=1")
        .then(data => {
            var message = `☸️🧘 tersesat~ oh tersesaat~ namo buuu?..ddhaya 🧘☸️ \n\n${data.content} \n\n${data.author}`
            sendAndDelete(ctx, message)
        })
}

function moslem(ctx) {
    let rand = Math.floor(Math.random() * 6326) + 1
    getData(`https://api.alquran.cloud/v1/ayah/${rand}/editions/quran-simple,en.asad`)
        .then(data => {
            var message = `🕋☪🕌 tersesat~ oh tersesaat~ astagfi?..rullah 🕋☪🕌 \n\n${data.data[0].text}\n${data.data[1].text} \n\nQS ${data.data[0].surah.englishName}:${data.data[0].numberInSurah}`
            sendAndDelete(ctx, message)
        })
}

function random(ctx) {
    switch (Math.random() * 3) {
        case 0:
            buddha(ctx)
            break
        case 1:
            christian(ctx)
            break
        default:
            moslem(ctx)
    }
}

function sendAndDelete(ctx, message) {
    ctx.reply(message)
    ctx.deleteMessage()
}

module.exports = { pemudatersesat, christian, buddha, moslem, random }