function Hint($$renderer, $$props) {
  let { children } = $$props;
  $$renderer.push(`<p class="mt-1 text-sm font-normal text-gray-500 dark:text-slate-400">`);
  children?.($$renderer);
  $$renderer.push(`<!----></p>`);
}

export { Hint as H };
//# sourceMappingURL=Hint.js-B3ipMhPI.js.map
