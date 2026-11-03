import { ah as attr, a9 as escape_html, ad as ensure_array_like, a7 as attr_class, a8 as clsx, ab as store_get, ac as unsubscribe_stores } from '../../../../chunks/index.js-NLYGLmrE.js';
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
    const { guild } = data;
    const base = `/settings/${guild.id}`;
    const tabs = [
      {
        href: base,
        label: "Overview",
        icon: "fa-solid fa-house",
        exact: true
      },
      {
        href: `${base}/general`,
        label: "General",
        icon: "fa-solid fa-gears"
      },
      {
        href: `${base}/categories`,
        label: "Categories",
        icon: "fa-solid fa-list"
      },
      {
        href: `${base}/panels`,
        label: "Panels",
        icon: "fa-solid fa-sliders"
      },
      {
        href: `${base}/tags`,
        label: "Tags",
        icon: "fa-solid fa-tags"
      },
      {
        href: `${base}/feedback`,
        label: "Feedback",
        icon: "fa-solid fa-comments"
      }
    ];
    const active = (tab) => tab.exact ? store_get($$store_subs ??= {}, "$page", page).url.pathname === tab.href : store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith(tab.href);
    const portalHref = `/${BigInt(guild.id).toString(36)}/tickets`;
    $$renderer2.push(`<nav aria-label="Server settings" class="mb-6 flex items-center gap-1 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm dark:bg-slate-800"><span class="mr-2 flex shrink-0 items-center gap-2 px-2 font-semibold">`);
    if (guild.logo) {
      $$renderer2.push(`<!--[0--><img${attr("src", guild.logo)} alt="" class="h-6 w-6 rounded-full"/>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <span class="max-w-40 truncate">${escape_html(guild.name)}</span></span> <!--[-->`);
    const each_array = ensure_array_like(tabs);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let tab = each_array[$$index];
      $$renderer2.push(`<a${attr("href", tab.href)}${attr("aria-current", active(tab) ? "page" : void 0)}${attr_class(`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${active(tab) ? "bg-blurple text-white" : "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"}`)}><i${attr_class(clsx(tab.icon))}></i> ${escape_html(tab.label)}</a>`);
    }
    $$renderer2.push(`<!--]--> <a${attr("href", portalHref)} data-sveltekit-reload="" class="ml-auto flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"><i class="fa-solid fa-ticket"></i> Tickets</a></nav> `);
    children?.($$renderer2);
    $$renderer2.push(`<!---->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte.js-CF79fZIR.js.map
