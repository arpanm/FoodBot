const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    'background/service-worker': './src/background/service-worker.ts',
    'content-scripts/swiggy-content': './src/content-scripts/swiggy-content.ts',
    'ui/popup': './src/ui/popup.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: [/node_modules/, /__tests__/, /\.test\.ts$/],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'images', to: 'images', noErrorOnMissing: true },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/ui/popup.html',
      filename: 'ui/popup.html',
      chunks: ['ui/popup'],
    }),
  ],
  optimization: {
    minimize: false,
  },
  devtool: 'cheap-module-source-map',
};
