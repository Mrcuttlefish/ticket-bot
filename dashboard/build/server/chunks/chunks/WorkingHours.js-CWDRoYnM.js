import { ah as attr, af as stringify, a7 as attr_class, a9 as escape_html, ad as ensure_array_like, ak as bind_props, a8 as clsx } from './index.js-NLYGLmrE.js';
import { m as ms } from '../entries/pages/_layout.server.js-Nv3LlfKg.js';
import { R as Required } from './Required.js-BUvC22z7.js';

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
function RoleSelect($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      roles,
      value = [],
      label = "Roles",
      size = "h-32",
      exclude = [],
      disabled = false
    } = $$props;
    $$renderer2.select(
      {
        multiple: true,
        "aria-label": label,
        disabled,
        class: `input form-multiselect ${stringify(size)} font-normal disabled:opacity-60`,
        value
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(roles.filter((r) => !exclude.includes(r.id)));
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let role = each_array[$$index];
          $$renderer3.option({ value: role.id, class: "m-1 rounded p-1", style: role._style }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(role.unicodeEmoji || "")}
			${escape_html(role.name)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    bind_props($$props, { value });
  });
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
function closedChannelToForm(keepClosedFor) {
  if (keepClosedFor === null || keepClosedFor === void 0) return { mode: "delete", after: "" };
  if (keepClosedFor === 0) return { mode: "keep", after: "" };
  return { mode: "timed", after: ms(keepClosedFor) };
}
const LOG_EVENTS = [
  ["ticket.create", "Tickets created"],
  ["ticket.close", "Tickets closed"],
  ["ticket.reopen", "Tickets reopened"],
  ["ticket.delete", "Closed ticket channels deleted"],
  ["ticket.claim", "Tickets claimed"],
  ["ticket.unclaim", "Tickets released"],
  ["ticket.update", "Tickets changed (topic, members, priority…)"],
  ["message.update", "Messages edited"],
  ["message.delete", "Messages deleted"],
  ["admin", "Settings changes"]
];
const CUSTOM_BUTTONS = [
  ["create", "Create ticket (panels)"],
  ["claim", "Claim"],
  ["unclaim", "Release"],
  ["close", "Close"],
  ["edit", "Edit answers"],
  ["reopen", "Reopen"],
  ["transcript", "Transcript"],
  ["delete", "Delete"]
];
const BUTTON_STYLES = [
  ["PRIMARY", "Blurple"],
  ["SECONDARY", "Grey"],
  ["SUCCESS", "Green"],
  ["DANGER", "Red"]
];
const CREATOR_ROLE_EVENTS = [
  ["open", "Ticket opened"],
  ["claim", "Ticket claimed"],
  ["close", "Ticket closed"]
];
function buttonsToForm(buttons) {
  return Object.fromEntries(
    CUSTOM_BUTTONS.map(([name]) => [
      name,
      {
        emoji: buttons?.[name]?.emoji ?? "",
        label: buttons?.[name]?.label ?? "",
        style: buttons?.[name]?.style ?? ""
      }
    ])
  );
}
function creatorRolesToForm(creatorRoles) {
  return Object.fromEntries(
    CREATOR_ROLE_EVENTS.map(([event]) => [
      event,
      {
        add: [...creatorRoles?.[event]?.add ?? []],
        remove: [...creatorRoles?.[event]?.remove ?? []]
      }
    ])
  );
}
function automationsToForm(rules) {
  return (Array.isArray(rules) ? rules : []).map((rule) => ({
    action: rule.action ?? "TAG",
    after: durationToInput(rule.after) || "",
    tag: rule.tag ?? "",
    waitingOn: rule.waitingOn ?? "STAFF"
  }));
}
function buttonRolesToForm(buttons) {
  return Object.fromEntries(
    CUSTOM_BUTTONS.map(([name]) => [
      name,
      { allow: [...buttons?.[name]?.allow ?? []], deny: [...buttons?.[name]?.deny ?? []] }
    ])
  );
}
const zones = /* @__PURE__ */ JSON.parse('["Africa/Abidjan","Africa/Accra","Africa/Addis_Ababa","Africa/Algiers","Africa/Asmara","Africa/Asmera","Africa/Bamako","Africa/Bangui","Africa/Banjul","Africa/Bissau","Africa/Blantyre","Africa/Brazzaville","Africa/Bujumbura","Africa/Cairo","Africa/Casablanca","Africa/Ceuta","Africa/Conakry","Africa/Dakar","Africa/Dar_es_Salaam","Africa/Djibouti","Africa/Douala","Africa/El_Aaiun","Africa/Freetown","Africa/Gaborone","Africa/Harare","Africa/Johannesburg","Africa/Juba","Africa/Kampala","Africa/Khartoum","Africa/Kigali","Africa/Kinshasa","Africa/Lagos","Africa/Libreville","Africa/Lome","Africa/Luanda","Africa/Lubumbashi","Africa/Lusaka","Africa/Malabo","Africa/Maputo","Africa/Maseru","Africa/Mbabane","Africa/Mogadishu","Africa/Monrovia","Africa/Nairobi","Africa/Ndjamena","Africa/Niamey","Africa/Nouakchott","Africa/Ouagadougou","Africa/Porto-Novo","Africa/Sao_Tome","Africa/Timbuktu","Africa/Tripoli","Africa/Tunis","Africa/Windhoek","America/Adak","America/Anchorage","America/Anguilla","America/Antigua","America/Araguaina","America/Argentina/Buenos_Aires","America/Argentina/Catamarca","America/Argentina/ComodRivadavia","America/Argentina/Cordoba","America/Argentina/Jujuy","America/Argentina/La_Rioja","America/Argentina/Mendoza","America/Argentina/Rio_Gallegos","America/Argentina/Salta","America/Argentina/San_Juan","America/Argentina/San_Luis","America/Argentina/Tucuman","America/Argentina/Ushuaia","America/Aruba","America/Asuncion","America/Atikokan","America/Atka","America/Bahia","America/Bahia_Banderas","America/Barbados","America/Belem","America/Belize","America/Blanc-Sablon","America/Boa_Vista","America/Bogota","America/Boise","America/Buenos_Aires","America/Cambridge_Bay","America/Campo_Grande","America/Cancun","America/Caracas","America/Catamarca","America/Cayenne","America/Cayman","America/Chicago","America/Chihuahua","America/Coral_Harbour","America/Cordoba","America/Costa_Rica","America/Creston","America/Cuiaba","America/Curacao","America/Danmarkshavn","America/Dawson","America/Dawson_Creek","America/Denver","America/Detroit","America/Dominica","America/Edmonton","America/Eirunepe","America/El_Salvador","America/Ensenada","America/Fort_Nelson","America/Fort_Wayne","America/Fortaleza","America/Glace_Bay","America/Godthab","America/Goose_Bay","America/Grand_Turk","America/Grenada","America/Guadeloupe","America/Guatemala","America/Guayaquil","America/Guyana","America/Halifax","America/Havana","America/Hermosillo","America/Indiana/Indianapolis","America/Indiana/Knox","America/Indiana/Marengo","America/Indiana/Petersburg","America/Indiana/Tell_City","America/Indiana/Vevay","America/Indiana/Vincennes","America/Indiana/Winamac","America/Indianapolis","America/Inuvik","America/Iqaluit","America/Jamaica","America/Jujuy","America/Juneau","America/Kentucky/Louisville","America/Kentucky/Monticello","America/Knox_IN","America/Kralendijk","America/La_Paz","America/Lima","America/Los_Angeles","America/Louisville","America/Lower_Princes","America/Maceio","America/Managua","America/Manaus","America/Marigot","America/Martinique","America/Matamoros","America/Mazatlan","America/Mendoza","America/Menominee","America/Merida","America/Metlakatla","America/Mexico_City","America/Miquelon","America/Moncton","America/Monterrey","America/Montevideo","America/Montreal","America/Montserrat","America/Nassau","America/New_York","America/Nipigon","America/Nome","America/Noronha","America/North_Dakota/Beulah","America/North_Dakota/Center","America/North_Dakota/New_Salem","America/Nuuk","America/Ojinaga","America/Panama","America/Pangnirtung","America/Paramaribo","America/Phoenix","America/Port-au-Prince","America/Port_of_Spain","America/Porto_Acre","America/Porto_Velho","America/Puerto_Rico","America/Punta_Arenas","America/Rainy_River","America/Rankin_Inlet","America/Recife","America/Regina","America/Resolute","America/Rio_Branco","America/Rosario","America/Santa_Isabel","America/Santarem","America/Santiago","America/Santo_Domingo","America/Sao_Paulo","America/Scoresbysund","America/Shiprock","America/Sitka","America/St_Barthelemy","America/St_Johns","America/St_Kitts","America/St_Lucia","America/St_Thomas","America/St_Vincent","America/Swift_Current","America/Tegucigalpa","America/Thule","America/Thunder_Bay","America/Tijuana","America/Toronto","America/Tortola","America/Vancouver","America/Virgin","America/Whitehorse","America/Winnipeg","America/Yakutat","America/Yellowknife","Antarctica/Casey","Antarctica/Davis","Antarctica/DumontDUrville","Antarctica/Macquarie","Antarctica/Mawson","Antarctica/McMurdo","Antarctica/Palmer","Antarctica/Rothera","Antarctica/South_Pole","Antarctica/Syowa","Antarctica/Troll","Antarctica/Vostok","Arctic/Longyearbyen","Asia/Aden","Asia/Almaty","Asia/Amman","Asia/Anadyr","Asia/Aqtau","Asia/Aqtobe","Asia/Ashgabat","Asia/Ashkhabad","Asia/Atyrau","Asia/Baghdad","Asia/Bahrain","Asia/Baku","Asia/Bangkok","Asia/Barnaul","Asia/Beirut","Asia/Bishkek","Asia/Brunei","Asia/Calcutta","Asia/Chita","Asia/Choibalsan","Asia/Chongqing","Asia/Chungking","Asia/Colombo","Asia/Dacca","Asia/Damascus","Asia/Dhaka","Asia/Dili","Asia/Dubai","Asia/Dushanbe","Asia/Famagusta","Asia/Gaza","Asia/Harbin","Asia/Hebron","Asia/Ho_Chi_Minh","Asia/Hong_Kong","Asia/Hovd","Asia/Irkutsk","Asia/Istanbul","Asia/Jakarta","Asia/Jayapura","Asia/Jerusalem","Asia/Kabul","Asia/Kamchatka","Asia/Karachi","Asia/Kashgar","Asia/Kathmandu","Asia/Katmandu","Asia/Khandyga","Asia/Kolkata","Asia/Krasnoyarsk","Asia/Kuala_Lumpur","Asia/Kuching","Asia/Kuwait","Asia/Macao","Asia/Macau","Asia/Magadan","Asia/Makassar","Asia/Manila","Asia/Muscat","Asia/Nicosia","Asia/Novokuznetsk","Asia/Novosibirsk","Asia/Omsk","Asia/Oral","Asia/Phnom_Penh","Asia/Pontianak","Asia/Pyongyang","Asia/Qatar","Asia/Qostanay","Asia/Qyzylorda","Asia/Rangoon","Asia/Riyadh","Asia/Saigon","Asia/Sakhalin","Asia/Samarkand","Asia/Seoul","Asia/Shanghai","Asia/Singapore","Asia/Srednekolymsk","Asia/Taipei","Asia/Tashkent","Asia/Tbilisi","Asia/Tehran","Asia/Tel_Aviv","Asia/Thimbu","Asia/Thimphu","Asia/Tokyo","Asia/Tomsk","Asia/Ujung_Pandang","Asia/Ulaanbaatar","Asia/Ulan_Bator","Asia/Urumqi","Asia/Ust-Nera","Asia/Vientiane","Asia/Vladivostok","Asia/Yakutsk","Asia/Yangon","Asia/Yekaterinburg","Asia/Yerevan","Atlantic/Azores","Atlantic/Bermuda","Atlantic/Canary","Atlantic/Cape_Verde","Atlantic/Faeroe","Atlantic/Faroe","Atlantic/Jan_Mayen","Atlantic/Madeira","Atlantic/Reykjavik","Atlantic/South_Georgia","Atlantic/St_Helena","Atlantic/Stanley","Australia/ACT","Australia/Adelaide","Australia/Brisbane","Australia/Broken_Hill","Australia/Canberra","Australia/Currie","Australia/Darwin","Australia/Eucla","Australia/Hobart","Australia/LHI","Australia/Lindeman","Australia/Lord_Howe","Australia/Melbourne","Australia/NSW","Australia/North","Australia/Perth","Australia/Queensland","Australia/South","Australia/Sydney","Australia/Tasmania","Australia/Victoria","Australia/West","Australia/Yancowinna","Brazil/Acre","Brazil/DeNoronha","Brazil/East","Brazil/West","CEST","CET","CST6CDT","Canada/Atlantic","Canada/Central","Canada/Eastern","Canada/Mountain","Canada/Newfoundland","Canada/Pacific","Canada/Saskatchewan","Canada/Yukon","Chile/Continental","Chile/EasterIsland","Cuba","EDT","EET","EST","EST5EDT","Egypt","Eire","Etc/GMT","Etc/GMT+0","Etc/GMT+1","Etc/GMT+10","Etc/GMT+11","Etc/GMT+12","Etc/GMT+2","Etc/GMT+3","Etc/GMT+4","Etc/GMT+5","Etc/GMT+6","Etc/GMT+7","Etc/GMT+8","Etc/GMT+9","Etc/GMT-0","Etc/GMT-1","Etc/GMT-10","Etc/GMT-11","Etc/GMT-12","Etc/GMT-13","Etc/GMT-14","Etc/GMT-2","Etc/GMT-3","Etc/GMT-4","Etc/GMT-5","Etc/GMT-6","Etc/GMT-7","Etc/GMT-8","Etc/GMT-9","Etc/GMT0","Etc/Greenwich","Etc/UCT","Etc/UTC","Etc/Universal","Etc/Zulu","Europe/Amsterdam","Europe/Andorra","Europe/Astrakhan","Europe/Athens","Europe/Belfast","Europe/Belgrade","Europe/Berlin","Europe/Bratislava","Europe/Brussels","Europe/Bucharest","Europe/Budapest","Europe/Busingen","Europe/Chisinau","Europe/Copenhagen","Europe/Dublin","Europe/Gibraltar","Europe/Guernsey","Europe/Helsinki","Europe/Isle_of_Man","Europe/Istanbul","Europe/Jersey","Europe/Kaliningrad","Europe/Kiev","Europe/Kirov","Europe/Lisbon","Europe/Ljubljana","Europe/London","Europe/Luxembourg","Europe/Madrid","Europe/Malta","Europe/Mariehamn","Europe/Minsk","Europe/Monaco","Europe/Moscow","Europe/Nicosia","Europe/Oslo","Europe/Paris","Europe/Podgorica","Europe/Prague","Europe/Riga","Europe/Rome","Europe/Samara","Europe/San_Marino","Europe/Sarajevo","Europe/Saratov","Europe/Simferopol","Europe/Skopje","Europe/Sofia","Europe/Stockholm","Europe/Tallinn","Europe/Tirane","Europe/Tiraspol","Europe/Ulyanovsk","Europe/Uzhgorod","Europe/Vaduz","Europe/Vatican","Europe/Vienna","Europe/Vilnius","Europe/Volgograd","Europe/Warsaw","Europe/Zagreb","Europe/Zaporozhye","Europe/Zurich","GB","GB-Eire","GMT","GMT+0","GMT-0","GMT0","Greenwich","HST","Hongkong","Iceland","Indian/Antananarivo","Indian/Chagos","Indian/Christmas","Indian/Cocos","Indian/Comoro","Indian/Kerguelen","Indian/Mahe","Indian/Maldives","Indian/Mauritius","Indian/Mayotte","Indian/Reunion","Iran","Israel","Jamaica","Japan","Kwajalein","Libya","MET","MST","MST7MDT","Mexico/BajaNorte","Mexico/BajaSur","Mexico/General","NZ","NZ-CHAT","Navajo","PRC","PST","PDT","PST8PDT","Pacific/Apia","Pacific/Auckland","Pacific/Bougainville","Pacific/Chatham","Pacific/Chuuk","Pacific/Easter","Pacific/Efate","Pacific/Enderbury","Pacific/Fakaofo","Pacific/Fiji","Pacific/Funafuti","Pacific/Galapagos","Pacific/Gambier","Pacific/Guadalcanal","Pacific/Guam","Pacific/Honolulu","Pacific/Johnston","Pacific/Kiritimati","Pacific/Kosrae","Pacific/Kwajalein","Pacific/Majuro","Pacific/Marquesas","Pacific/Midway","Pacific/Nauru","Pacific/Niue","Pacific/Norfolk","Pacific/Noumea","Pacific/Pago_Pago","Pacific/Palau","Pacific/Pitcairn","Pacific/Pohnpei","Pacific/Ponape","Pacific/Port_Moresby","Pacific/Rarotonga","Pacific/Saipan","Pacific/Samoa","Pacific/Tahiti","Pacific/Tarawa","Pacific/Tongatapu","Pacific/Truk","Pacific/Wake","Pacific/Wallis","Pacific/Yap","Poland","Portugal","ROC","ROK","Singapore","Turkey","UCT","US/Alaska","US/Aleutian","US/Arizona","US/Central","US/East-Indiana","US/Eastern","US/Hawaii","US/Indiana-Starke","US/Michigan","US/Mountain","US/Pacific","US/Samoa","UTC","Universal","W-SU","WET","Zulu"]');
function WorkingHours($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { value = void 0, id = "timezones" } = $$props;
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];
    const time = "form-input rounded-md border-transparent bg-gray-100 text-center shadow-sm focus:border-2 focus:border-blurple focus:bg-white focus:ring-0 dark:bg-slate-800";
    $$renderer2.push(`<label class="font-medium">Timezone `);
    Required($$renderer2);
    $$renderer2.push(`<!----> <input type="text"${attr("list", id)} class="input form-input" required=""${attr("value", value[0])}/> <datalist${attr("id", id)}><!--[-->`);
    const each_array = ensure_array_like(zones);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let zone = each_array[$$index];
      $$renderer2.option({ value: zone }, ($$renderer3) => {
      });
    }
    $$renderer2.push(`<!--]--></datalist></label> <div class="grid grid-cols-1 gap-2"><!--[-->`);
    const each_array_1 = ensure_array_like(days);
    for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
      let day = each_array_1[index];
      $$renderer2.push(`<div class="grid grid-cols-[6rem,1fr,auto,1fr] items-center gap-2"><span class="font-medium">${escape_html(day)}</span> <input type="time"${attr("aria-label", `${stringify(day)} start`)}${attr_class(clsx(time))}${attr("value", value[index + 1][0])}/> <i class="fa-solid fa-arrow-right-long text-gray-400"></i> <input type="time"${attr("aria-label", `${stringify(day)} end`)}${attr_class(clsx(time))}${attr("value", value[index + 1][1])}/></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { value });
  });
}

export { BUTTON_STYLES as B, CREATOR_ROLE_EVENTS as C, LOG_EVENTS as L, RoleSelect as R, Section as S, WorkingHours as W, creatorRolesToForm as a, automationsToForm as b, closedChannelToForm as c, durationToInput as d, buttonRolesToForm as e, buttonsToForm as f, WEBHOOK_SECRET_MASK as g, CUSTOM_BUTTONS as h, normaliseHolidays as n, override as o, workingHoursToForm as w };
//# sourceMappingURL=WorkingHours.js-CWDRoYnM.js.map
