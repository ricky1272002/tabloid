import type { Configuration } from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';

import { rules } from './webpack.rules';
import { plugins as existingPlugins } from './webpack.plugins';

export const rendererConfig = (env: unknown, argv: { mode?: string }): Configuration => {
  // Determine if it's a production build using Webpack's mode argument
  const isProduction = argv.mode === 'production';

  // Create a fresh rules array for each call to avoid mutations across builds
  const newRules = [...rules]; 

  // Check if CSS rule already exists to prevent duplicates if config is cached/reused
  const cssRuleExists = newRules.some(rule => rule.test && rule.test.toString().includes('\\.css'));

  if (!cssRuleExists) {
    newRules.push({
      test: /\.css$/i,
      use: [
        isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
        { loader: 'css-loader' },
        { loader: 'postcss-loader' }
      ],
    });
  }

  return {
    module: {
      rules: newRules, // Use the new rules array
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
    // Optionally, explicitly set the mode based on Webpack's argument
    // mode: argv.mode || 'development',
  };
};
