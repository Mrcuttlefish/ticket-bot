import { ag as head, a9 as escape_html, ah as attr, ad as ensure_array_like, af as stringify, a7 as attr_class, ak as bind_props } from '../../../../../chunks/index.js-NLYGLmrE.js';
import '../../../../../chunks/url.js-DUsrn6y4.js';
import '../../../../../chunks/utils2.js-ejsMtG81.js';
import '../../../../../chunks/utils.js-Ct33xveJ.js';
import '../../../../../chunks/root.js-CICqcBMU.js';
import '../../../../../chunks/exports.js-ttBjoXEq.js';
import '../../../../../chunks/state.svelte.js-V04G28x9.js';
import '../../../_layout.server.js-BxtTreF1.js';
import { d as durationToInput, w as workingHoursToForm, n as normaliseHolidays, W as WEBHOOK_SECRET_MASK, S as Section, L as LOG_EVENTS } from '../../../../../chunks/settings.js-1Yh_2fv0.js';
import { H as Hint } from '../../../../../chunks/Hint.js-B3ipMhPI.js';
import { R as Required } from '../../../../../chunks/Required.js-BUvC22z7.js';
import '../../../../../chunks/uneval.js-7Jtky0YJ.js';
import '../../../../../index.js-CD2fPg80.js';
import '../../../../../chunks/server.js-DtCli5Nu.js';
import '../../../../../chunks/index2.js-DH9RKYtd.js';
import '../../../../../chunks/internal2.js-CgC_i9CR.js';
import '../../../../../chunks/i18n.js-moWVPshl.js';

const zones = /* @__PURE__ */ JSON.parse('["Africa/Abidjan","Africa/Accra","Africa/Addis_Ababa","Africa/Algiers","Africa/Asmara","Africa/Asmera","Africa/Bamako","Africa/Bangui","Africa/Banjul","Africa/Bissau","Africa/Blantyre","Africa/Brazzaville","Africa/Bujumbura","Africa/Cairo","Africa/Casablanca","Africa/Ceuta","Africa/Conakry","Africa/Dakar","Africa/Dar_es_Salaam","Africa/Djibouti","Africa/Douala","Africa/El_Aaiun","Africa/Freetown","Africa/Gaborone","Africa/Harare","Africa/Johannesburg","Africa/Juba","Africa/Kampala","Africa/Khartoum","Africa/Kigali","Africa/Kinshasa","Africa/Lagos","Africa/Libreville","Africa/Lome","Africa/Luanda","Africa/Lubumbashi","Africa/Lusaka","Africa/Malabo","Africa/Maputo","Africa/Maseru","Africa/Mbabane","Africa/Mogadishu","Africa/Monrovia","Africa/Nairobi","Africa/Ndjamena","Africa/Niamey","Africa/Nouakchott","Africa/Ouagadougou","Africa/Porto-Novo","Africa/Sao_Tome","Africa/Timbuktu","Africa/Tripoli","Africa/Tunis","Africa/Windhoek","America/Adak","America/Anchorage","America/Anguilla","America/Antigua","America/Araguaina","America/Argentina/Buenos_Aires","America/Argentina/Catamarca","America/Argentina/ComodRivadavia","America/Argentina/Cordoba","America/Argentina/Jujuy","America/Argentina/La_Rioja","America/Argentina/Mendoza","America/Argentina/Rio_Gallegos","America/Argentina/Salta","America/Argentina/San_Juan","America/Argentina/San_Luis","America/Argentina/Tucuman","America/Argentina/Ushuaia","America/Aruba","America/Asuncion","America/Atikokan","America/Atka","America/Bahia","America/Bahia_Banderas","America/Barbados","America/Belem","America/Belize","America/Blanc-Sablon","America/Boa_Vista","America/Bogota","America/Boise","America/Buenos_Aires","America/Cambridge_Bay","America/Campo_Grande","America/Cancun","America/Caracas","America/Catamarca","America/Cayenne","America/Cayman","America/Chicago","America/Chihuahua","America/Coral_Harbour","America/Cordoba","America/Costa_Rica","America/Creston","America/Cuiaba","America/Curacao","America/Danmarkshavn","America/Dawson","America/Dawson_Creek","America/Denver","America/Detroit","America/Dominica","America/Edmonton","America/Eirunepe","America/El_Salvador","America/Ensenada","America/Fort_Nelson","America/Fort_Wayne","America/Fortaleza","America/Glace_Bay","America/Godthab","America/Goose_Bay","America/Grand_Turk","America/Grenada","America/Guadeloupe","America/Guatemala","America/Guayaquil","America/Guyana","America/Halifax","America/Havana","America/Hermosillo","America/Indiana/Indianapolis","America/Indiana/Knox","America/Indiana/Marengo","America/Indiana/Petersburg","America/Indiana/Tell_City","America/Indiana/Vevay","America/Indiana/Vincennes","America/Indiana/Winamac","America/Indianapolis","America/Inuvik","America/Iqaluit","America/Jamaica","America/Jujuy","America/Juneau","America/Kentucky/Louisville","America/Kentucky/Monticello","America/Knox_IN","America/Kralendijk","America/La_Paz","America/Lima","America/Los_Angeles","America/Louisville","America/Lower_Princes","America/Maceio","America/Managua","America/Manaus","America/Marigot","America/Martinique","America/Matamoros","America/Mazatlan","America/Mendoza","America/Menominee","America/Merida","America/Metlakatla","America/Mexico_City","America/Miquelon","America/Moncton","America/Monterrey","America/Montevideo","America/Montreal","America/Montserrat","America/Nassau","America/New_York","America/Nipigon","America/Nome","America/Noronha","America/North_Dakota/Beulah","America/North_Dakota/Center","America/North_Dakota/New_Salem","America/Nuuk","America/Ojinaga","America/Panama","America/Pangnirtung","America/Paramaribo","America/Phoenix","America/Port-au-Prince","America/Port_of_Spain","America/Porto_Acre","America/Porto_Velho","America/Puerto_Rico","America/Punta_Arenas","America/Rainy_River","America/Rankin_Inlet","America/Recife","America/Regina","America/Resolute","America/Rio_Branco","America/Rosario","America/Santa_Isabel","America/Santarem","America/Santiago","America/Santo_Domingo","America/Sao_Paulo","America/Scoresbysund","America/Shiprock","America/Sitka","America/St_Barthelemy","America/St_Johns","America/St_Kitts","America/St_Lucia","America/St_Thomas","America/St_Vincent","America/Swift_Current","America/Tegucigalpa","America/Thule","America/Thunder_Bay","America/Tijuana","America/Toronto","America/Tortola","America/Vancouver","America/Virgin","America/Whitehorse","America/Winnipeg","America/Yakutat","America/Yellowknife","Antarctica/Casey","Antarctica/Davis","Antarctica/DumontDUrville","Antarctica/Macquarie","Antarctica/Mawson","Antarctica/McMurdo","Antarctica/Palmer","Antarctica/Rothera","Antarctica/South_Pole","Antarctica/Syowa","Antarctica/Troll","Antarctica/Vostok","Arctic/Longyearbyen","Asia/Aden","Asia/Almaty","Asia/Amman","Asia/Anadyr","Asia/Aqtau","Asia/Aqtobe","Asia/Ashgabat","Asia/Ashkhabad","Asia/Atyrau","Asia/Baghdad","Asia/Bahrain","Asia/Baku","Asia/Bangkok","Asia/Barnaul","Asia/Beirut","Asia/Bishkek","Asia/Brunei","Asia/Calcutta","Asia/Chita","Asia/Choibalsan","Asia/Chongqing","Asia/Chungking","Asia/Colombo","Asia/Dacca","Asia/Damascus","Asia/Dhaka","Asia/Dili","Asia/Dubai","Asia/Dushanbe","Asia/Famagusta","Asia/Gaza","Asia/Harbin","Asia/Hebron","Asia/Ho_Chi_Minh","Asia/Hong_Kong","Asia/Hovd","Asia/Irkutsk","Asia/Istanbul","Asia/Jakarta","Asia/Jayapura","Asia/Jerusalem","Asia/Kabul","Asia/Kamchatka","Asia/Karachi","Asia/Kashgar","Asia/Kathmandu","Asia/Katmandu","Asia/Khandyga","Asia/Kolkata","Asia/Krasnoyarsk","Asia/Kuala_Lumpur","Asia/Kuching","Asia/Kuwait","Asia/Macao","Asia/Macau","Asia/Magadan","Asia/Makassar","Asia/Manila","Asia/Muscat","Asia/Nicosia","Asia/Novokuznetsk","Asia/Novosibirsk","Asia/Omsk","Asia/Oral","Asia/Phnom_Penh","Asia/Pontianak","Asia/Pyongyang","Asia/Qatar","Asia/Qostanay","Asia/Qyzylorda","Asia/Rangoon","Asia/Riyadh","Asia/Saigon","Asia/Sakhalin","Asia/Samarkand","Asia/Seoul","Asia/Shanghai","Asia/Singapore","Asia/Srednekolymsk","Asia/Taipei","Asia/Tashkent","Asia/Tbilisi","Asia/Tehran","Asia/Tel_Aviv","Asia/Thimbu","Asia/Thimphu","Asia/Tokyo","Asia/Tomsk","Asia/Ujung_Pandang","Asia/Ulaanbaatar","Asia/Ulan_Bator","Asia/Urumqi","Asia/Ust-Nera","Asia/Vientiane","Asia/Vladivostok","Asia/Yakutsk","Asia/Yangon","Asia/Yekaterinburg","Asia/Yerevan","Atlantic/Azores","Atlantic/Bermuda","Atlantic/Canary","Atlantic/Cape_Verde","Atlantic/Faeroe","Atlantic/Faroe","Atlantic/Jan_Mayen","Atlantic/Madeira","Atlantic/Reykjavik","Atlantic/South_Georgia","Atlantic/St_Helena","Atlantic/Stanley","Australia/ACT","Australia/Adelaide","Australia/Brisbane","Australia/Broken_Hill","Australia/Canberra","Australia/Currie","Australia/Darwin","Australia/Eucla","Australia/Hobart","Australia/LHI","Australia/Lindeman","Australia/Lord_Howe","Australia/Melbourne","Australia/NSW","Australia/North","Australia/Perth","Australia/Queensland","Australia/South","Australia/Sydney","Australia/Tasmania","Australia/Victoria","Australia/West","Australia/Yancowinna","Brazil/Acre","Brazil/DeNoronha","Brazil/East","Brazil/West","CEST","CET","CST6CDT","Canada/Atlantic","Canada/Central","Canada/Eastern","Canada/Mountain","Canada/Newfoundland","Canada/Pacific","Canada/Saskatchewan","Canada/Yukon","Chile/Continental","Chile/EasterIsland","Cuba","EDT","EET","EST","EST5EDT","Egypt","Eire","Etc/GMT","Etc/GMT+0","Etc/GMT+1","Etc/GMT+10","Etc/GMT+11","Etc/GMT+12","Etc/GMT+2","Etc/GMT+3","Etc/GMT+4","Etc/GMT+5","Etc/GMT+6","Etc/GMT+7","Etc/GMT+8","Etc/GMT+9","Etc/GMT-0","Etc/GMT-1","Etc/GMT-10","Etc/GMT-11","Etc/GMT-12","Etc/GMT-13","Etc/GMT-14","Etc/GMT-2","Etc/GMT-3","Etc/GMT-4","Etc/GMT-5","Etc/GMT-6","Etc/GMT-7","Etc/GMT-8","Etc/GMT-9","Etc/GMT0","Etc/Greenwich","Etc/UCT","Etc/UTC","Etc/Universal","Etc/Zulu","Europe/Amsterdam","Europe/Andorra","Europe/Astrakhan","Europe/Athens","Europe/Belfast","Europe/Belgrade","Europe/Berlin","Europe/Bratislava","Europe/Brussels","Europe/Bucharest","Europe/Budapest","Europe/Busingen","Europe/Chisinau","Europe/Copenhagen","Europe/Dublin","Europe/Gibraltar","Europe/Guernsey","Europe/Helsinki","Europe/Isle_of_Man","Europe/Istanbul","Europe/Jersey","Europe/Kaliningrad","Europe/Kiev","Europe/Kirov","Europe/Lisbon","Europe/Ljubljana","Europe/London","Europe/Luxembourg","Europe/Madrid","Europe/Malta","Europe/Mariehamn","Europe/Minsk","Europe/Monaco","Europe/Moscow","Europe/Nicosia","Europe/Oslo","Europe/Paris","Europe/Podgorica","Europe/Prague","Europe/Riga","Europe/Rome","Europe/Samara","Europe/San_Marino","Europe/Sarajevo","Europe/Saratov","Europe/Simferopol","Europe/Skopje","Europe/Sofia","Europe/Stockholm","Europe/Tallinn","Europe/Tirane","Europe/Tiraspol","Europe/Ulyanovsk","Europe/Uzhgorod","Europe/Vaduz","Europe/Vatican","Europe/Vienna","Europe/Vilnius","Europe/Volgograd","Europe/Warsaw","Europe/Zagreb","Europe/Zaporozhye","Europe/Zurich","GB","GB-Eire","GMT","GMT+0","GMT-0","GMT0","Greenwich","HST","Hongkong","Iceland","Indian/Antananarivo","Indian/Chagos","Indian/Christmas","Indian/Cocos","Indian/Comoro","Indian/Kerguelen","Indian/Mahe","Indian/Maldives","Indian/Mauritius","Indian/Mayotte","Indian/Reunion","Iran","Israel","Jamaica","Japan","Kwajalein","Libya","MET","MST","MST7MDT","Mexico/BajaNorte","Mexico/BajaSur","Mexico/General","NZ","NZ-CHAT","Navajo","PRC","PST","PDT","PST8PDT","Pacific/Apia","Pacific/Auckland","Pacific/Bougainville","Pacific/Chatham","Pacific/Chuuk","Pacific/Easter","Pacific/Efate","Pacific/Enderbury","Pacific/Fakaofo","Pacific/Fiji","Pacific/Funafuti","Pacific/Galapagos","Pacific/Gambier","Pacific/Guadalcanal","Pacific/Guam","Pacific/Honolulu","Pacific/Johnston","Pacific/Kiritimati","Pacific/Kosrae","Pacific/Kwajalein","Pacific/Majuro","Pacific/Marquesas","Pacific/Midway","Pacific/Nauru","Pacific/Niue","Pacific/Norfolk","Pacific/Noumea","Pacific/Pago_Pago","Pacific/Palau","Pacific/Pitcairn","Pacific/Pohnpei","Pacific/Ponape","Pacific/Port_Moresby","Pacific/Rarotonga","Pacific/Saipan","Pacific/Samoa","Pacific/Tahiti","Pacific/Tarawa","Pacific/Tongatapu","Pacific/Truk","Pacific/Wake","Pacific/Wallis","Pacific/Yap","Poland","Portugal","ROC","ROK","Singapore","Turkey","UCT","US/Alaska","US/Aleutian","US/Arizona","US/Central","US/East-Indiana","US/Eastern","US/Hawaii","US/Indiana-Starke","US/Michigan","US/Mountain","US/Pacific","US/Samoa","UTC","Universal","W-SU","WET","Zulu"]');
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
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];
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
          $$renderer4.push(`<!----></label>`);
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
          $$renderer4.push(`<label class="font-medium">Timezone `);
          Required($$renderer4);
          $$renderer4.push(`<!----> <input type="text" list="timezones" class="input form-input" required=""${attr("value", settings.workingHours[0])}/> <datalist id="timezones"><!--[-->`);
          const each_array_1 = ensure_array_like(zones);
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let zone = each_array_1[$$index_1];
            $$renderer4.option({ value: zone }, ($$renderer5) => {
            });
          }
          $$renderer4.push(`<!--]--></datalist></label> <div class="grid grid-cols-1 gap-2"><!--[-->`);
          const each_array_2 = ensure_array_like(days);
          for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
            let day = each_array_2[index];
            $$renderer4.push(`<div class="grid grid-cols-[6rem,1fr,auto,1fr] items-center gap-2"><span class="font-medium">${escape_html(day)}</span> <input type="time"${attr("aria-label", `${stringify(day)} start`)} class="form-input rounded-md border-transparent bg-gray-100 text-center shadow-sm focus:border-2 focus:border-blurple focus:bg-white focus:ring-0 dark:bg-slate-800"${attr("value", settings.workingHours[index + 1][0])}/> <i class="fa-solid fa-arrow-right-long text-gray-400"></i> <input type="time"${attr("aria-label", `${stringify(day)} end`)} class="form-input rounded-md border-transparent bg-gray-100 text-center shadow-sm focus:border-2 focus:border-blurple focus:bg-white focus:ring-0 dark:bg-slate-800"${attr("value", settings.workingHours[index + 1][1])}/></div>`);
          }
          $$renderer4.push(`<!--]--></div> <div><p class="font-medium">Holidays</p> `);
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
            const each_array_3 = ensure_array_like(locales);
            for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
              let locale = each_array_3[$$index_3];
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
            const each_array_4 = ensure_array_like(channels);
            for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
              let channel = each_array_4[$$index_4];
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
            const each_array_5 = ensure_array_like(LOG_EVENTS);
            for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
              let [event, label] = each_array_5[$$index_5];
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
              const each_array_6 = ensure_array_like(channels);
              for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
                let channel = each_array_6[$$index_6];
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
                const each_array_7 = ensure_array_like(channels);
                for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
                  let channel = each_array_7[$$index_7];
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
//# sourceMappingURL=_page.svelte.js-jGL9DADN.js.map
