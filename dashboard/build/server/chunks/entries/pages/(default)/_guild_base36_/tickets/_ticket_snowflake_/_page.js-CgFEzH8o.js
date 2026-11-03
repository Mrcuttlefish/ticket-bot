import { B as error } from '../../../../../../chunks/utils.js-Ct33xveJ.js';
import { g as getTicket, a as getMessages, A as ApiError } from '../../../../../../chunks/tickets.js-COOjhcPR.js';

async function load({ fetch, parent, params }) {
  const { guild } = await parent();
  try {
    const [ticket, page] = await Promise.all([
      getTicket(fetch, guild.id, params.ticket),
      getMessages(fetch, guild.id, params.ticket)
    ]);
    return { ticket, page };
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
//# sourceMappingURL=_page.js-CgFEzH8o.js.map
