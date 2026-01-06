import { useEffect, useRef } from 'react';
import './Background.module.css';
async function fetchJsonFallback(paths, signal) {
  for (const p of paths) {
    try {
      const res = await fetch(p, { signal });
      if (res && res.ok) return res.json();
    } catch (e) {

    }
  }
  throw new Error('all fetches failed');
}

export default function Background({ bgImage }) {
  const lastBgRef = useRef(null);
  const activeIndex = useRef(0);

  useEffect(() => {
    if (!bgImage) return;
    if (lastBgRef.current === bgImage) return;

    const layer0 = document.getElementById('bg-layer-0');
    const layer1 = document.getElementById('bg-layer-1');
    const layers = [layer0, layer1];
    const next = 1 - (activeIndex.current || 0);
    const target = layers[next];
    if (!target) return;

    const img = new Image();
    img.src = bgImage;
    img.onload = () => {
      target.style.backgroundImage = `url('${bgImage}')`;

      target.classList.add('show');
      const prev = layers[1 - next];
      if (prev) prev.classList.remove('show');
      activeIndex.current = next;
      lastBgRef.current = bgImage;
    };

    return () => { img.onload = null; };
  }, [bgImage]);
  useEffect(() => {
    if (bgImage) return;

    const layer0 = document.getElementById('bg-layer-0');
    const layer1 = document.getElementById('bg-layer-1');
    const layers = [layer0, layer1];

    function setBackgroundFromAchievements(achievements) {
      if (!achievements || !achievements.length) return;
      let topAchievement = achievements.find(a => a && (a.thumbnail || a.levelID));
      if (!topAchievement) return;
      let bgUrl = topAchievement.thumbnail || (topAchievement.levelID ? `https://levelthumbs.prevter.me/thumbnail/${topAchievement.levelID}/small` : null);
      if (!bgUrl || lastBgRef.current === bgUrl) return;
      const next = 1 - (activeIndex.current || 0);
      const target = layers[next];
      if (!target) return;
      const img = new Image();
      img.src = bgUrl;
      images.push(img);
      img.onload = () => {
        target.style.backgroundImage = `url('${bgUrl}')`;
        target.classList.add('show');
        const prev = layers[1 - next];
        if (prev) prev.classList.remove('show');
        activeIndex.current = next;
        lastBgRef.current = bgUrl;
      };
    }
    const controller = new AbortController();
    const images = [];

    fetchJsonFallback(['/achievements.json', 'achievements.json'], controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        setBackgroundFromAchievements(data);
      })
      .catch(() => { });

    return () => {
      controller.abort();

      images.forEach(i => { try { i.onload = null; } catch (e) { } });
    };
  }, []);

  return (
    <div id="background-root">
      <div id="blue-tint-overlay"></div>
      <div id="dynamic-background">
        <div id="bg-layer-0" className="bg-layer"></div>
        <div id="bg-layer-1" className="bg-layer"></div>
      </div>
    </div>
  );
}
