const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const config = {
  // Define entry points for each script in your extension
  entry: {
    background: './src/background.ts',
    linkclump: './src/linkclump.ts',
    options: './src/pages/options.ts', // Entry point for options page script
  },
  output: {
    filename: (pathData) => {
      // Customize output filenames
      if (pathData.chunk.name === 'options') return 'pages/options.js';
      return '[name].js';
    },
    path: path.resolve(__dirname, 'build'),
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'], // Resolve TypeScript and JavaScript files
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Use Babel to transpile TypeScript
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]',
        },
      }
    ],
  },
  plugins: [
    // Copy static files to the output directory
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'src/images', to: 'images' }, // Copy images folder
        { from: 'src/pages/test.css', to: 'pages/test.css' },
      ],
    }),
    // Generate options.html and inject the script
    new HtmlWebpackPlugin({
      template: 'src/pages/options.html',
      filename: 'pages/options.html',
      chunks: ['options'],
    }),
    new HtmlWebpackPlugin({
        template: 'src/pages/test_area.html',
        filename: 'pages/test_area.html',
        chunks: ['linkclump'],
    }),
  ]
};

module.exports = (env, argv) => {
  // Production
  if (argv.mode === 'production') {
    config.mode = 'production';
  }

  // Development
  if (argv.mode === 'development') {
    config.mode = 'development';    // Use 'development' for non-minified output
    config.devtool = 'source-map';  // Generate source maps for debugging
  }

  return config;
};
