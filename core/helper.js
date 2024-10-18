const fetch = require("node-fetch")

const apiKey = process.env.OPENAI_API_KEY

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

function getCurrentDate() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(currentDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function promptOpenAI(prompt) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const data = {
      model: 'gpt-4o-mini',
      messages: [
          {
              role: 'user',
              content: prompt,
          },
      ],
  };

  try {
      const response = await fetch(url, {
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(data),
          method: 'POST',
          mode: 'cors',
      });

      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      return result.choices[0].message.content;

  } catch (error) {
      console.error('Error fetching chat completion:', error);
      return null; // Return null if there was an error, handle accordingly
  }
}

module.exports = { 
  getCurrentDate,
  getData, 
  sleep, 
  addZero, 
  msToTime, 
  daysToString,
  promptOpenAI
}