import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type MarcoAvatarProps = {
  size?: number;
};

export const MarcoAvatar = ({ size = 160 }: MarcoAvatarProps) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    {/* 1. Dashed halo ring */}
    <Circle
      cx="50"
      cy="52"
      r="46"
      fill="none"
      stroke="#0F4C5C"
      strokeWidth="1.2"
      strokeDasharray="3 3"
      opacity="0.55"
    />

    {/* 2. Teal shirt collar */}
    <Path
      d="M36 84 q14 8 28 0 L70 100 L30 100 Z"
      fill="#0F4C5C"
      opacity="0.9"
    />

    {/* 3. Collar V-line */}
    <Path
      d="M44 86 L50 92 L56 86"
      fill="none"
      stroke="#1a2a30"
      strokeWidth="1.44"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* 4. Face */}
    <Path
      d="M22 50 q0 -28 28 -30 q28 2 28 30 q0 22 -14 32 q-14 8 -28 0 q-14 -10 -14 -32 Z"
      fill="#f4d9c2"
      stroke="#1a2a30"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />

    {/* 5. Left ear */}
    <Path
      d="M22 52 q-4 1 -3 6 q1 5 4 5"
      fill="#f4d9c2"
      stroke="#1a2a30"
      strokeWidth="1.92"
      strokeLinejoin="round"
    />

    {/* 6. Right ear */}
    <Path
      d="M78 52 q4 1 3 6 q-1 5 -4 5"
      fill="#f4d9c2"
      stroke="#1a2a30"
      strokeWidth="1.92"
      strokeLinejoin="round"
    />

    {/* 7. Hair */}
    <Path
      d="M22 42 q4 -22 28 -22 q24 0 28 22 q-6 -8 -16 -8 q-6 0 -10 4 q-4 -4 -10 -4 q-10 0 -20 8 Z"
      fill="#26201c"
      stroke="#1a2a30"
      strokeWidth="2.16"
      strokeLinejoin="round"
    />

    {/* 8. Orange headband — renders on top of hair */}
    <Path
      d="M21 38 q14 -10 29 -10 q15 0 29 10 l0 6 q-14 -7 -29 -7 q-15 0 -29 7 Z"
      fill="#E36414"
      stroke="#1a2a30"
      strokeWidth="1.92"
    />

    {/* 9. Left eyebrow */}
    <Path
      d="M33 40 q5 -3 10 1"
      fill="none"
      stroke="#1a2a30"
      strokeWidth="2.4"
      strokeLinecap="round"
    />

    {/* 10. Right eyebrow */}
    <Path
      d="M57 41 q5 -4 10 -1"
      fill="none"
      stroke="#1a2a30"
      strokeWidth="2.4"
      strokeLinecap="round"
    />

    {/* 11. Left eye */}
    <Path
      d="M36 47 q3 -3 6 0"
      fill="none"
      stroke="#1a2a30"
      strokeWidth="2.4"
      strokeLinecap="round"
    />

    {/* 12. Right eye */}
    <Path
      d="M58 47 q3 -3 6 0"
      fill="none"
      stroke="#1a2a30"
      strokeWidth="2.4"
      strokeLinecap="round"
    />

    {/* 13. Nose */}
    <Path
      d="M50 50 q-1 6 -2 10 q3 2 6 0"
      fill="none"
      stroke="#1a2a30"
      strokeWidth="1.68"
      strokeLinecap="round"
    />

    {/* 14. Smile */}
    <Path
      d="M42 64 q10 5 17 -2"
      fill="none"
      stroke="#1a2a30"
      strokeWidth="2.4"
      strokeLinecap="round"
    />

    {/* 15-17. Freckles */}
    <Circle cx="40" cy="74" r="0.7" fill="#1a2a30" opacity="0.55" />
    <Circle cx="50" cy="78" r="0.7" fill="#1a2a30" opacity="0.55" />
    <Circle cx="60" cy="74" r="0.7" fill="#1a2a30" opacity="0.55" />
  </Svg>
);
