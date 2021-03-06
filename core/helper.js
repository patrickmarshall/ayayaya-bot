const fetch = require("node-fetch")

async function getData(url = '') {
  const response = await fetch(url)
  return response.json()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function addZero(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}

function daysToString(date) {
  const daysOfWeek = ['Sunday', 'Monday','Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return daysOfWeek[date.getDay()]
}

function msToTime(s) {
  // let seconds = (ms / 1000).toFixed(1);
  // let minutes = (ms / (1000 * 60)).toFixed(1);
  // let hours = (ms / (1000 * 60 * 60)).toFixed(1);
  // let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
  // if (seconds < 60) return seconds + " Sec";
  // else if (minutes < 60) return minutes + " Min";
  // else if (hours < 24) return hours + " Hrs";
  // else return days + " Days"
  // Pad to 2 or 3 digits, default is 2
  function pad(n, z) {
    z = z || 2;
    return ('00' + n).slice(-z);
  }

  var result = ""

  var ms = s % 1000
  s = (s - ms) / 1000
  var secs = s % 60
  s = (s - secs) / 60
  var mins = s % 60
  s = (s - mins) / 60
  var hours = s % 24
  var days = (s - hours) / 24

  if (days > 0) {
    result += `${days} hari `
  } 
  if (hours > 0) {
    result += `${hours} jam `
  }
  if (mins > 0) {
    result += `${mins} menit`
  }

  return result
}

module.exports = { getData, sleep, addZero, msToTime, daysToString }