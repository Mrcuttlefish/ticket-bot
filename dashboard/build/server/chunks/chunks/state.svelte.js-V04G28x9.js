import { n as noop } from './index.js-NLYGLmrE.js';
import './url.js-DUsrn6y4.js';
import './utils.js-Ct33xveJ.js';
import './root.js-CICqcBMU.js';

const is_legacy = noop.toString().includes("$$") || /function \w+\(\) \{\}/.test(noop.toString());
const placeholder_url = "a:";
if (is_legacy) {
  ({
    url: new URL(placeholder_url)
  });
} else {
  new class Page {
    data = {};
    form = null;
    error = null;
    params = {};
    route = { id: null };
    state = {};
    status = -1;
    url = new URL(placeholder_url);
  }();
}
//# sourceMappingURL=state.svelte.js-V04G28x9.js.map
