import { ag as head, ad as ensure_array_like, a9 as escape_html, ah as attr, S as derived } from '../../../../../chunks/index.js-NLYGLmrE.js';
import '../../../../../chunks/uneval.js-7Jtky0YJ.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const types = [
      ["", "Everything"],
      ["settings", "General settings"],
      ["category", "Categories"],
      ["question", "Questions"],
      ["panel", "Panels"],
      ["tag", "Tags"]
    ];
    const verbs = { create: "created", delete: "deleted", update: "changed" };
    const typeNames = {
      category: "category",
      panel: "panel",
      question: "question",
      settings: "the settings",
      tag: "tag"
    };
    const when = (date) => new Date(date).toLocaleString(void 0, { dateStyle: "medium", timeStyle: "short" });
    const nextHref = derived(() => `?${new URLSearchParams({
      ...data.type && { type: data.type },
      before: String(data.history.next)
    })}`);
    head("ah49sy", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>History - ${escape_html(data.guild?.name ?? "Discord Tickets")}</title>`);
      });
    });
    $$renderer2.push(`<div class="mx-auto max-w-5xl px-4 pb-12"><div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h1 class="text-3xl font-bold">History</h1> <p class="text-gray-500 dark:text-slate-400">Changes made in the dashboard, newest first. Kept for a year.</p></div> <form method="GET" class="flex items-center gap-2"><label class="text-sm font-medium">Show `);
    $$renderer2.select(
      {
        name: "type",
        class: "input form-multiselect mt-0 inline-block w-auto",
        value: data.type,
        onchange: (event) => event.currentTarget.form.requestSubmit()
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(types);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let [value, label] = each_array[$$index];
          $$renderer3.option({ value }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(label)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(`</label> <noscript><button type="submit" class="text-blurple">Filter</button></noscript></form></div> `);
    if (data.history.entries.length === 0) {
      $$renderer2.push(`<!--[0--><p class="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">No changes yet.</p>`);
    } else {
      $$renderer2.push(`<!--[-1--><ol class="flex flex-col gap-3"><!--[-->`);
      const each_array_1 = ensure_array_like(data.history.entries);
      for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
        let entry = each_array_1[$$index_2];
        $$renderer2.push(`<li class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800"><div class="flex flex-wrap items-center gap-2">`);
        if (entry.user?.avatar) {
          $$renderer2.push(`<!--[0--><img${attr("src", entry.user.avatar)} alt="" class="h-6 w-6 rounded-full"/>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <span class="font-semibold">${escape_html(entry.user?.displayName ?? entry.user?.username ?? entry.user?.id)}</span> <span>${escape_html(verbs[entry.action] ?? entry.action)}
							${escape_html(typeNames[entry.target.type] ?? entry.target.type)} `);
        if (entry.target.type !== "settings" && entry.target.name) {
          $$renderer2.push(`<!--[0--><span class="font-medium">${escape_html(entry.target.name)}</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></span> <time class="ml-auto text-sm text-gray-500 dark:text-slate-400"${attr("datetime", entry.createdAt)}>${escape_html(when(entry.createdAt))}</time></div> `);
        if (entry.changes.length > 0) {
          $$renderer2.push(`<!--[0--><details class="mt-2"><summary class="cursor-pointer text-sm text-gray-500 dark:text-slate-400">${escape_html(entry.changes.length)} change${escape_html(entry.changes.length === 1 ? "" : "s")}</summary> <table class="mt-2 w-full table-fixed text-left text-sm"><thead class="text-gray-500 dark:text-slate-400"><tr><th class="w-1/4">Setting</th><th>Before</th><th>After</th></tr></thead><tbody class="font-mono"><!--[-->`);
          const each_array_2 = ensure_array_like(entry.changes);
          for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
            let change = each_array_2[$$index_1];
            $$renderer2.push(`<tr class="border-t border-gray-100 align-top dark:border-slate-700"><td class="break-words py-1 font-sans font-medium">${escape_html(change.field)}</td><td class="break-words py-1 text-red-700 dark:text-red-300">${escape_html(change.from ?? "-")}</td><td class="break-words py-1 text-green-700 dark:text-green-300">${escape_html(change.to ?? "-")}</td></tr>`);
          }
          $$renderer2.push(`<!--]--></tbody></table></details>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></li>`);
      }
      $$renderer2.push(`<!--]--></ol> `);
      if (data.history.next) {
        $$renderer2.push(`<!--[0--><div class="mt-4 text-center"><a${attr("href", nextHref())} class="font-medium text-blurple hover:underline">Older changes</a></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-DYCOy0h2.js.map
