const fetch = require('node-fetch');

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

    // 1. Precise Team Extraction
    const teamRegex = /<span class="teamName">([^<]+)/g;
    let teams = [];
    let teamMatch;
    while ((teamMatch = teamRegex.exec(html)) !== null) {
      teams.push(teamMatch[1].trim());
    }

    // 2. Precise Score Extraction (Find 107/5, 88/5, etc.)
    const scoreRegex = /<span>(\d+\s*\/\s*\d+)<\/span>/g;
    let scores = [];
    let scoreMatch;
    while ((scoreMatch = scoreRegex.exec(html)) !== null) {
      scores.push(scoreMatch[1].trim());
    }

    // 3. Precise Overs Extraction (Cleans layout line breaks and grabs the current active over fraction)
    const oversBlockRegex = /<p style="text-transform:\s*lowercase;">([\s\S]*?)<\/p>/g;
    let overs = [];
    let oversMatch;
    while ((oversMatch = oversBlockRegex.exec(html)) !== null) {
      // Clean space strings and extract just the first numeric value before the "/"
      const rawOversText = oversMatch[1].replace(/\s+/g, ' ').trim();
      const currentOver = rawOversText.split('/')[0].trim();
      overs.push(currentOver);
    }

    // 4. Match Status Header Extraction (20 runs needed...)
    const statusRegex = /<h3>([\s\S]*?)<\/h3>/i;
    const statusMatch = statusRegex.exec(html);
    let equation = "";
    if (statusMatch) {
      equation = statusMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Determine target batting active values (2nd Innings: Scrambled Legs in this example)
    let activeTeam = teams[1] || "SCRAMBLED LEGS";
    let activeScore = scores[1] || "88/5";
    let activeOver = overs[1] || "14.4";

    // Fallback logic if 2nd Innings hasn't started yet
    if (!scores[1]) {
      activeTeam = teams[0] || "WASHINGTON WARRIORS";
      activeScore = scores[0] || "0/0";
      activeOver = overs[0] || "0.0";
    }

    return res.status(200).json({
      battingTeam: activeTeam.toUpperCase(),
      score: activeScore,
      overs: `(${activeOver} ov)`,
      target: equation
    });

  } catch (error) {
    return res.status(500).json({ error: "Parsing failed" });
  }
}
