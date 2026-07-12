const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const TARGET_URL = 'https://cricclubs.com/ARCL/ballbyball.do?matchId=13906&clubId=992';

  try {
    const response = await fetch(TARGET_URL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) throw new Error('Blocked');
    const html = await response.text();

    // 1. Parse team titles cleanly from <span class="teamName">
    const teamRegex = /<span class="teamName">([\s\S]*?)<\/span>/g;
    let teams = [];
    let teamMatch;
    while ((teamMatch = teamRegex.exec(html)) !== null) {
      teams.push(teamMatch[1].replace(/<br\s*\/?>/gi, '').trim());
    }

    // 2. Parse run/wicket values cleanly from <span> (e.g. 107/5, 88/5)
    const scoreRegex = /<span>(\d+\s*\/\s*\d+)<\/span>/g;
    let scores = [];
    let scoreMatch;
    while ((scoreMatch = scoreRegex.exec(html)) !== null) {
      scores.push(scoreMatch[1].trim());
    }

    // 3. Parse progress overs from paragraph blocks
    const oversRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let overs = [];
    let overMatch;
    while ((overMatch = oversRegex.exec(html)) !== null) {
      const text = overMatch[1].replace(/\s+/g, ' ').trim();
      const currentOver = text.split('/')[0].trim();
      if (currentOver && !isNaN(parseFloat(currentOver))) {
        overs.push(currentOver);
      }
    }

    // 4. Parse target status string from first h3 element
    const statusRegex = /<h3>([\s\S]*?)<\/h3>/i;
    const statusMatch = statusRegex.exec(html);
    let targetText = "";
    if (statusMatch) {
      targetText = statusMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Determine target batting active values (2nd Innings vs 1st Innings)
    let activeTeam = "";
    let activeScore = "";
    let activeOver = "";

    if (scores.length >= 2) {
      activeTeam = teams[1];
      activeScore = scores[1];
      activeOver = overs[1];
    } else if (scores.length === 1) {
      activeTeam = teams[0];
      activeScore = scores[0];
      activeOver = overs[0];
    }

    return res.status(200).json({
      battingTeam: activeTeam ? activeTeam.toUpperCase() : "",
      score: activeScore || "",
      overs: activeOver ? `(${activeOver} ov)` : "",
      target: targetText || ""
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
