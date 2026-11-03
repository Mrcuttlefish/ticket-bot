import { ah as attr, ab as store_get, ac as unsubscribe_stores } from '../../../../../chunks/index.js-NLYGLmrE.js';
import { b as base } from '../../../../../chunks/server.js-DtCli5Nu.js';
import '../../../../../chunks/url.js-DUsrn6y4.js';
import '../../../../../chunks/utils.js-Ct33xveJ.js';
import '../../../../../chunks/root.js-CICqcBMU.js';
import { p as page } from '../../../../../chunks/stores.js-BUBp50S-.js';
import '../../../../../chunks/uneval.js-7Jtky0YJ.js';
import '../../../../../chunks/utils2.js-ejsMtG81.js';
import '../../../../../chunks/exports.js-ttBjoXEq.js';
import '../../../../../chunks/state.svelte.js-V04G28x9.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    $$renderer2.push(`<h1 class="m-4 text-center text-4xl font-bold">Feedback</h1> <div class="mx-auto my-8 max-w-lg text-center"><div class="my-8"><img${attr("src", `${base}/assets/undraw_reviews.svg`)} alt="Reviews illustration" width="70%" height="auto" class="mx-auto"/></div> <div class="my-8 text-lg font-semibold"><a${attr("href", `${base}/${store_get($$store_subs ??= {}, "$page", page).params.guild}/feedback`)} class="transition duration-300 hover:text-blurple">View feedback in the portal <i class="fa-solid fa-arrow-right-long"></i></a></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-DzDC0kpZ.js.map
