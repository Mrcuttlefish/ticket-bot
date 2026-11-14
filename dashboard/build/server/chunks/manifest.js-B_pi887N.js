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
		client: {start:"_app/immutable/entry/start.DJegMn0R.js",app:"_app/immutable/entry/app.ob61_UYw.js",imports:["_app/immutable/entry/start.DJegMn0R.js","_app/immutable/chunks/P_dcTRkl.js","_app/immutable/chunks/CTYrzb0j.js","_app/immutable/chunks/COHgEoAa.js","_app/immutable/chunks/-UyI9lYi.js","_app/immutable/chunks/FY5ebLy7.js","_app/immutable/chunks/6XiACmnH.js","_app/immutable/chunks/B0XwC4Ot.js","_app/immutable/entry/app.ob61_UYw.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/ZbvLg5CL.js","_app/immutable/chunks/COHgEoAa.js","_app/immutable/chunks/Bzak7iHL.js","_app/immutable/chunks/CTYrzb0j.js","_app/immutable/chunks/CErdNhBl.js","_app/immutable/chunks/DWfcSV9x.js","_app/immutable/chunks/Dak9oTug.js","_app/immutable/chunks/B2-RILMp.js","_app/immutable/chunks/HNu5pRpQ.js","_app/immutable/chunks/Bh5WQRyi.js","_app/immutable/chunks/6XiACmnH.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-D1XE-IYG.js')),
			__memo(() => import('./nodes/1.js-CznMDEfQ.js')),
			__memo(() => import('./nodes/2.js-D74HGMUs.js')),
			__memo(() => import('./nodes/3.js-DifP-ot0.js')),
			__memo(() => import('./nodes/4.js-CjpjCaoy.js')),
			__memo(() => import('./nodes/5.js-DIy4IlzO.js')),
			__memo(() => import('./nodes/6.js-CNlpMNeV.js')),
			__memo(() => import('./nodes/7.js-C1m5U_LK.js')),
			__memo(() => import('./nodes/8.js-DUQMtd7M.js')),
			__memo(() => import('./nodes/9.js-BnbYFd9R.js')),
			__memo(() => import('./nodes/10.js-DJ4Zsl4i.js')),
			__memo(() => import('./nodes/11.js-DOluwhEa.js')),
			__memo(() => import('./nodes/12.js-BizG43SC.js')),
			__memo(() => import('./nodes/13.js-CihGsgZ-.js')),
			__memo(() => import('./nodes/14.js-Bd0rPGEG.js')),
			__memo(() => import('./nodes/15.js-BJJYtScN.js')),
			__memo(() => import('./nodes/16.js-DwyWUNgR.js')),
			__memo(() => import('./nodes/17.js-Bgc0F5jy.js')),
			__memo(() => import('./nodes/18.js-MWUatArx.js')),
			__memo(() => import('./nodes/19.js-vl1CvtoJ.js')),
			__memo(() => import('./nodes/20.js-C2hX8VtM.js')),
			__memo(() => import('./nodes/21.js-Bo90zGRW.js')),
			__memo(() => import('./nodes/22.js-QYZ1SfoW.js')),
			__memo(() => import('./nodes/23.js-CVsxi0lh.js'))
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
				id: "/settings/[guild=snowflake]/history",
				pattern: /^\/settings\/([^/]+?)\/history\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,7,], errors: [1,6,,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/settings/[guild=snowflake]/panels",
				pattern: /^\/settings\/([^/]+?)\/panels\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,7,], errors: [1,6,,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/settings/[guild=snowflake]/statistics",
				pattern: /^\/settings\/([^/]+?)\/statistics\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,7,], errors: [1,6,,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/settings/[guild=snowflake]/tags",
				pattern: /^\/settings\/([^/]+?)\/tags\/?$/,
				params: [{"name":"guild","matcher":"snowflake","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,5,7,], errors: [1,6,,], leaf: 23 },
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
//# sourceMappingURL=manifest.js-B_pi887N.js.map
