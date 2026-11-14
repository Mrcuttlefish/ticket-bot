import { _ as __variableDynamicImportRuntimeHelper } from '../../../../chunks/dynamic-import-helper.js-MmBm7UiY.js';
import { i as importJSON } from '../../../../chunks/i18n.js-moWVPshl.js';

async function load({ parent, url }) {
  const { locale } = await parent();
  return {
    translations: importJSON(
      await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "../../../lib/locales/en-GB/_common.json": () => import('../../../../chunks/_common.js-CJGeEyET.js') }), `../../../lib/locales/${locale}/_common.json`, 7),
      await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "../../../lib/locales/en-GB/misc.json": () => import('../../../../chunks/misc.js-AxcZLwK9.js') }), `../../../lib/locales/${locale}/misc.json`, 7)
    ),
    query: url.search
  };
}

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _page as _ };
//# sourceMappingURL=_page.js-RERFJHCg.js.map
