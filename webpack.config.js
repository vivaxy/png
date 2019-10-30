/**
 * @since 2019-10-30 03:49
 * @author vivaxy
 */
module.exports = {
  mode: 'development',
  entry: {
    png: './src/index.ts',
  },
  output: {
    path: __dirname,
    filename: 'dist/index.js',
    libraryTarget: 'window',
    library: 'png',
  },
  devtool: 'eval-source-map',
  resolve: {
    extensions: ['.js', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  devServer: {
    hot: true,
    open: true,
    openPage: 'demo/index.html',
  },
};
