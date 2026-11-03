class ApiError extends Error {
  /** @param {number} status @param {any} body */
  constructor(status, body) {
    super(body?.message || body?.error || `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}
async function request(fetch, url, options = {}) {
  const response = await fetch(url, { credentials: "include", ...options });
  const isJSON = response.headers.get("content-type")?.includes("json");
  const body = isJSON ? await response.json() : await response.text();
  if (!response.ok) throw new ApiError(response.status, isJSON ? body : { message: body });
  return body;
}
const base = (guildId) => `/api/guilds/${guildId}/tickets`;
function listTickets(fetch, guildId, filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== void 0 && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return request(fetch, `${base(guildId)}${qs ? `?${qs}` : ""}`);
}
const getTicket = (fetch, guildId, ticketId) => request(fetch, `${base(guildId)}/${ticketId}`);
function getMessages(fetch, guildId, ticketId, cursor) {
  const qs = "";
  return request(fetch, `${base(guildId)}/${ticketId}/messages${qs}`);
}
const MAX_MESSAGE_LENGTH = 2e3;
function resolveMentions(content, { users = {}, roles = {}, channels = {} } = {}) {
  return String(content ?? "").replace(
    /<@!?(\d{17,20})>/g,
    (_, id) => `@${users[id]?.displayName || users[id]?.username || "unknown-user"}`
  ).replace(/<@&(\d{17,20})>/g, (_, id) => `@${roles[id]?.name || "unknown-role"}`).replace(/<#(\d{17,20})>/g, (_, id) => `#${channels[id]?.name || "unknown-channel"}`).replace(/<a?:(\w{2,32}):\d{17,20}>/g, ":$1:").replace(
    /<t:(\d{1,13})(?::[tTdDfFR])?>/g,
    (_, s) => new Date(Number(s) * 1e3).toLocaleString()
  );
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${i === 0 ? n : n.toFixed(1)} ${units[i]}`;
}
const STAFF_USER_ID = "0";
function addAuthors(users, messages) {
  for (const m of messages ?? []) {
    const a = m?.author;
    if (a?.id && !users[a.id]) users[a.id] = a;
  }
  if (!users[STAFF_USER_ID]) users[STAFF_USER_ID] = { username: "staff", displayName: "Staff" };
  return users;
}
const displayName = (u) => u?.displayName || u?.username || "Unknown user";

export { ApiError as A, MAX_MESSAGE_LENGTH as M, getMessages as a, addAuthors as b, displayName as d, formatBytes as f, getTicket as g, listTickets as l, resolveMentions as r };
//# sourceMappingURL=tickets.js-COOjhcPR.js.map
