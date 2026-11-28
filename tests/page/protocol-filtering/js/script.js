"use strict";

document.addEventListener("DOMContentLoaded", () => {
	// 1. Initialize safe in-memory text Blob URL
	const blobLink = document.getElementById("blob-test-link");
	if (blobLink) {
		const safeBlob = new Blob(
			["Linkclump Plus: Safe in-memory Blob navigation test content.\n"],
			{ type: "text/plain" }
		);
		const blobUrl = URL.createObjectURL(safeBlob);
		blobLink.href = blobUrl;
		blobLink.textContent = blobUrl;
	}

	// 2. Intercept mailto clicks when protection is enabled
	const mailtoInterceptCheckbox = document.getElementById("intercept-mailto-checkbox");
	const mailtoLog = document.getElementById("mailto-intercept-log");

	document.querySelectorAll("a[href^='mailto:']").forEach((link) => {
		link.addEventListener("click", (event) => {
			if (mailtoInterceptCheckbox && mailtoInterceptCheckbox.checked) {
				event.preventDefault();
				if (mailtoLog) {
					const now = new Date().toLocaleTimeString();
					mailtoLog.textContent = `[${now}] Intercepted and blocked OS mailer launch for: ${link.getAttribute("href")}`;
				}
			}
		});
	});
});
