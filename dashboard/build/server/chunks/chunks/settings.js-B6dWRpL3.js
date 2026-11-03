import { ah as attr, af as stringify, a7 as attr_class, a9 as escape_html } from './index.js-NLYGLmrE.js';
import { m as ms } from '../entries/pages/_layout.server.js-Bzwarz43.js';

function Section($$renderer, $$props) {
  let { title, description = "", icon = "", id, children } = $$props;
  $$renderer.push(`<section${attr("id", id)} class="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-700"${attr("aria-labelledby", `${stringify(id)}-title`)}><header class="mb-4"><h2${attr("id", `${stringify(id)}-title`)} class="text-xl font-bold">`);
  if (icon) {
    $$renderer.push(`<!--[0--><i${attr_class(`${stringify(icon)} mr-1 text-blurple`)}></i>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--> ${escape_html(title)}</h2> `);
  if (description) {
    $$renderer.push(`<!--[0--><p class="text-sm text-gray-500 dark:text-slate-400">${escape_html(description)}</p>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></header> <div class="flex flex-col gap-6">`);
  children?.($$renderer);
  $$renderer.push(`<!----></div></section>`);
}
const WEBHOOK_SECRET_MASK = "********";
function durationToInput(value, { allowOff = false } = {}) {
  if (value === null || value === void 0) return "";
  if (value === 0) return allowOff ? "off" : "";
  return ms(value);
}
function workingHoursToForm(workingHours) {
  const [timezone = "UTC", ...days] = Array.isArray(workingHours) ? workingHours : [];
  const out = [timezone];
  for (let i = 0; i < 7; i++) {
    const day = days[i];
    out.push(Array.isArray(day) && day.length === 2 && day[0] !== day[1] ? [...day] : []);
  }
  return out;
}
function normaliseHolidays(dates) {
  return [...new Set((dates ?? []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
}
const override = {
  /** @param {boolean | null | undefined} value */
  toSelect: (value) => value === true ? "on" : value === false ? "off" : "inherit",
  /** @param {string} value */
  fromSelect: (value) => value === "on" ? true : value === "off" ? false : null
};

export { Section as S, WEBHOOK_SECRET_MASK as W, durationToInput as d, normaliseHolidays as n, override as o, workingHoursToForm as w };
//# sourceMappingURL=settings.js-B6dWRpL3.js.map
