import dynamic from 'next/dynamic';
import React from 'react';

const SharedList = dynamic(() => import('../components/betasharedlist'), { ssr: false });

export default function TimelinePage() {
  return (
    <SharedList
      dataUrl="/timeline.json"
      dataFileName="timeline.json"
      storageKeySuffix="timeline"
      mode="timeline"
    />
  );
}
