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
		client: {start:"_app/immutable/entry/start.CjXu8ZXz.js",app:"_app/immutable/entry/app.BNDVqtvi.js",imports:["_app/immutable/entry/start.CjXu8ZXz.js","_app/immutable/chunks/B23-RYWk.js","_app/immutable/chunks/CTYrzb0j.js","_app/immutable/chunks/COHgEoAa.js","_app/immutable/chunks/-UyI9lYi.js","_app/immutable/chunks/q0nwcvCO.js","_app/immutable/chunks/6XiACmnH.js","_app/immutable/chunks/B0XwC4Ot.js","_app/immutable/entry/app.BNDVqtvi.js","_app/immutable/chunks/Dp1pzeXC.js","_app/immutable/chunks/ZbvLg5CL.js","_app/immutable/chunks/COHgEoAa.js","_app/immutable/chunks/Bzak7iHL.js","_app/immutable/chunks/CTYrzb0j.js","_app/immutable/chunks/CErdNhBl.js","_app/immutable/chunks/DWfcSV9x.js","_app/immutable/chunks/Dak9oTug.js","_app/immutable/chunks/B2-RILMp.js","_app/immutable/chunks/HNu5pRpQ.js","_app/immutable/chunks/Bh5WQRyi.js","_app/immutable/chunks/6XiACmnH.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-Cr8mnZdE.js')),
			__memo(() => import('./nodes/1.js-7vhl0KKz.js')),
			__memo(() => import('./nodes/2.js-CDHtc9BR.js')),
			__memo(() => import('./nodes/3.js-CrWiuHTX.js')),
			__memo(() => import('./nodes/4.js-b3fkj5f6.js')),
			__memo(() => import('./nodes/5.js-DkECcBNP.js')),
			__memo(() => import('./nodes/6.js-C7FOYrbX.js')),
			__memo(() => import('./nodes/7.js-3WvaM7_Y.js')),
			__memo(() => import('./nodes/8.js-DUQMtd7M.js')),
			__memo(() => import('./nodes/9.js-BnbYFd9R.js')),
			__memo(() => import('./nodes/10.js-BB8VOMj4.js')),
			__memo(() => import('./nodes/11.js-D6xRoMMy.js')),
			__memo(() => import('./nodes/12.js-BizG43SC.js')),
			__memo(() => import('./nodes/13.js-CihGsgZ-.js')),
			__memo(() => import('./nodes/14.js-C44tyBoH.js')),
			__memo(() => import('./nodes/15.js-Bkpa0rTZ.js')),
			__memo(() => import('./nodes/16.js-BHHLWoZM.js')),
			__memo(() => import('./nodes/17.js-CsP694fz.js')),
			__memo(() => import('./nodes/18.js-CEaplQut.js')),
			__memo(() => import('./nodes/19.js-By7KFZOI.js')),
			__memo(() => import('./nodes/20.js-C2hX8VtM.js')),
			__memo(() => import('./nodes/21.js-DsVlwqgB.js')),
			__memo(() => import('./nodes/22.js-QYZ1SfoW.js')),
			__memo(() => import('./nodes/23.js-BgklRUuO.js'))
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
//# sourceMappingURL=manifest.js-CoJIGJSS.js.map
