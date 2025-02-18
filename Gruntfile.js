module.exports = function(grunt) {

	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);
	require('time-grunt')(grunt);

	// Project configuration.
	grunt.initConfig({
		// Metadata.
		pkg: grunt.file.readJSON('package.json'),
		banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
			'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
			'<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
			'* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>;' +
			' @license <%= pkg.license %> License */\n',
		config: {
			root: 'web/', // from domain root, do not include the first slash, do include a trailing slash
			jsSrc: '<%= config.root %>js/',
			cssSrc: '<%= config.root %>css/',
			imgSrc: '<%= config.root %>img/',
			iconsSrc: '<%= config.imgSrc %>icons/',
			distFolder: '<%= config.root %>dist/<%= pkg.version %>/'
		},
		// Task configuration.
		concat: {
			options: {
				banner: '<%= banner %>',
				stripBanners: true
			},
			js: {
				src: [
					'<%= config.jsSrc %>initial.js',
					'<%= config.jsSrc %>fonts.js'
				],
				dest: '<%= config.distFolder %>initial.js'
			},
			jsAsync: {
				src: [
					'node_modules/fg-loadjs/loadJS.js',
					'<%= config.jsSrc %>timeago.js',
					'<%= config.jsSrc %>async.js'
					],
				dest: '<%= config.distFolder %>async.js'
			},
			jsDefer: {
				src: [
					'<%= config.jsSrc %>google-analytics.js',
					'<%= config.jsSrc %>lazyimg.js',
					'<%= config.jsSrc %>toggle.js',
					'node_modules/infinity-burger/infinity-burger.js',
					'node_modules/speedlify-score/speedlify-score.js',
					],
				dest: '<%= config.distFolder %>defer.js'
			}
			// CSS concat handled by SASS
		},
		terser: {
			// TODO no banner
			options: {},
			js: {
				src: '<%= concat.js.dest %>',
				dest: '<%= config.distFolder %>initial.min.js'
			},
			jsAsync: {
				src: '<%= concat.jsAsync.dest %>',
				dest: '<%= config.distFolder %>async.min.js'
			},
			jsDefer: {
				src: '<%= concat.jsDefer.dest %>',
				dest: '<%= config.distFolder %>defer.min.js'
			}
		},
		sass: {
			dist: {
				options: {
					style: 'expanded',
					sourcemap: 'file'
				},
				files: {
					'<%= config.distFolder %>initial.css': '<%= config.cssSrc %>initial.scss',
					'<%= config.distFolder %>defer.css': '<%= config.cssSrc %>defer.scss',
					'<%= config.distFolder %>keynote-extractor.css': '<%= config.cssSrc %>keynote-extractor.scss'
				}
			}
		},
		cssmin: {
			dist: {
				options: {
					banner: '<%= banner %>'
				},
				files: {
					'<%= config.distFolder %>initial.min.css': ['<%= config.distFolder %>initial.css'],
					'<%= config.distFolder %>defer.min.css': ['<%= config.distFolder %>defer.css']
				}
			}
		},
		copy: {
			// Because sass won’t import css files
			'css-to-sass': {
				files: {
					'web/css/lib/_infinity-burger.scss': 'node_modules/infinity-burger/infinity-burger.css',
					'web/css/lib/_speedlify-score.scss': 'node_modules/speedlify-score/speedlify-score.css',
				}
			},
			// For CSS inlining
			includes: {
				files: {
					'_includes/initial.min.css': ['<%= config.distFolder %>initial.min.css'],
					'_includes/initial.css': ['<%= config.distFolder %>initial.css'],
					'_includes/initial.min.js': ['<%= config.distFolder %>initial.min.js'],
					'_includes/initial.js': ['<%= config.distFolder %>initial.js']
				}
			}
		},
		compress: {
			mainGzip: {
				options: {
					mode: 'gzip'
				},
				// only do HTML files to comply with webmention brid.gy bug https://github.com/snarfed/bridgy/issues/878
				// when that bug is fixed, this can go away (and .htaccess stuff for gzip)
				files: [
					{
						expand: true,
						cwd: '_site/',
						src: ['**/*.html'],
						dest: '_site/',
						extDot: 'last',
						ext: '.html.zgz'
					}
				]
			},
			mainBrotli: {
				options: {
					mode: 'brotli',
					brotli: {
						mode: 1
					}
				},
				files: [
					// reenable when bridgy bug above in compress:mainGzip task is fixed.
					// {
					// 	expand: true,
					// 	cwd: '_site/',
					// 	src: ['**/*.html'],
					// 	dest: '_site/',
					// 	extDot: 'last',
					// 	ext: '.html.zbr'
					// },
					{
						expand: true,
						cwd: '_site/',
						src: ['**/*.js'],
						dest: '_site/',
						extDot: 'last',
						ext: '.js.zbr'
					},
					{
						expand: true,
						cwd: '_site/',
						src: ['**/*.css'],
						dest: '_site/',
						extDot: 'last',
						ext: '.css.zbr'
					},
					{
						expand: true,
						cwd: '_site/',
						src: ['**/*.svg'],
						dest: '_site/',
						extDot: 'last',
						ext: '.svg.zbr'
					}
				]
			}
		},
		htmlmin: {
			main: {
				options: {
					removeComments: true,
					collapseWhitespace: true
				},
				files: [
					{
						expand: true,
						cwd: '_site/',
						src: '**/*.html',
						dest: '_site/'
					}
				]
			}
		},
		shell: {
			eleventy: {
				command: 'npx @11ty/eleventy --quiet',
				options: {
					execOptions: {}
				}
			},
			eleventyProduction: {
				command: 'ELEVENTY_FEATURES=webmentions,counts,fullcopy npx @11ty/eleventy --quiet',
				options: {
					execOptions: {}
				}
			},
			// TODO https://github.com/shama/grunt-beep
			upload: {
				command: 'echo "Note: Requires an \'zachleat\' host in .ssh/config"; rsync --archive --verbose --stats --compress --rsh=ssh ./_site/ zachleat:/home/public/',
				options: {
					maxBuffer: 1024 * 1024 * 64,
					execOptions: {}
				}
			}
		},
		clean: {
			drafts: [ '_site/web/drafts/**' ],
			compressed: [ '_site/**/*.zbr', '_site/**/*.zgz' ]
		},
		watch: {
			assets: {
				files: ['<%= config.cssSrc %>**/*', '<%= config.jsSrc %>**/*'],
				tasks: ['assets', 'content']
			},
			content: {
				files: [
					'**/*.liquid',
					'**/*.njk',
					'**/*.html',
					'**/*.md',
					'!_site/**/*' ],
				tasks: ['content']
			}
		}
	});

	// bestof
	grunt.task.loadTasks('grunt-tasks');

	// Default task.
	grunt.registerTask('assets', ['copy:css-to-sass', 'sass', 'concat', 'terser', 'cssmin']);

	grunt.registerTask('content', ['copy:includes', 'shell:eleventy']);
	grunt.registerTask('content-production', ['copy:includes', 'shell:eleventyProduction']);

	grunt.registerTask('default', ['clean', 'assets', 'content']);
	grunt.registerTask('separate', ['clean', 'assets', 'copy:includes']);

	// Upload to Production
	grunt.registerTask('stage', ['clean', 'assets', 'content-production', 'clean:drafts', 'htmlmin', 'compress']);
	grunt.registerTask('deploy', ['stage', 'shell:upload', 'clean']);
};
