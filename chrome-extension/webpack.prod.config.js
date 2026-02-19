/**
 * Production Webpack Configuration for FoodBot Chrome Extension
 *
 * Optimizations:
 * - Code minification with Terser
 * - Tree shaking for unused code elimination
 * - Bundle size optimization
 * - Hidden source maps for debugging
 * - CSS minification
 * - Asset optimization
 *
 * @version 1.0.0
 */

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const isAnalyze = process.env.ANALYZE === 'true';

module.exports = {
  mode: 'production',

  entry: {
    'background/service-worker': './src/background/service-worker.ts',
    'content-scripts/swiggy-content': './src/content-scripts/swiggy-content.ts',
    'ui/popup': './src/ui/popup.ts',
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
    // Chrome extensions don't support module format
    environment: {
      arrowFunction: false,
      bigIntLiteral: false,
      const: false,
      destructuring: false,
      dynamicImport: false,
      forOf: false,
      module: false,
    },
  },

  module: {
    rules: [
      // TypeScript
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
              transpileOnly: false,
              compilerOptions: {
                sourceMap: true,
                declaration: false,
              },
            },
          },
        ],
        exclude: [/node_modules/, /__tests__/, /\.test\.ts$/],
      },

      // CSS with minification
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['autoprefixer'],
                  [
                    'cssnano',
                    {
                      preset: ['default', { discardComments: { removeAll: true } }],
                    },
                  ],
                ],
              },
            },
          },
        ],
      },

      // Images
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
        generator: {
          filename: 'assets/images/[name].[hash:8][ext]',
        },
      },

      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name].[hash:8][ext]',
        },
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@background': path.resolve(__dirname, 'src/background'),
      '@content-scripts': path.resolve(__dirname, 'src/content-scripts'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },

  plugins: [
    // Copy static assets
    new CopyPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: 'manifest.json',
          transform(content) {
            // Minify JSON in production
            const manifest = JSON.parse(content.toString());
            return JSON.stringify(manifest);
          },
        },
        {
          from: 'images',
          to: 'images',
          noErrorOnMissing: true,
        },
      ],
    }),

    // Generate HTML for popup
    new HtmlWebpackPlugin({
      template: './src/ui/popup.html',
      filename: 'ui/popup.html',
      chunks: ['ui/popup'],
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
      },
    }),

    // Bundle analyzer (optional)
    ...(isAnalyze
      ? [
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: 'bundle-report.html',
            openAnalyzer: false,
          }),
        ]
      : []),
  ],

  optimization: {
    minimize: true,
    minimizer: [
      // JavaScript minification
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log in production
            drop_debugger: true,
            pure_funcs: ['console.info', 'console.debug', 'console.warn'],
            passes: 2,
          },
          mangle: {
            safari10: true,
          },
          format: {
            comments: false,
            ascii_only: true,
          },
          keep_classnames: true, // Important for Chrome extensions
          keep_fnames: true, // Important for Chrome extensions
        },
        extractComments: false,
        parallel: true,
      }),

      // CSS minification
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
            },
          ],
        },
      }),
    ],

    // Split chunks for better caching
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
          name: 'common',
        },
      },
    },

    // Runtime chunk for better caching
    runtimeChunk: false, // Chrome extensions don't support runtime chunks

    // Module IDs
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',

    // Tree shaking
    usedExports: true,
    sideEffects: true,

    // Concatenate modules
    concatenateModules: true,
  },

  // Hidden source maps for production debugging
  devtool: 'hidden-source-map',

  // Performance hints
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000, // 500kb
    maxAssetSize: 512000, // 500kb
    assetFilter(assetFilename) {
      return assetFilename.endsWith('.js');
    },
  },

  // Cache for faster builds
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.webpack_cache'),
    buildDependencies: {
      config: [__filename],
    },
  },

  // Stats configuration
  stats: {
    colors: true,
    hash: false,
    version: false,
    timings: true,
    assets: true,
    chunks: false,
    modules: false,
    reasons: false,
    children: false,
    source: false,
    errors: true,
    errorDetails: true,
    warnings: true,
    publicPath: false,
  },

  // Ignore warnings for certain modules
  ignoreWarnings: [
    /Failed to parse source map/,
    /Critical dependency: the request of a dependency is an expression/,
  ],
};
