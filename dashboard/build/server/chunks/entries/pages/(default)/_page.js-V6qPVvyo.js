import { _ as __variableDynamicImportRuntimeHelper } from '../../../chunks/dynamic-import-helper.js-MmBm7UiY.js';
import { M as redirect } from '../../../chunks/utils.js-Ct33xveJ.js';
import { i as importJSON } from '../../../chunks/i18n.js-moWVPshl.js';

async function load({ parent, fetch }) {
  const { locale } = await parent();
  const guilds = await (await fetch(`/api/guilds`)).json();
  if (guilds.length === 0) {
    redirect(302, "/settings");
  } else if (guilds.length === 1) {
    redirect(302, `/${BigInt(guilds[0].id).toString(36)}/tickets`);
  }
  return {
    translations: importJSON(
      await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "../../lib/locales/en-GB/_common.json": () => import('../../../chunks/_common.js-CJGeEyET.js') }), `../../lib/locales/${locale}/_common.json`, 6),
      await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "../../lib/locales/en-GB/misc.json": () => import('../../../chunks/misc.js-AxcZLwK9.js') }), `../../lib/locales/${locale}/misc.json`, 6)
    ),
    guilds
  };
}

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _page as _ };
//# sourceMappingURL=_page.js-V6qPVvyo.js.map
