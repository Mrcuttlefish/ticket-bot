import { ab as store_get, ag as head, ah as attr, a9 as escape_html, a7 as attr_class, ad as ensure_array_like, af as stringify, ac as unsubscribe_stores, ae as attr_style, S as derived } from '../../../../../../chunks/index.js-NLYGLmrE.js';
import { p as page } from '../../../../../../chunks/stores.js-BUBp50S-.js';
import { h as html, r as renderMarkdown, s as safeHref } from '../../../../../../chunks/markdown.js-CLoL3xwH.js';
import { b as addAuthors, M as MAX_MESSAGE_LENGTH, d as displayName, r as resolveMentions, f as formatBytes } from '../../../../../../chunks/tickets.js-COOjhcPR.js';
import '../../../../../../chunks/uneval.js-7Jtky0YJ.js';
import '../../../../../../chunks/url.js-DUsrn6y4.js';
import '../../../../../../chunks/utils2.js-ejsMtG81.js';
import '../../../../../../chunks/utils.js-Ct33xveJ.js';
import '../../../../../../chunks/root.js-CICqcBMU.js';
import '../../../../../../chunks/exports.js-ttBjoXEq.js';
import '../../../../../../chunks/state.svelte.js-V04G28x9.js';

function Message($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { message, refs = {}, grouped = false } = $$props;
    const time = new Intl.DateTimeFormat("default", { timeStyle: "short" });
    const full = new Intl.DateTimeFormat("default", { dateStyle: "full", timeStyle: "long" });
    const short = new Intl.DateTimeFormat("default", { dateStyle: "medium", timeStyle: "short" });
    const avatar = derived(() => message.author?.avatar && safeHref(message.author.avatar) ? message.author.avatar : "https://cdn.discordapp.com/embed/avatars/0.png");
    const html$1 = derived(() => renderMarkdown(resolveMentions(message.content, refs).replace(/\n/g, "  \n")));
    const isImage = (a) => /^image\//.test(a.contentType ?? "") && !a.expired && safeHref(a.url);
    $$renderer2.push(`<article${attr_class(`group flex gap-3 px-4 ${grouped ? "py-0.5" : "mt-3 py-1"} hover:bg-dgrey-200/40 dark:hover:bg-dgrey-950/30`, void 0, { "opacity-60": message.deleted })}${attr("aria-label", `Message from ${stringify(displayName(message.author))}`)}${attr("data-message-id", message.id)}><div class="w-10 shrink-0">`);
    if (!grouped) {
      $$renderer2.push(`<!--[0--><img${attr("src", avatar())} alt="" class="h-10 w-10 rounded-full" loading="lazy"/>`);
    } else {
      $$renderer2.push(`<!--[-1--><time${attr("datetime", message.createdAt)} class="invisible block pt-1 text-right text-[10px] text-gray-500 group-hover:visible dark:text-gray-400">${escape_html(time.format(new Date(message.createdAt)))}</time>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="min-w-0 grow">`);
    if (!grouped) {
      $$renderer2.push(`<!--[0--><p class="flex flex-wrap items-baseline gap-x-2"><span class="font-semibold"${attr_style(message.author?.roleColour ? `color: ${message.author.roleColour}` : "")}>${escape_html(displayName(message.author))}</span> `);
      if (message.author?.bot) {
        $$renderer2.push(`<!--[0--><span class="rounded bg-blurple px-1 text-[10px] font-bold uppercase text-white">Bot</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (message.viaWeb) {
        $$renderer2.push(`<!--[0--><span class="rounded bg-dgrey-300 px-1 text-[10px] font-semibold uppercase dark:bg-dgrey-700">Web</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <time${attr("datetime", message.createdAt)}${attr("title", full.format(new Date(message.createdAt)))} class="text-xs text-gray-500 dark:text-gray-400">${escape_html(short.format(new Date(message.createdAt)))}</time></p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (message.content) {
      $$renderer2.push(`<!--[0--><div class="prose prose-sm max-w-none break-words dark:prose-invert prose-p:my-0">${html(html$1())}</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (message.editedAt) {
      $$renderer2.push(`<!--[0--><span class="text-[10px] text-gray-500 dark:text-gray-400"${attr("title", full.format(new Date(message.editedAt)))}>(edited)</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (message.deleted) {
      $$renderer2.push(`<!--[0--><span class="text-[10px] font-semibold text-red-500">(deleted)</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array = ensure_array_like(message.embeds ?? []);
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let embed = each_array[$$index_1];
      $$renderer2.push(`<div class="mt-1 max-w-lg rounded border-l-4 bg-dgrey-200/60 p-3 dark:bg-dgrey-950/50"${attr_style(`border-color: ${embed.color ? `#${Number(embed.color).toString(16).padStart(6, "0")}` : "#5865f2"}`)}>`);
      if (embed.title) {
        $$renderer2.push(`<!--[0--><p class="font-semibold">${escape_html(embed.title)}</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (embed.description) {
        $$renderer2.push(`<!--[0--><div class="prose prose-sm dark:prose-invert">${html(renderMarkdown(resolveMentions(embed.description, refs)))}</div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      const each_array_1 = ensure_array_like(embed.fields ?? []);
      for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
        let field = each_array_1[$$index];
        $$renderer2.push(`<p class="mt-2 text-sm font-semibold">${escape_html(field.name)}</p> <div class="prose prose-sm dark:prose-invert">${html(renderMarkdown(resolveMentions(field.value, refs)))}</div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (message.attachments?.length) {
      $$renderer2.push(`<!--[0--><div class="mt-1 flex flex-wrap gap-2"><!--[-->`);
      const each_array_2 = ensure_array_like(message.attachments);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let a = each_array_2[$$index_2];
        if (isImage(a)) {
          $$renderer2.push(`<!--[0--><a${attr("href", safeHref(a.url))} target="_blank" rel="noopener noreferrer"><img${attr("src", safeHref(a.url))}${attr("alt", a.name)} class="max-h-64 max-w-xs rounded" loading="lazy"/></a>`);
        } else {
          $$renderer2.push(`<!--[-1--><div class="flex items-center gap-2 rounded border border-dgrey-300 bg-white px-3 py-2 text-sm dark:border-dgrey-700 dark:bg-dgrey-900"><i class="fa-solid fa-file text-gray-500 dark:text-gray-400"></i> `);
          if (a.expired || !safeHref(a.url)) {
            $$renderer2.push(`<!--[0--><span>${escape_html(a.name)}</span> <span class="text-xs text-gray-500 dark:text-gray-400">(link expired)</span>`);
          } else {
            $$renderer2.push(`<!--[-1--><a${attr("href", safeHref(a.url))} target="_blank" rel="noopener noreferrer" class="text-blurple hover:underline">${escape_html(a.name)}</a>`);
          }
          $$renderer2.push(`<!--]--> <span class="text-xs text-gray-500 dark:text-gray-400">${escape_html(formatBytes(a.size))}</span></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></article>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    data.guild.id;
    let ticket = data.ticket;
    let messages = data.page.messages ?? [];
    let older = data.page.next ?? null;
    const refs = {
      users: addAuthors({ ...data.ticket.users ?? {}, ...data.page.users ?? {} }, data.page.messages),
      roles: data.page.roles ?? {},
      channels: data.page.channels ?? {}
    };
    let draft = "";
    const permissions = derived(() => ticket.permissions ?? {});
    const canReply = derived(() => ticket.open && permissions().canReply);
    const dateFormat = new Intl.DateTimeFormat("default", { dateStyle: "medium", timeStyle: "short" });
    const backHref = `/${store_get($$store_subs ??= {}, "$page", page).params.guild}/tickets`;
    const grouped = (i) => {
      if (i === 0) return false;
      const a = messages[i - 1];
      const b = messages[i];
      return a.author?.id === b.author?.id && new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() < 5 * 60 * 1e3;
    };
    head("3j0gp6", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>#${escape_html(ticket.number)} ${escape_html(ticket.topic ?? "")} - ${escape_html(data.guild.name)}</title>`);
      });
    });
    $$renderer2.push(`<div class="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row"><section class="flex min-w-0 grow flex-col overflow-hidden rounded-xl bg-white shadow-sm dark:bg-dgrey-900"><header class="flex flex-wrap items-center gap-3 border-b border-dgrey-200 p-4 dark:border-dgrey-700"><a${attr("href", backHref)} class="text-gray-500 hover:text-blurple dark:text-gray-400" aria-label="Back to tickets"><i class="fa-solid fa-arrow-left"></i></a> <h1 class="min-w-0 grow truncate text-xl font-bold"><span class="text-gray-500 dark:text-gray-400">#${escape_html(ticket.number)}</span> ${escape_html(ticket.topic || ticket.category?.name || "Ticket")}</h1> <span${attr_class(`rounded-full px-3 py-0.5 text-xs font-semibold ${ticket.open ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-dgrey-300 text-dgrey-700 dark:bg-dgrey-700 dark:text-dgrey-300"}`)} data-testid="ticket-status">${escape_html(ticket.open ? "Open" : "Closed")}</span> `);
    if (ticket.open) {
      $$renderer2.push(`<!--[0--><span class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400" title="Live updates"><span${attr_class(`h-2 w-2 rounded-full ${"bg-dgrey-400"}`)}></span> ${escape_html("Connecting…")}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></header> <div class="max-h-[65vh] min-h-64 overflow-y-auto pb-4" aria-label="Messages" role="log">`);
    if (older) {
      $$renderer2.push(`<!--[0--><div class="p-2 text-center"><button type="button" class="text-sm text-blurple hover:underline">Load earlier messages</button></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (messages.length === 0) {
      $$renderer2.push(`<!--[0--><p class="p-8 text-center text-gray-500 dark:text-gray-400">No messages yet.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array = ensure_array_like(messages);
    for (let i = 0, $$length = each_array.length; i < $$length; i++) {
      let message = each_array[i];
      Message($$renderer2, { message, refs, grouped: grouped(i) });
    }
    $$renderer2.push(`<!--]--></div> `);
    if (canReply()) {
      $$renderer2.push(`<!--[0--><form class="border-t border-dgrey-200 p-3 dark:border-dgrey-700"><label for="reply" class="sr-only">Reply</label> <textarea id="reply" rows="3"${attr("maxlength", MAX_MESSAGE_LENGTH)} placeholder="Reply in the ticket channel… (Ctrl+Enter to send)" class="input form-input mt-0 w-full resize-y">`);
      const $$body = escape_html(draft);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea> <div class="mt-2 flex items-center gap-3"><span class="text-xs text-gray-500 dark:text-gray-400">${escape_html(draft.length)}/${escape_html(MAX_MESSAGE_LENGTH)}</span> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <button type="submit"${attr("disabled", !draft.trim(), true)} class="ml-auto rounded-lg bg-blurple px-5 py-2 font-medium text-white transition hover:bg-blurple/80 disabled:opacity-50">${escape_html("Send")}</button></div></form>`);
    } else if (!ticket.open) {
      $$renderer2.push(`<!--[1--><p class="border-t border-dgrey-200 p-4 text-center text-sm text-gray-500 dark:border-dgrey-700 dark:text-gray-400">This ticket is closed${escape_html(ticket.closedAt ? ` (${dateFormat.format(new Date(ticket.closedAt))})` : "")}. This is the archived transcript.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></section> <aside class="flex w-full shrink-0 flex-col gap-4 lg:w-72"><div class="rounded-xl bg-white p-4 text-sm shadow-sm dark:bg-dgrey-900"><h2 class="mb-2 font-semibold">Details</h2> <dl class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1"><dt class="text-gray-500 dark:text-gray-400">Category</dt> <dd>${escape_html(ticket.category?.emoji ?? "")} ${escape_html(ticket.category?.name ?? "Deleted")}</dd> <dt class="text-gray-500 dark:text-gray-400">Opened by</dt> <dd>${escape_html(displayName(refs.users[ticket.createdById]))}</dd> `);
    if (ticket.claimedById) {
      $$renderer2.push(`<!--[0--><dt class="text-gray-500 dark:text-gray-400">Claimed by</dt> <dd>${escape_html(displayName(refs.users[ticket.claimedById]))}</dd>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <dt class="text-gray-500 dark:text-gray-400">Opened</dt> <dd>${escape_html(dateFormat.format(new Date(ticket.createdAt)))}</dd> `);
    if (ticket.closedAt) {
      $$renderer2.push(`<!--[0--><dt class="text-gray-500 dark:text-gray-400">Closed</dt> <dd>${escape_html(dateFormat.format(new Date(ticket.closedAt)))}</dd>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (ticket.closedById) {
      $$renderer2.push(`<!--[0--><dt class="text-gray-500 dark:text-gray-400">Closed by</dt> <dd>${escape_html(displayName(refs.users[ticket.closedById]))}</dd>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (ticket.closedReason) {
      $$renderer2.push(`<!--[0--><dt class="text-gray-500 dark:text-gray-400">Reason</dt> <dd class="whitespace-pre-wrap break-words">${escape_html(ticket.closedReason)}</dd>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></dl></div> `);
    if (ticket.questionAnswers?.length) {
      $$renderer2.push(`<!--[0--><div class="rounded-xl bg-white p-4 text-sm shadow-sm dark:bg-dgrey-900"><h2 class="mb-2 font-semibold">Answers</h2> <dl class="flex flex-col gap-2"><!--[-->`);
      const each_array_1 = ensure_array_like(ticket.questionAnswers);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let answer = each_array_1[$$index_1];
        $$renderer2.push(`<div><dt class="text-gray-500 dark:text-gray-400">${escape_html(answer.label ?? answer.question?.label)}</dt> <dd class="whitespace-pre-wrap break-words">${escape_html(answer.value || "—")}</dd></div>`);
      }
      $$renderer2.push(`<!--]--></dl></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (ticket.feedback) {
      $$renderer2.push(`<!--[0--><div class="rounded-xl bg-white p-4 text-sm shadow-sm dark:bg-dgrey-900"><h2 class="mb-2 font-semibold">Feedback</h2> <p${attr("aria-label", `Rating ${stringify(ticket.feedback.rating)} out of 5`)}>${escape_html("★".repeat(ticket.feedback.rating))}${escape_html("☆".repeat(5 - ticket.feedback.rating))}</p> `);
      if (ticket.feedback.comment) {
        $$renderer2.push(`<!--[0--><p class="mt-1 whitespace-pre-wrap">${escape_html(ticket.feedback.comment)}</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (ticket.open && permissions().canClose) {
      $$renderer2.push(`<!--[0--><div class="rounded-xl bg-white p-4 text-sm shadow-sm dark:bg-dgrey-900">`);
      {
        $$renderer2.push(`<!--[-1--><button type="button" class="w-full rounded-lg border border-red-500 px-4 py-1.5 font-medium text-red-500 hover:bg-red-500 hover:text-white">Close ticket…</button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></aside></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-B9pnnn0P.js.map
