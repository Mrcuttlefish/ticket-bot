import { ag as head, ad as ensure_array_like, ah as attr, af as stringify, a7 as attr_class, a9 as escape_html, a8 as clsx, S as derived } from '../../../../../chunks/index.js-NLYGLmrE.js';
import '../../../../../chunks/uneval.js-7Jtky0YJ.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const ranges = [7, 30, 90, 365];
    const stats = derived(() => data.statistics);
    const days = derived(() => stats().days ?? []);
    const max = derived(() => Math.max(1, ...days().map((d) => Math.max(d.created, d.closed))));
    let hovered = null;
    const width = 720;
    const height = 220;
    const pad = { top: 12, right: 8, bottom: 24, left: 32 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const slot = derived(() => plotW / Math.max(1, days().length));
    const barW = derived(() => Math.max(1, Math.min(14, (slot() - 4) / 2)));
    const y = (value) => pad.top + plotH - value / max() * plotH;
    const ticks = derived(() => [0, Math.round(max() / 2), max()].filter((v, i, a) => a.indexOf(v) === i));
    const label = (date) => (/* @__PURE__ */ new Date(`${date}T00:00:00Z`)).toLocaleDateString(void 0, { day: "numeric", month: "short", timeZone: "UTC" });
    const every = derived(() => Math.ceil(days().length / 8));
    const bar = (x, value) => {
      const top = y(value);
      const h = pad.top + plotH - top;
      if (h <= 0) return "";
      const r = Math.min(4, barW() / 2, h);
      return `M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW() - r}Q${x + barW()},${top} ${x + barW()},${top + r}V${top + h}Z`;
    };
    const tiles = derived(() => [
      { label: "Opened", value: stats().totals.created },
      { label: "Closed", value: stats().totals.closed },
      { label: "Open now", value: stats().open },
      {
        label: "First response",
        value: stats().totals.avgResponseTime ?? "-"
      },
      {
        label: "Resolution",
        value: stats().totals.avgResolutionTime ?? "-"
      },
      { label: "Rating", value: stats().totals.avgRating ?? "-" }
    ]);
    head("z2gyr3", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Statistics - ${escape_html(data.guild?.name ?? "Discord Tickets")}</title>`);
      });
    });
    $$renderer2.push(`<div class="mx-auto max-w-5xl px-4 pb-12"><div class="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 class="text-3xl font-bold">Statistics</h1> <nav aria-label="Time range" class="flex gap-1 rounded-lg bg-white p-1 shadow-sm dark:bg-slate-800"><!--[-->`);
    const each_array = ensure_array_like(ranges);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let range = each_array[$$index];
      $$renderer2.push(`<a${attr("href", `?days=${stringify(range)}`)} data-sveltekit-noscroll=""${attr("aria-current", data.days === range ? "page" : void 0)}${attr_class(`rounded-md px-3 py-1 text-sm font-medium ${data.days === range ? "bg-blurple text-white" : "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700"}`)}>${escape_html(range === 365 ? "1 year" : `${range} days`)}</a>`);
    }
    $$renderer2.push(`<!--]--></nav></div> <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"><!--[-->`);
    const each_array_1 = ensure_array_like(tiles());
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let tile = each_array_1[$$index_1];
      $$renderer2.push(`<div class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800"><p class="text-sm text-gray-500 dark:text-slate-400">${escape_html(tile.label)}</p> <p class="text-2xl font-bold tabular-nums">${escape_html(tile.value)}</p></div>`);
    }
    $$renderer2.push(`<!--]--></div> <section class="mt-6 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800" aria-labelledby="per-day"><div class="flex flex-wrap items-center justify-between gap-2"><h2 id="per-day" class="text-xl font-bold">Tickets per day</h2> <div class="flex gap-4 text-sm text-gray-600 dark:text-slate-300"><span class="flex items-center gap-1.5"><span class="inline-block h-3 w-3 rounded-sm bg-[#2a78d6] dark:bg-[#3987e5]"></span>Opened</span> <span class="flex items-center gap-1.5"><span class="inline-block h-3 w-3 rounded-sm bg-[#eb6834] dark:bg-[#d95926]"></span>Closed</span></div></div> <div class="relative mt-2"><svg viewBox="0 0 720 220" class="h-auto w-full" role="img" aria-label="Tickets opened and closed per day"><!--[-->`);
    const each_array_2 = ensure_array_like(ticks());
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let tick = each_array_2[$$index_2];
      $$renderer2.push(`<line${attr("x1", pad.left)}${attr("x2", width - pad.right)}${attr("y1", y(tick))}${attr("y2", y(tick))} class="stroke-gray-200 dark:stroke-slate-700" stroke-width="1"></line><text${attr("x", pad.left - 6)}${attr("y", y(tick) + 4)} text-anchor="end" class="fill-gray-500 text-[11px] dark:fill-slate-400">${escape_html(tick)}</text>`);
    }
    $$renderer2.push(`<!--]--><!--[-->`);
    const each_array_3 = ensure_array_like(days());
    for (let i = 0, $$length = each_array_3.length; i < $$length; i++) {
      let day = each_array_3[i];
      const x = pad.left + i * slot() + (slot() - barW() * 2 - 2) / 2;
      $$renderer2.push(`<path${attr("d", bar(x, day.created))} class="fill-[#2a78d6] dark:fill-[#3987e5]"></path><path${attr("d", bar(x + barW() + 2, day.closed))} class="fill-[#eb6834] dark:fill-[#d95926]"></path>`);
      if (i % every() === 0) {
        $$renderer2.push(`<!--[0--><text${attr("x", pad.left + i * slot() + slot() / 2)}${attr("y", height - 6)} text-anchor="middle" class="fill-gray-500 text-[11px] dark:fill-slate-400">${escape_html(label(day.date))}</text>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--><rect${attr("x", pad.left + i * slot())}${attr("y", pad.top)}${attr("width", slot())}${attr("height", plotH)} fill="transparent" role="presentation"${attr_class(clsx(hovered === i ? "fill-gray-500/10" : ""))}></rect>`);
    }
    $$renderer2.push(`<!--]--></svg> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <details class="mt-2 text-sm"><summary class="cursor-pointer text-gray-500 dark:text-slate-400">Show as a table</summary> <table class="mt-2 w-full text-left tabular-nums"><thead><tr><th>Date</th><th>Opened</th><th>Closed</th></tr></thead><tbody><!--[-->`);
    const each_array_4 = ensure_array_like(days());
    for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
      let day = each_array_4[$$index_4];
      $$renderer2.push(`<tr><td>${escape_html(day.date)}</td><td>${escape_html(day.created)}</td><td>${escape_html(day.closed)}</td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table></details></section> <div class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2"><section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800" aria-labelledby="per-category"><h2 id="per-category" class="mb-2 text-xl font-bold">Categories</h2> `);
    if (stats().categories.length === 0) {
      $$renderer2.push(`<!--[0--><p class="text-gray-500 dark:text-slate-400">No tickets in this time.</p>`);
    } else {
      $$renderer2.push(`<!--[-1--><table class="w-full text-left tabular-nums"><thead class="text-sm text-gray-500 dark:text-slate-400"><tr><th>Category</th><th class="text-right">Opened</th><th class="text-right">Closed</th></tr></thead><tbody><!--[-->`);
      const each_array_5 = ensure_array_like(stats().categories);
      for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
        let category = each_array_5[$$index_5];
        $$renderer2.push(`<tr class="border-t border-gray-100 dark:border-slate-700"><td class="py-1">${escape_html(category.name ?? "Deleted category")}</td><td class="text-right">${escape_html(category.created)}</td><td class="text-right">${escape_html(category.closed)}</td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table>`);
    }
    $$renderer2.push(`<!--]--></section> <section class="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800" aria-labelledby="per-staff"><h2 id="per-staff" class="mb-2 text-xl font-bold">Staff</h2> `);
    if (stats().staff.length === 0) {
      $$renderer2.push(`<!--[0--><p class="text-gray-500 dark:text-slate-400">No claimed or closed tickets in this time.</p>`);
    } else {
      $$renderer2.push(`<!--[-1--><table class="w-full text-left tabular-nums"><thead class="text-sm text-gray-500 dark:text-slate-400"><tr><th>Member</th><th class="text-right">Claimed</th><th class="text-right">Closed</th></tr></thead><tbody><!--[-->`);
      const each_array_6 = ensure_array_like(stats().staff);
      for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
        let member = each_array_6[$$index_6];
        $$renderer2.push(`<tr class="border-t border-gray-100 dark:border-slate-700"><td class="flex items-center gap-2 py-1">`);
        if (member.avatar) {
          $$renderer2.push(`<!--[0--><img${attr("src", member.avatar)} alt="" class="h-6 w-6 rounded-full"/>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> ${escape_html(member.displayName ?? member.username ?? member.id)}</td><td class="text-right">${escape_html(member.claimed)}</td><td class="text-right">${escape_html(member.closed)}</td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table>`);
    }
    $$renderer2.push(`<!--]--> <p class="mt-2 text-sm text-gray-500 dark:text-slate-400">Tickets in anonymous categories aren't counted here.</p></section></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-CfUChvQk.js.map
