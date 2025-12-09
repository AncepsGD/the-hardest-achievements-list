import dynamic from 'next/dynamic';
import React from 'react';

const SharedList = dynamic(() => import('../components/SharedList'), { ssr: false });

export default function ListPage() {
  return (
    <SharedList
      dataUrl="/achievements.json"
      dataFileName="achievements.json"
      storageKeySuffix="achievements"
    />
  );
}
