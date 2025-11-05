
const { getData } = require("../core/helper")
const Database = require("easy-json-database")

const dota = new Database("./dota.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

function updateDotaHeroes() {
    getData("https://www.dota2.com/datafeed/herolist?language=english")
        .then(data => {
            dota.set("heroes", data.result.data.heroes)
        })
}


function randomhero(ctx) {
    const heroes = dota.get("heroes")
    const randomElement = heroes[Math.floor(Math.random() * heroes.length)]
    ctx.reply(`${randomElement.name_loc}`)
}

// Attribute mapping
const ATTR_MAP = {
    0: "Strength",
    1: "Agility",
    2: "Intelligence",
    3: "Universal"
}

function randomhero2(ctx) {
    ctx.reply("Choose hero attribute:", {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Strength", callback_data: "dota_attr_0" },
                    { text: "Agility", callback_data: "dota_attr_1" }
                ],
                [
                    { text: "Intelligence", callback_data: "dota_attr_2" },
                    { text: "Universal", callback_data: "dota_attr_3" }
                ],
                [
                    { text: "Any", callback_data: "dota_attr_any" }
                ]
            ]
        }
    })
}

async function randomhero2_by_attr(ctx, attr) {
    const heroes = dota.get("heroes")
    let filtered
    if (attr === "any") {
        filtered = heroes
    } else {
        filtered = heroes.filter(h => h.primary_attr === parseInt(attr))
    }
    if (!filtered || filtered.length === 0) {
        await ctx.reply("No hero found for this attribute.")
        if (ctx.callbackQuery?.message?.message_id) {
            await ctx.deleteMessage(ctx.callbackQuery.message.message_id)
        }
        return
    }
    const randomElement = filtered[Math.floor(Math.random() * filtered.length)]
    await ctx.reply(`${randomElement.name_loc}`)
    if (ctx.callbackQuery?.message?.message_id) {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id)
    }
}

module.exports = {
    randomhero,
    updateDotaHeroes,
    randomhero2,
    randomhero2_by_attr
}