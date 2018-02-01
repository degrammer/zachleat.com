module.exports = function(grunt) {
	const fs = require("fs");
	const cheerio = require("cheerio");
	const matter = require("gray-matter");
	const _uniq = require('lodash.uniq');
	const _remove = require('lodash.remove');
	const normalize = require("normalize-path");
	const bestof = grunt.file.readJSON("zachleat-bestof.json").rows;

	"use strict";
	grunt.registerTask("bestof", function() {
		var pageviews = {};

		bestof.forEach(function(entry) {
			var path = entry[0];
			if (path.indexOf("?") > -1) {
				path = path.substr(0, entry[0].indexOf("?"));
			}
			var slug = path.match(/^\/web\/(?:\d{4}\/\d{2}\/\d{2}\/)?([A-Za-z0-9-\/]+)/);
			if (slug && slug.length > 1) {
				var newslug = slug[1] + (slug[1].substr(-1) !== "/" ? "/" : "");
				var filename = "web/_site/" + newslug + "index.html";

				if (fs.existsSync(filename)) {
					if (!pageviews[newslug]) {
						console.log("New analytics post entry found:", newslug, entry[1]);

						var postTemplate = cheerio.load(fs.readFileSync(filename, "utf8"));
						var postPath = postTemplate("meta[property='eleventy:path']").attr("content");
						if( postPath.indexOf( "./" ) === 0 ) {
							postPath = postPath.substr(2);
						}
						postPath = normalize('web/' + postPath);
						console.log("Found path to original file:", postPath);

						pageviews[newslug] = {
							slug: newslug,
							path: postPath,
							views: 0,
							title: postTemplate("title").html().replace(/&#x2014;zachleat.com/, ""),
							postedDate: Date.parse(postTemplate(".sub .date").html())
						};
					} else {
						// console.log("Adding to already existing analytics post entry:", newslug, entry[1]);
					}

					pageviews[newslug].views += parseInt(entry[1], 10);

					if (pageviews[newslug].postedDate) {
						var numDays = ((Date.now() - pageviews[newslug].postedDate) / (1000 * 60 * 60 * 24));
						pageviews[newslug].postedYear =
							"(" + new Date(pageviews[newslug].postedDate).getFullYear() + ")";
						pageviews[newslug].averageViews = (pageviews[newslug].views / numDays).toFixed(1);
						pageviews[newslug].daysPosted = Math.round( parseFloat( numDays ) );
						pageviews[newslug].yearsPosted = parseFloat( (numDays / 365).toFixed(1) );
					} else {
						pageviews[newslug].postedYear = "";
						pageviews[newslug].averageViews = "";
						pageviews[newslug].daysPosted = "";
						pageviews[newslug].yearsPosted = "";
					}
				} else {
					console.warn( ">>> WARNING POST NOT FOUND!", filename );
				}
			} else {
				console.warn( ">>> WARNING bad match:", entry[ 0 ], " to ", path );
			}
		});

		var pageviewsArr = [];
		for (var j in pageviews) {
			pageviewsArr.push(pageviews[j]);
		}
		pageviewsArr = pageviewsArr.sort(function(a, b) {
			return b.averageViews - a.averageViews;
		});

		var totalviewsArr = [];
		for (var j in pageviews) {
			totalviewsArr.push(pageviews[j]);
		}
		totalviewsArr = totalviewsArr.sort(function(a, b) {
			return b.views - a.views;
		});

		console.log( "> Deleting previous post ranks, tags from front matters." );
		pageviewsArr.forEach(function(entry, j) {
			var frontmatter = matter( fs.readFileSync(entry.path, 'utf8') );
			delete frontmatter.data.postRank;
			delete frontmatter.data.daysPosted;
			delete frontmatter.data.yearsPosted;
			if( frontmatter.data.tags ) {
				_remove( frontmatter.data.tags, function( tag ) {
					return tag === "popular-posts";
				});
			}
			fs.writeFileSync( entry.path, frontmatter.stringify());
		});

		totalviewsArr.forEach(function(entry, j) {
			var frontmatter = matter( fs.readFileSync(entry.path, 'utf8') );
			delete frontmatter.data.postRankTotalViews;
			delete frontmatter.data.daysPosted;
			delete frontmatter.data.yearsPosted;
			if( frontmatter.data.tags ) {
				_remove( frontmatter.data.tags, function( tag ) {
					return tag === "popular-posts-total";
				});
			}
			fs.writeFileSync( entry.path, frontmatter.stringify());
		});
		console.log( "> Deleting complete." );

		console.log( "> Editing post front matter with post ranks (avg per day)." );
		pageviewsArr.slice(0, 20).forEach(function(entry, j) {
			// TODO convert this to use jekyll datafiles instead? http://jekyllrb.com/docs/datafiles/
			var frontmatter = matter( fs.readFileSync(entry.path, 'utf8') );
			frontmatter.data.postRank = ( j + 1 );
			frontmatter.data.daysPosted = entry.daysPosted;
			frontmatter.data.yearsPosted = entry.yearsPosted;
			if( !frontmatter.data.tags ) {
				frontmatter.data.tags = [];
			}
			frontmatter.data.tags.push( 'popular-posts' );
			frontmatter.data.tags = _uniq( frontmatter.data.tags );
			console.log( "Writing", entry.path );
			fs.writeFileSync( entry.path, frontmatter.stringify());
		});

		console.log( "> Editing post front matter with post ranks (total)." );
		totalviewsArr.slice(0, 20).forEach(function(entry, j) {
			// TODO convert this to use jekyll datafiles instead? http://jekyllrb.com/docs/datafiles/
			var frontmatter = matter( fs.readFileSync(entry.path, 'utf8') );
			frontmatter.data.postRankTotalViews = ( j + 1 );
			frontmatter.data.daysPosted = entry.daysPosted;
			frontmatter.data.yearsPosted = entry.yearsPosted;
			if( !frontmatter.data.tags ) {
				frontmatter.data.tags = [];
			}
			frontmatter.data.tags.push( 'popular-posts-total' );
			frontmatter.data.tags = _uniq( frontmatter.data.tags );
			console.log( "Writing", entry.path );
			fs.writeFileSync( entry.path, frontmatter.stringify());
		});

		console.log( "> Writing best-of jekyll template file." );
		

		function updateUpdatedDate( bestOfTemplatePath, updatedDate ) {
			var bestofFrontMatter = matter( fs.readFileSync( bestOfTemplatePath, 'utf8') );
			bestofFrontMatter.data.dataUpdatedDate = updatedDate;
			console.log( "Writing", bestOfTemplatePath );
			fs.writeFileSync( bestOfTemplatePath, bestofFrontMatter.stringify());
		}

		/* Warning this date won’t match the analytics data fetch date. */
		/* TODO: use the file modified date on the zachleat-bestof.json include above. */
		var updatedDate = new Date().toLocaleString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			timeZoneName: "short"
		});

		updateUpdatedDate( "web/best-of/index.html", updatedDate );
		updateUpdatedDate( "web/best-of/best-of-total-views.html", updatedDate );

		// var unitNormalizer = pageviewsArr[0].averageViews;
		// pageviewsArr.slice(0, 20).forEach(function(entry, j) {
		// 	html += `
		// <tr>
		// 	<td>${j + 1}</td>
		// 	<td><a href="/web/${entry.slug}">${entry.title}</a> ${entry.postedYear}</td>
		// 	<td class="numeric">${(entry.averageViews * 100 / unitNormalizer).toFixed(1)}</td>
		// </tr>`;
		// });
	});
};
