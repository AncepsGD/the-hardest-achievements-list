
import Head from 'next/head';
import { useEffect, useState } from 'react';
import Background from '../components/Background';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Link from 'next/link';

function getLeaderboard(achievements) {
  const leaderboard = {};
  const N = achievements.length;
  if (N === 0) return [];

  const N_REF = 1000; 
  const TOP_K = 50; 
  const EXPONENT_TOP = 1.5; 
  const EXPONENT_REST = 0.7; 
  const POINTS_MULTIPLIER = 100; 
  const ALPHA = 0.9; 

  const rawWeights = achievements.map((_, index) => {
    const i = index; 
    const topBoundaryValue = Math.max(N_REF - (TOP_K - 1), 1);
    const currValue = Math.max(N_REF - i, 1);
    if (i < TOP_K) {
      return Math.pow(currValue, EXPONENT_TOP);
    }
    
    const topAtBoundary = Math.pow(topBoundaryValue, EXPONENT_TOP);
    const ratio = currValue / topBoundaryValue;
    return topAtBoundary * Math.pow(Math.max(ratio, 0.0001), EXPONENT_REST);
  });

  const sumRaw = rawWeights.reduce((a, b) => a + b, 0);
  
  const scale = (N_REF / sumRaw) * POINTS_MULTIPLIER;
  const pointsById = {};
  achievements.forEach((ach, index) => {
    pointsById[ach.id] = rawWeights[index] * scale;
  });

  achievements.forEach((achievement, index) => {
    const playerName = (achievement.player || '').trim();
    if (playerName === '-') return;
    const rawPts = pointsById[achievement.id] || 0;
    const augmented = { ...achievement, points: rawPts, mainRank: index + 1 };

    if (leaderboard[playerName]) {
      leaderboard[playerName].rawPoints += rawPts;
      leaderboard[playerName].effectivePoints += Math.pow(rawPts, ALPHA);
      leaderboard[playerName].count += 1;
      leaderboard[playerName].achievements.push(augmented);
    } else {
      leaderboard[playerName] = {
        rawPoints: rawPts,
        effectivePoints: Math.pow(rawPts, ALPHA),
        count: 1,
        achievements: [augmented],
      };
    }
  });

  return Object.entries(leaderboard)
    .map(([player, stats]) => ({
      player,
      
      points: stats.effectivePoints,
      rawPoints: stats.rawPoints,
      count: stats.count,
      achievements: stats.achievements,
    }))
    .sort((a, b) => b.points - a.points)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function LeaderboardRow({ player, points, count, achievements, rank, allAchievements }) {

  let hardest = null;
  let hardestRank = allAchievements.length + 1;
  achievements.forEach(ach => {
    const r = ach.mainRank || (allAchievements.findIndex(a => a.id === ach.id) + 1);
    if (r > 0 && r < hardestRank) {
      hardestRank = r;
      hardest = ach;
    }
  });
  const [show, setShow] = useState(false);
  return (
    <>
      <tr className="clickable-row" onClick={() => setShow(s => !s)} style={{ cursor: 'pointer' }}>
        <td>#{rank}</td>
        <td>{player}</td>
        <td style={{ textAlign: 'left' }}>{points.toFixed(0)}</td>
        <td>{count}</td>
        <td>{hardest ? <Link href={`/achievement/${hardest.id}`}>{hardest.name}</Link> : '-'}</td>
      </tr>
      {show && (
        <tr className="hidden-row">
          <td colSpan={5}>
            <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
              {achievements.map((ach) => {
                const mainListRank = ach.mainRank || (allAchievements.findIndex(a => a.id === ach.id) + 1);
                const pts = ach.points ?? (allAchievements.length - (mainListRank - 1));
                const pointsDisplay = `+${pts.toFixed(0)}`;
                return (
                  <li key={ach.id}>
                    {pointsDisplay} · #{mainListRank} ·
                    <Link href={`/achievement/${ach.id}`}>{ach.name}</Link>
                  </li>
                );
              })}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Leaderboard() {
  const [achievements, setAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function handleResize() { setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 900); }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => {
    fetch('/achievements.json')
      .then(res => res.json())
      .then(data => {
        setAchievements(data);
        setLeaderboard(getLeaderboard(data));
      });
  }, []);
  return (
    <>
      <Head>
        <title>Leaderboard · The Hardest Achievements List</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/assets/favicon-96x96.png" sizes="96x96" />
        <link rel="shortcut icon" href="/assets/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="THAL" />
        <link rel="manifest" href="/assets/site.webmanifest" />
        <meta
          name="description"
          content="This Geometry Dash list ranks rated, unrated, challenges, runs, speedhacked, low refresh rate, (and more) all under one list."
        />
      </Head>
      <Background />
      <Header />
      <main className="main-content">
        {!isMobile && <Sidebar />}
        <section id="leaderboard-section" className="leaderboard-container" style={{ flexGrow: 1, padding: '2rem' }}>
          <table className="leaderboard-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Points</th>
                <th># of Achievements</th>
                <th>Hardest Achievement</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, i) => (
                <LeaderboardRow key={row.player} {...row} allAchievements={achievements} />
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
