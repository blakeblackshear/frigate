// Karma configuration
// Generated on Tue Oct 04 2016 13:53:46 GMT+0200 (CEST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '../',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      '.config/pretest.js',
      {
        pattern: 'spec/fixtures/fixture.css',
        included: false,
        served: true
      },
      {
        pattern: 'spec/fixtures/fixture.svg',
        included: false,
        served: true
      },
      {
        pattern: 'spec/fixtures/pixel.png',
        included: false,
        served: true
      },
      'dist/svg.js',
      'spec/spec/**/*.js'
    ],
    
    proxies: {
      '/fixtures/': '/base/spec/fixtures/'
    },


    // list of files to exclude
    exclude: [],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'dist/svg.js': ['coverage']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage'],


    // configure the coverage reporter
    coverageReporter: {
      // Specify a reporter type.
      type: 'lcov',
      dir: 'coverage/',
      subdir: function(browser) {
        // normalization process to keep a consistent browser name accross different OS
        return browser.toLowerCase().split(/[ /-]/)[0]; // output the results into: './coverage/firefox/'
      }
    },


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Firefox'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
