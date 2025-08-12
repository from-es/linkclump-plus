
window.addEventListener("load", main);



function main() {
	makeIds();

	setTableOfContents();
}

function setTableOfContents() {
	// Tocbot API(https://tscanlin.github.io/tocbot/#api)
	const options = {
		tocSelector    : ".js-toc",
		contentSelector: ".js-toc-content",
		headingSelector: "h1, h2, h3",
		collapseDepth  : 6,
		scrollSmooth   : false,
	};
	tocbot.init(options);

	// 動的生成されたリスト要素の前にテキスト(<p>Table of Contents</p>)を追加
	const elm  = document.querySelector(options.tocSelector);
	const str  = "Table of Contents";
	const text = document.createElement("p");

	text.textContent = str;
	elm.insertBefore(text, elm.firstChild);
}