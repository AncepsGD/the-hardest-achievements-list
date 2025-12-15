import dynamic from 'next/dynamic';
import React from 'react';

const SharedList = dynamic(() => import('../components/SharedList'), { ssr: false });

export default function PendingPage() {
  return (
    <SharedList
      dataUrl="/pending.json"
      dataFileName="pending.json"
      storageKeySuffix="pending"
      showPlatformToggle={false}
    />
  );
}
