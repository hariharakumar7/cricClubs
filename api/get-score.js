const fetch = require('node-fetch');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const TARGET_URL = 'https://cricclubs.com/ARCL/ballbyball.do?matchId=13906&clubId=992';

  try {
    const response = await fetch(TARGET_URL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      }
    });
    
    const html = await response.text();

    // Parse team titles
    const teamRegex = /<div class="match-team-name[^>]*>([\s\S]*?)<\/div>/g;
    let teams = [];
    let teamMatch;
    while ((teamMatch = teamRegex.exec(html)) !== null) {
      teams.push(teamMatch[1].replace(/<[^>]*>/g, '').trim());
    }

    // Parse run/wicket values
    const scoreRegex = /(\d+\s*\/\s*\d+)/g;
    let scores = html.match(scoreRegex) || [];

    // Parse progress overs
    const oversRegex = /(\d+\.\d+)\s*\/\s*\d+\.?\d*\s*ov/g;
    let oversMatches = [];
    let overMatch;
    while ((overMatch = oversRegex.exec(html)) !== null) {
      oversMatches.push(overMatch[1]);
    }

    // Parse bottom match status banner
    const contextRegex = /<div[^>]*class="[^"]*match-status[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
    const contextMatch = contextRegex.exec(html);
    let statusText = "";
    if (contextMatch) {
      statusText = contextMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Set index targets assuming 2nd innings is running based on the screenshot
    let activeTeam = teams[1];
    let activeScore = scores[1];
    let activeOvers = oversMatches[1] ? `(${oversMatches[1]} ov)` : "";

    // Toggle back to 1st innings if data arrays only contain one team entry
    if (scores.length === 1) {
      activeTeam = teams[0];
      activeScore = scores[0];
      activeOvers = oversMatches[0] ? `(${oversMatches[0]} ov)` : "";
    }

    return res.status(200).json({
      battingTeam: activeTeam ? activeTeam.toUpperCase() : "",
      score: activeScore || "",
      overs: activeOvers,
      target: statusText || ""
    });

  } catch (error) {
    return res.status(500).json({ error: "Data processing failed" });
  }
}
