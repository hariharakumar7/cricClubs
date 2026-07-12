const fetch = require('node-fetch');

export default async function handler(req, res) {
  // Direct header allowance to prevent Streamlabs/Browser connection blocks
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const { matchId, clubId } = req.query; 

  if (!matchId) {
    return res.status(400).json({ error: 'Missing matchId parameter' });
  }

  try {
    // Fallback direct request straight to the mobile-optimized match view
    const targetUrl = `https://cricclubs.com/shareScoreCard.do?matchId=${matchId}${clubId ? `&clubId=${clubId}` : ''}`;
    
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    if (!response.ok) throw new Error('Data sync unavailable');
    
    const textData = await response.text();

    // Catching case variations if the API drops raw JSON vs template strings
    let matchView = {};
    try {
      const jsonData = JSON.parse(textData);
      matchView = jsonData.matchView || {};
    } catch (e) {
      // RegEx fallback extract if CricClubs sends a script-wrapped layout template
      const runsRegex = /"totalRuns"\s*:\s*(\d+)/i.exec(textData);
      const wicketsRegex = /"wickets"\s*:\s*(\d+)/i.exec(textData);
      const oversRegex = /"overs"\s*:\s*"([^"]+)"/i.exec(textData);
      const teamRegex = /"battingTeamName"\s*:\s*"([^"]+)"/i.exec(textData);

      matchView = {
        totalRuns: runsRegex ? runsRegex[1] : null,
        wickets: wicketsRegex ? wicketsRegex[1] : null,
        overs: oversRegex ? oversRegex[1] : null,
        battingTeamName: teamRegex ? teamRegex[1] : null
      };
    }

    // Safeguard ensuring the overlay never displays empty breaks mid-stream
    if (!matchView.totalRuns && !matchView.overs) {
      return res.status(200).json({
        battingTeam: "LIVE MATCH",
        score: "0/0",
        overs: "0.0 ov",
        target: ""
      });
    }

    return res.status(200).json({
      battingTeam: matchView.battingTeamName || "BATTING",
      score: `${matchView.totalRuns || 0}/${matchView.wickets || 0}`,
      overs: `${matchView.overs || "0.0"} ov`,
      target: matchView.target ? `Target: ${matchView.target}` : ""
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
