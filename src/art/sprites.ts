/**
 * Original pixel-art sprites, drawn as text: each character is one pixel, '.' is transparent.
 * No imports here, so scripts/make-icons.ts can reuse the same art for the app icons.
 */

export const PALETTE: Record<string, string> = {
  o: '#e8833a', // fox orange
  O: '#b85a1f', // fox shade
  w: '#f6efe2', // white fur
  k: '#1b1420', // eyes, nose, paws
  p: '#7b5cc0', // hat
  P: '#4f3787', // hat shade
  y: '#f2d65c', // star
  b: '#7a4a24', // wood
  B: '#4a2e17', // wood shade
  s: '#7d7f8c', // stone
  S: '#55576a', // stone shade
  f: '#ffe27a', // fire core
  F: '#f6a23a', // fire
  r: '#e0532a', // fire edge
  R: '#9c2f1c', // ember
  t: '#d1b07a', // tent
  T: '#94713f', // tent shade
  d: '#3b2a1a', // tent door
  g: '#2f6b3e', // pine
  G: '#1f4a2b', // pine shade
  n: '#5a3a1e', // trunk
};

export type Sprite = string[];

/** The fox sorceress, sitting, with her wizard hat (faces right). */
export const FOX: Sprite = [
  '........p.......',
  '.......pp.......',
  '.......pyp......',
  '......pppP......',
  '.....ppppPP.....',
  '..O.PPPPPPPP.O..',
  '.oOo.oooooo.oOo.',
  '.oOOooooooooOOo.',
  '.oooooooooooooo.',
  '.oowkoooooowkoo.',
  '.oooooooooooooo.',
  '..wwwwwkkwwwww..',
  '...wwwwwwwwww...',
  '....wwwwwwww....',
  '.....oooooo.....',
  '....oowwwwoo....',
  '...ooowwwwooo...oo',
  '...ooowwwwooo..oOOo',
  '...oooowwoooo..oOOo',
  '...oooooooooo..ooO.',
  '...oo.oooo.oo..oww',
  '...kk......kk..ww.',
];

/** Fire, three sizes, two flicker frames each. */
export const FIRE: Record<'embers' | 'small' | 'big', [Sprite, Sprite]> = {
  embers: [
    [
      '............',
      '............',
      '............',
      '............',
      '.....R......',
      '....RrR.R...',
      '..bBRrRBb...',
      '.sBbbbbbBs..',
      'ss.......ss.',
    ],
    [
      '............',
      '............',
      '............',
      '............',
      '......R.....',
      '...R.RrR....',
      '..bBRrRBb...',
      '.sBbbbbbBs..',
      'ss.......ss.',
    ],
  ],
  small: [
    [
      '............',
      '.....r......',
      '....rFr.....',
      '....rFFr....',
      '...rFfFr....',
      '...rFffFr...',
      '..bBrFfrBb..',
      '.sBbbbbbbBs.',
      'ss........ss',
    ],
    [
      '......r.....',
      '.....rr.....',
      '....rFFr....',
      '...rFFfr....',
      '...rFffFr...',
      '...rFffFr...',
      '..bBrFfrBb..',
      '.sBbbbbbbBs.',
      'ss........ss',
    ],
  ],
  big: [
    [
      '.....r......',
      '....rFr..r..',
      '...rFFr.rFr.',
      '..rFFfFrFFr.',
      '..rFffFFfFr.',
      '.rFfffffFFr.',
      '.rFfffffffr.',
      '.rFffffffFr.',
      '..rFffffFr..',
      '..bBrFfrBb..',
      '.sBbbbbbbBs.',
      'ss........ss',
    ],
    [
      '......r.....',
      '..r..rFr....',
      '.rFr.rFFr...',
      '.rFFrFfFFr..',
      '.rFfFFffFr..',
      '.rFFfffffFr.',
      '.rfffffffFr.',
      '.rFffffffFr.',
      '..rFffffFr..',
      '..bBrFfrBb..',
      '.sBbbbbbbBs.',
      'ss........ss',
    ],
  ],
};

export const TENT: Sprite = [
  '..........T...........',
  '.........tTT..........',
  '........ttTTT.........',
  '.......tttTTTT........',
  '......ttttTTTTT.......',
  '.....tttttdTTTTT......',
  '....ttttttddTTTTT.....',
  '...tttttttdddTTTTT....',
  '..ttttttttddddTTTTT...',
  '.tttttttttdddddTTTTT..',
  'ttttttttttddddddTTTTT.',
];

export const PINE: Sprite = [
  '......g.......',
  '.....ggG......',
  '....gggGG.....',
  '.....ggG......',
  '....gggGG.....',
  '...ggggGGG....',
  '....gggGG.....',
  '...ggggGGG....',
  '..gggggGGGG...',
  '...ggggGGG....',
  '..gggggGGGG...',
  '.ggggggGGGGG..',
  'gggggggGGGGGG.',
  '......n.......',
  '......n.......',
];

export const LOG_PILE: Sprite = [
  '..bBb.bBb.',
  '.bBBBbBBBb',
  'bBbBbBbBbB',
];
