import Head from 'next/head';
import Background from '../../components/Background';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import fs from 'fs';
import path from 'path';
import { useState, useEffect } from 'react';
import { useDateFormat } from '../../components/DateFormatContext';
import Tag, { TAG_PRIORITY_ORDER } from '../../components/Tag';

export async function getStaticPaths() {
  const achievementsPath = path.join(process.cwd(), 'public', 'achievements.json');
  const timelinePath = path.join(process.cwd(), 'public', 'timeline.json');
  const platformersPath = path.join(process.cwd(), 'public', 'platformers.json');
  const platformerTimelinePath = path.join(process.cwd(), 'public', 'platformertimeline.json');
  const pendingPath = path.join(process.cwd(), 'public', 'pending.json');
  const legacyPath = path.join(process.cwd(), 'public', 'legacy.json');

  let achievements = [], timeline = [], platformers = [], platformerTimeline = [], pending = [], legacy = [];

  try { achievements = JSON.parse(fs.readFileSync(achievementsPath, 'utf8')); } catch {}
  try { timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8')); } catch {}
  try { platformers = JSON.parse(fs.readFileSync(platformersPath, 'utf8')); } catch {}
  try { platformerTimeline = JSON.parse(fs.readFileSync(platformerTimelinePath, 'utf8')); } catch {}
  try { pending = JSON.parse(fs.readFileSync(pendingPath, 'utf8')); } catch {}
  try { legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8')); } catch {}

  const combinedData = [...achievements, ...timeline, ...platformers, ...platformerTimeline, ...pending, ...legacy];
  const paths = combinedData
    .filter(a => a && a.id && a.name)
    .map(a => ({ params: { id: a.id.toString() } }));

  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const achievementsPath = path.join(process.cwd(), 'public', 'achievements.json');
  const timelinePath = path.join(process.cwd(), 'public', 'timeline.json');
  const platformersPath = path.join(process.cwd(), 'public', 'platformers.json');
  const platformerTimelinePath = path.join(process.cwd(), 'public', 'platformertimeline.json');
  const pendingPath = path.join(process.cwd(), 'public', 'pending.json');
  const legacyPath = path.join(process.cwd(), 'public', 'legacy.json');

  let achievements = [], timeline = [], platformers = [], platformerTimeline = [], pending = [], legacy = [];

  try { achievements = JSON.parse(fs.readFileSync(achievementsPath, 'utf8')); } catch {}
  try { timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8')); } catch {}
  try { platformers = JSON.parse(fs.readFileSync(platformersPath, 'utf8')); } catch {}
  try { platformerTimeline = JSON.parse(fs.readFileSync(platformerTimelinePath, 'utf8')); } catch {}
  try { pending = JSON.parse(fs.readFileSync(pendingPath, 'utf8')); } catch {}
  try { legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8')); } catch {}

  const combinedData = [...achievements, ...timeline, ...platformers, ...platformerTimeline, ...pending, ...legacy]
    .filter(a => a && a.id && a.name);

  const achievement = combinedData.find(a => a.id.toString() === params.id) || null;

  let placement = null;
  if (achievement) {
    const achIndex = achievements.findIndex(a => a && a.id && a.id.toString() === params.id);
    if (achIndex !== -1) placement = achIndex + 1;
    else {
      const platIndex = platformers.findIndex(a => a && a.id && a.id.toString() === params.id);
      if (platIndex !== -1) placement = platIndex + 1;
    }
  }

  return { props: { achievement, placement }, revalidate: 600 };
}

export default function AchievementPage({ achievement, placement }) {
  const [copyMsg, setCopyMsg] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function handleResize() { setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 900); }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const { dateFormat } = useDateFormat();
  function showCopyNotification(text) {
    setCopyMsg(text);
    setTimeout(() => setCopyMsg(''), 1800);
  }

  function formatDate(date) {
    if (!date) return 'N/A';
    function parseAsLocal(input) {
      if (input instanceof Date) return input;
      if (typeof input === 'number') return new Date(input);
      if (typeof input !== 'string') return new Date(input);

      const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        return new Date(y, mo - 1, d);
      }

      return new Date(input);
    }

    const d = parseAsLocal(date);
    if (isNaN(d)) return 'N/A';
    const yy = String(d.getFullYear()).slice(-2);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    if (dateFormat === 'YYYY/MM/DD') return `${yyyy}/${mm}/${dd}`;
    if (dateFormat === 'MM/DD/YY') return `${mm}/${dd}/${yy}`;
    if (dateFormat === 'DD/MM/YY') return `${dd}/${mm}/${yy}`;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function formatLength(length) {

    if (length === null || length === undefined || length === '') return 'N/A';
    const num = Number(length);
    if (isNaN(num)) return 'N/A';
    const min = Math.floor(num / 60);
    const sec = (num % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  }
  function getEmbedLink(url) {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split(/[?&]/)[0];
      } else {
        const match = url.match(/[?&]v=([^&]+)/);
        videoId = match ? match[1] : '';
      }
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    return null;
  }
  function isImageUrl(url) {
    if (!url) return false;
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    const lowercaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowercaseUrl.includes(ext));
  }
  if (!achievement) {
    return (
      <div>
        <Head>
          <title>Achievement Not Found</title>
        </Head>
        <Background />
        <Header />
        {!isMobile && <Sidebar />}
  <div>Achievement not found.</div>
      </div>
    );
  }

  const bgImage = achievement.thumbnail || (achievement.levelID ? `https://tjcsucht.net/levelthumbs/${achievement.levelID}.png` : null);
  return (
    <>
      <Head>
        <title>{achievement.name} · The Hardest Achievements List</title>
        <meta name="description" content={`${achievement.name} done by ${achievement.player} on ${formatDate(achievement.date)}. View Geometry Dash details, videos, and more on The Hardest Achievements List.`} />
        <link rel="icon" type="image/png" href="/assets/favicon-96x96.png" sizes="96x96" />
        <link rel="shortcut icon" href="/assets/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="THAL" />
        <link rel="manifest" href="/assets/site.webmanifest" />
      </Head>
      <Background bgImage={bgImage} />
      <Header />
      <main style={{ display: 'flex', gap: '2rem', padding: '2rem', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', overflowY: 'auto' }}>
        {!isMobile && <Sidebar />}
        <section style={{ flex: '1 1 0%', maxWidth: 900, overflowY: 'auto', maxHeight: 'calc(100vh - 4rem)', position: 'relative' }}>
          <div
            className="achievement-card"
            style={{
              color: 'var(--text-color, #DFE3F5)',
              position: 'relative',
              overflow: 'auto',
              minWidth: 320,
              minHeight: 400,
              maxHeight: 'calc(100vh - 4rem)',
              paddingBottom: '3rem'
            }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 className="achievement-title" style={{ fontSize: '2rem', marginBottom: 8, textAlign: 'center' }}>{achievement.name}</h2>
              <p className="achievement-player" style={{ fontWeight: 700, color: '#8fa1c7', marginBottom: 16, textAlign: 'center', fontSize: '1.25rem' }}>{achievement.player}</p>
              { }
              {getEmbedLink(achievement.video) ? (
                <iframe
                  src={getEmbedLink(achievement.video)}
                  title="Achievement Video"
                  style={{ width: '100%', aspectRatio: '16/9', borderRadius: 8, marginBottom: 16, border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : isImageUrl(achievement.video) ? (
                <img
                  src={achievement.video}
                  alt="Achievement Video"
                  style={{ width: '100%', maxHeight: '600px', borderRadius: 8, marginBottom: 16, objectFit: 'cover' }}
                />
              ) : achievement.video ? (
                <a href={achievement.video} target="_blank" rel="noopener" style={{ color: '#7ecfff', textDecoration: 'underline', marginBottom: 16, display: 'block' }}>Watch Video</a>
              ) : (
                <p style={{ color: '#aaa', marginBottom: 16 }}>No video available</p>
              )}
              { }
              {achievement.tags && achievement.tags.length > 0 && (
                <div style={{ marginBottom: 16, textAlign: 'left' }}>
                  <strong>Tags:</strong>{' '}
                  <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', verticalAlign: 'middle', justifyContent: 'flex-start' }}>
                    {achievement.tags.sort((a, b) => TAG_PRIORITY_ORDER.indexOf(a.toUpperCase()) - TAG_PRIORITY_ORDER.indexOf(b.toUpperCase())).map(tag => (
                      <Tag tag={tag} key={tag} />
                    ))}
                  </span>
                </div>
              )}
              { }
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12, marginTop: 12 }}>
                {achievement.levelID && (
                  <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>ID:</strong>
                    <button
                      onClick={() => { navigator.clipboard.writeText(achievement.levelID); showCopyNotification(`Copied ID: ${achievement.levelID}`); }}
                      className="copy-btn"
                      style={{ marginLeft: 4 }}
                    >{achievement.levelID}</button>
                  </div>
                )}
                {achievement.date && (
                  <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>Date:</strong>
                    <button
                      onClick={() => { navigator.clipboard.writeText(formatDate(achievement.date)); showCopyNotification(`Copied Date: ${formatDate(achievement.date)}`); }}
                      className="copy-btn"
                      style={{ marginLeft: 4 }}
                    >{formatDate(achievement.date)}</button>
                  </div>
                )}
                {achievement.length !== undefined && achievement.length !== null && achievement.length !== '' && (
                  <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>Length:</strong>
                    <button
                      onClick={() => { navigator.clipboard.writeText(formatLength(achievement.length)); showCopyNotification(`Copied Length: ${formatLength(achievement.length)}`); }}
                      className="copy-btn"
                      style={{ marginLeft: 4 }}
                    >{formatLength(achievement.length)}</button>
                  </div>
                )}
                {achievement.version && (
                  <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>Version:</strong>
                    <button
                      onClick={() => { navigator.clipboard.writeText(achievement.version); showCopyNotification(`Copied Version: ${achievement.version}`); }}
                      className="copy-btn"
                      style={{ marginLeft: 4 }}
                    >{achievement.version}</button>
                  </div>
                )}
              </div>
              {placement && (
                <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong>Rank:</strong>
                  <button
                    onClick={() => { navigator.clipboard.writeText(placement); showCopyNotification(`Copied Rank: ${placement}`); }}
                    className="copy-btn"
                    style={{ marginLeft: 4 }}
                  >{placement}</button>
                </div>
              )}
              {achievement.showcaseVideo && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 6 }}>Showcase</h3>
                  {getEmbedLink(achievement.showcaseVideo) ? (
                    <iframe
                      src={getEmbedLink(achievement.showcaseVideo)}
                      title="Showcase Video"
                      style={{ width: '100%', aspectRatio: '16/9', borderRadius: 8, border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : isImageUrl(achievement.showcaseVideo) ? (
                    <img
                      src={achievement.showcaseVideo}
                      alt="Showcase Image"
                      style={{ width: '100%', maxHeight: '600px', borderRadius: 8, objectFit: 'cover' }}
                    />
                  ) : (
                    <a href={achievement.showcaseVideo} target="_blank" rel="noopener" style={{ color: '#7ecfff', textDecoration: 'underline' }}>Watch Showcase</a>
                  )}
                </div>
              )}
              { }
              {achievement.submitter && (
                <div style={{ marginTop: 16, color: '#b6c2e1', fontSize: 13 }}>
                  <strong>Thanks for submitting this achievement,</strong> {achievement.submitter}
                </div>
              )}
            </div>
          </div>
          {copyMsg && (
            <div className="copy-notification show">
              {copyMsg}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
