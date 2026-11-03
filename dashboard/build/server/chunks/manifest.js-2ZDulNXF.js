const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["assets/topgg-dark.webp","assets/topgg-light.webp","assets/undraw_reviews.svg","assets/wordmark-dark.png","assets/wordmark-light.png","favicon.png"]),
	mimeTypes: {".webp":"image/webp",".svg":"image/svg+xml",".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.BcJPQqzV.js",app:"_app/immutable/entry/app.ChUtm9p8.js",imports:["_app/immutable/entry/start.BcJPQqzV.js","_app/immutable/chunks/Ciu5n0vU.js","_app/immutable/chunks/D9Ubi-ut.js","_app/immutable/chunks/XDDRZcps.js","_app/immutable/chunks/-UyI9lYi.js","_app/immutable/chunks/cvpI2zMJ.js","_app/immutable/chunks/By-MXjms.js","_app/immutable/chunks/B0XwC4Ot.js","_app/immutable/entry/app.ChUtm9p8.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/0vZHKkPU.js","_app/immutable/chunks/XDDRZcps.js","_app/immutable/chunks/Bzak7iHL.js","_app/immutable/chunks/D9Ubi-ut.js","_app/immutable/chunks/C5vSB-p-.js","_app/immutable/chunks/DHWX1f0S.js","_app/immutable/chunks/BzIbvLR1.js","_app/immutable/chunks/NT7LkeOQ.js","_app/immutable/chunks/a7qbFxEj.js","_app/immutable/chunks/CkfSnh-P.js","_app/immutable/chunks/By-MXjms.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-CTEA4EXB.js')),
			__memo(() => import('./nodes/1.js-DfzzBz9l.js')),
			__memo(() => import('./nodes/2.js-BvPyQddD.js')),
			__memo(() => import('./nodes/3.js-Cf_JpEay.js')),
			__memo(() => import('./nodes/4.js-CcpWHozC.js')),
			__memo(() => import('./nodes/5.js-rhj-sbYC.js')),
			__memo(() => import('./nodes/6.js-BUnQF2E_.js')),
			__memo(() => import('./nodes/7.js-CUutZGfR.js')),
			__memo(() => import('./nodes/8.js-mFvdQ3Qu.js')),
			__memo(() => import('./nodes/9.js-BnbYFd9R.js')),
			__memo(() => import('./nodes/10.js-CavojiUp.js')),
			__memo(() => import('./nodes/11.js-DWUhVWiz.js')),
			__memo(() => import('./nodes/12.js-BizG43SC.js')),
			__memo(() => import('./nodes/13.js-CwsMdNna.js')),
			__memo(() => import('./nodes/14.js-_0Is8LK0.js')),
			__memo(() => import('./nodes/15.js-DiIDTHR-.js')),
			__memo(() => import('./nodes/16.js-CIqvym9V.js')),
			__memo(() => import('./nodes/17.js-DKkcfHBk.js')),
			__memo(() => import('./nodes/18.js-CKodm_l2.js')),
			__memo(() => import('./nodes/19.js-id5RhCIh.js')),
			__memo(() => import('./nodes/20.js-BWf8MI5E.js')),
			__memo(() => import('./nodes/21.js-DYfcT2gh.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/(default)",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,3,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(default)/invite",
				pattern: /^\/invite\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,3,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/(default)/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,3,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,5,], errors: [1,6,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/settings/[guild=snowflake]",
				pattern: /^\/settings\/([^/]+?)\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,], errors: [1,6,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/settings/[guild=snowflake]/categories",
				pattern: /^\/settings\/([^/]+?)\/categories\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,7,], errors: [1,6,,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/settings/[guild=snowflake]/categories/[category=category]",
				pattern: /^\/settings\/([^/]+?)\/categories\/([^/]+?)\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false},{"name":"category","matcher":"category","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,7,], errors: [1,6,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/settings/[guild=snowflake]/feedback",
				pattern: /^\/settings\/([^/]+?)\/feedback\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,7,], errors: [1,6,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/settings/[guild=snowflake]/general",
				pattern: /^\/settings\/([^/]+?)\/general\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,7,], errors: [1,6,,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/settings/[guild=snowflake]/panels",
				pattern: /^\/settings\/([^/]+?)\/panels\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,7,], errors: [1,6,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/settings/[guild=snowflake]/tags",
				pattern: /^\/settings\/([^/]+?)\/tags\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,7,], errors: [1,6,,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/(default)/[guild=base36]",
				pattern: /^\/([^/]+?)\/?$/,
				params: [{"name":"guild","matcher":"base36","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,4,], errors: [1,3,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(default)/[guild=base36]/tickets",
				pattern: /^\/([^/]+?)\/tickets\/?$/,
				params: [{"name":"guild","matcher":"base36","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,4,], errors: [1,3,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/(default)/[guild=base36]/tickets/[ticket=snowflake]",
				pattern: /^\/([^/]+?)\/tickets\/([^/]+?)\/?$/,
				params: [{"name":"guild","matcher":"base36","optional":false,"rest":false,"chained":false},{"name":"ticket","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,4,], errors: [1,3,,], leaf: 11 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			const { match: snowflake } = await import ('./entries/matchers/snowflake.js-YSXWpcYi.js');
			const { match: category } = await import ('./entries/matchers/category.js-Cq7OhK66.js');
			const { match: base36 } = await import ('./entries/matchers/base36.js-B-s4BEmK.js');
			return { snowflake, category, base36 };
		},
		server_assets: {}
	}
}
})();

export { manifest as m };
//# sourceMappingURL=manifest.js-2ZDulNXF.js.map
