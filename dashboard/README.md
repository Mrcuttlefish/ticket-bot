# Web dashboard (vendored)

`build/` is the prebuilt web dashboard from [Mrcuttlefish/ticket-portal](https://github.com/Mrcuttlefish/ticket-portal) (SvelteKit, `adapter-node`). `src/http.js` mounts `build/handler.js`. `COMMIT` is the ticket-portal commit it was built from.

Don't edit `build/` by hand. To update it, run (needs git, Node 22 and pnpm):

```sh
scripts/update-dashboard.sh          # latest main
scripts/update-dashboard.sh <ref>    # a branch, tag or commit
```
