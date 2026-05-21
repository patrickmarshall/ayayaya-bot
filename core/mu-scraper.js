const fetch = require("node-fetch")

const FIXTURES_URL = "https://www.manutd.com/en/matches/mens-team/fixtures"
const RESULTS_URL = "https://www.manutd.com/en/matches/mens-team/results"

function extractBalanced(s, start) {
    let depth = 0, inString = false, escape = false
    for (let i = start; i < s.length; i++) {
        const c = s[i]
        if (escape) { escape = false; continue }
        if (c === '\\') { escape = true; continue }
        if (c === '"') { inString = !inString; continue }
        if (inString) continue
        if (c === '{') depth++
        else if (c === '}') {
            depth--
            if (depth === 0) return [s.slice(start, i + 1), i + 1]
        }
    }
    return [null, -1]
}

function parseRSCContent(html) {
    const scriptRegex = /<script>(self\.__next_f\.push\(.*?\))<\/script>/gs
    let rscContent = ""

    for (const m of html.matchAll(scriptRegex)) {
        const inner = m[1]
        const strMatch = inner.match(/^self\.__next_f\.push\(\[1,"(.*)"\]\)$/)
        if (!strMatch) continue
        try {
            const unescaped = JSON.parse('"' + strMatch[1] + '"')
            if (unescaped.includes('fixtureProps')) {
                rscContent = unescaped
                break
            }
        } catch (_) {}
    }

    if (!rscContent) {
        for (const m of html.matchAll(scriptRegex)) {
            const inner = m[1]
            const strMatch = inner.match(/^self\.__next_f\.push\(\[1,"(.*)"\]\)$/)
            if (!strMatch) continue
            try {
                const unescaped = JSON.parse('"' + strMatch[1] + '"')
                if (unescaped.includes('kickOffUtc')) {
                    rscContent = unescaped
                    break
                }
            } catch (_) {}
        }
    }

    return rscContent
}

function extractScore(objStr, teamKey) {
    const idx = objStr.indexOf(`"${teamKey}":{`)
    if (idx === -1) return null
    const [teamObj] = extractBalanced(objStr, idx + `"${teamKey}":`.length)
    if (!teamObj) return null
    const m = teamObj.match(/"score":(\d+)/)
    return m ? parseInt(m[1]) : null
}

function extractField(objStr, teamKey, field) {
    const idx = objStr.indexOf(`"${teamKey}":{`)
    if (idx === -1) return null
    const [teamObj] = extractBalanced(objStr, idx + `"${teamKey}":`.length)
    if (!teamObj) return null
    const m = teamObj.match(new RegExp(`"${field}":"([^"]+)"`))
    return m ? m[1] : null
}

function extractPenaltyScore(objStr, teamKey) {
    const idx = objStr.indexOf(`"${teamKey}":{`)
    if (idx === -1) return null
    const [teamObj] = extractBalanced(objStr, idx + `"${teamKey}":`.length)
    if (!teamObj) return null
    const m = teamObj.match(/"penaltyScore":"?(\d+)"?/)
    return m ? parseInt(m[1]) : null
}

function parseMatches(rscContent) {
    const matches = []
    let pos = 0

    while (true) {
        const idx = rscContent.indexOf('"fixtureProps":{', pos)
        if (idx === -1) break

        const [objStr, endPos] = extractBalanced(rscContent, idx + '"fixtureProps":'.length)
        if (!objStr) { pos = idx + 1; continue }

        const after = rscContent.slice(endPos, endPos + 300)
        const kickoffM = after.match(/"kickOffUtc":"([^"]+)"/)

        const idM = objStr.match(/"id":"([^"]+)"/)
        const venueM = objStr.match(/"matchLocation":"([^"]*?)"/)
        const leagueM = objStr.match(/"leagueTitle":"([^"]+)"/)
        const statusM = objStr.match(/"matchStatus":"([^"]+)"/)
        const minuteM = objStr.match(/"minute":"([^"]+)"/)

        const match = {
            id: idM ? idM[1] : null,
            matchdate_tdt: kickoffM ? kickoffM[1] : null,
            venuename_t: venueM ? venueM[1] : '',
            competitionname_t: leagueM ? leagueM[1] : '',
            matchStatus: statusM ? statusM[1] : null,
            minute: minuteM ? minuteM[1] : null,
            hometeam_t: extractField(objStr, 'home', 'clubName'),
            hometeamabbrevname_t: extractField(objStr, 'home', 'clubAbbreviation'),
            homeshortname_t: extractField(objStr, 'home', 'clubShortName'),
            awayteam_t: extractField(objStr, 'away', 'clubName'),
            awayteamabbrevname_t: extractField(objStr, 'away', 'clubAbbreviation'),
            awayshortname_t: extractField(objStr, 'away', 'clubShortName'),
            homeScore: extractScore(objStr, 'home'),
            awayScore: extractScore(objStr, 'away'),
            homePenaltyScore: extractPenaltyScore(objStr, 'home'),
            awayPenaltyScore: extractPenaltyScore(objStr, 'away'),
        }

        matches.push(match)
        pos = idx + 1
    }

    return matches
}

async function fetchPage(url) {
    const response = await fetch(url, {
        headers: {
            "accept": "text/html",
            "accept-language": "en-US,en;q=0.9",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    })
    return response.text()
}

async function getFixtures() {
    const html = await fetchPage(FIXTURES_URL)
    const rsc = parseRSCContent(html)
    if (!rsc) return []
    return parseMatches(rsc)
}

async function getResults() {
    const html = await fetchPage(RESULTS_URL)
    const rsc = parseRSCContent(html)
    if (!rsc) return []
    return parseMatches(rsc)
}

module.exports = { getFixtures, getResults }
