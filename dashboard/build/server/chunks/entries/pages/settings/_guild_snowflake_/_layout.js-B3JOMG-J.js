import { M as redirect, B as error } from '../../../../chunks/utils.js-Ct33xveJ.js';

async function load({ fetch, params, url }) {
  const response = await fetch(`/api/admin/guilds/${params.guild}`);
  const isJSON = response.headers.get("Content-Type")?.includes("json");
  const body = isJSON ? await response.json() : await response.text();
  if (response.status === 401 && body.elevate) {
    redirect(
      307,
      `/auth/login?r=${encodeURIComponent(url.pathname + url.search)}&role=${body.elevate}`
    );
  } else if (!response.ok) {
    error(response.status, isJSON ? JSON.stringify(body) : body);
  } else {
    return { guild: body };
  }
}

var _layout = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _layout as _ };
//# sourceMappingURL=_layout.js-B3JOMG-J.js.map
