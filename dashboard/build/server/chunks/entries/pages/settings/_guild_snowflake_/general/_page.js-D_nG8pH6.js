import { B as error } from '../../../../../chunks/utils.js-Ct33xveJ.js';

async function load({ fetch, params }) {
  const response = await fetch(`/api/admin/guilds/${params.guild}/settings`);
  const isJSON = response.headers.get("Content-Type")?.includes("json");
  const body = isJSON ? await response.json() : await response.text();
  if (!response.ok) {
    error(response.status, isJSON ? JSON.stringify(body) : body);
  } else {
    return {
      settings: body,
      channels: await (await fetch(`/api/admin/guilds/${params.guild}/data?query=channels.cache`)).json(),
      locales: await (await fetch(`/api/locales`)).json(),
      roles: await (await fetch(`/api/admin/guilds/${params.guild}/data?query=roles.cache`)).json()
    };
  }
}

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _page as _ };
//# sourceMappingURL=_page.js-D_nG8pH6.js.map
