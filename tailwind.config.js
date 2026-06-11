/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        marco: {
          teal: '#0F4C5C',
          'teal-50': '#E6EDEF',
          'teal-100': '#B3CACF',
          'teal-200': '#80A7AF',
          'teal-300': '#4D848F',
          'teal-400': '#26656F',
          'teal-500': '#0F4C5C',
          'teal-600': '#0C3E4B',
          'teal-700': '#093039',
          'teal-800': '#062228',
          'teal-900': '#031417',
          orange: '#E36414',
          'orange-50': '#FCE9DC',
          'orange-100': '#F8C9A6',
          'orange-200': '#F3A874',
          'orange-300': '#EE8843',
          'orange-400': '#E36414',
          'orange-500': '#C25510',
          'orange-600': '#9E450D',
          'orange-700': '#79350A',
          'orange-800': '#552507',
          'orange-900': '#311504',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
