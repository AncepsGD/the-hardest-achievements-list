import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';

const SharedList = dynamic(() => import('../components/SharedList'), { ssr: false });

export default function LegacyPage() {
  const [rankOffset, setRankOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/achievements.json');
        const text = await res.text();
        let parsed = [];
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          try {
            parsed = JSON.parse(text.replace(/[^\x20-\x7E\r\n\t]+/g, ''));
          } catch (e2) {
            parsed = [];
          }
        }
        if (cancelled) return;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const ranks = parsed.map(a => {
            const r = a && a.rank != null ? Number(a.rank) : NaN;
            return Number.isFinite(r) ? r : NaN;
          }).filter(Number.isFinite);
          const maxRank = ranks.length ? Math.max(...ranks) : parsed.length;
          setRankOffset(Number(maxRank) || 0);
        }
      } catch (err) {
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <SharedList
      dataUrl="/legacy.json"
      dataFileName="legacy.json"
      storageKeySuffix="legacy"
      showPlatformToggle={false}
      rankOffset={rankOffset}
      showTiers={true}
    />
  );
}
