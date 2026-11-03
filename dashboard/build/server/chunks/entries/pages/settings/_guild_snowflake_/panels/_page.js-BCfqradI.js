import { B as error } from '../../../../../chunks/utils.js-Ct33xveJ.js';

async function load({ fetch, params }) {
  const fetchOptions = { credentials: "include" };
  const response = await fetch(`/api/admin/guilds/${params.guild}/categories`, fetchOptions);
  const isJSON = response.headers.get("Content-Type")?.includes("json");
  const body = isJSON ? await response.json() : await response.text();
  if (!response.ok) {
    error(response.status, isJSON ? JSON.stringify(body) : body);
  } else {
    return {
      categories: body,
      channels: await (await fetch(`/api/admin/guilds/${params.guild}/data?query=channels.cache`, fetchOptions)).json(),
      // the layout new and updated panels use (shown so admins can see the setting took effect), and what the
      // preview needs
      settings: await fetch(`/api/admin/guilds/${params.guild}/settings`, fetchOptions).then((r) => r.ok ? r.json() : {}).then((s) => ({
        componentsV2: s.componentsV2 === true,
        footer: s.footer ?? null,
        primaryColour: s.primaryColour ?? null
      })).catch(() => ({ componentsV2: false, footer: null, primaryColour: null }))
    };
  }
}

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _page as _ };
//# sourceMappingURL=_page.js-BCfqradI.js.map
