// Design tokens extracted from the Match preparation redesigns
// (Detail & Prep-list HTML). Keeping them colocated with the
// preparation components because they encode a specific paper /
// sticker visual language — warm cream surfaces, hard ink-shadow
// offsets, mixed Instrument Serif + JetBrains Mono + Caveat.

export const preparationColors = {
  // Surfaces
  bg: '#FEFBF5',          // page background (warmest cream)
  cream: '#FAF8F5',       // alt cream tint
  card: '#FFFFFF',        // white card / L badge
  paper: '#F3EEE5',       // pale cream block (hero, suggestion chip bg)
  stone: '#C7BFB2',       // stone divider / chip border
  stoneSoft: '#ECE7DC',   // very pale stone (inset shadow ring)

  // Ink
  ink: '#1A2A30',         // primary text / hard shadow color
  inkSoft: 'rgba(26,42,48,0.12)', // hairline borders
  mute: '#4A5560',        // secondary text / muted icons

  // Accents
  clay: '#E36414',        // PREP tile, plan-missed, note Caveat quote
  teal: '#0F4C5C',        // W tile, plan-worked, big % preparation, checks

  // Status overlays
  scrim: 'rgba(20,28,32,0.55)',
} as const;

export const preparationFonts = {
  serif: 'InstrumentSerif_400Regular',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
  hand: 'Caveat_400Regular',
} as const;

// Hard 2px offset shadow — gives every card/tile the "sticker on
// a corkboard" feel that's all over the design. Applied via
// `shadowColor + shadowOffset + shadowOpacity:1 + shadowRadius:0`
// because that mimics CSS `box-shadow: 2px 2px 0 0 #1A2A30`.
export const stickerShadow = {
  shadowColor: preparationColors.ink,
  shadowOffset: { width: 2, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 2,
} as const;

export const stickerShadowSm = {
  shadowColor: preparationColors.ink,
  shadowOffset: { width: 1.5, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 1,
} as const;
