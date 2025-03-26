const path = require('path');

module.exports = {
    mode: 'development', // or 'production'
    entry: './src/index.js', // Path to your main JavaScript file
    output: {
        filename: 'main.js', // Output bundle file name
        path: path.resolve(__dirname, 'dist'), // Output directory
    },
};