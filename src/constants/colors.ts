export const colors = {
  teal: '#0F4C5C',
  tealDark: '#093039',
  tealLight: '#4D848F',
  orange: '#E36414',
  orangeDark: '#9E450D',
  orangeLight: '#EE8843',
  background: '#FFFFFF',
  surface: '#F7F7F8',
  border: '#E5E7EB',
  text: '#0B1416',
  textMuted: '#6B7280',
  success: '#10B981',
  danger: '#EF4444',

  // Design-system palette from the Marco prototype (primitives.jsx `M`).
  // The neutrals above are cool Tailwind greys; these are the warm ones the
  // design actually uses. New/updated screens should pull from this group —
  // `ink` rather than `text`, `bg` rather than `background`.
  ink: '#1A2A30',
  inkSoft: '#4A5560',
  pencil: '#2F3A44',
  bg: '#FAF8F5',
  bgWarm: '#F3EEE5',
  cream: '#FEFBF5',
  line: '#8A8074',
  lineSoft: '#C7BFB2',
  tealDeep: '#0A3640',
  clay: '#E36414',
  clayLight: '#F4A06B',
  postit: '#FFF3A8',
  darkBg: '#11242B',
  darkPanel: '#163039',
  darkInk: '#E8E3D8',
} as const;

export type ColorKey = keyof typeof colors;
