let policy;
/**
* Attempt to create policy
*/
function createPolicy() {
	try {
		policy = window.trustedTypes.createPolicy("iconify", { createHTML: (s) => s });
	} catch (err) {
		policy = null;
	}
}
/**
* Clean up value for innerHTML assignment
*
* This code doesn't actually clean up anything.
* It is intended be used with Iconify icon data, which has already been validated
*/
function cleanUpInnerHTML(html) {
	if (policy === void 0) createPolicy();
	return policy ? policy.createHTML(html) : html;
}

export { cleanUpInnerHTML };