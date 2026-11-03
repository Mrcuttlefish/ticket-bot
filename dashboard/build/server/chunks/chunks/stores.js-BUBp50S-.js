import { aa as getContext } from './index.js-NLYGLmrE.js';
import './url.js-DUsrn6y4.js';
import './utils2.js-ejsMtG81.js';
import './utils.js-Ct33xveJ.js';
import './root.js-CICqcBMU.js';
import './exports.js-ttBjoXEq.js';
import './state.svelte.js-V04G28x9.js';

const getStores = () => {
  const stores = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
const navigating = {
  subscribe(fn) {
    const store = getStores().navigating;
    return store.subscribe(fn);
  }
};

export { navigating as n, page as p };
//# sourceMappingURL=stores.js-BUBp50S-.js.map
