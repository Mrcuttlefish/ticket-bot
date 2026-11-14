import { ag as head, a9 as escape_html, ah as attr, ad as ensure_array_like, a7 as attr_class, af as stringify, ak as bind_props, a8 as clsx } from '../../../../../chunks/index.js-NLYGLmrE.js';
import '../../../../../chunks/url.js-DUsrn6y4.js';
import '../../../../../chunks/utils2.js-ejsMtG81.js';
import '../../../../../chunks/utils.js-Ct33xveJ.js';
import '../../../../../chunks/root.js-CICqcBMU.js';
import '../../../../../chunks/exports.js-ttBjoXEq.js';
import '../../../../../chunks/state.svelte.js-V04G28x9.js';
import { d as durationToInput, w as workingHoursToForm, n as normaliseHolidays, e as buttonRolesToForm, f as buttonsToForm, g as WEBHOOK_SECRET_MASK, S as Section, W as WorkingHours, R as RoleSelect, L as LOG_EVENTS, h as CUSTOM_BUTTONS, B as BUTTON_STYLES } from '../../../../../chunks/WorkingHours.js-pBKgn6Pa.js';
import '../../../_layout.server.js-YLKRlluw.js';
import { H as Hint } from '../../../../../chunks/Hint.js-B3ipMhPI.js';
import '../../../../../chunks/uneval.js-7Jtky0YJ.js';
import '../../../../../chunks/Required.js-BUvC22z7.js';
import '../../../../../index.js-B7y4MLPy.js';
import '../../../../../chunks/server.js-DtCli5Nu.js';
import '../../../../../chunks/index2.js-DH9RKYtd.js';
import '../../../../../chunks/internal2.js-Dzffpb1J.js';
import '../../../../../chunks/i18n.js-moWVPshl.js';

function ButtonCustomiser($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { value = void 0, access = void 0, roles = [] } = $$props;
    const input = "form-input w-full rounded-md border-transparent bg-gray-100 text-base shadow-sm focus:border-2 focus:border-blurple focus:bg-white focus:ring-0 dark:bg-slate-800";
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="grid grid-cols-1 gap-3"><!--[-->`);
      const each_array = ensure_array_like(CUSTOM_BUTTONS);
      for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
        let [name, title] = each_array[$$index_1];
        $$renderer3.push(`<fieldset class="grid grid-cols-1 items-center gap-2 sm:grid-cols-[9rem,1fr,6rem,8rem]"><legend class="sr-only">${escape_html(title)} button</legend> <span class="text-base font-medium">${escape_html(title)}</span> <input type="text"${attr_class(clsx(input))} maxlength="80" placeholder="Default label"${attr("aria-label", `${stringify(title)} button label`)}${attr("value", value[name].label)}/> <input type="text"${attr_class(clsx(input))} maxlength="64" placeholder="Emoji"${attr("aria-label", `${stringify(title)} button emoji`)}${attr("value", value[name].emoji)}/> `);
        $$renderer3.select(
          {
            class: input,
            "aria-label": `${stringify(title)} button colour`,
            value: value[name].style
          },
          ($$renderer4) => {
            $$renderer4.option({ value: "" }, ($$renderer5) => {
              $$renderer5.push(`Default colour`);
            });
            $$renderer4.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(BUTTON_STYLES);
            for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
              let [style, label] = each_array_1[$$index];
              $$renderer4.option({ value: style }, ($$renderer5) => {
                $$renderer5.push(`${escape_html(label)}`);
              });
            }
            $$renderer4.push(`<!--]-->`);
          }
        );
        $$renderer3.push(` `);
        if (access) {
          $$renderer3.push(`<!--[0--><details class="sm:col-span-4"${attr("open", access[name].allow.length + access[name].deny.length > 0, true)}><summary class="cursor-pointer text-sm text-gray-500 dark:text-slate-400">Who can use it `);
          if (access[name].allow.length + access[name].deny.length > 0) {
            $$renderer3.push(`<!--[0--><span class="text-blurple">(limited)</span>`);
          } else {
            $$renderer3.push("<!--[-1-->");
          }
          $$renderer3.push(`<!--]--></summary> <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"><label class="text-sm font-medium">Only these roles (empty: anyone who could already) `);
          RoleSelect($$renderer3, {
            roles,
            size: "h-24",
            label: `${stringify(title)} button: only these roles`,
            get value() {
              return access[name].allow;
            },
            set value($$value) {
              access[name].allow = $$value;
              $$settled = false;
            }
          });
          $$renderer3.push(`<!----></label> <label class="text-sm font-medium">Not these roles `);
          RoleSelect($$renderer3, {
            roles,
            size: "h-24",
            label: `${stringify(title)} button: not these roles`,
            get value() {
              return access[name].deny;
            },
            set value($$value) {
              access[name].deny = $$value;
              $$settled = false;
            }
          });
          $$renderer3.push(`<!----></label></div></details>`);
        } else {
          $$renderer3.push("<!--[-1-->");
        }
        $$renderer3.push(`<!--]--></fieldset>`);
      }
      $$renderer3.push(`<!--]--></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { value, access });
  });
}
function HolidayPicker($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { value = [] } = $$props;
    let date = "";
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const format = (d) => new Intl.DateTimeFormat("default", { dateStyle: "medium", timeZone: "UTC" }).format(/* @__PURE__ */ new Date(`${d}T00:00:00Z`));
    $$renderer2.push(`<div class="flex flex-col gap-2"><div class="flex items-center gap-2"><input type="date" aria-label="Holiday date" class="input form-input mt-0 grow"${attr("value", date)}/> <button type="button" class="rounded-lg px-3 py-1 font-medium text-green-600 transition duration-300 hover:bg-green-500/10 disabled:opacity-50 dark:text-green-400"${attr("disabled", !date, true)} aria-label="Add holiday"><i class="fa-solid fa-circle-plus"></i> Add</button></div> `);
    if (value.length > 0) {
      $$renderer2.push(`<!--[0--><ul class="flex flex-wrap gap-2" aria-label="Holidays"><!--[-->`);
      const each_array = ensure_array_like(value);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let d = each_array[$$index];
        $$renderer2.push(`<li${attr_class("flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-sm font-normal dark:bg-slate-800", void 0, { "opacity-50": d < today })}><time${attr("datetime", d)}>${escape_html(format(d))}</time> <button type="button" class="text-red-400 hover:text-red-600"${attr("aria-label", `Remove ${stringify(d)}`)}><i class="fa-solid fa-xmark"></i></button></li>`);
      }
      $$renderer2.push(`<!--]--></ul> `);
      if (value.some((d) => d < today)) {
        $$renderer2.push(`<!--[0--><button type="button" class="self-start text-sm text-gray-500 hover:underline dark:text-slate-400">Remove past dates</button>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push(`<!--[-1--><p class="text-sm font-normal text-gray-500 dark:text-slate-400">No holidays set.</p>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { value });
  });
}
function SaveBar($$renderer, $$props) {
  let { loading, saved = false, label = "Save changes" } = $$props;
  $$renderer.push(`<div class="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-4 border-t border-gray-200 bg-gray-200/90 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"><p class="text-sm" role="status" aria-live="polite">`);
  if (loading) {
    $$renderer.push(`<!--[0-->Saving…`);
  } else if (saved) {
    $$renderer.push(`<!--[2--><span class="text-green-600 dark:text-green-400"><i class="fa-solid fa-check"></i> Saved</span>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></p> <button type="submit"${attr("disabled", loading, true)} class="rounded-lg bg-green-500 px-5 py-2 font-medium text-white transition duration-300 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60">`);
  if (loading) {
    $$renderer.push(`<!--[0--><i class="fa-solid fa-spinner animate-spin"></i>`);
  } else {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--> ${escape_html(label)}</button></div>`);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let tmp = data, settings = tmp.settings, channels = tmp.channels, locales = tmp.locales, roles = tmp.roles;
    channels = channels.filter((c) => c.type === 0);
    roles = roles.filter((r) => r.name !== "@everyone").sort((a, b) => b.rawPosition - a.rawPosition);
    roles.forEach((r) => {
      r._hexColor = r.color > 0 ? `#${r.color.toString(16).padStart(6, "0")}` : null;
      r._style = r._hexColor ? `color: ${r._hexColor}` : "";
    });
    settings.autoClose = durationToInput(settings.autoClose);
    settings.logChannel = settings.logChannel ?? "";
    settings.transcriptChannel = settings.transcriptChannel ?? "";
    settings.transcriptDm ??= false;
    settings.logExclude = [...settings.logExclude ?? []];
    settings.staleAfter = durationToInput(settings.staleAfter);
    settings.workingHours = workingHoursToForm(settings.workingHours);
    settings.holidays = normaliseHolidays(settings.holidays);
    settings.closeRequests ??= true;
    settings.ghostPing ??= false;
    settings.ticketNumberOffset ??= 0;
    settings.webhookUrl ??= "";
    let buttonAccess = buttonRolesToForm(settings.buttons);
    settings.buttons = buttonsToForm(settings.buttons);
    settings.dashboardRoles = [...settings.dashboardRoles ?? []];
    const viaDashboardRole = data.guild?.viaDashboardRole === true;
    settings.moveRelease ??= false;
    settings.moveResend ??= false;
    settings.userLimit ??= 0;
    let hadWebhookSecret = settings.webhookSecret === WEBHOOK_SECRET_MASK;
    let webhookSecret = "";
    let removeWebhookSecret = false;
    let autoTag = Array.isArray(settings.autoTag) ? "custom" : settings.autoTag;
    let loading = false;
    let saved = false;
    let savedComponentsV2 = settings.componentsV2 === true;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1vhm1mm", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>General settings - ${escape_html(data.guild?.name ?? "Discord Tickets")}</title>`);
        });
      });
      $$renderer3.push(`<div class="mx-auto max-w-3xl"><h1 class="mb-1 text-3xl font-bold">General settings</h1> <p class="mb-6 text-gray-500 dark:text-slate-400">These apply to every category unless a category overrides them. <a href="https://discordtickets.app/configuration/general" target="_blank" rel="noopener noreferrer" class="text-blurple hover:underline">Documentation</a></p> `);
      {
        $$renderer3.push("<!--[-1-->");
      }
      $$renderer3.push(`<!--]--> <form class="flex flex-col gap-6">`);
      Section($$renderer3, {
        id: "tickets",
        title: "Tickets",
        icon: "fa-solid fa-ticket",
        children: ($$renderer4) => {
          $$renderer4.push(`<label for="closeRequests" class="flex items-start gap-3 font-medium"><input type="checkbox" id="closeRequests" class="form-checkbox mt-1"${attr("checked", settings.closeRequests, true)}/> <span>Close requests `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Ask the ticket creator to confirm when staff use /close or the close button. When off,
						tickets close straight away.`);
            }
          });
          $$renderer4.push(`<!----></span></label> <div class="flex flex-col gap-2"><p class="font-medium">Buttons on the opening message</p> <label for="claimButton" class="flex items-center gap-3 text-base"><input type="checkbox" id="claimButton" class="form-checkbox"${attr("checked", settings.claimButton, true)}/> Claim / unclaim (only in categories with claiming on)</label> <label for="closeButton" class="flex items-center gap-3 text-base"><input type="checkbox" id="closeButton" class="form-checkbox"${attr("checked", settings.closeButton, true)}/> Close</label></div> <label for="archive" class="flex items-start gap-3 font-medium"><input type="checkbox" id="archive" class="form-checkbox mt-1"${attr("checked", settings.archive, true)}/> <span>Archive messages `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Save ticket messages so transcripts can be viewed after the ticket closes.`);
            }
          });
          $$renderer4.push(`<!----></span></label> <label class="font-medium">Ticket number offset <input type="number" min="0" max="1000000000" step="1" class="input form-input"${attr("value", settings.ticketNumberOffset)}/> `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Start numbering from here, e.g. when moving from another bot. Numbers never go backwards.`);
            }
          });
          $$renderer4.push(`<!----></label> <label class="font-medium">Blocklist `);
          $$renderer4.select(
            {
              multiple: true,
              class: "input form-multiselect h-36 font-normal",
              value: settings.blocklist
            },
            ($$renderer5) => {
              $$renderer5.push(`<!--[-->`);
              const each_array = ensure_array_like(roles);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let role = each_array[$$index];
                $$renderer5.option({ value: role.id, class: "m-1 rounded p-1", style: role._style }, ($$renderer6) => {
                  $$renderer6.push(`${escape_html(role.unicodeEmoji || "")}
							${escape_html(role.name)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(` `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Members with these roles can't open tickets. Hold Ctrl or ⌘ to select several.`);
            }
          });
          $$renderer4.push(`<!----></label> <label class="font-medium">Open tickets per member <input type="number" min="0" max="100" step="1" class="input form-input"${attr("value", settings.userLimit)}/> `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Across all categories. 0 means no server-wide limit (category limits still apply).`);
            }
          });
          $$renderer4.push(`<!----></label> <div class="flex flex-col gap-2"><p class="font-medium">When staff move a ticket with /move</p> <label for="moveRelease" class="flex items-center gap-3 text-base"><input type="checkbox" id="moveRelease" class="form-checkbox"${attr("checked", settings.moveRelease, true)}/> Release the claim</label> <label for="moveResend" class="flex items-center gap-3 text-base"><input type="checkbox" id="moveResend" class="form-checkbox"${attr("checked", settings.moveResend, true)}/> Send the new category's opening message again</label></div>`);
        }
      });
      $$renderer3.push(`<!----> `);
      Section($$renderer3, {
        id: "automation",
        title: "Reminders and auto-close",
        icon: "fa-solid fa-clock",
        children: ($$renderer4) => {
          $$renderer4.push(`<label class="font-medium">Stale after <input type="text" class="input form-input" placeholder="e.g. 2d (blank turns it off)"${attr("value", settings.staleAfter)}/> `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Remind members and staff when a ticket has had no reply for this long.`);
            }
          });
          $$renderer4.push(`<!----></label> <label class="font-medium">Auto close after <input type="text" class="input form-input" placeholder="e.g. 12h (blank turns it off)"${attr("value", settings.autoClose)}/> `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Close stale tickets and unanswered close requests after this long.`);
            }
          });
          $$renderer4.push(`<!----></label> <label for="ghostPing" class="flex items-start gap-3 font-medium"><input type="checkbox" id="ghostPing" class="form-checkbox mt-1"${attr("checked", settings.ghostPing, true)}/> <span>Ghost ping `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->When staff reply and the creator has been quiet for 5 minutes, ping them and delete the
						ping straight away (once until they reply).`);
            }
          });
          $$renderer4.push(`<!----></span></label>`);
        }
      });
      $$renderer3.push(`<!----> `);
      Section($$renderer3, {
        id: "working-hours",
        title: "Working hours and holidays",
        icon: "fa-solid fa-business-time",
        description: "Shown in the opening message so members know when to expect a reply. Leave a day empty for a day off.",
        children: ($$renderer4) => {
          WorkingHours($$renderer4, {
            get value() {
              return settings.workingHours;
            },
            set value($$value) {
              settings.workingHours = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> <div><p class="font-medium">Holidays</p> `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Whole days off in the timezone above. The opening message says when staff are back.`);
            }
          });
          $$renderer4.push(`<!----> <div class="mt-2">`);
          HolidayPicker($$renderer4, {
            get value() {
              return settings.holidays;
            },
            set value($$value) {
              settings.holidays = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----></div></div>`);
        }
      });
      $$renderer3.push(`<!----> `);
      Section($$renderer3, {
        id: "appearance",
        title: "Language and appearance",
        icon: "fa-solid fa-palette",
        children: ($$renderer4) => {
          $$renderer4.push(`<label class="font-medium">Language `);
          $$renderer4.select({ class: "input form-multiselect", value: settings.locale }, ($$renderer5) => {
            $$renderer5.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(locales);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let locale = each_array_1[$$index_1];
              $$renderer5.option({ value: locale }, ($$renderer6) => {
                $$renderer6.push(`${escape_html(locale)}`);
              });
            }
            $$renderer5.push(`<!--]-->`);
          });
          $$renderer4.push(`</label> <div class="grid grid-cols-1 gap-4 sm:grid-cols-3"><label class="font-medium">Primary colour <input type="text" class="input form-input"${attr("value", settings.primaryColour)}/></label> <label class="font-medium">Success colour <input type="text" class="input form-input"${attr("value", settings.successColour)}/></label> <label class="font-medium">Error colour <input type="text" class="input form-input"${attr("value", settings.errorColour)}/></label></div> `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Colours can be hex (#5865F2) or a Discord colour name (Blurple, Red, …).`);
            }
          });
          $$renderer4.push(`<!----> <label for="componentsV2" class="flex items-start gap-3 font-medium"><input type="checkbox" id="componentsV2" class="form-checkbox mt-1"${attr("checked", settings.componentsV2, true)}/> <span>Use Discord's new message layout `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Opening messages and panels use Discord's newer layout components instead of embeds.
						Panels sent this way can't be changed back into embed panels later.`);
            }
          });
          $$renderer4.push(`<!----> <p class="mt-1 text-sm font-normal" data-testid="layout-status">`);
          if (savedComponentsV2) {
            $$renderer4.push(`<!--[0--><span class="text-green-600 dark:text-green-400"><i class="fa-solid fa-circle-check"></i> On for this server.</span> New tickets and new panels use it. To switch a panel you already sent, <a href="../panels" class="text-blurple hover:underline">update it on the Panels page</a>.`);
          } else {
            $$renderer4.push(`<!--[-1--><span class="text-gray-500 dark:text-slate-400">Off: the bot uses classic embeds.</span>`);
          }
          $$renderer4.push(`<!--]--></p></span></label> <label class="font-medium">Footer <input type="text" class="input form-input" maxlength="2048"${attr("value", settings.footer)}/> `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Text at the bottom of the bot's embeds.`);
            }
          });
          $$renderer4.push(`<!----></label>`);
        }
      });
      $$renderer3.push(`<!----> `);
      Section($$renderer3, {
        id: "buttons",
        title: "Buttons",
        icon: "fa-solid fa-hand-pointer",
        description: "Change the label, emoji and colour of the bot's buttons. Leave a box empty to keep the default.",
        children: ($$renderer4) => {
          ButtonCustomiser($$renderer4, {
            roles,
            get value() {
              return settings.buttons;
            },
            set value($$value) {
              settings.buttons = $$value;
              $$settled = false;
            },
            get access() {
              return buttonAccess;
            },
            set access($$value) {
              buttonAccess = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Emoji can be a unicode emoji, a name like :tickets:, or a custom emoji like
				&lt;:name:123456789012345678>. Members with Manage Server can always use every button.`);
            }
          });
          $$renderer4.push(`<!---->`);
        }
      });
      $$renderer3.push(`<!----> `);
      Section($$renderer3, {
        id: "dashboard",
        title: "Dashboard access",
        icon: "fa-solid fa-user-gear",
        description: "Members with these roles can change this server's settings here without the Manage Server permission. They can't export or import the server, or change this list.",
        children: ($$renderer4) => {
          $$renderer4.push(`<label class="font-medium">Dashboard roles `);
          RoleSelect($$renderer4, {
            roles,
            label: "Dashboard roles",
            size: "h-36",
            disabled: viaDashboardRole,
            get value() {
              return settings.dashboardRoles;
            },
            set value($$value) {
              settings.dashboardRoles = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          if (viaDashboardRole) {
            $$renderer4.push("<!--[0-->");
            Hint($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Only members with Manage Server can change this.`);
              }
            });
          } else {
            $$renderer4.push("<!--[-1-->");
            Hint($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Only give these to people you'd trust as admins: they can change staff roles and see
						every ticket's transcript.`);
              }
            });
          }
          $$renderer4.push(`<!--]--></label>`);
        }
      });
      $$renderer3.push(`<!----> `);
      Section($$renderer3, {
        id: "channels",
        title: "Channels",
        icon: "fa-solid fa-hashtag",
        children: ($$renderer4) => {
          $$renderer4.push(`<label class="font-medium">Log channel `);
          $$renderer4.select({ class: "input form-multiselect", value: settings.logChannel }, ($$renderer5) => {
            $$renderer5.option({ value: "" }, ($$renderer6) => {
              $$renderer6.push(`None`);
            });
            $$renderer5.push(`<!--[-->`);
            const each_array_2 = ensure_array_like(channels);
            for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
              let channel = each_array_2[$$index_2];
              $$renderer5.option({ value: channel.id }, ($$renderer6) => {
                $$renderer6.push(`#${escape_html(channel.name)}`);
              });
            }
            $$renderer5.push(`<!--]-->`);
          });
          $$renderer4.push(` `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Where the bot logs ticket and settings changes.`);
            }
          });
          $$renderer4.push(`<!----></label> `);
          if (settings.logChannel) {
            $$renderer4.push(`<!--[0--><fieldset><legend class="font-medium">Logged events</legend> <div class="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2"><!--[-->`);
            const each_array_3 = ensure_array_like(LOG_EVENTS);
            for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
              let [event, label] = each_array_3[$$index_3];
              $$renderer4.push(`<label class="flex items-center gap-2 font-normal"><input type="checkbox" class="form-checkbox"${attr("checked", !settings.logExclude.includes(event), true)}/> ${escape_html(label)}</label>`);
            }
            $$renderer4.push(`<!--]--></div> `);
            Hint($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Unticked events aren't posted to the log channel. The bot's own log still has them.`);
              }
            });
            $$renderer4.push(`<!----></fieldset>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <label class="font-medium">Transcript channel `);
          $$renderer4.select(
            {
              class: "input form-multiselect",
              value: settings.transcriptChannel
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "" }, ($$renderer6) => {
                $$renderer6.push(`None`);
              });
              $$renderer5.push(`<!--[-->`);
              const each_array_4 = ensure_array_like(channels);
              for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
                let channel = each_array_4[$$index_4];
                $$renderer5.option({ value: channel.id }, ($$renderer6) => {
                  $$renderer6.push(`#${escape_html(channel.name)}`);
                });
              }
              $$renderer5.push(`<!--]-->`);
            }
          );
          $$renderer4.push(` `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->When a ticket closes, its transcript (an HTML file) is posted here. Needs archiving.`);
            }
          });
          $$renderer4.push(`<!----></label> <label for="transcriptDm" class="flex items-start gap-3 font-medium"><input type="checkbox" id="transcriptDm" class="form-checkbox mt-1"${attr("checked", settings.transcriptDm, true)}/> <span>Send the transcript to the member `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Attach the transcript file to the message the member gets when their ticket closes.`);
            }
          });
          $$renderer4.push(`<!----></span></label> <label class="font-medium">Auto tag `);
          $$renderer4.select(
            {
              class: "input form-multiselect block font-normal",
              value: autoTag
            },
            ($$renderer5) => {
              $$renderer5.option({ value: "custom" }, ($$renderer6) => {
                $$renderer6.push(`Specific channels`);
              });
              $$renderer5.option({ value: "ticket" }, ($$renderer6) => {
                $$renderer6.push(`Only ticket channels`);
              });
              $$renderer5.option({ value: "!ticket" }, ($$renderer6) => {
                $$renderer6.push(`All non-ticket channels`);
              });
              $$renderer5.option({ value: "all" }, ($$renderer6) => {
                $$renderer6.push(`All channels`);
              });
            }
          );
          $$renderer4.push(` `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Where the bot replies automatically when a message matches a tag.`);
            }
          });
          $$renderer4.push(`<!----></label> `);
          if (autoTag === "custom") {
            $$renderer4.push(`<!--[0--><label class="font-medium">Auto tag channels `);
            $$renderer4.select(
              {
                multiple: true,
                class: "input form-multiselect h-36 font-normal",
                value: settings.autoTag
              },
              ($$renderer5) => {
                $$renderer5.push(`<!--[-->`);
                const each_array_5 = ensure_array_like(channels);
                for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
                  let channel = each_array_5[$$index_5];
                  $$renderer5.option({ value: channel.id, class: "m-1 rounded p-1" }, ($$renderer6) => {
                    $$renderer6.push(`#${escape_html(channel.name)}`);
                  });
                }
                $$renderer5.push(`<!--]-->`);
              }
            );
            $$renderer4.push(`</label>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]-->`);
        }
      });
      $$renderer3.push(`<!----> `);
      Section($$renderer3, {
        id: "webhook",
        title: "Webhook",
        icon: "fa-solid fa-plug",
        description: "The bot sends a JSON POST here when a ticket is opened or closed.",
        children: ($$renderer4) => {
          $$renderer4.push(`<label class="font-medium">URL <input type="url" inputmode="url" placeholder="https://example.com/tickets" autocomplete="off" class="input form-input"${attr("value", settings.webhookUrl)}/> `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Must be HTTPS. Leave blank to turn webhooks off.`);
            }
          });
          $$renderer4.push(`<!----></label> <label class="font-medium">Secret <input type="password" autocomplete="new-password"${attr("placeholder", hadWebhookSecret ? "Saved (hidden). Type to replace it" : "Optional")}${attr("disabled", removeWebhookSecret, true)} class="input form-input"${attr("value", webhookSecret)}/> `);
          Hint($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->With a secret, the body is signed with HMAC-SHA256 in the X-Signature-256 header.`);
            }
          });
          $$renderer4.push(`<!----></label> `);
          if (hadWebhookSecret) {
            $$renderer4.push(`<!--[0--><label for="removeWebhookSecret" class="flex items-center gap-3 text-base"><input type="checkbox" id="removeWebhookSecret" class="form-checkbox"${attr("checked", removeWebhookSecret, true)}/> Remove the saved secret</label>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]-->`);
        }
      });
      $$renderer3.push(`<!----> `);
      SaveBar($$renderer3, { loading, saved });
      $$renderer3.push(`<!----></form></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte.js-DkMhokNj.js.map
