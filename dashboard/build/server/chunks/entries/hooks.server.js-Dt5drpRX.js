async function handle({ event, resolve }) {
  const response = await resolve(event, {
    // only these headers of server-side fetches are serialised into the page
    filterSerializedResponseHeaders: (name) => name === "content-type"
  });
  try {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  } catch {
  }
  return response;
}
function handleError({ error, event, status, message }) {
  const errorId = Date.now().toString(16);
  if (process?.env.NODE_ENV === "development") console.error(error);
  process?.emit("sveltekit:error", { error, errorId, event });
  return {
    name: status === 404 ? "Not Found" : "Internal Server Error",
    // don't leak internal error details (stack traces, file paths) to the browser;
    // `message` is SvelteKit's generic text for the status (e.g. "Not Found")
    message,
    errorId
  };
}

export { handle, handleError };
//# sourceMappingURL=hooks.server.js-Dt5drpRX.js.map
