import type { Configuration } from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';

import { rules } from './webpack.rules';
import { plugins as existingPlugins } from './webpack.plugins';

// Determine if it's a production build
const isProduction = process.env.NODE_ENV === 'production';

rules.push({
  test: /\.css$/i,
  use: [
    isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
    { loader: 'css-loader' },
    { loader: 'postcss-loader' }
  ],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins: [
    ...existingPlugins,
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src', 'renderer', 'index.html'),
      filename: 'index.html'
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
