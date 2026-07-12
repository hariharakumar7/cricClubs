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

    // Target the team name spans directly
    $('.teamName').each((i, elem) => {
      const parentLi = $(elem).closest('li');
      
      // Clean up the text inside <span class="teamName">
      const teamName = $(elem).text().replace(/[\r\n\t]+/g, ' ').replace('<br>', '').trim();
      
      // Find the score span inside the same <li> block that isn't the team name
      const score = parentLi.find('span').not('.teamName').text().trim();
      
      // Extract the overs from the paragraph tag in the same <li> block
      const rawOversText = parentLi.find('p').text().replace(/\s+/g, ' ').trim();
      const currentOver = rawOversText.split('/')[0].trim();

      if (teamName) {
        matchData.push({
          team: teamName,
          score: score || "0/0",
          overs: currentOver || "0.0"
        });
      }
    });

    // Extract the status text message (e.g., "20 runs needed...")
    const targetText = $('h3').first().text().replace(/\s+/g, ' ').trim();

    // Default to Innings 1 (Washington Warriors)
    let activeData = matchData[0] || { team: "ERROR PARSING", score: "0/0", overs: "0.0" };

    // Automatically switch overlay focus if Innings 2 (Scrambled Legs) is actively chasing
    if (matchData.length >= 2 && matchData[1].score && matchData[1].score !== "0/0") {
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
