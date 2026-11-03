async function load({ fetch }) {
  const fetchOptions = { credentials: "include" };
  return {
    guilds: await (await fetch(`/api/admin/guilds`, fetchOptions)).json()
  };
}

var _page = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

export { _page as _ };
//# sourceMappingURL=_page.js-DKsLxpBF.js.map
