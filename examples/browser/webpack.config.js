const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: distDir,
  },
  module: {
    rules: [
      {
        test: /.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: publicDir, to: distDir }
      ]
    }),
  ]
};
