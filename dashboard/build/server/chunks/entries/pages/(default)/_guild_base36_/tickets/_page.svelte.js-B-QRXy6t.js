import { ag as head, a9 as escape_html, ah as attr, ad as ensure_array_like, a7 as attr_class, ab as store_get, ac as unsubscribe_stores } from '../../../../../chunks/index.js-NLYGLmrE.js';
import '../../../../../chunks/url.js-DUsrn6y4.js';
import '../../../../../chunks/utils2.js-ejsMtG81.js';
import '../../../../../chunks/utils.js-Ct33xveJ.js';
import '../../../../../chunks/root.js-CICqcBMU.js';
import '../../../../../chunks/exports.js-ttBjoXEq.js';
import '../../../../../chunks/state.svelte.js-V04G28x9.js';
import { p as page } from '../../../../../chunks/stores.js-BUBp50S-.js';
import { d as displayName } from '../../../../../chunks/tickets.js-COOjhcPR.js';
import '../../../../../chunks/uneval.js-7Jtky0YJ.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let tickets = data.result.tickets;
    let users = data.result.users ?? {};
    let next = data.result.next;
    let loadingMore = false;
    let q = data.q;
    const statuses = [
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
      { value: "all", label: "All" }
    ];
    const isStaff = data.guild.privilegeLevel >= 1;
    const dateFormat = new Intl.DateTimeFormat("default", { dateStyle: "medium", timeStyle: "short" });
    function filterUrl(changes) {
      const params = new URLSearchParams(store_get($$store_subs ??= {}, "$page", page).url.searchParams);
      for (const [k, v] of Object.entries(changes)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      const qs = params.toString();
      return `${store_get($$store_subs ??= {}, "$page", page).url.pathname}${qs ? `?${qs}` : ""}`;
    }
    head("wezwye", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Tickets - ${escape_html(data.guild.name)}</title>`);
      });
    });
    $$renderer2.push(`<div class="mx-auto flex max-w-4xl flex-col gap-6"><div class="flex flex-wrap items-end justify-between gap-4"><div><h1 class="text-3xl font-bold">${escape_html(isStaff ? "Tickets" : "Your tickets")}</h1> <p class="text-gray-500 dark:text-gray-400">${escape_html(isStaff ? "Read transcripts and reply to open tickets." : "Read your past tickets and reply to open ones.")}</p></div> <form role="search" class="flex gap-2"><input type="search" class="input form-input mt-0 w-56" placeholder="Search topic or number" aria-label="Search tickets"${attr("value", q)}/> <button type="submit" class="rounded-lg bg-blurple px-4 font-medium text-white hover:bg-blurple/80">Search</button></form></div> <div class="flex gap-2" role="tablist" aria-label="Ticket status"><!--[-->`);
    const each_array = ensure_array_like(statuses);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let s = each_array[$$index];
      $$renderer2.push(`<a role="tab"${attr("aria-selected", data.status === s.value)}${attr("href", filterUrl({ status: s.value === "open" ? "" : s.value }))}${attr_class(`rounded-full px-4 py-1 text-sm font-medium transition ${data.status === s.value ? "bg-blurple text-white" : "bg-dgrey-200 hover:bg-dgrey-300 dark:bg-dgrey-900 dark:hover:bg-dgrey-700"}`)}>${escape_html(s.label)}</a>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    if (tickets.length === 0) {
      $$renderer2.push(`<!--[0--><div class="rounded-xl bg-white p-8 text-center shadow-sm dark:bg-dgrey-900"><i class="fa-regular fa-folder-open mb-2 text-4xl text-dgrey-400"></i> <p>No ${escape_html(data.status === "all" ? "" : data.status)} tickets${escape_html(data.q ? ` matching "${data.q}"` : "")}.</p></div>`);
    } else {
      $$renderer2.push(`<!--[-1--><ul class="flex flex-col gap-2" aria-label="Tickets"><!--[-->`);
      const each_array_1 = ensure_array_like(tickets);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let ticket = each_array_1[$$index_1];
        $$renderer2.push(`<li><a${attr("href", `${store_get($$store_subs ??= {}, "$page", page).url.pathname}/${ticket.id}`)} class="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition hover:ring-2 hover:ring-blurple/50 dark:bg-dgrey-900"><span class="text-2xl" aria-hidden="true">${escape_html(ticket.category?.emoji || "🎫")}</span> <div class="min-w-0 grow"><p class="truncate font-semibold"><span class="text-gray-500 dark:text-gray-400">#${escape_html(ticket.number)}</span> ${escape_html(ticket.topic || ticket.category?.name || "Ticket")}</p> <p class="truncate text-sm text-gray-500 dark:text-gray-400">${escape_html(ticket.category?.name ?? "Deleted category")} `);
        if (isStaff) {
          $$renderer2.push(`<!--[0-->· ${escape_html(displayName(users[ticket.createdById]))}`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> · ${escape_html(dateFormat.format(new Date(ticket.createdAt)))} `);
        if (ticket.messageCount) {
          $$renderer2.push(`<!--[0-->· ${escape_html(ticket.messageCount)} message${escape_html(ticket.messageCount === 1 ? "" : "s")}`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></p></div> <span${attr_class(`shrink-0 rounded-full px-3 py-0.5 text-xs font-semibold ${ticket.open ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-dgrey-300 text-dgrey-700 dark:bg-dgrey-700 dark:text-dgrey-300"}`)}>${escape_html(ticket.open ? "Open" : "Closed")}</span></a></li>`);
      }
      $$renderer2.push(`<!--]--></ul> `);
      if (next) {
        $$renderer2.push(`<!--[0--><button type="button" class="self-center rounded-lg px-4 py-2 font-medium text-blurple hover:bg-blurple/10"${attr("disabled", loadingMore, true)}>${escape_html("Load more")}</button>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-B-QRXy6t.js.map
