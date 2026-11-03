import { y as setContext, a7 as attr_class, a8 as clsx } from '../../chunks/index.js-NLYGLmrE.js';
import '../../index.js-DfdKOvq5.js';
import './_layout.server.js-CpcRggUt.js';
import '../../chunks/uneval.js-7Jtky0YJ.js';
import '../../chunks/utils.js-Ct33xveJ.js';
import '../../chunks/utils2.js-ejsMtG81.js';
import '../../chunks/server.js-DtCli5Nu.js';
import '../../chunks/url.js-DUsrn6y4.js';
import '../../chunks/index2.js-DH9RKYtd.js';
import '../../chunks/internal2.js-DnVvaYjQ.js';
import '../../chunks/root.js-CICqcBMU.js';
import '../../chunks/exports.js-ttBjoXEq.js';
import '../../chunks/i18n.js-moWVPshl.js';

function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, children } = $$props;
    const { client, user, theme, locale } = data;
    setContext("client", client);
    setContext("user", user);
    setContext("theme", theme);
    setContext("locale", locale);
    $$renderer2.push(`<div${attr_class(clsx(theme))}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte.js-Cx5FXxUb.js.map
