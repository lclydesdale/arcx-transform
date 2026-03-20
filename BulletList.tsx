
import React from 'react';

interface BulletListProps {
  items?: string[];
  prefix?: string;
}

const BulletList: React.FC<BulletListProps> = ({ items = [], prefix = '•' }) => {
  if (items.length === 0) {
    return <p className="opacity-30 italic text-[9px]">No documented entries</p>;
  }

  return (
    <ul className="space-y-1">
      {items.map((item, idx) => (
        <li key={idx} className="flex gap-1.5 items-start leading-[1.15]">
          <span className="opacity-40 font-bold shrink-0 text-[9px] mt-0.5">{prefix}</span>
          <span className="flex-1 text-[10.5px] font-medium tracking-tight break-words hyphens-auto opacity-95">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default BulletList;
