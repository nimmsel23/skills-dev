module.exports = {
  content: ['./index.html', './*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        fit: {
          bg: 'var(--bg)',
          bg2: 'var(--bg2)',
          card: 'var(--card)',
          line: 'var(--line)',
          ink: 'var(--ink)',
          dim: 'var(--dim)',
          accent: 'var(--accent)',
        },
      },
    },
  },
  plugins: [],
};
