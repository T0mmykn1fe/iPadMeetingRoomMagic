module.exports = function(grunt) {

  var serverScripts = ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js'];
  var clientScripts = [
    'public/js/eventManager.js',
    'public/js/main.js',
    'public/js/setup.js',
    'public/js/ui.js',
    'public/js/util.js'
  ];
  var jshintrc = ['**/.jshintrc'];

  grunt.initConfig({
    pkg: '<json:package.json>',
    nodeunit: {
      all: ['test/**/*.js']
    },
    jshint: {
      options: {
        jshintrc: true
      },
      all: serverScripts.concat(clientScripts)
    },
    watch: {
      scripts: {
          files: serverScripts.concat(clientScripts).concat(jshintrc),
          tasks: 'default',
          options : {
            interrupt : true
          }
      }
      
    }
  });

  // Default task.
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['jshint', 'nodeunit']);
  grunt.registerTask('run', 'run the server', function() {
    require('./lib/MEATIER');
    this.async();
  });
};