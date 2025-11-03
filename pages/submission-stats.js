import Head from 'next/head';
import { useEffect, useState } from 'react';
import Background from '../components/Background';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Link from 'next/link';

function SubmitterRow({ submitter, count, achievements, rank }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <tr className="clickable-row" onClick={() => setShow(s => !s)} style={{cursor: 'pointer'}}>
        <td>#{rank}</td>
        <td>{submitter}</td>
        <td style={{textAlign: 'left'}}>{count}</td>
      </tr>
      {show && (
        <tr className="hidden-row">
          <td colSpan={3}>
            <ul style={{listStyleType: 'none', margin: 0, padding: 0}}>
              {achievements.map((ach) => (
                <li key={ach.id || ach.name}>
                  <Link href={ach.id ? `/achievement/${ach.id}` : '#'}>{ach.name || '(Unnamed Achievement)'}</Link>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

export default function SubmissionStats() {
  const [submitters, setSubmitters] = useState([]);
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
      .then(achievements => {
        const submitterStats = {};
        achievements.forEach(achievement => {
          const submitter = achievement.submitter;
          if (!submitter) return;
          if (submitterStats[submitter]) {
            submitterStats[submitter].count += 1;
            submitterStats[submitter].achievements.push(achievement);
          } else {
            submitterStats[submitter] = { count: 1, achievements: [achievement] };
          }
        });
        const sortedSubmitters = Object.entries(submitterStats)
          .sort(([, a], [, b]) => b.count - a.count)
          .map(([submitter, stats], index) => ({ submitter, ...stats, rank: index + 1 }));
        setSubmitters(sortedSubmitters);
      });
  }, []);
  return (
    <>
      <Head>
        <title>Submission Stats · The Hardest Achievements List</title>
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
        <section id="submission-stats-section" className="leaderboard-container" style={{flexGrow: 1, padding: '2rem'}}>
          <p style={{marginTop: 0, marginBottom: '1rem'}}>
            <a href="https://forms.gle/kzjRLkD1JgqzgfKp8" target="_blank" rel="noopener noreferrer">Click here to submit an achievement (or join the discord server)</a>
          </p>
          <table className="leaderboard-table" style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr>
                <th>#</th>
                <th>Submitter</th>
                <th>Submissions</th>
              </tr>
            </thead>
            <tbody>
              {submitters.map((row, i) => (
                <SubmitterRow key={row.submitter} {...row} />
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
