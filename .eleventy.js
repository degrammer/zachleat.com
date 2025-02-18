const { DateTime } = require("luxon");
const { URL } = require("url");
const sanitizeHTML = require("sanitize-html")
const numeral = require("numeral")
const pluginRss = require("@11ty/eleventy-plugin-rss");
const siteData = require("./_data/site.json");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const Natural = require('natural');
const analyze = new Natural.SentimentAnalyzer("English", Natural.PorterStemmer, "afinn");
const randomCase = require('random-case');

const getBaseUrl = require("./_includes/getBaseUrl");
const pluginImage = require("./_includes/imagePlugin");
const pluginImageAvatar = require("./_includes/imageAvatarPlugin");

function hasEleventyFeature(featureName) {
	return process.env.ELEVENTY_FEATURES && process.env.ELEVENTY_FEATURES.split(",").indexOf(featureName) > -1;
}

module.exports = function(eleventyConfig) {
	eleventyConfig.setUseGitIgnore(false);
	eleventyConfig.setDataDeepMerge(true);
	eleventyConfig.setQuietMode(true);

	eleventyConfig.setLiquidOptions({
		strict_filters: true
	});

	eleventyConfig.setBrowserSyncConfig({
		ui: false,
		ghostMode: false
	});

	/* PLUGINS */
	eleventyConfig.addPlugin(pluginRss);
	eleventyConfig.addPlugin(pluginSyntaxHighlight);
	eleventyConfig.addPlugin(pluginImage);
	eleventyConfig.addPlugin(pluginImageAvatar);

	/* COPY */
	eleventyConfig
		.addPassthroughCopy(".htaccess")
		.addPassthroughCopy("img/")
		.addPassthroughCopy("resume/.htaccess")
		.addPassthroughCopy("resume/index.css")
		.addPassthroughCopy("resume/resume.pdf")
		.addPassthroughCopy("web/css/fonts")
		.addPassthroughCopy("web/img")
		.addPassthroughCopy("web/wp-content")
		.addPassthroughCopy("web/dist");

	if(hasEleventyFeature("fullcopy")) {
		eleventyConfig
			.addPassthroughCopy("robots.txt")
			.addPassthroughCopy("humans.txt")
			.addPassthroughCopy("keybase.txt")
			.addPassthroughCopy("demos/")
			.addPassthroughCopy("presentations/");
	}

	/* LAYOUTS */
	eleventyConfig.addLayoutAlias('default', 'layouts/default.liquid');
	eleventyConfig.addLayoutAlias('page', 'layouts/page.liquid');
	eleventyConfig.addLayoutAlias('post', 'layouts/post.liquid');

	/* FILTERS */
	eleventyConfig.addFilter("truncate", (str, len = 280) => { // tweet sized default
		let suffix = str.length > len ? `… <span class="tag-inline">Truncated</span>` : "";
		return str.substr(0, len) + suffix;
	});

	eleventyConfig.addLiquidFilter("numberString", function(num) {
		let strs = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
		if( num < strs.length ) {
			return strs[num];
		}
		return num;
	});

	// Count total number of items that have speaking metadata set
	eleventyConfig.addLiquidFilter("getSpeakingCount", function(allCollection, propName, propValueMatch) {
		let count = 0;
		for(let item of allCollection) {
			if(item.data.metadata && item.data.metadata.speaking && item.data.metadata.speaking[propName] && (!propValueMatch || item.data.metadata.speaking[propName] === propValueMatch)) {
				count++;
			}
		}
		return count;
	});

	// Count unique number of items for a speaking metadata property
	eleventyConfig.addLiquidFilter("getSpeakingUniqueCount", function(allCollection, propName) {
		let count = new Set();
		for(let item of allCollection) {
			if(item.data.metadata && item.data.metadata.speaking && item.data.metadata.speaking[propName]) {
				count.add(item.data.metadata.speaking[propName]);
			}
		}
		return count.size;
	});

	eleventyConfig.addLiquidFilter("renderNumber", function renderNumber(num) {
		return numeral(parseInt(num, 10)).format("0,0");
	});

	eleventyConfig.addLiquidFilter("round", function(num, digits = 2) {
		return parseFloat(num).toFixed(digits);
	});

	eleventyConfig.addLiquidFilter("medialengthCleanup", str => {
		let split = str.split(" ");
		return `${split[0]}<span aria-hidden="true">m</span><span class="sr-only"> minutes</span>`;
	});

	eleventyConfig.addLiquidFilter("simpleTagStrip", str => {
		return str.replace(/<[^>]*>/g, "");
	});

	eleventyConfig.addLiquidFilter("absoluteUrl", (url, base) => {
		if( !base ) {
			base = siteData.url;
		}
		try {
			return (new URL(url, base)).toString();
			} catch(e) {
			console.log(`Trying to convert ${url} to be an absolute url with base ${base} and failed.`);
			return url;
		}
	});

	eleventyConfig.addLiquidFilter("timePosted", (startDate, endDate = Date.now()) => {
		if(typeof startDate === "string") {
			startDate = Date.parse(startDate);
		}
		if(typeof endDate === "string") {
			endDate = Date.parse(endDate);
		}
		let numDays = ((endDate - startDate) / (1000 * 60 * 60 * 24));
		let daysPosted = Math.round( parseFloat( numDays ) );
		let yearsPosted = parseFloat( (numDays / 365).toFixed(1) );

		if( daysPosted < 365 ) {
			return daysPosted + " day" + (daysPosted !== 1 ? "s" : "");
		} else {
			return yearsPosted + " year" + (yearsPosted !== 1 ? "s" : "");
		}
	});

	eleventyConfig.addNunjucksFilter("rssNewestUpdatedDate", collection => {
		if( !collection || !collection.length ) {
			throw new Error( "Collection is empty in lastUpdatedDate filter." );
		}

		return DateTime.fromJSDate(collection[ 0 ].date).toISO({ includeOffset: true, suppressMilliseconds: true });
	});

	eleventyConfig.addFilter("readableDate", dateObj => {
		return DateTime.fromJSDate(dateObj).toFormat("LLLL dd, yyyy");
	});

	eleventyConfig.addLiquidFilter("readableDateFromISO", (dateStr, formatStr = "dd LLL yyyy 'at' hh:mma") => {
		return DateTime.fromISO(dateStr).toFormat(formatStr);
	});

	eleventyConfig.addLiquidFilter("twitterUsernameFromUrl", (url) => {
		if( url.indexOf("https://twitter.com/") > -1 ) {
			return "@" + url.replace("https://twitter.com/", "");
		}
		return url;
	});

	eleventyConfig.addLiquidFilter("getPostCountForYear", (posts, year) => {
		return posts.filter(function(post) {
			return !post.data.tags ||
				post.data.tags.indexOf("deprecated") === -1 &&
				!post.data.deprecated &&
				!post.data.feedtrim &&
				post.data.tags.indexOf("pending") === -1 &&
				post.data.tags.indexOf("draft") === -1;
		}).filter(function(post) {
			return post.data.page.date.getFullYear() === parseInt(year, 10);
		}).length;
	});

	eleventyConfig.addLiquidFilter("hostnameFromUrl", (url) => {
		let urlObject = new URL(url);
		return urlObject.hostname;
	});

	eleventyConfig.addLiquidFilter("longWordWrap", str => {
		if( !str || typeof str === "string" && str.indexOf("<") > -1 && str.indexOf(">") > str.indexOf("<")) {
			return str;
		}

		let words = {
			"domcontentloaded": true,
			"getelementsbytagname": true
		};

		return str.split(" ").map(function(word) {
			return word.split("—").map(function(word) {
				return word.split("(").map(function(word) {
					return word.split(")").map(function(word) {
						return words[word.toLowerCase()] || word.length >= 11 ? `<span class="long-word">${word}</span>` : word;
					}).join(")");
				}).join("(");
			}).join("—");
		}).join(" ");
	});

	eleventyConfig.addLiquidFilter("orphanWrap", str => {
		return str.split("—").map(function(str, index, dashSplit) {
			// Uncomment this to prevent orphans only at the end of the string, not before every —
			// if( index !== dashSplit.length - 1 ) {
			// 	return str;
			// }

			let splitSpace = str.split(" ");
			let after = "";
			if( splitSpace.length > 1 ) {
				if( splitSpace.length > 2 ) {
					after += " ";
				}

				// TODO strip HTML from this?
				let lastWord = splitSpace.pop();
				let secondLastWord = splitSpace.pop();
				// skip when last two words are super long 😭
				if(`${secondLastWord} ${lastWord}`.length >= 15) {
					after += `${secondLastWord} ${lastWord}`;
				} else {
					after += `<span class="prevent-orphan">${secondLastWord} ${lastWord}</span>`;
				}
			}

			return splitSpace.join(" ") + after;
		}).join("​—​");
	});

	eleventyConfig.addLiquidFilter("emoji", function(content) {
		return `<span aria-hidden="true">${content}</span>`;
	});

	eleventyConfig.addLiquidFilter("wordcount", function(content) {
		let words = content.split(" ").length;
		let wordsLabel = "word" + (words !== 1 ? "s" : "");
		return `${words} ${wordsLabel}`;
	});

	// Get the first `n` elements of a collection.
	eleventyConfig.addFilter("head", (array, n) => {
		if( n < 0 ) {
			return array.slice(n);
		}
		return array.slice(0, n);
	});

	eleventyConfig.addFilter('localUrl', (absoluteUrl) => {
		return absoluteUrl.replace("https://www.zachleat.com", "");
	});

	const allowedHTML = {
		allowedTags: ['b', 'i', 'em', 'strong', 'a'],
		allowedAttributes: {
			a: ['href']
		}
	};

	eleventyConfig.addLiquidFilter('sanitizeHTML', content => {
		return content ? sanitizeHTML(content, allowedHTML) : "";
	});

	eleventyConfig.addFilter('webmentionsForUrl', (webmentions, url, allowedTypes) => {
		if( !allowedTypes ) {
			// all types
			allowedTypes = ['mention-of', 'in-reply-to', 'like-of', 'repost-of', 'bookmark-of'];
		} else if( typeof allowedTypes === "string" ) {
			allowedTypes = [ allowedTypes ];
		}

		if(!url || !webmentions.mentions || !webmentions.mentions[url]) {
			return [];
		}

		return webmentions.mentions[url]
			.filter(entry => {
				if(!allowedTypes.includes(entry['wm-property'])) {
					return false;
				}
				return getBaseUrl(entry['wm-target']) === url;
			});
	});


	eleventyConfig.addLiquidFilter("randomCase", function(content, sentimentValue) {
		if(content && sentimentValue < -0.07 && content.length <= 5000) {
			return randomCase(content);
		}
		return content;
	});

	eleventyConfig.addLiquidFilter("getSentimentValue", function(content) {
		if( content ) {
			const tokenizer = new Natural.WordTokenizer();
			return analyze.getSentiment(tokenizer.tokenize(content));
		}

		return 0;
	});

	/* SHORTCODES */
	eleventyConfig.addLiquidShortcode("youtubeEmbed", function(slug, startTime) {
		return `<div class="fullwidth"><div class="fluid-width-video-wrapper"><iframe class="youtube-player" src="https://www.youtube.com/embed/${slug}${startTime ? `?start=${startTime}` : ''}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div></div>`;
	});

	/* COLLECTIONS */
	function getPosts(collectionApi) {
		return collectionApi.getFilteredByGlob("./web/_posts/*").reverse().filter(function(item) {
			return !!item.data.permalink;
		});
	}

	eleventyConfig.addCollection("posts", function(collection) {
		return getPosts(collection);
	});

	eleventyConfig.addCollection("feedPosts", function(collection) {
		return getPosts(collection).filter(function(item) {
			return !item.data.tags ||
				item.data.tags.indexOf("deprecated") === -1 &&
				!item.data.deprecated &&
				!item.data.feedtrim &&
				item.data.tags.indexOf("pending") === -1 &&
				item.data.tags.indexOf("draft") === -1;
		});
	});

	eleventyConfig.addCollection("noteTagList", function(collection) {
		let noteTags = new Set();
		collection.getAll().forEach(function(item) {
			if(Array.isArray(item.data["note-tags"])) {
				for(let noteTag of item.data["note-tags"]) {
					noteTags.add(noteTag);
				}
			}
		});
		return Array.from(noteTags).sort();
	});

	eleventyConfig.addCollection("noteTagCollections", function(collection) {
		let resultArrays = {};
		collection.getAll().forEach(function(item) {
			if(Array.isArray(item.data["note-tags"])) {
				for(let noteTag of item.data["note-tags"]) {
					if( !resultArrays[noteTag] ) {
						resultArrays[noteTag] = [];
					}
					resultArrays[noteTag].push(item);
				}
			}
		});
		return resultArrays;
	});

	function hasTag(post, tag) {
		return "tags" in post.data && post.data.tags && post.data.tags.indexOf(tag) > -1;
	}
	function hasCategory(post, category) {
		return "categories" in post.data && post.data.categories && post.data.categories.indexOf(category) > -1;
	}
	function isWriting(item) {
		return !!item.inputPath.match(/\/_posts\//) &&
				(!hasTag(item, "external") || hasTag(item, "writing") || (item.data.external_url || "").indexOf("filamentgroup.com") > -1) &&
				!hasTag(item, "speaking") &&
				!hasCategory(item, "presentations");
	}

	eleventyConfig.addCollection("writing", function(collection) {
		let posts = collection.getSortedByDate().reverse();
		let items = [];
		for( let item of posts ) {
			if( isWriting(item) ) {
				items.push( item );
			}
		}
		return items;
	});
	eleventyConfig.addCollection("latestPosts", function(collection) {
		let posts = collection.getSortedByDate().reverse();
		let items = [];
		for( let item of posts ) {
			if( !!item.inputPath.match(/\/_posts\//) && !hasTag(item, "external") ) {
				items.push( item );
				if( items.length >= 5 ) {
					return items;
				}
			}
		}
	});

	// font-loading category mapped to collection
	eleventyConfig.addCollection("font-loading", function(collection) {
		return collection.getAllSorted().filter(function(item) {
			return "categories" in item.data && item.data.categories && item.data.categories.indexOf("font-loading") > -1 || hasTag(item, "font-loading");
		}).reverse();
	});

	// presentations category mapped to collection
	eleventyConfig.addCollection("presentations", function(collection) {
		return collection.getAllSorted().filter(function(item) {
			return "categories" in item.data && item.data.categories && item.data.categories.indexOf("presentations") > -1 || hasTag(item, "speaking");
		}).reverse();
	});

	eleventyConfig.addCollection("popularPostsRanked", function(collection) {
		return collection.getFilteredByTag("popular-posts").sort(function(a, b) {
			return b.data.postRank - a.data.postRank;
		}).reverse();
	});

	eleventyConfig.addCollection("popularPostsTotalRanked", function(collection) {
		return collection.getFilteredByTag("popular-posts-total").sort(function(a, b) {
			return b.data.postRankTotalViews - a.data.postRankTotalViews;
		}).reverse();
	});

	/* Markdown */
	let markdownIt = require("markdown-it");
	let markdownItAnchor = require("markdown-it-anchor");
	let options = {
		html: true,
		breaks: true,
		linkify: true
	};
	let opts = {
		permalink: true,
		permalinkClass: "direct-link",
		permalinkSymbol: "#",
		level: [1,2,3,4]
	};

	eleventyConfig.setLibrary("md", markdownIt(options).use(markdownItAnchor, opts));

	return {
		"templateFormats": [
			"liquid",
			"md",
			"njk",
			"html"
		],
		"dataTemplateEngine": false,
		"htmlTemplateEngine": "liquid",
		"markdownTemplateEngine": "liquid"
	};
};