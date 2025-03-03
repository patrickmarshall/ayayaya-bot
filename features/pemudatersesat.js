const { getData, promptOpenAI } = require("../core/helper")
require('dotenv').config()
const cron = require('node-cron')
const fetch = require("node-fetch")
const puppeteer = require('puppeteer');
const Database = require("easy-json-database")
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const chat_db = new Database("./chatlist.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

const books_db = new Database("./testament.json", {
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
                [{ text: "Islam", callback_data: `moslem` }, { text: "Christian", callback_data: `christian` }],
                [{ text: "Buddha", callback_data: `buddha` }, { text: "Hindu", callback_data: `hindhu` }],
                [{ text: "Random", callback_data: `random` }]
            ]
        }
    })
}

// Function to get a random item from an array
function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Function to get a random verse from the data
function getRandomVerse() {
    const bible = books_db.get('bible');

    // Get a random book
    const randomBook = getRandomItem(bible);

    // Get a random chapter from the selected book
    const randomChapter = getRandomItem(randomBook.content);

    // Get a random verse from the selected chapter
    const randomVerse = Math.floor(Math.random() * randomChapter.verse) + 1;

    return {
        key: randomBook.key,
        book: randomBook.name,
        testament: randomBook.testament,
        chapter: randomChapter.chapter,
        verse: randomVerse
    };
}

// Function to fetch and extract content as JSON
async function fetchAndParseAlkitab() {

    const { key, book, testament, chapter, verse } = getRandomVerse();
    const url = `https://www.imankatolik.or.id/alkitab.php?k=${key}&b=${chapter}&a1=${verse}&a2=${verse}`;

    const response = await fetch(url);
    const html = await response.text();

    // Parse the HTML using JSDOM
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Select the correct table cell containing the verse
    const verseCell = document.querySelector('td.v + td.v');
    const text = verseCell ? verseCell.textContent.trim() : '';

    // Format it as JSON
    const result = {
        book,
        testament,
        chapter,
        verse,
        text
    };

    return result;
}

async function christian(ctx, id) {
    const {
        book,
        testament,
        chapter,
        verse,
        text
    } = await fetchAndParseAlkitab();

    var prompt = await promptOpenAI(`Buatkan renungan harian singkat dengan bahasa santai ala anak muda berdasarkan kutipan berikut: '${text}'. Pastikan renungan ini tidak hanya terasa relevan dan mudah dipahami, tetapi juga memiliki kekuatan rohani yang mendalam, seperti yang ditulis oleh seorang rohaniwan berpengalaman.

Sebelum menulis renungan, pahami konteks penuh dari ayat yang dikutip. Jika ayat ini merupakan bagian dari sebuah perikop yang lebih besar, gunakan pemahaman menyeluruh terhadap perikop tersebut agar pesan renungan tetap akurat dan tidak terdistorsi.

Jika diperlukan, tambahkan ayat Alkitab lain yang memiliki tema serupa untuk memperkaya makna dan memberikan refleksi yang lebih dalam. Jangan hanya menyampaikan makna permukaan—ajak pembaca untuk merenungkan bagaimana firman ini berbicara dalam hidup mereka secara nyata, membangun iman, dan menginspirasi perubahan hati.

Gunakan bahasa yang santai, tapi tetap membawa bobot spiritual yang kuat. Buat renungan terasa hidup, relevan, dan menggugah jiwa, seolah-olah ditulis oleh seorang rohaniwan yang benar-benar memahami kehidupan sehari-hari anak muda. Tulis renungan dalam bentuk teks sederhana, tanpa hiasan, judul, atau salam pembuka/penutup.`)
    var message = `🌟🕊️✝ tersesat~ oh tersesaat~ halle?..luuuya ✝🕊️🌟 \n\n${text} \n\n${book} ${chapter}:${verse}\n\n~Renungan Harian~\n${prompt}`
    send(ctx, id, message)

    // var message = `✝ tersesat~ oh tersesaat~ halle?..luuuya ✝ \n\n${text} \n\n${testament}\n${book} ${chapter}:${verse}`
    // var message = `✝ tersesat~ oh tersesaat~ halle?..luuuya ✝ \n\n${text} \n\n${book} ${chapter}:${verse}`
    // send(ctx, id, message)

    // (async () => {
    //     const browser = await puppeteer.launch();
    //     const page = await browser.newPage();
        
    //     // Make sure you are using fresh headers, and let Puppeteer handle the cookies
    //     await page.setExtraHTTPHeaders({
    //         'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    //         'accept-language': 'en-US,en;q=0.9,id;q=0.8',
    //         'cache-control': 'max-age=0',
    //         'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    //     });

    //     await page.goto('https://labs.bible.org/api/?passage=random&type=json');
    //     // Extract the content inside the <pre> tag
    //     const preContent = await page.$eval('pre', el => el.textContent);
    //     // Parse the content as JSON
    //     const jsonData = JSON.parse(preContent);

    //     var message = `✝ tersesat~ oh tersesaat~ halle?..luuuya ✝ \n\n${jsonData[0].text} \n\n${jsonData[0].bookname} ${jsonData[0].chapter}:${jsonData[0].verse}`
    //     send(ctx, id, message)

    //     await browser.close();
    // })();
}

function buddha(ctx, id) {
    getData("https://quotable.io/random?author=buddha|daisaku-ikeda|dalai-lama|bodhidharma|chen-yeng&limit=1")
        .then(async data => {
            var prompt = await promptOpenAI(`buatkan renungan harian singkat dengan bahasa yang santai ala anak muda berdasarkan quote ini: ${data.content}, renungan dikirim dalam bentuk teks jadi tidak perlu ada hiasan dan title dan salam.`)
            var message = `☸️🧘 tersesat~ oh tersesaat~ namo buuu?..ddhaya 🧘☸️ \n\n${data.content} \n\n${data.author}\n\n~Apa yang bisa kita ambil dari sini?~\n${prompt}`
            send(ctx, id, message)
        })
        .catch(err => {
            var message = `Maaf ya kak, quote agama Buddha lagi error nih 😭`
            send(ctx, id, message)
        })
}

function hindhu(ctx, id) {
    getData("https://quotable.io/random?author=mahatma-gandhi|ramakrishna|sai-baba|swami-vivekananda|chanakya|eknath-easwaran|paramahansa-yogananda&limit=1")
        .then(async data => {
            var prompt = await promptOpenAI(`buatkan renungan harian singkat dengan bahasa yang santai ala anak muda berdasarkan quote ini: ${data.content}, renungan dikirim dalam bentuk teks jadi tidak perlu ada hiasan dan title dan salam.`)
            var message = `🛕🪷 tersesat~ oh tersesaat~ Om Swasti?..astu 🪷🛕 \n\n${data.content} \n\n${data.author}\n\n~Apa yang bisa kita ambil dari sini?~\n${prompt}`
            send(ctx, id, message)
        })
        .catch(err => {
            var message = `Maaf ya kak, quote agama Hindu lagi error nih 😭`
            send(ctx, id, message)
        })
}

// english -> change after comma to en.asad
function moslem(ctx, id) {
    let rand = Math.floor(Math.random() * 6326) + 1
    getData(`https://api.alquran.cloud/v1/ayah/${rand}/editions/quran-simple,id.indonesian`)
        .then(async data => {
            var prompt = await promptOpenAI(`buatkan renungan singkat dengan bahasa yang santai ala anak muda berdasarkan ayat ini: ${data.data[1].text}, renungan dikirim dalam bentuk teks jadi tidak perlu ada hiasan dan title dan salam.`)
            var message = `🕋☪🕌 tersesat~ oh tersesaat~ astagfi?..rullah 🕋☪🕌 \n\n${data.data[0].text}\n${data.data[1].text} \n\nQS ${data.data[0].surah.englishName}:${data.data[0].numberInSurah}\n\n~Renungan~\n${prompt}`
            send(ctx, id, message)
        })
}

function random(ctx, id) {
    let ang = Math.floor(Math.random() * 4)
    switch (ang) {
        case 0:
            buddha(ctx, id)
            break
        case 1:
            christian(ctx, id)
            break
        case 2:
            hindhu(ctx, id)
            break
        default:
            moslem(ctx, id)
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
            .then(() => {
                selectReligion(ctx)
            })
    }
}

function selectReligion(ctx) {
    ctx.reply("Sekarang pilih agama ya kakk!", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Islam", callback_data: `subs_Islam` }, { text: "Christian", callback_data: `subs_Christian` }],
                [{ text: "Buddha", callback_data: `subs_Buddha` }, { text: "Hindu", callback_data: `subs_Hindu` }],
                [{ text: "Random", callback_data: `subs_Random` }]
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

            const religion = subscribers[subscriberIndex].religion.charAt(0).toUpperCase() + subscribers[subscriberIndex].religion.slice(1)
            ctx.reply("Oke kak! Aku bakal kirimin kamu ayat dari agama "+ religion +" setiap jam " + hour + ":00 ya! 🥳")
        } else {
            // subscriber not found
        }
    } else {
        // subscribers not found
    }
}

function sendDailyVerse() {
    const subscribers = chat_db.get('subscribers');
    if (subscribers && Array.isArray(subscribers)) {

        const currentHour = parseInt(new Date().toLocaleString("en-US", { 
            timeZone: "Asia/Jakarta", 
            hour: "2-digit", 
            hour12: false 
          }), 10);
        subscribers.forEach(subscriber => {
            if (subscriber.hour === currentHour) {
                switch (subscriber.religion) {
                    case "Islam":
                        moslem(null, subscriber.id);
                        break;
                    case "Christian":
                        christian(null, subscriber.id);
                        break;
                    case "Buddha":
                        buddha(null, subscriber.id);
                        break;
                    case "Hindu":
                        hindhu(null, subscriber.id);
                        break;
                    default:
                        random(null, subscriber.id);
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
