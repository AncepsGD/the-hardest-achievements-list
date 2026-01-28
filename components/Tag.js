import React from 'react';

const TAG_PRIORITY_ORDER = [
  'LEVEL', 'CHALLENGE', 'PLATFORMER', 'VERIFIED', 'DEATHLESS', 'COIN ROUTE', 'LOW HERTZ', 'MOBILE', 'SPEEDHACK',
  'NOCLIP', 'MISCELLANEOUS', 'PROGRESS', 'CONSISTENCY', '2P', 'CBF',
  'RATED', 'FORMERLY RATED', 'OUTDATED VERSION', 'TENTATIVE'
];

const TAG_DEFINITIONS = {
  PLATFORMER: {
    className: 'tag-platformer',
    text: 'Platformer',
    tooltip: 'Uses platformer mode, a side-scrolling mode added in update 2.2.'
  },
  LEVEL: {
    className: 'tag-level',
    text: 'Level',
    tooltip: 'A traditional level, which spans 30+ seconds.'
  },
  CHALLENGE: {
    className: 'tag-challenge',
    text: 'Challenge',
    tooltip: 'Tiny or short length level; a level that spans under 30 seconds.'
  },
  'LOW HERTZ': {
    className: 'tag-low-hertz',
    text: 'Low Hertz',
    tooltip: 'Done at a low hz. Added when it significantly increases difficulty.'
  },
  MOBILE: {
    className: 'tag-mobile',
    text: 'Mobile',
    tooltip: 'Played on mobile.'
  },
  SPEEDHACK: {
    className: 'tag-speedhack',
    text: 'Speedhack',
    tooltip: 'Altered speed of the game.'
  },
  NOCLIP: {
    className: 'tag-noclip',
    text: 'Noclip',
    tooltip: 'Done with noclip on.'
  },
  DEATHLESS: {
    className: 'tag-deathless',
    text: 'Deathless',
    tooltip: 'Platformer done without dying.'
  },
  MISCELLANEOUS: {
    className: 'tag-miscellaneous',
    text: 'Miscellaneous',
    tooltip: "An achievement that doesn't fit with any other tags."
  },
  PROGRESS: {
    className: 'tag-progress',
    text: 'Progress',
    tooltip: 'Parts of the level completed.'
  },
  CONSISTENCY: {
    className: 'tag-consistency',
    text: 'Consistency',
    tooltip: 'Progress done in a row.'
  },
  SPEEDRUN: {
    className: 'tag-speedrun',
    text: 'Speedrun',
    tooltip: 'Time of completion contributes to the difficulty.'
  },
  '2P': {
    className: 'tag-2p',
    icon: '/assets/2p-icon.webp',
    text: '2 Player',
    tooltip: 'Level uses 2 player mode.'
  },
  CBF: {
    className: 'tag-cbf',
    icon: '/assets/cbf-logo.webp',
    text: 'CBF',
    tooltip: 'Uses Geode mod Click Between Frames to input actions in between visual frames, increasing input precision.'
  },
  RATED: {
    className: 'tag-rated',
    icon: '/assets/rated-icon.webp',
    text: 'Rated',
    tooltip: 'Level is rated in-game.'
  },
  'FORMERLY RATED': {
    className: 'tag-formerly-rated',
    icon: '/assets/formerly-rated-icon.webp',
    text: 'Formerly Rated',
    tooltip: 'Level was rated but had its rating status removed.'
  },
  'OUTDATED VERSION': {
    className: 'tag-outdated-version',
    icon: '/assets/outdated-version-icon.webp',
    text: 'Outdated Version',
    tooltip: 'Achievement is on an older version of its level than the current one, or done on a version before the latest release.'
  },
  VERIFIED: {
    className: 'tag-verified',
    text: 'Verified',
    tooltip: 'Levels that are verified without alterations such as speedhack.'
  },
  'COIN ROUTE': {
    className: 'tag-coin-route',
    icon: '/assets/coin-icon.webp',
    text: 'Coin Route',
    tooltip: "Coin(s) collected that contribute to the difficulty."
  },
  TENTATIVE: {
    className: 'tag-tentative',
    icon: '/assets/warning-icon.webp',
    text: 'Tentative',
    tooltip: 'Tentative placement; unfixed; subject to change.'
  },
};

const TagComponent = function Tag({ tag, onClick, tabIndex, clickable, state }) {
  const def = TAG_DEFINITIONS[tag.toUpperCase()] || {};
  const classNames = [
    'tag',
    def.className,
    clickable ? 'tag-clickable' : '',
    state === 'include' ? 'tag-include' : '',
    state === 'exclude' ? 'tag-exclude' : '',
    state === 'neutral' ? 'tag-neutral' : ''
  ].filter(Boolean).join(' ');
  return (
    <>
      <span
        className={classNames}
        title={def.tooltip || (def.text || tag)}
        aria-label={def.tooltip || (def.text || tag)}
        onClick={clickable ? onClick : undefined}
        tabIndex={clickable ? (tabIndex ?? 0) : undefined}
        role={clickable ? 'button' : undefined}
        aria-pressed={clickable ? (state === 'include' ? 'true' : 'false') : undefined}
        onKeyDown={clickable ? (e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick && onClick(e);
          }
        }) : undefined}
      >
        {def.icon && (
          <img src={def.icon} alt={def.text} />
        )}
        <span>{def.text || tag}</span>
      </span>
      <style jsx>{`
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
          font-size: 13px;
          padding: 4px 10px;
          border-radius: 8px;
          margin-right: 4px;
          box-shadow: 0 2px 8px #00000038, 0 4px 16px #0000001A; /* Enhanced drop shadow */
          color: #FFFFFF;
          background: linear-gradient(135deg, #23283E 0%, #2E3451 100%);
          text-transform: uppercase;
          text-shadow: 2px 2px 6px #000000D9, 0 1px 2px #000000;
          transition: background 0.3s, border 0.2s, opacity 0.2s;
          outline: none;
          cursor: default;
        }
        .tag-clickable {
          cursor: pointer;
          box-shadow: 0 2px 8px #0000002E;
        }
        .tag-clickable:hover {
          opacity: 0.85;
          filter: brightness(1.1);
        }
        .tag-include {
          border: none;
          box-shadow: 0 0 0 3px #5EFF3E;
        }
        .tag-exclude {
          border: none;
          box-shadow: 0 0 0 3px #E9403B;
          opacity: 0.7;
        }
        .tag-neutral {
          border: none;
          box-shadow: none;
        }
        .tag img {
          width: 16px;
          height: 16px;
          vertical-align: middle;
          filter: drop-shadow(0 2px 4px #000000B3) drop-shadow(0 0px 1px #000000);
        }
.tag-level {
  background: linear-gradient(135deg, #43E97B 0%, #25A4B4 100%);
}
.tag-challenge {
  background: linear-gradient(135deg, #FFB347 0%, #FF5FA2 100%);
}
.tag-low-hertz {
  background: linear-gradient(135deg, #D724E7 0%, #6232D1 100%);
}
.tag-speedrun {
  background: linear-gradient(135deg, #e7e7e7 0%, rgba(255, 216, 145, 1) 100%);
}
.tag-mobile {
  background: linear-gradient(135deg, #2398FF 0%, #4FFFF7 100%);
}
.tag-speedhack {
  background: linear-gradient(135deg, #E92EAAFF 0%, #93225c 100%);
}
.tag-noclip {
  background: linear-gradient(135deg, #E52D27 0%, #5e004f 100%);
}
.tag-miscellaneous {
  background: linear-gradient(135deg, #545466 0%, #29272F 100%);
}
.tag-progress {
  background: linear-gradient(135deg, #87ebbc 0%, #2f9bc6 100%);
}
.tag-consistency {
  background: linear-gradient(135deg, #4f58e4 0%, #1b007e 100%);
}
.tag-2p {
  background: linear-gradient(135deg, #ff7800 0%, #3e89ff 100%);
}
.tag-cbf {
  background: linear-gradient(135deg, #FF758C 0%, #DB303F 100%);
}
.tag-rated {
  background: linear-gradient(135deg, #ffcd58 0%, #db6f46 100%);
}
.tag-formerly-rated {
  background: linear-gradient(135deg, #FF9966 0%, #833325 100%);
}
.tag-outdated-version {
  background: linear-gradient(135deg, #8A8673 0%, #CE9B2F 100%);
}
.tag-verified {
  background: linear-gradient(135deg, #9EF04D 0%, #00b896 100%)
}
.tag-coin-route {
  background: linear-gradient(135deg, #A8ACB3 0%, #35383A 100%);
}
.tag-tentative {
  background: linear-gradient(135deg, #A68B62 0%, #44392F 100%)
}
.tag-platformer {
  background: linear-gradient(135deg, #4372D8 0%, #FF8262 100%);
}
.tag-deathless {
  background: linear-gradient(135deg, #2B0000 0%, #050000 100%);
}
      `}</style>
      <style jsx>{`
        @media (max-width: 600px) {
          .tag {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 6px;
            gap: 2px;
          }
          .tag img {
            width: 13px;
            height: 13px;
          }
        }
      `}</style>
    </>
  );
};

const Tag = React.memo(TagComponent, (prev, next) => {
  return prev.tag === next.tag && prev.state === next.state && prev.clickable === next.clickable && prev.tabIndex === next.tabIndex && prev.onClick === next.onClick;
});

export default Tag;

export { TAG_DEFINITIONS, TAG_PRIORITY_ORDER };
