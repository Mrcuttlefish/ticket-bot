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
		client: {start:"_app/immutable/entry/start.Dz3ptxfL.js",app:"_app/immutable/entry/app.BhFK9_ND.js",imports:["_app/immutable/entry/start.Dz3ptxfL.js","_app/immutable/chunks/CoYCOUSD.js","_app/immutable/chunks/CTYrzb0j.js","_app/immutable/chunks/COHgEoAa.js","_app/immutable/chunks/-UyI9lYi.js","_app/immutable/chunks/4cnSXgJm.js","_app/immutable/chunks/6XiACmnH.js","_app/immutable/chunks/B0XwC4Ot.js","_app/immutable/entry/app.BhFK9_ND.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/ZbvLg5CL.js","_app/immutable/chunks/COHgEoAa.js","_app/immutable/chunks/Bzak7iHL.js","_app/immutable/chunks/CTYrzb0j.js","_app/immutable/chunks/CErdNhBl.js","_app/immutable/chunks/DWfcSV9x.js","_app/immutable/chunks/Dak9oTug.js","_app/immutable/chunks/B2-RILMp.js","_app/immutable/chunks/HNu5pRpQ.js","_app/immutable/chunks/Bh5WQRyi.js","_app/immutable/chunks/6XiACmnH.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-CjWkO_jr.js')),
			__memo(() => import('./nodes/1.js-BdHy9XdU.js')),
			__memo(() => import('./nodes/2.js-C9gC03y0.js')),
			__memo(() => import('./nodes/3.js-RST-AZaK.js')),
			__memo(() => import('./nodes/4.js-Bn4PM6ks.js')),
			__memo(() => import('./nodes/5.js-pcbsZ4Hw.js')),
			__memo(() => import('./nodes/6.js-Ee5jXjLe.js')),
			__memo(() => import('./nodes/7.js-CDODLKNj.js')),
			__memo(() => import('./nodes/8.js-BA7rIigf.js')),
			__memo(() => import('./nodes/9.js-BnbYFd9R.js')),
			__memo(() => import('./nodes/10.js-BRfS20aG.js')),
			__memo(() => import('./nodes/11.js-CqBmUu04.js')),
			__memo(() => import('./nodes/12.js-BizG43SC.js')),
			__memo(() => import('./nodes/13.js-BMdqbA8n.js')),
			__memo(() => import('./nodes/14.js-BlKMbOAS.js')),
			__memo(() => import('./nodes/15.js-CsSOzrw2.js')),
			__memo(() => import('./nodes/16.js-DpxO4MmD.js')),
			__memo(() => import('./nodes/17.js-9jV5-fb_.js')),
			__memo(() => import('./nodes/18.js-B6HKFpil.js')),
			__memo(() => import('./nodes/19.js-Cx92XFj5.js')),
			__memo(() => import('./nodes/20.js-C2hX8VtM.js')),
			__memo(() => import('./nodes/21.js-DP5AssCS.js')),
			__memo(() => import('./nodes/22.js-QYZ1SfoW.js')),
			__memo(() => import('./nodes/23.js-B5bylie5.js'))
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
//# sourceMappingURL=manifest.js-bJuPF13e.js.map
