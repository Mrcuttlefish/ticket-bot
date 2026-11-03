import { B as error } from '../../../../../chunks/utils.js-Ct33xveJ.js';

async function load({ fetch, params }) {
  const response = await fetch(`/api/admin/guilds/${params.guild}/tags`);
  const isJSON = response.headers.get("Content-Type")?.includes("json");
  const body = isJSON ? await response.json() : await response.text();
  if (!response.ok) {
    error(response.status, isJSON ? JSON.stringify(body) : body);
  } else {
    return {
      tags: body
    };
  }
}

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _page as _ };
//# sourceMappingURL=_page.js-DliToJEd.js.map
