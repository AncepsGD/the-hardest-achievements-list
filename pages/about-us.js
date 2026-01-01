import Head from 'next/head';
import React, { useState, useEffect } from 'react';
import Background from '../components/Background';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function AboutUs() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function handleResize() { setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 900); }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return (
    <>
      <Head>
        <title>About Us · The Hardest Achievements List</title>
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
      <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '2rem', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '2rem', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
          {!isMobile && <Sidebar />}
          <section className="about-us about-us-container">
            <h2>The Hardest Achievements List</h2>
            <p>What is this list?</p>
            <p>
              This list ranks <strong>rated levels</strong>, <strong>unrated</strong>, <strong>challenges</strong>,
              <strong>runs</strong>, <strong>speedhacked</strong>, and more. This is all under one list, sorted by
              difficulty, with the baseline starting at <strong>Tartarus</strong>.
            </p>
            <h3>Owner</h3>
            <ul>
              <li><strong>Anceps</strong></li>
            </ul>
            <h3>List Editor</h3>
            <ul>
              <li><strong>Arcadie</strong></li>
              <li><strong>jak</strong></li>
              <li><strong>exiled_shade</strong></li>
              <li><strong>TYATYAPKA</strong></li>
            </ul>
            <h3>List Helper</h3>
            <ul>
              <li><strong>goofygdplayer_</strong></li>
            </ul>
            <h3>Server Moderator</h3>
            <ul>
              <li><strong>Grave</strong></li>
            </ul>
            <h3>Trial Moderator</h3>
            <ul>
              <li><strong>stax</strong></li>
            </ul>
            <h3>Tag Definitions</h3>
            <ul>
              <li><b>Level</b> — A traditional level, which spans 30+ seconds. (Acheron)</li>
              <li><b>Challenge</b> — Tiny or short length level; a level that spans under 30 seconds. (VSC)</li>
              <li><b>Platformer</b> — Uses platformer mode, a side-scrolling mode added in update 2.2. (Diamonds For Dashers)</li>
              <li><b>Verified</b> — Levels that are verified without alterations such as speedhack. (CBF, Low Hertz, etc. can qualify if it's the first completion.)</li>
              <li><b>Deathless</b> — Platformer done without dying. (Null (Deathless))</li>
              <li><b>Coin Route</b> — Coin(s) collected that contribute to the difficulty. (Checked Steam (1st Coin))</li>
              <li><b>Low Hertz</b> — Done at a low hz. Added when it significantly increases difficulty. (The Rupture 60hz)</li>
              <li><b>Mobile</b> — Played on mobile. (Hard Machine 144hz Mobile)</li>
              <li><b>Speedhack</b> — Altered speed of the game. (Trueffet 1.3x)</li>
              <li><b>Noclip</b> — Done with noclip on. (vsc superbuff 6 deaths, 99.79 accuracy)</li>
              <li><b>Miscellaneous</b> — An achievement that doesn't fit with any other tags.</li>
              <li><b>Progress</b> — Parts of the level completed. (Singularity 61%)</li>
              <li><b>Consistency</b> — Progress done in a row. (Slaughterhouse 300%, Extra Mile 77%, 69%, 53%)</li>
              <li><b>Speedrun</b> — Time of completion contributes to the difficulty. (Terminal Heaven (Speedrun))</li>
              <li><b>2P</b> — Level uses 2 player mode. (Codependence)</li>
              <li><b>CBF</b> — Uses Geode mod Click Between Frames to input actions in between visual frames, increasing input precision.</li>
              <li><b>Rated</b> — Level is rated ingame.</li>
              <li><b>Formerly Rated</b> — Level was rated, but had its rating status removed. (Natural Disaster (GammaReXx))</li>
              <li><b>Outdated Version</b> — Achievement is on an older version of its level than the current one, or done on a version before the latest release. (Silent clubstep 2.1)</li>
              <li><b>Tentative</b> — Tentative placement; unfixed; subject to change.</li>
            </ul>
            <h3>Rules</h3>
            <section>
              <h4>Geometry Dash</h4>
              <p>
                Only achievements within the levels of the official Geometry Dash series are eligible. Submissions from platformer levels, other metrics (e.g., creator points, in-game achievements, stars), or other games will not be accepted.
              </p>
            </section>
            <section>
              <h4>Baseline</h4>
              <p>
                To be included in the main list, an achievement must be more difficult than the lowest-ranked current entry.
              </p>
              <h4>One Thousand Achievements Limit</h4>
              <p>
                If the baseline rank approaches or reaches 1000, a new baseline will be reassessed &amp; established, and any achievements falling below this updated threshold will be moved to the Legacy List.
              </p>
            </section>
            <section>
              <h4><b>External Factors</b></h4>
              <p>
                <b>Achievements that rely on artificially increased difficulty through external limitations are <u>not eligible</u>.</b>
                <br />
                This includes (but is not limited to):
              </p>
              <ul>
                <li>Using a low-polling-rate mouse</li>
                <li>Playing blindfolded or with the monitor turned off</li>
                <li>Impaired setup</li>
              </ul>
              <div>
                <b>Exception:</b> Low-hertz achievements performed on mobile devices are exempt from this rule due to the inherent input latency of touchscreen controls. These achievements are recognized separately and marked with a dedicated <b>mobile</b> tag.
              </div>
            </section>
            <section>
              <h4><b>Consistency</b></h4>
              <ol>
                <li>
                  <b>Significant Difficulty Increase</b>
                  <p>A consistency achievement must represent a clear and substantial increase in difficulty compared to the standard execution of the level. (e.g., 75% then 100%, 150%, 70 spots above, exceptions are obviously made if it's unbalanced.)</p>
                </li>
                <li>
                  <b>One Achievement Per Level</b>
                  <p>Only one consistency achievement may be active per level at any given time.</p>
                </li>
                <li>
                  <b>Achievement Replacement</b>
                  <ul>
                    <li>If a new consistency achievement is validated as more difficult than the current one, it will <b>replace</b> the existing achievement.</li>
                    <li>Submissions that are less difficult than the current achievement will <b>not be accepted</b>.</li>
                  </ul>
                </li>
                <li>
                  <b>Allowed Actions</b>
                  <p>The following actions are permitted during attempts, provided they aren’t meaningful attempts:</p>
                  <ul>
                    <li>Re-entering the level</li>
                    <li>Restarting</li>
                    <li>Switching start positions</li>
                    <li>Filler deaths (e.g., No clicking, random clicking)</li>
                  </ul>
                </li>
                <li>
                  <b>Performance Threshold</b>
                  <p>All attempts must demonstrate performance closely comparable in difficulty to the highest-performing run.</p>
                  <p>Examples of unacceptable attempts include <b>wildly inconsistent performances</b> (e.g., 215%, 8%, 100%), as they do not reflect true consistency. In such cases, only the highest-performing run (e.g., 215%) will be considered.</p>
                </li>
                <li>
                  <b>Moderation & Discretion</b>
                  <p>In cases of ambiguity, borderline performance, or disputed claims, a dedicated moderation team will review and evaluate the submission.</p>
                </li>
              </ol>
            </section>
          </section>
        </div>
      </main>
    </>
  );
}






