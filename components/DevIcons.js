import React from 'react';

const Svg = ({ children, width = 18, height = 18, viewBox = '0 0 24 24', className }) => (
  <svg width={width} height={height} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
    {children}
  </svg>
);

export const EditIcon = (props) => (
  <Svg {...props}>
    <path d="M3 21h4l11-11-4-4L3 17v4z" fill="currentColor" />
    <path d="M14.5 6.5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const UpIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <path d="M12 6l-6 6h12l-6-6z" fill="currentColor" />
  </Svg>
);

export const DownIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <path d="M12 18l6-6H6l6 6z" fill="currentColor" />
  </Svg>
);

export const CopyIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <rect x="9" y="9" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <rect x="4" y="4" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </Svg>
);

export const AddIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const DeleteIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <path d="M3 6h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const FileIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </Svg>
);

export const CheckIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export const NewIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChangelogIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <path d="M6 3h12v18H6z" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </Svg>
);

export const ResetIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <path d="M20 12a8 8 0 1 0-2.3 5.4L20 20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export const CollapseUpIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export const CollapseDownIcon = (props) => (
  <Svg {...props} viewBox="0 0 24 24">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export default {
  EditIcon,
  UpIcon,
  DownIcon,
  CopyIcon,
  AddIcon,
  DeleteIcon,
  FileIcon,
  CheckIcon,
  NewIcon,
  ChangelogIcon,
  ResetIcon,
  CollapseUpIcon,
  CollapseDownIcon,
};
