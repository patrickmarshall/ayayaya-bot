const { getData } = require("../core/helper")
const cron = require('node-cron')
const Database = require("easy-json-database")

const chat_db = new Database("./chatlist.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

var copy_bot

// tester
// cron.schedule('*/10 * * * * *', () => {
//     sendDailyVerse()
// });

cron.schedule('0 * * * *', sendDailyVerse, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});

function pemudatersesat(ctx) {
    ctx.reply("Choose y̶o̶u̶r̶ religion", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Moslem", callback_data: `moslem` }, { text: "Christian", callback_data: `christian` }],
                [{ text: "Buddha", callback_data: `buddha` }, { text: "Hindu", callback_data: `hindhu` }],
                [{ text: "Random", callback_data: `random` }]
            ]
        }
    })
}

function christian(ctx, id) {
    getData("https://labs.bible.org/api/?passage=random&type=json")
        .then(data => {
            var message = `✝ tersesat~ oh tersesaat~ halle?..luuuya ✝ \n\n${data[0].text} \n\n${data[0].bookname} ${data[0].chapter}:${data[0].verse}`
            send(ctx, id, message)
        })
}

function buddha(ctx, id) {
    getData("https://quotable.io/random?author=buddha|daisaku-ikeda|dalai-lama|bodhidharma|chen-yeng&limit=1")
        .then(data => {
            var message = `☸️🧘 tersesat~ oh tersesaat~ namo buuu?..ddhaya 🧘☸️ \n\n${data.content} \n\n${data.author}`
            send(ctx, id, message)
        })
}

function hindhu(ctx, id) {
    getData("https://quotable.io/random?author=mahatma-gandhi|ramakrishna|sai-baba|swami-vivekananda|chanakya|eknath-easwaran|paramahansa-yogananda&limit=1")
        .then(data => {
            var message = `🛕🪷 tersesat~ oh tersesaat~ Om Swasti?..astu 🪷🛕 \n\n${data.content} \n\n${data.author}`
            send(ctx, id, message)
        })
}

// english -> change after comma to en.asad
function moslem(ctx, id) {
    let rand = Math.floor(Math.random() * 6326) + 1
    getData(`https://api.alquran.cloud/v1/ayah/${rand}/editions/quran-simple,id.indonesian`)
        .then(data => {
            var message = `🕋☪🕌 tersesat~ oh tersesaat~ astagfi?..rullah 🕋☪🕌 \n\n${data.data[0].text}\n${data.data[1].text} \n\nQS ${data.data[0].surah.englishName}:${data.data[0].numberInSurah}`
            send(ctx, id, message)
        })
}

function random(ctx) {
    let ang = Math.floor(Math.random() * 4)
    switch (ang) {
        case 0:
            buddha(ctx, null)
            break
        case 1:
            christian(ctx, null)
            break
        case 2:
            hindhu(ctx, null)
            break
        default:
            moslem(ctx, null)
    }
}

function send(ctx, id, message) {
    if (!id) {
        ctx.reply(message);
        ctx.deleteMessage();
    } else {
        copy_bot.telegram.sendMessage(id, message)
    }
}

function subscribe(ctx) {
    const subscribers = chat_db.get('subscribers');
    const subscriberIndex = subscribers.findIndex(subscriber => subscriber.id === ctx.chat.id);
    if (subscriberIndex !== -1) {
        // Subscriber exists in the database
        subscribers.splice(subscriberIndex, 1);
        // Save the updated array back to the database
        chat_db.set('subscribers', subscribers);
        ctx.reply("Okelah kalo udah gamau terima ayat harian lagi. 😠\nSemoga kakak ga tersesat! 😠");
    } else {
        // Subscriber does not exist in the database
        ctx.reply("Oke!\n" +
            "Aku bakal kirimin ayat ke kamu sehari sekali!\n" +
            "Semoga istiqomah ya kak! :3")
            .then((sentMessage) => {
                const messageId = sentMessage.message_id;
                // Delete the message after a delay
                setTimeout(() => {
                    ctx.deleteMessage(messageId);
                }, 10000); // Delete after 5 seconds
            })
        selectReligion(ctx)
    }
}

function selectReligion(ctx) {
    ctx.reply("Sekarang pilih agama ya kakk!", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Moslem", callback_data: `subs_moslem` }, { text: "Christian", callback_data: `subs_christian` }],
                [{ text: "Buddha", callback_data: `subs_buddha` }, { text: "Hindu", callback_data: `subs_hindhu` }]
            ]
        }
    })
}

function selectedReligion(ctx, religion) {

    const newSubscriber = { id: ctx.chat.id, religion: religion }
    let subscribers = chat_db.get('subscribers');

    // Check if subscribers array exists and is an array
    if (subscribers && Array.isArray(subscribers)) {
        subscribers.push(newSubscriber);
        chat_db.set('subscribers', subscribers);
    } else {
        // if subcribers not exist 
        chat_db.set('subscribers', [newSubscriber]);
    }
    selectHour(ctx)
}

function selectHour(ctx) {
    ctx.deleteMessage()
    ctx.reply("Noted!!\nMau diingetin jam brp bg?", {
        reply_markup: {
            inline_keyboard: [
                [
                    { "text": "09:00", "callback_data": "hour_9" },
                    { "text": "12:00", "callback_data": "hour_12" },
                    { "text": "15:00", "callback_data": "hour_15" },
                    { "text": "18:00", "callback_data": "hour_18" },
                    { "text": "21:00", "callback_data": "hour_21" }
                ],
                [
                    { "text": "Pilih Jam Lain", "callback_data": "hour_other" }
                ]
            ]
        }
    })
}

function selectDetailHour(ctx) {
    ctx.deleteMessage()
    ctx.reply("Banyak mau deh! \nYaudah mau diingetin jam brp deh?", {
        reply_markup: {
            inline_keyboard: [
                [
                    { "text": "00:00", "callback_data": "hour_0" },
                    { "text": "01:00", "callback_data": "hour_1" },
                    { "text": "02:00", "callback_data": "hour_2" },
                    { "text": "03:00", "callback_data": "hour_3" }
                ],
                [
                    { "text": "04:00", "callback_data": "hour_4" },
                    { "text": "05:00", "callback_data": "hour_5" },
                    { "text": "06:00", "callback_data": "hour_6" },
                    { "text": "07:00", "callback_data": "hour_7" }
                ],
                [
                    { "text": "08:00", "callback_data": "hour_8" },
                    { "text": "09:00", "callback_data": "hour_9" },
                    { "text": "10:00", "callback_data": "hour_10" },
                    { "text": "11:00", "callback_data": "hour_11" }
                ],
                [
                    { "text": "12:00", "callback_data": "hour_12" },
                    { "text": "13:00", "callback_data": "hour_13" },
                    { "text": "14:00", "callback_data": "hour_14" },
                    { "text": "15:00", "callback_data": "hour_15" }
                ],
                [
                    { "text": "16:00", "callback_data": "hour_16" },
                    { "text": "17:00", "callback_data": "hour_17" },
                    { "text": "18:00", "callback_data": "hour_18" },
                    { "text": "19:00", "callback_data": "hour_19" }
                ],
                [
                    { "text": "20:00", "callback_data": "hour_20" },
                    { "text": "21:00", "callback_data": "hour_21" },
                    { "text": "22:00", "callback_data": "hour_22" },
                    { "text": "23:00", "callback_data": "hour_23" }
                ]
            ]
        }
    })
}

function selectedHour(ctx, hour) {
    ctx.deleteMessage()
    let subscribers = chat_db.get('subscribers');

    if (subscribers && Array.isArray(subscribers)) {

        const subscriberIndex = subscribers.findIndex(subscriber => subscriber.id === ctx.chat.id);

        if (subscriberIndex !== -1) {
            subscribers[subscriberIndex].hour = parseInt(hour);

            // Save the updated array back to the database
            chat_db.set('subscribers', subscribers);
        } else {
            // subscriber not found
        }
    } else {
        // subscribers not found
    }
    ctx.reply("Oke kak! Aku bakal kirimin kamu ayat setiap jam " + hour + ":00 ya! 🥳")
}

function sendDailyVerse() {
    const subscribers = chat_db.get('subscribers');
    if (subscribers && Array.isArray(subscribers)) {

        const currentHour = new Date().getHours();
        subscribers.forEach(subscriber => {
            if (subscriber.hour === currentHour) {
                switch (subscriber.religion) {
                    case "moslem":
                        moslem(null, subscriber.id);
                        break;
                    case "christian":
                        christian(null, subscriber.id);
                        break;
                    case "buddha":
                        buddha(null, subscriber.id);
                        break;
                    case "hindhu":
                        hindhu(null, subscriber.id);
                        break;
                    default:
                        random(null);
                }
            }
        });
    }
}

function prepare(bot) {
    copy_bot = bot
}

module.exports = {
    buddha,
    christian,
    hindhu,
    moslem,
    pemudatersesat,
    prepare,
    random,
    selectDetailHour,
    selectedReligion,
    selectedHour,
    subscribe
}
