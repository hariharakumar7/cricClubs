const fetch = require('node-fetch');

export default async function handler(req, res) {
  // Enable CORS so your streaming widget can load the data safely
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const { matchId, clubId } = req.query; 

  if (!matchId || !clubId) {
    return res.status(400).json({ error: 'Missing matchId or clubId query parameters' });
  }

  try {
    const cricClubsUrl = `https://cricclubs.com/shareScoreCard.do?matchId=${matchId}&clubId=${clubId}`;
    const response = await fetch(cricClubsUrl);
    
    if (!response.ok) throw new Error('CricClubs data source unreachable');
    
    const data = await response.json();
    const match = data.matchView || {};

    // Map out the precise payload needed for a clean stream layout
    return res.status(200).json({
      battingTeam: match.battingTeamName || "Batting Team",
      score: `${match.totalRuns || 0}/${match.wickets || 0}`,
      overs: `${match.overs || "0.0"} ov`,
      target: match.target ? `Target: ${match.target}` : ""
    });

  } catch (error) {
    return res.status(500).json({ error: error.message, fallback: "0/0 (0.0 ov)" });
  }
}
