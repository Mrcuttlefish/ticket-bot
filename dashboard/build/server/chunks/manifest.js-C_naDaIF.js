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
		client: {start:"_app/immutable/entry/start.CNR-RiwL.js",app:"_app/immutable/entry/app.BUogVjh1.js",imports:["_app/immutable/entry/start.CNR-RiwL.js","_app/immutable/chunks/Cv3VojRG.js","_app/immutable/chunks/BlQ-YtbR.js","_app/immutable/chunks/ByRWmfkd.js","_app/immutable/chunks/-UyI9lYi.js","_app/immutable/chunks/BpKOwARp.js","_app/immutable/chunks/tTsBgNYh.js","_app/immutable/chunks/B0XwC4Ot.js","_app/immutable/entry/app.BUogVjh1.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/CSpRyOtD.js","_app/immutable/chunks/ByRWmfkd.js","_app/immutable/chunks/Bzak7iHL.js","_app/immutable/chunks/BlQ-YtbR.js","_app/immutable/chunks/DToFvAHs.js","_app/immutable/chunks/CHshr3v2.js","_app/immutable/chunks/DRmwEdf5.js","_app/immutable/chunks/C9JEgVtJ.js","_app/immutable/chunks/BzxDd-L_.js","_app/immutable/chunks/e_fei9Tz.js","_app/immutable/chunks/tTsBgNYh.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-xrFQFs9D.js')),
			__memo(() => import('./nodes/1.js-Bjz9sPyj.js')),
			__memo(() => import('./nodes/2.js-B7eb0oE9.js')),
			__memo(() => import('./nodes/3.js-DDYeF2oM.js')),
			__memo(() => import('./nodes/4.js-CaJGc1Ll.js')),
			__memo(() => import('./nodes/5.js-D4Nt0rbV.js')),
			__memo(() => import('./nodes/6.js-CTyZaAhz.js')),
			__memo(() => import('./nodes/7.js-F6Xmbbl5.js')),
			__memo(() => import('./nodes/8.js-C_3zOUy2.js')),
			__memo(() => import('./nodes/9.js-BnbYFd9R.js')),
			__memo(() => import('./nodes/10.js-C30qMRF9.js')),
			__memo(() => import('./nodes/11.js-DUjfQEYn.js')),
			__memo(() => import('./nodes/12.js-BizG43SC.js')),
			__memo(() => import('./nodes/13.js-C7rgTGU1.js')),
			__memo(() => import('./nodes/14.js-D3SdfZ0J.js')),
			__memo(() => import('./nodes/15.js-BKPllJld.js')),
			__memo(() => import('./nodes/16.js-DlNtORXY.js')),
			__memo(() => import('./nodes/17.js-SekzSVL0.js')),
			__memo(() => import('./nodes/18.js-CewNdM25.js')),
			__memo(() => import('./nodes/19.js-1Kre0Wro.js')),
			__memo(() => import('./nodes/20.js-sUdBHlKh.js')),
			__memo(() => import('./nodes/21.js-CbRa7x7I.js'))
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
//# sourceMappingURL=manifest.js-C_naDaIF.js.map
