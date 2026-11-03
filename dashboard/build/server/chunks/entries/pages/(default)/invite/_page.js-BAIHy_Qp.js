import { M as redirect } from '../../../../chunks/utils.js-Ct33xveJ.js';

async function load({ url }) {
  redirect(307, `/auth/login?invite&guild=${url.searchParams.get("guild") || ""}`);
}

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _page as _ };
//# sourceMappingURL=_page.js-BAIHy_Qp.js.map
