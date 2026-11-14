import { B as error } from '../../../../../chunks/utils.js-Ct33xveJ.js';

async function load({ fetch, params, url }) {
  const days = [7, 30, 90, 365].includes(Number(url.searchParams.get("days"))) ? Number(url.searchParams.get("days")) : 30;
  const response = await fetch(`/api/admin/guilds/${params.guild}/statistics?days=${days}`, {
    credentials: "include"
  });
  const isJSON = response.headers.get("Content-Type")?.includes("json");
  const body = isJSON ? await response.json() : await response.text();
  if (!response.ok) error(response.status, isJSON ? JSON.stringify(body) : body);
  return { days, statistics: body };
}

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _page as _ };
//# sourceMappingURL=_page.js-DeJeah47.js.map
