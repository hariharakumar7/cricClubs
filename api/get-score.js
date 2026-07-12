const fetch = require('node-fetch');
const cheerio = require('cheerio');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const TARGET_URL = 'https://cricclubs.com/ARCL/ballbyball.do?matchId=13906&clubId=992';

  try {
    const response = await fetch(TARGET_URL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);

    let matchData = [];

    // Loop through each team block inside the match summary
    $('.vsteam-image li.win, .vsteam-image li:not(.vs)').each((i, elem) => {
      const teamName = $(elem).find('.teamName').text().replace(/<br>/g, '').trim();
      
      // Look for the score span right after or inside the team block
      const score = $(elem).find('span').not('.teamName').text().trim();
      
      // Extract the overs from the paragraph tag
      const rawOversText = $(elem).find('p').text().replace(/\s+/g, ' ').trim();
      const currentOver = rawOversText.split('/')[0].trim();

      if (teamName) {
        matchData.push({
          team: teamName,
          score: score || "0/0",
          overs: currentOver || "0.0"
        });
      }
    });

    // Extract the status message text (e.g., "20 runs needed...")
    const targetText = $('h3').first().text().replace(/\s+/g, ' ').trim();

    // Default to the first team (Innings 1)
    let activeData = matchData[0] || { team: "UNKNOWN", score: "0/0", overs: "0.0" };

    // If the second innings has started and has data, automatically switch the overlay focus to them
    if (matchData.length >= 2 && matchData[1].score !== "" && matchData[1].score !== "0/0") {
      activeData = matchData[1];
    }

    return res.status(200).json({
      battingTeam: activeData.team.toUpperCase(),
      score: activeData.score,
      overs: `(${activeData.overs} ov)`,
      target: targetText
    });

  } catch (error) {
    return res.status(500).json({ error: "DOM parsing failed" });
  }
}
