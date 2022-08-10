const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'index.js',
    path: distDir,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: publicDir, to: distDir }
      ]
    }),
  ]
};
