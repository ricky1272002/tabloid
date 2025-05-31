import type { Configuration } from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

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
    ...plugins,
    new MiniCssExtractPlugin(),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
