import { B as error } from '../../../../../chunks/utils.js-Ct33xveJ.js';
import { l as listTickets, A as ApiError } from '../../../../../chunks/tickets.js-COOjhcPR.js';

async function load({ fetch, parent, url }) {
  const { guild } = await parent();
  const status = url.searchParams.get("status") ?? "open";
  const q = url.searchParams.get("q") ?? "";
  const filters = { q, open: status === "all" ? null : status === "open" };
  try {
    const result = await listTickets(fetch, guild.id, filters);
    return { status, q, result };
  } catch (err) {
    if (err instanceof ApiError) error(err.status, err.message);
    throw err;
  }
}

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _page as _ };
//# sourceMappingURL=_page.js-Wiucqiy3.js.map
