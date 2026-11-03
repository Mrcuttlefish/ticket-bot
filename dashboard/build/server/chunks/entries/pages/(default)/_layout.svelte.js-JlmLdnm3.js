import { ab as store_get, ac as unsubscribe_stores } from '../../../chunks/index.js-NLYGLmrE.js';
import { n as navigating } from '../../../chunks/stores.js-BUBp50S-.js';
import { S as Spinner } from '../../../chunks/Spinner.js-C279GjTH.js';
import '../../../chunks/uneval.js-7Jtky0YJ.js';
import '../../../chunks/url.js-DUsrn6y4.js';
import '../../../chunks/utils2.js-ejsMtG81.js';
import '../../../chunks/utils.js-Ct33xveJ.js';
import '../../../chunks/root.js-CICqcBMU.js';
import '../../../chunks/exports.js-ttBjoXEq.js';
import '../../../chunks/state.svelte.js-V04G28x9.js';

function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { children } = $$props;
    $$renderer2.push(`<div class="absolute h-max min-h-screen w-full bg-dgrey-100 text-dgrey-600 dark:bg-dgrey-800 dark:text-dgrey-300">`);
    if (store_get($$store_subs ??= {}, "$navigating", navigating) || true) {
      $$renderer2.push(`<!--[0--><div class="flex h-dvh items-center justify-center">`);
      Spinner($$renderer2);
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte.js-JlmLdnm3.js.map
