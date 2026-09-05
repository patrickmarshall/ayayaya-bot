// Manchester United fixtures & results.
//
// manutd.com used to be the source, but it now blocks this server at the
// Cloudflare WAF: every path (even /robots.txt) answers 403 no matter what
// user agent or headers we send, because the request leaves a datacenter IP.
// ESPN's public site API is reachable, needs no key, and covers every
// competition MU plays (league, domestic cups, Europe, friendlies).
const fetch = require("node-fetch")

const MU_TEAM_ID = "360"
const SCHEDULE_URL = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${MU_TEAM_ID}/schedule`

async function fetchEvents(upcoming) {
    // Without ?fixture=true the endpoint returns played matches (newest first),
    // with it the scheduled ones (soonest first).
    // No browser user agent here on purpose: ESPN answers 403 to Chrome-looking
    // UAs, and 200 to a plain client.
    const response = await fetch(upcoming ? `${SCHEDULE_URL}?fixture=true` : SCHEDULE_URL, {
        headers: { "accept": "application/json" }
    })

    if (!response.ok) throw new Error(`ESPN responded ${response.status}`)

    const data = await response.json()
    return Array.isArray(data.events) ? data.events : []
}

function scoreOf(competitor) {
    const score = competitor.score
    if (score === null || score === undefined) return null
    if (typeof score === "object") return typeof score.value === "number" ? score.value : null
    const parsed = parseInt(score, 10)
    return isNaN(parsed) ? null : parsed
}

function penaltyScoreOf(competitor) {
    const score = competitor.score
    if (!score || typeof score !== "object") return null
    return typeof score.shootoutScore === "number" ? score.shootoutScore : null
}

function statusOf(status) {
    const type = (status && status.type) || {}
    if (type.name === "STATUS_POSTPONED") return "Postponed"
    if (type.name === "STATUS_CANCELED" || type.name === "STATUS_CANCELLED") return "Cancelled"
    if (type.completed) return "FullTime"
    if (type.state === "in") return "Live"
    return "PreMatch"
}

function competitionOf(event) {
    // league.name is the competition ("English Premier League"), seasonType.name
    // is the stage within it ("League Phase", "Third Round").
    const name = (event.league && event.league.name) || (event.seasonType && event.seasonType.name) || ""
    return name.replace(/^English /, "")
}

function venueOf(competition) {
    const venue = competition.venue
    if (!venue) return ""
    const city = venue.address && venue.address.city
    return city ? `${venue.fullName}, ${city}` : venue.fullName
}

function toMatch(event) {
    const competition = (event.competitions && event.competitions[0]) || {}
    const competitors = competition.competitors || []
    const home = competitors.find(team => team.homeAway === "home")
    const away = competitors.find(team => team.homeAway === "away")

    if (!home || !away || !event.date) return null

    const status = competition.status || {}
    const matchStatus = statusOf(status)

    return {
        id: event.id,
        matchdate_tdt: new Date(event.date).toISOString(),
        venuename_t: venueOf(competition),
        competitionname_t: competitionOf(event),
        matchStatus,
        // shortDetail is the clock ("45'", "FT") once a match has started; for a
        // match that has not kicked off yet it is just the scheduled time.
        minute: matchStatus === "PreMatch" ? null : (status.type && status.type.shortDetail) || null,
        muIsHome: home.team.id === MU_TEAM_ID,
        hometeam_t: home.team.displayName,
        hometeamabbrevname_t: home.team.abbreviation,
        homeshortname_t: home.team.shortDisplayName,
        awayteam_t: away.team.displayName,
        awayteamabbrevname_t: away.team.abbreviation,
        awayshortname_t: away.team.shortDisplayName,
        homeScore: scoreOf(home),
        awayScore: scoreOf(away),
        homePenaltyScore: penaltyScoreOf(home),
        awayPenaltyScore: penaltyScoreOf(away),
    }
}

function toMatches(events) {
    return events.map(toMatch).filter(match => match !== null)
}

// Upcoming matches, soonest first.
async function getFixtures() {
    const matches = toMatches(await fetchEvents(true))
    return matches
        .filter(match => match.matchStatus !== "Cancelled")
        .sort((a, b) => new Date(a.matchdate_tdt) - new Date(b.matchdate_tdt))
}

// Finished matches, most recent first. Matches still in play are left out so a
// half-time score never goes out as a final result.
async function getResults() {
    const matches = toMatches(await fetchEvents(false))
    return matches
        .filter(match => match.matchStatus === "FullTime")
        .sort((a, b) => new Date(b.matchdate_tdt) - new Date(a.matchdate_tdt))
}

module.exports = { getFixtures, getResults }
