import { B as error } from '../../../../../chunks/utils.js-Ct33xveJ.js';

async function load({ fetch, params, url }) {
  const query = new URLSearchParams();
  const type = url.searchParams.get("type");
  const before = url.searchParams.get("before");
  if (type) query.set("type", type);
  if (before && /^\d+$/.test(before)) query.set("before", before);
  const response = await fetch(`/api/admin/guilds/${params.guild}/history?${query}`, {
    credentials: "include"
  });
  const isJSON = response.headers.get("Content-Type")?.includes("json");
  const body = isJSON ? await response.json() : await response.text();
  if (!response.ok) error(response.status, isJSON ? JSON.stringify(body) : body);
  return { history: body, type: type ?? "" };
}

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _page as _ };
//# sourceMappingURL=_page.js-Dhv9DEv7.js.map
