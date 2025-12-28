import dynamic from 'next/dynamic';
import React from 'react';

const SharedList = dynamic(() => import('../components/SharedList'), { ssr: false });

export default function LegacyPage() {
  return (
    <SharedList
      dataUrl="/legacy.json"
      dataFileName="legacy.json"
      storageKeySuffix="legacy"
      showPlatformToggle={false}
    />
  );
}
