
const { getData } = require("../core/helper")
const Database = require("easy-json-database")

const dota = new Database("./dota.json", {
    snapshots: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000,
        folder: './backups/'
    }
})

function updateDotaHeroes(ctx) {
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

module.exports = { updateDotaHeroes, randomhero }