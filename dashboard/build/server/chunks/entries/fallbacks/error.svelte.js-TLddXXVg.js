import { a9 as escape_html, aa as getContext } from '../../chunks/index.js-NLYGLmrE.js';
import '../../chunks/state.svelte.js-V04G28x9.js';
import '../../chunks/url.js-DUsrn6y4.js';
import '../../chunks/utils2.js-ejsMtG81.js';
import '../../chunks/utils.js-Ct33xveJ.js';
import '../../chunks/root.js-CICqcBMU.js';
import '../../chunks/exports.js-ttBjoXEq.js';
import '../../chunks/uneval.js-7Jtky0YJ.js';

function context() {
  return getContext("__request__");
}
const page$1 = {
  get error() {
    return context().page.error;
  },
  get status() {
    return context().page.status;
  }
};
const page = page$1;
function Error$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<h1>${escape_html(page.status)}</h1> <p>${escape_html(page.error?.message)}</p>`);
  });
}

export { Error$1 as default };
//# sourceMappingURL=error.svelte.js-TLddXXVg.js.map
