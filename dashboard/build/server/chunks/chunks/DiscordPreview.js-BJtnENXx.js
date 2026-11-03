import { ah as attr, a9 as escape_html, ad as ensure_array_like, ae as attr_style, a7 as attr_class, af as stringify } from './index.js-NLYGLmrE.js';
import { h as html, s as safeHref, r as renderMarkdown, e as escapeHTML } from './markdown.js-CLoL3xwH.js';
import { e as emoji$1 } from '../entries/pages/settings/_guild_snowflake_/categories/_page.svelte.js-DgtZxVIQ.js';

const TEXT_LIMIT = 2e3;
const DETAILS_LIMIT = 1500;
const INTRO_LIMIT = 1800;
const truncate = (text, max) => text.length > max ? text.slice(0, max - 1) + "…" : text;
function replaceNumber(template, number) {
  return String(template ?? "").replace(
    /{+\s?num(?:ber)?(?::(\d{1,2}))?\s?}+/gi,
    (_, padding) => String(number).padStart(Math.min(Number(padding) || 0, 10), "0")
  );
}
class Mentions {
  constructor() {
    this.list = [];
  }
  /**
   * @param {string} name shown after the @
   * @param {{ color?: string | null, kind?: 'role' | 'user' | 'channel' }} [options]
   * @returns {string} a token to put in markdown
   */
  add(name, { color = null, kind = "user" } = {}) {
    const token = `%%MENTION${this.list.length}%%`;
    this.list.push({ color, kind, name: String(name ?? ""), token });
    return token;
  }
}
function formatOpeningMessage(template, { creator, displayName, username, category, topic, stats = {} }) {
  const values = {
    avgrating: stats.avgRating,
    avgresolutiontime: stats.avgResolutionTime,
    avgresponsetime: stats.avgResponseTime,
    category: category?.name,
    description: category?.description,
    displayname: displayName,
    mention: creator,
    name: creator,
    tag: username,
    topic,
    username: creator
  };
  return replaceNumber(template, 1).replace(/{+\s?([a-z]+)\s?}+/gi, (match, key) => {
    const value = values[key.toLowerCase()];
    return value === void 0 || value === null ? match : String(value);
  });
}
function openingButtons({ edit = false, claim = null, close = false }) {
  const buttons = [];
  if (edit) buttons.push({ emoji: "✏️", label: "Edit", style: "secondary" });
  if (claim === "claim") buttons.push({ emoji: "🙌", label: "Claim", style: "secondary" });
  if (claim === "unclaim") buttons.push({ emoji: "♻️", label: "Release", style: "secondary" });
  if (close) buttons.push({ emoji: "✖️", label: "Close", style: "danger" });
  return buttons;
}
function openingMessagePreview({
  style = "EMBED",
  v2 = false,
  colour = "#009999",
  bot,
  creator,
  pingRoles = [],
  category,
  fields = [],
  footer = null,
  buttons = [],
  stats = {}
}) {
  const mentions = new Mentions();
  const creatorToken = mentions.add(creator.name);
  const pings = pingRoles.map((r) => mentions.add(r.name, { color: r.color, kind: "role" })).join(" ");
  const content = `${pings ? pings + ",\n" : ""}${creatorToken} has created a new ticket`;
  const description = formatOpeningMessage(category.openingMessage ?? "", {
    category,
    creator: creatorToken,
    displayName: creator.name,
    stats,
    topic: fields[0]?.value ?? "",
    username: creator.name
  }).trim() || null;
  const rows = buttons.length ? [{ buttons, type: "buttons" }] : [];
  const base = { author: bot, container: null, embeds: [], mentions: mentions.list, rows };
  if (style === "TEXT" || style === "OFF") {
    const details = fields.length ? truncate(fields.map((f) => `**${f.name}**
${f.value}`).join("\n\n"), DETAILS_LIMIT) : "";
    const head = style === "TEXT" ? [content, `**${creator.name}**`, description, category.image].filter(Boolean).join("\n\n") : content;
    return {
      ...base,
      content: truncate(head, TEXT_LIMIT - 3 - details.length) + (details ? "\n\n" + details : "")
    };
  }
  if (!v2) {
    const embeds = [
      {
        author: { icon: creator.avatar, name: creator.name },
        color: colour,
        description,
        image: category.image || null
      }
    ];
    if (fields.length) embeds.push({ color: colour, fields });
    if (footer) embeds[embeds.length - 1].footer = { icon: bot.avatar, text: footer };
    return { ...base, content, embeds };
  }
  const children = [
    {
      markdown: truncate(
        `### ${creator.name}` + (description ? `
${description}` : ""),
        INTRO_LIMIT
      ),
      thumbnail: creator.avatar || null,
      type: "text"
    }
  ];
  if (category.image) children.push({ type: "gallery", url: category.image });
  children.push({ type: "separator" });
  children.push(
    fields.length ? {
      markdown: truncate(
        fields.map((f) => `**${f.name}**
${f.value}`).join("\n\n"),
        DETAILS_LIMIT
      ),
      type: "text"
    } : { text: "—", type: "subtext" }
  );
  if (buttons.length) children.push({ buttons, type: "buttons" });
  if (footer) children.push({ text: footer, type: "subtext" });
  return { ...base, container: { accent: colour, children }, content, rows: [] };
}
function closedMessagePreview({
  bot,
  colour = "#009999",
  closedBy,
  keepClosedFor,
  archive,
  footer = null
}) {
  const mentions = new Mentions();
  const closer = mentions.add(closedBy);
  let description = `${closer} closed this ticket.
Staff can reopen it, save a transcript, or delete the channel.`;
  if (keepClosedFor > 0)
    description += `
This channel will be deleted in ${formatDuration(keepClosedFor)}.`;
  const buttons = [{ emoji: "🔓", label: "Reopen", style: "success" }];
  if (archive) buttons.push({ emoji: "📄", label: "Transcript", style: "primary" });
  buttons.push({ emoji: "🗑️", label: "Delete", style: "danger" });
  return {
    author: bot,
    container: null,
    content: null,
    embeds: [
      {
        color: colour,
        description,
        footer: footer ? { icon: bot.avatar, text: footer } : null,
        title: "🔒 Ticket closed"
      }
    ],
    mentions: mentions.list,
    rows: [{ buttons, type: "buttons" }]
  };
}
function formatDuration(ms) {
  const units = [
    ["day", 864e5],
    ["hour", 36e5],
    ["minute", 6e4],
    ["second", 1e3]
  ];
  for (const [name, size] of units) {
    if (ms >= size) {
      const n = Math.round(ms / size);
      return `${n} ${name}${n === 1 ? "" : "s"}`;
    }
  }
  return "a moment";
}
function panelPreview({
  v2 = false,
  colour = "#009999",
  bot,
  type,
  title = "",
  description = "",
  image = "",
  thumbnail = "",
  footer = null,
  categories
}) {
  let control = null;
  if (type === "MESSAGE") {
    control = {
      buttons: [{ emoji: "🎫", label: "Create a ticket", style: "primary" }],
      type: "buttons"
    };
  } else if (type === "MENU") {
    control = {
      options: categories.map((c) => ({
        description: c.description,
        emoji: c.emoji,
        label: c.name
      })),
      placeholder: "Select a ticket category",
      type: "menu"
    };
  } else if (categories.length) {
    control = {
      buttons: categories.map((c) => ({
        emoji: c.emoji,
        label: c.name,
        style: categories.length === 1 ? "primary" : "secondary"
      })),
      type: "buttons"
    };
  }
  const base = { author: bot, content: null, mentions: [], rows: [] };
  if (!v2) {
    return {
      ...base,
      container: null,
      embeds: [
        {
          color: colour,
          description: description || null,
          footer: footer ? { icon: bot.avatar, text: footer } : null,
          image: image || null,
          thumbnail: thumbnail || null,
          title: title || null
        }
      ],
      rows: control ? [control] : []
    };
  }
  const children = [
    {
      markdown: [title && `## ${title}`, description].filter(Boolean).join("\n") || "",
      thumbnail: thumbnail || null,
      type: "text"
    }
  ];
  if (image) children.push({ type: "gallery", url: image });
  if (control) children.push(control);
  if (footer) children.push({ text: footer, type: "subtext" });
  return { ...base, container: { accent: colour, children }, embeds: [] };
}
const NAMED_COLOURS = {
  Aqua: "#1abc9c",
  Blue: "#3498db",
  Blurple: "#5865f2",
  DarkAqua: "#11806a",
  DarkBlue: "#206694",
  DarkGreen: "#1f8b4c",
  DarkRed: "#992d22",
  Default: "#000000",
  Fuchsia: "#eb459e",
  Gold: "#f1c40f",
  Green: "#57f287",
  Grey: "#95a5a6",
  Orange: "#e67e22",
  Purple: "#9b59b6",
  Red: "#ed4245",
  White: "#ffffff",
  Yellow: "#fee75c"
};
function cssColour(colour, fallback = "#5865f2") {
  if (typeof colour !== "string") return fallback;
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(colour)) return colour;
  return NAMED_COLOURS[colour] ?? fallback;
}
function resolveEmoji(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (/^\d{17,20}$/.test(text))
    return { url: `https://cdn.discordapp.com/emojis/${text}.webp?size=44` };
  return { text: emoji$1.get(text) ?? text };
}
function emoji($$renderer, value) {
  const e = resolveEmoji(value);
  if (e?.url) {
    $$renderer.push(`<!--[0--><img${attr("src", e.url)} alt="" class="h-[18px] w-[18px]"/>`);
  } else if (e?.text) {
    $$renderer.push(`<!--[1--><span aria-hidden="true">${escape_html(e.text)}</span>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]-->`);
}
function DiscordPreview($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { message, label = "Message preview" } = $$props;
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("default", { hour: "numeric", minute: "numeric" });
    const mentionHTML = (m) => {
      const colour = m.kind === "role" && m.color && m.color !== "#000000" ? cssColour(m.color, "") : "";
      const style = colour ? ` style="color:${colour};background-color:${colour}26"` : "";
      return `<span class="discord-mention"${style}>@${escapeHTML(m.name)}</span>`;
    };
    const md = (text) => renderMarkdown(String(text ?? "").replace(/\n/g, "  \n"), message.mentions.map((m) => [new RegExp(m.token, "g"), mentionHTML(m), { html: true }]));
    const image = (url) => {
      const safe = safeHref(url ?? "");
      return safe && !safe.startsWith("mailto:") ? safe : null;
    };
    const BUTTON_STYLES = {
      danger: "bg-[#da373c] text-white",
      primary: "bg-[#5865f2] text-white",
      secondary: "bg-[#e3e5e8] text-[#313338] dark:bg-[#4e5058] dark:text-white",
      success: "bg-[#248046] text-white"
    };
    function row($$renderer3, r) {
      if (r.type === "buttons") {
        $$renderer3.push(`<!--[0--><div class="mt-1 flex flex-wrap gap-2" data-preview="buttons"><!--[-->`);
        const each_array = ensure_array_like(r.buttons);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let b = each_array[$$index];
          $$renderer3.push(`<span${attr_class(`inline-flex h-8 items-center gap-1.5 rounded-[3px] px-4 text-sm font-medium ${stringify(BUTTON_STYLES[b.style] ?? BUTTON_STYLES.secondary)}`, "svelte-1bzrnuu")}>`);
          emoji($$renderer3, b.emoji);
          $$renderer3.push(`<!----> <span>${escape_html(b.label)}</span></span>`);
        }
        $$renderer3.push(`<!--]--></div>`);
      } else if (r.type === "menu") {
        $$renderer3.push(`<!--[1--><details class="group mt-1 max-w-[400px]" data-preview="menu"><summary class="flex h-10 cursor-pointer list-none items-center justify-between rounded border border-[#e3e5e8] bg-[#ebedef] px-3 text-sm text-[#5c5e66] dark:border-[#1e1f22] dark:bg-[#1e1f22] dark:text-[#949ba4]"><span>${escape_html(r.placeholder)}</span> <span class="transition-transform group-open:rotate-180" aria-hidden="true">⌄</span></summary> <ul class="mt-1 rounded border border-[#e3e5e8] bg-white text-sm dark:border-[#1e1f22] dark:bg-[#2b2d31]">`);
        const each_array_1 = ensure_array_like(r.options);
        if (each_array_1.length !== 0) {
          $$renderer3.push("<!--[-->");
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let o = each_array_1[$$index_1];
            $$renderer3.push(`<li class="flex items-center gap-2 px-3 py-2">`);
            emoji($$renderer3, o.emoji);
            $$renderer3.push(`<!----> <span><span class="block font-medium">${escape_html(o.label)}</span> `);
            if (o.description) {
              $$renderer3.push(`<!--[0--><span class="block text-xs text-[#5c5e66] dark:text-[#b5bac1]">${escape_html(o.description)}</span>`);
            } else {
              $$renderer3.push("<!--[-1-->");
            }
            $$renderer3.push(`<!--]--></span></li>`);
          }
        } else {
          $$renderer3.push(`<!--[!--><li class="px-3 py-2 text-[#5c5e66] dark:text-[#b5bac1]">No categories</li>`);
        }
        $$renderer3.push(`<!--]--></ul></details>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]-->`);
    }
    function footer($$renderer3, f) {
      $$renderer3.push(`<div class="mt-2 flex items-center gap-2 text-xs text-[#5c5e66] dark:text-[#b5bac1]">`);
      if (image(f.icon)) {
        $$renderer3.push(`<!--[0--><img${attr("src", image(f.icon))} alt="" class="h-5 w-5 rounded-full"/>`);
      } else {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> <span>${escape_html(f.text)}</span></div>`);
    }
    $$renderer2.push(`<div class="discord-preview rounded-lg bg-white px-4 py-3 text-[15px] leading-[1.375rem] text-[#313338] dark:bg-[#313338] dark:text-[#dbdee1] svelte-1bzrnuu" role="figure"${attr("aria-label", label)}${attr("data-preview-layout", message.container ? "v2" : message.embeds.length ? "embed" : "text")}><div class="flex gap-4">`);
    if (image(message.author.avatar)) {
      $$renderer2.push(`<!--[0--><img${attr("src", image(message.author.avatar))} alt="" class="h-10 w-10 shrink-0 rounded-full"/>`);
    } else {
      $$renderer2.push(`<!--[-1--><div class="h-10 w-10 shrink-0 rounded-full bg-[#5865f2]"></div>`);
    }
    $$renderer2.push(`<!--]--> <div class="min-w-0 flex-1"><div class="flex items-center gap-1"><span class="font-medium text-[#060607] dark:text-white">${escape_html(message.author.name)}</span> <span class="rounded bg-[#5865f2] px-1 text-[10px] font-semibold uppercase leading-4 text-white">App</span> <span class="ml-1 text-xs text-[#5c5e66] dark:text-[#949ba4]">Today at ${escape_html(time)}</span></div> `);
    if (message.content) {
      $$renderer2.push(`<!--[0--><div class="discord-markdown break-words svelte-1bzrnuu" data-preview="content">${html(md(message.content))}</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array_2 = ensure_array_like(message.embeds);
    for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
      let e = each_array_2[$$index_3];
      $$renderer2.push(`<div class="mt-1 flex max-w-[520px] overflow-hidden rounded bg-[#f2f3f5] dark:bg-[#2b2d31]" data-preview="embed"><div class="w-1 shrink-0"${attr_style("", { "background-color": cssColour(e.color) })}></div> <div class="flex min-w-0 flex-1 gap-4 px-3 pb-3 pt-2"><div class="min-w-0 flex-1">`);
      if (e.author) {
        $$renderer2.push(`<!--[0--><div class="mt-1 flex items-center gap-2 text-sm font-medium">`);
        if (image(e.author.icon)) {
          $$renderer2.push(`<!--[0--><img${attr("src", image(e.author.icon))} alt="" class="h-6 w-6 rounded-full"/>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <span>${escape_html(e.author.name)}</span></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (e.title) {
        $$renderer2.push(`<!--[0--><div class="discord-markdown mt-1 font-semibold svelte-1bzrnuu">${html(md(e.title))}</div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (e.description) {
        $$renderer2.push(`<!--[0--><div class="discord-markdown mt-1 break-words text-sm svelte-1bzrnuu">${html(md(e.description))}</div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (e.fields?.length) {
        $$renderer2.push(`<!--[0--><div class="mt-2 grid gap-2"><!--[-->`);
        const each_array_3 = ensure_array_like(e.fields);
        for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
          let field = each_array_3[$$index_2];
          $$renderer2.push(`<div class="text-sm"><div class="font-semibold">${escape_html(field.name)}</div> <div class="discord-markdown break-words svelte-1bzrnuu">${html(md(field.value))}</div></div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (image(e.image)) {
        $$renderer2.push(`<!--[0--><img${attr("src", image(e.image))} alt="" class="mt-3 max-h-80 max-w-full rounded"/>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (e.footer) {
        $$renderer2.push("<!--[0-->");
        footer($$renderer2, e.footer);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> `);
      if (image(e.thumbnail)) {
        $$renderer2.push(`<!--[0--><img${attr("src", image(e.thumbnail))} alt="" class="mt-2 h-20 w-20 shrink-0 rounded object-cover"/>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (message.container) {
      $$renderer2.push(`<!--[0--><div class="mt-1 flex max-w-[600px] overflow-hidden rounded-lg border border-[#e3e5e8] bg-[#f2f3f5] dark:border-[#3f4147] dark:bg-[#2b2d31]" data-preview="container"><div class="w-1 shrink-0"${attr_style("", { "background-color": cssColour(message.container.accent) })}></div> <div class="flex min-w-0 flex-1 flex-col gap-2 p-4"><!--[-->`);
      const each_array_4 = ensure_array_like(message.container.children);
      for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
        let c = each_array_4[$$index_4];
        if (c.type === "text") {
          $$renderer2.push(`<!--[0--><div class="flex gap-4"><div class="discord-markdown min-w-0 flex-1 break-words svelte-1bzrnuu">${html(md(c.markdown))}</div> `);
          if (image(c.thumbnail)) {
            $$renderer2.push(`<!--[0--><img${attr("src", image(c.thumbnail))} alt="" class="h-20 w-20 shrink-0 rounded-lg object-cover"/>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--></div>`);
        } else if (c.type === "gallery") {
          $$renderer2.push("<!--[1-->");
          if (image(c.url)) {
            $$renderer2.push(`<!--[0--><img${attr("src", image(c.url))} alt="" class="max-h-80 w-full rounded-lg object-cover"/>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]-->`);
        } else if (c.type === "separator") {
          $$renderer2.push(`<!--[2--><hr class="border-[#e3e5e8] dark:border-[#3f4147]"/>`);
        } else if (c.type === "subtext") {
          $$renderer2.push(`<!--[3--><div class="discord-markdown text-xs text-[#5c5e66] dark:text-[#949ba4] svelte-1bzrnuu">${html(md(c.text))}</div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          row($$renderer2, c);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array_5 = ensure_array_like(message.rows);
    for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
      let r = each_array_5[$$index_5];
      row($$renderer2, r);
    }
    $$renderer2.push(`<!--]--></div></div></div>`);
  });
}

export { DiscordPreview as D, openingButtons as a, closedMessagePreview as c, openingMessagePreview as o, panelPreview as p };
//# sourceMappingURL=DiscordPreview.js-BJtnENXx.js.map
