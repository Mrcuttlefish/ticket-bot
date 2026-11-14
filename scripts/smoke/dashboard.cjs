/* eslint-disable no-console */
/* global document, location -- used in code that runs in the browser */
// Loads the dashboard of a running bot (see run.sh) in headless Chromium, with the headers
// and CSP the bot really sends, and fails on any page error, console error, CSP report,
// failed request or a page that is still on its loading spinner.
// Usage: node dashboard.cjs http://127.0.0.1:8169
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:8169';
const GUILD_ID = '451745464480432129';
const slug = BigInt(GUILD_ID).toString(36);

const pages = [
	['/login', 'Language'],
	['/', 'Log out'],
	[`/${slug}/tickets`, 'Log out'],
	['/settings', 'Smoke Test Server'],
	[`/settings/${GUILD_ID}`],
	[`/settings/${GUILD_ID}/general`],
	[`/settings/${GUILD_ID}/categories`],
	[`/settings/${GUILD_ID}/categories/new`],
	[`/settings/${GUILD_ID}/panels`],
	[`/settings/${GUILD_ID}/tags`],
	[`/settings/${GUILD_ID}/feedback`],
	[`/settings/${GUILD_ID}/statistics`],
	[`/settings/${GUILD_ID}/history`],
];

(async () => {
	const browser = await chromium.launch();
	const context = await browser.newContext();
	await context.addCookies([
		{
			name: 'welcomed',
			url: base,
			value: 'true',
		},
		{
			name: 'dismissedCookies',
			url: base,
			value: 'true',
		},
	]);
	await context.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', e => {
			console.error(`CSP violation: ${e.violatedDirective} blocked ${e.blockedURI || 'inline'} at ${e.sourceFile}:${e.lineNumber}`);
		});
	});
	// third-party requests (fonts, avatars) get an empty reply, so the check doesn't need the internet
	await context.route(url => !url.href.startsWith(base), route => route.fulfill({
		body: '',
		status: 200,
	}));

	// sign in as if Discord's authorisation page had sent the browser back to the bot
	async function signIn() {
		const login = await context.request.get(`${base}/auth/login`, { maxRedirects: 0 });
		const authorize = new URL(login.headers().location);
		const callback = await context.request.get(
			`${authorize.searchParams.get('redirect_uri')}?code=smoke&state=${authorize.searchParams.get('state')}`,
			{ maxRedirects: 0 },
		);
		if (!callback.ok()) throw new Error(`Signing in failed: HTTP ${callback.status()} ${await callback.text()}`);
	}

	const failures = [];
	for (const [path, text] of pages) {
		if (path === '/') await signIn(); // pages before this are signed out
		const page = await context.newPage();
		const problems = [];
		page.on('pageerror', e => problems.push(`page error: ${e.message}`));
		page.on('console', m => {
			if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) problems.push(`console ${m.type()}: ${m.text()}`);
		});
		page.on('response', r => {
			if (r.url().startsWith(base) && r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`);
		});
		try {
			const response = await page.goto(base + path, {
				timeout: 30000,
				waitUntil: 'networkidle',
			});
			if (!response?.ok()) problems.push(`HTTP ${response?.status()} for the page`);
			const csp = response?.request().redirectedFrom()
				? (await page.evaluate(() => fetch(location.href).then(r => r.headers.get('content-security-policy'))))
				: response?.headers()['content-security-policy'];
			if (!csp) problems.push('no Content-Security-Policy header');
			else if (/unsafe-eval/.test(csp)) problems.push(`the CSP allows 'unsafe-eval': ${csp}`);
			await page.waitForTimeout(1000);
			if (await page.locator('.spinner').first().isVisible()) problems.push('still on the loading spinner');
			if (text && !(await page.getByText(text, { exact: false }).first().isVisible())) problems.push(`"${text}" isn't shown`);
			if (!(await page.locator('body').innerText()).trim()) problems.push('the page is blank');
		} catch (error) {
			problems.push(`didn't load: ${error.message.split('\n')[0]}`);
		}
		console.log(`${problems.length ? 'FAIL' : 'ok  '} ${path} -> ${new URL(page.url()).pathname}`);
		for (const problem of problems) console.log(`       ${problem}`);
		if (problems.length) failures.push(path);
		await page.close();
	}
	await browser.close();
	if (failures.length) {
		console.log(`\n${failures.length} of ${pages.length} dashboard pages failed`);
		process.exit(1);
	}
	console.log(`\nAll ${pages.length} dashboard pages loaded cleanly`);
})().catch(error => {
	console.error(error);
	process.exit(1);
});
