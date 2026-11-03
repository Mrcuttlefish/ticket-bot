import { ab as store_get, ag as head, ah as attr, a9 as escape_html, ac as unsubscribe_stores } from '../../../../chunks/index.js-NLYGLmrE.js';
import { p as page } from '../../../../chunks/stores.js-BUBp50S-.js';
import '../../../../chunks/uneval.js-7Jtky0YJ.js';
import '../../../../chunks/url.js-DUsrn6y4.js';
import '../../../../chunks/utils2.js-ejsMtG81.js';
import '../../../../chunks/utils.js-Ct33xveJ.js';
import '../../../../chunks/root.js-CICqcBMU.js';
import '../../../../chunks/exports.js-ttBjoXEq.js';
import '../../../../chunks/state.svelte.js-V04G28x9.js';

function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data, children } = $$props;
    const { guild, user } = data;
    const ticketsHref = `/${store_get($$store_subs ??= {}, "$page", page).params.guild}/tickets`;
    head("1rboupr", $$renderer2, ($$renderer3) => {
      if (guild.logo) {
        $$renderer3.push(`<!--[0--><link rel="icon"${attr("href", guild.logo)}/>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]-->`);
    });
    $$renderer2.push(`<header class="border-b border-dgrey-300 bg-white/70 backdrop-blur dark:border-dgrey-700 dark:bg-dgrey-900/70"><nav class="container mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3" aria-label="Portal"><a${attr("href", ticketsHref)} class="flex items-center gap-3 font-semibold">`);
    if (guild.logo) {
      $$renderer2.push(`<!--[0--><img${attr("src", guild.logo)} alt="" class="h-8 w-8 rounded-full"/>`);
    } else {
      $$renderer2.push(`<!--[-1--><span class="flex h-8 w-8 items-center justify-center rounded-full bg-blurple text-sm font-bold text-white" aria-hidden="true">${escape_html(guild.name.slice(0, 1))}</span>`);
    }
    $$renderer2.push(`<!--]--> <span>${escape_html(guild.name)}</span></a> <div class="flex grow items-center gap-4 text-sm"><a${attr("href", ticketsHref)} class="rounded-md px-2 py-1 transition hover:bg-dgrey-200 dark:hover:bg-dgrey-800"${attr("aria-current", store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith(ticketsHref) ? "page" : void 0)}><i class="fa-solid fa-ticket"></i> Tickets</a> `);
    if (guild.privilegeLevel >= 2) {
      $$renderer2.push(`<!--[0--><a${attr("href", `/settings/${guild.id}`)} data-sveltekit-reload="" class="rounded-md px-2 py-1 transition hover:bg-dgrey-200 dark:hover:bg-dgrey-800"><i class="fa-solid fa-gear"></i> Settings</a>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="flex items-center gap-3 text-sm"><span class="hidden text-gray-500 dark:text-gray-400 sm:inline">${escape_html(user?.username)}</span> <a href="/auth/logout" class="rounded-md px-2 py-1 transition hover:text-blurple">Log out</a></div></nav></header> <main class="container mx-auto px-4 py-6">`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></main>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte.js-BTlbJpSx.js.map
