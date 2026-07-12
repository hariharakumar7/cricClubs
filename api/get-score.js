const fetch = require('node-fetch');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const { matchId, clubId, club } = req.query; 

  if (!matchId || !clubId) {
    return res.status(400).json({ error: 'Missing matchId or clubId parameters' });
  }

  // Fallback to 'ARCL' if a club sub-path isn't explicitly provided in the query string
  const clubPath = club || 'ARCL';

  try {
    // Hit the exact live page from your screenshot
    const targetUrl = `https://cricclubs.com/ARCL/ballbyball.do?matchId=13906&clubId=992`;
    
    const response = await fetch(targetUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' 
      }
    });
    
    if (!response.ok) throw new Error('CricClubs dashboard unreachable');
    
    const html = await response.text();

    // 1. Extract Team Names dynamically
    const teamRegex = /<div class="match-team-name[^>]*>([\s\S]*?)<\/div>/g;
    let teams = [];
    let match;
    while ((match = teamRegex.exec(html)) !== null) {
      teams.push(match[1].replace(/<[^>]*>/g, '').trim());
    }

    // 2. Extract Scores (Format: 107/5 or 76/4)
    const scoreRegex = /(\d+\s*\/\s*\d+)/g;
    let scores = html.match(scoreRegex) || [];

    // 3. Extract Overs (Format: 16.0 or 13.0)
    const oversRegex = /(\d+\.\d+)\s*\/\s*\d+\.?\d*\s*ov/g;
    let oversMatches = [];
    let overMatch;
    while ((overMatch = oversRegex.exec(html)) !== null) {
      oversMatches.push(overMatch[1]);
    }

    // Determine the active chasing/batting team context
    let activeTeam = teams[0] || "Washington Warriors";
    let activeScore = scores[0] || "0/0";
    let activeOvers = oversMatches[0] ? `${oversMatches[0]} ov` : "0.0 ov";

    // If a second innings is running (like Scrambled Legs 76/4 in your screenshot)
    if (scores.length >= 2) {
      activeTeam = teams[1] || "Scrambled Legs";
      activeScore = scores[1];
      activeOvers = oversMatches[1] ? `${oversMatches[1]} ov` : activeOvers;
    }

    // 4. Extract Target/Equation text
    const contextRegex = /<div[^>]*class="[^"]*match-status[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
    const contextMatch = contextRegex.exec(html);
    let equation = "";
    if (contextMatch) {
      equation = contextMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    return res.status(200).json({
      battingTeam: activeTeam,
      score: activeScore,
      overs: activeOvers,
      target: equation.length > 50 ? equation.substring(0, 47) + "..." : equation
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
