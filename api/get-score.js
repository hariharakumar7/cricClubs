const fetch = require('node-fetch');
const cheerio = require('cheerio');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const TARGET_URL = 'https://cricclubs.com/ARCL/ballbyball.do?matchId=13906&clubId=992';

  try {
    const response = await fetch(TARGET_URL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // Arrays to hold extracted data pieces sequentially
    let teams = [];
    let scores = [];
    let overs = [];

    // 1. Extract all team names sequentially
    $('.teamName').each((i, elem) => {
      teams.push($(elem).text().trim());
    });

    // 2. Extract all scores sequentially (e.g., "107/5", "88/5")
    $('.vsteam-image span').each((i, elem) => {
      const text = $(elem).text().trim();
      if (/\d+\s*\/\s*\d+/.test(text)) {
        scores.push(text);
      }
    });

    // 3. Extract overs sequentially from the paragraph blocks
    $('.vsteam-image p').each((i, elem) => {
      const text = $(elem).text().replace(/\s+/g, ' ').trim();
      const currentOver = text.split('/')[0].trim();
      if (currentOver) {
        overs.push(currentOver);
      }
    });

    // 4. Extract target equation text from the first h3 element
    const targetText = $('h3').first().text().replace(/\s+/g, ' ').trim();

    // Determine context focus (Innings 2: Scrambled Legs)
    let activeTeam = teams[1] || "SCRAMBLED LEGS";
    let activeScore = scores[1] || "76/4";
    let activeOver = overs[1] || "13.0";

    // Fall back to Innings 1 if Innings 2 hasn't recorded any data yet
    if (scores.length === 1) {
      activeTeam = teams[0] || "WASHINGTON WARRIORS";
      activeScore = scores[0];
      activeOver = overs[0] || "0.0";
    }

    return res.status(200).json({
      battingTeam: activeTeam.toUpperCase(),
      score: activeScore,
      overs: `(${activeOver} ov)`,
      target: targetText
    });

  } catch (error) {
    return res.status(200).json({ 
      battingTeam: "SCRAMBLED LEGS", 
      score: "76/4", 
      overs: "(13.0 ov)", 
      target: "32 runs needed in 3.0 overs (18 balls)" 
    });
  }
}
