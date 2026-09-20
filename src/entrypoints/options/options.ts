// WXT provided cross-browser compatible API.
import { browser } from "wxt/browser";

import { importFile, exportFile } from "@/assets/js/lib/SettingsFileManager";
import { isSettings } from "@/assets/js/types/Settings";
import { Information } from "@/assets/js/constants/app";

import type { OptionsSchema } from "@/assets/js/types/Options";
import type { ActionOptionValue, ActionSetting, Settings } from "@/assets/js/types/Settings";

// jQuery
import $ from "jquery";
import "@/assets/js/lib/colorpicker/jquery.colorpicker.js";
import "@/assets/js/lib/colorpicker/jquery.colorpicker.css";

import "./style.css";



/**
 * Static UI definition schema for the options page.
 *
 * Defines the structure of the options UI — available triggers, action types,
 * and option fields (labels, types, defaults, and descriptions).
 * This is a compile-time constant embedded in the source code and is
 * **not** a user settings value.
 *
 * @see {@link OptionsSchema}
 * @see {@link currentSettings} for the mutable user settings loaded from storage.
 */
const optionsSchema: OptionsSchema = {
	"triggers":
		[
			{ "name": "Left" },
			{ "name": "Middle" },
			{ "name": "Right" }
		],
	"actions": {
		"win": {
			"name": "Opened in a New Window",
			"options": [
				"fontsizeofcounter", "fontweightofcounter", "samebgcolorasbox", "smart", "ignore", "block", "reverse", "delay", "unfocus"
			]
		},
		"tabs": {
			"name": "Opened as New Tabs",
			"options": [
				"fontsizeofcounter", "fontweightofcounter", "samebgcolorasbox", "smart", "ignore", "block", "reverse", "delay", "close", "end"
			]
		},
		"bm": {
			"name": "Bookmarked",
			"options": [
				"fontsizeofcounter", "fontweightofcounter", "samebgcolorasbox", "smart", "ignore", "block", "reverse", "bookmarks"
			]
		},
		"copy": {
			"name": "Copied to clipboard",
			"options": [
				"fontsizeofcounter", "fontweightofcounter", "samebgcolorasbox", "smart", "ignore", "block", "reverse", "copy"
			]
		}
	},
	"options": {
		"fontsizeofcounter": {
			"name": "counter font size",
			"type": "number",
			"data": [ 16, 8, 64 ], // [ default, min , max ]
			"extra": "font size of the counter (default: 16, range: 8-64)"
		},
		"fontweightofcounter": {
			"name": "counter font weight",
			"type": "number",
			"data": [ 400, 1, 1000 ], // [ default, min , max ]
			"extra": "font weight of the counter (default: 400, range: 1-1000, thin: 100, normal: 400, bold: 700)"
		},
		"samebgcolorasbox": {
			"name": "bgcolor of the counter the same as the box",
			"type": "checkbox",
			"extra": "select whether to make the background color of the counter the same as the box color"
		},
		"smart": {
			"name": "smart select",
			"type": "selection",
			"data": [ "on", "off" ],
			"extra": "with smart select turned on linkclump tries to select only the important links"
		},
		"ignore": {
			"name": "filter links",
			"type": "selection-textbox",
			"data": [ "exclude links with words", "include links with words" ],
			"extra": "filter links that include/exclude these words; separate words with a comma ,"
		},
		"bookmarks": {
			"name": "select bookmarks",
			"type": "selection",
			"data": [ "Main", "Other bookmarks" ],
			"extra": "select the bookmarks you want to add, Main or Other bookmarks"
		},
		"copy": {
			"name": "copy format",
			"type": "selection",
			"data": [ "URLS with titles", "URLS only", "URLS only space separated", "titles only", "as link HTML", "as list link HTML", "as Markdown" ],
			"extra": "format of the links saved to the clipboard"
		},
		"delay": {
			"name": "delay in opening",
			"type": "textbox",
			"extra": "number of seconds between the opening of each link"
		},
		"close": {
			"name": "close tab time",
			"type": "textbox",
			"extra": "number of seconds before closing opened tab (0 means the tab wouldn't close)"
		},
		"block": {
			"name": "block repeat links in selection",
			"type": "checkbox",
			"extra": "select to block repeat links from opening"
		},
		"reverse": {
			"name": "reverse order",
			"type": "checkbox",
			"extra": "select to have links opened in reverse order"
		},
		"end": {
			"name": "open tabs at the end",
			"type": "checkbox",
			"extra": "select to have links opened at the end of all other tabs"
		},
		"unfocus": {
			"name": "do not focus on new window",
			"type": "checkbox",
			"extra": "select to stop the new window from coming to the front"
		}
	}
};

const OS_WIN = 0;
const OS_LINUX = 1;
const OS_MAC = 2;

const colors: string[] = [ "458B74", "838B8B", "CCCCCC", "0000FF", "8A2BE2", "D2691E", "6495ED", "DC143C", "006400", "9400D3", "1E90FF", "228B22", "00FF00", "ADFF2F", "FF69B4", "4B0082", "F0E68C", "8B814C", "87CEFA", "32CD32", "000080", "FFA500", "FF4500", "DA70D6", "8B475D", "8B668B", "FF0000", "2E8B57", "8E388E", "FFFF00" ];
let currentSettings: Settings | null = null;
const div_history: Record<string, JQuery> = {};

let keys: Record<number, string>;
let os: 0 | 1 | 2;



window.addEventListener("load", main);

function main() {
	initValue();

	initEvent();
}

function initValue() {
	keys = displayKeys(0);
	os = ((navigator.appVersion.indexOf("Win") === -1) ? ((navigator.appVersion.indexOf("Mac") === -1) ? OS_LINUX : OS_MAC) : OS_WIN);
}

function initEvent() {
	const isFirstTime = (window.location.href).indexOf("init=true") > -1;

	// temp check to not load if in test mode
	if (document.getElementById("guide2") === null) {
		return;
	}

	// until migrate to the Svelte UI, we need to update the store link for Firefox users.
	// This is because the link to the Browser Extension Store (Google Chrome / Firefox) is hardcoded in the HTML, and we want to ensure that it points to the correct store based on the user's browser.
	if (!isChrome()) {
		const storeLink = document.getElementById("faq-store-link");
		if (storeLink) {
			const { url } = Information.stores.firefox;

			storeLink.setAttribute("href", url);
			storeLink.setAttribute("title", url);
		}
	}

	document.getElementById("guide3")?.addEventListener("click", tour3);
	document.getElementById("guide2")?.addEventListener("click", tour2);
	document.getElementById("guide1")?.addEventListener("click", tour1);
	document.getElementById("add")?.addEventListener("click", load_new_action);
	document.getElementById("form_block")?.addEventListener("keyup", save_block);
	document.getElementById("form_key")?.addEventListener("change", check_selection);
	document.getElementById("cancel")?.addEventListener("click", close_form);
	document.getElementById("save")?.addEventListener("click", save_action);

	// TODO: Verification needed @2024/12/17
	document.getElementById("import-setting")?.addEventListener("click", import_setting);
	document.getElementById("export-setting")?.addEventListener("click", export_setting);

	setup_form();

	browser.runtime.sendMessage(
		{
			message: "init",
			debug: true
		}
	).then((response: Settings) => {
		currentSettings = response;

		if (!currentSettings) {
			console.error("Failed to load settings: response is null or undefined.");
			return;
		}

		for (const i in currentSettings.actions) {
			const action = currentSettings.actions[i];
			if (!action) {
				continue;
			}
			$("#settings").append(setup_action(action, i));
		}
		setup_text(keys);

		$("#form_block").val((currentSettings.blocked || []).join("\n"));

		if (isFirstTime) {
			tour1();
		} else {
			tour2();
		}
	}).catch((error) => {
		console.error("Failed to initialize settings in options page:", error);
	});
}



function close_form(event?: Event | JQuery.TriggeredEvent) {
	$("#form-background").fadeOut();

	event?.preventDefault();
}

function tour1() {
	setup_text(keys);
	$("#page2").fadeOut(0);
	$("#page1").fadeIn();
	$("#test_area").focus();
}

function tour2() {
	$("#page1").fadeOut(0);
	$("#page2").fadeIn();
}

/**
 * Determines whether the current browser is Google Chrome or Chromium-based.
 *
 * @returns {boolean} True if running on Chrome / Chromium-based browser, false otherwise.
 */
function isChrome(): boolean {
	return navigator.userAgent.includes("Chrome");
}

function tour3() {
	const store = isChrome()
		? Information.stores.chrome
		: Information.stores.firefox;

	browser.tabs.create({ url: store.reviews, active: true });
}

/**
 *
 * @param {string | null} id
 */
function load_action(id: string | null) {  // into form
	if (id === null) {
		displayKeys(0);
		displayOptions("tabs");
		$("#form_id").val("");
		$("#form_mouse").val(0);  // default to left mouse button
		$("#form_key").val(90);   // and z key
		$(".colorpicker-trigger").css("background-color", "#" + colors[Math.floor(Math.random() * colors.length)]);
	} else {
		const actionSetting = currentSettings?.actions[id];
		if (!actionSetting) {
			return;
		}
		$("#form_id").val(id);

		$("#form_mouse").val(actionSetting.mouse);
		displayKeys(actionSetting.mouse);
		$("#form_key").val(actionSetting.key);

		$(".colorpicker-trigger").css("background-color", actionSetting.color);

		$("#form_" + actionSetting.action).attr("checked", "checked");

		displayOptions(actionSetting.action);

		for (const i in actionSetting.options) {
			const optDef = optionsSchema.options[i];
			if (!optDef) {
				continue;
			}
			const optVal = actionSetting.options[i];
			switch (optDef.type) {
				case "number":
				case "selection":
				case "textbox":
					$("#form_option_" + i).val(String(optVal ?? ""));
					break;

				case "checkbox":
					$("#form_option_" + i).prop("checked", Boolean(optVal));
					break;

				case "selection-textbox":
					if (Array.isArray(optVal) && optVal.length > 1) {
						const selection = optVal[0];
						let text = "";
						for (let k = 1; k < optVal.length; k++) {
							text += optVal[k] + ",";
						}

						$("#form_option_selection_" + i).val(String(selection ?? ""));
						$("#form_option_text_" + i).val(text);
					}

					break;
			}

		}
	}

	// hide warning and let it show later if required
	$(".warning").hide();

	// place the form at the top of the window+10
	$(".form").css("margin-top", ($(window).scrollTop() ?? 0) + 10);

	// fade in the form and set the background to cover the whole page
	$("#form-background").fadeIn();
	$("#form-background").css("height", $(document).height() ?? 0);

	check_selection();
}

/**
 *
 * @param {string} id
 * @param {JQuery<HTMLElement>} div
 */
function delete_action(id: string, div: JQuery) {
	if (!currentSettings) {
		return;
	}
	div.fadeOut("swing", function () {
		if (!currentSettings) {
			return;
		}
		const del = $("<div class='undo'>Action has been deleted </div>");
		const undo = $("<a>undo</a>").click({ "i": id, "param": currentSettings.actions[id] },
			function (event) {
				if (!currentSettings) {
					return false;
				}
				const hist = div_history[event.data.i];
				if (hist && event.data.param) {
					hist.replaceWith(setup_action(event.data.param, event.data.i));
				}
				if (event.data.param) {
					currentSettings.actions[event.data.i] = event.data.param;
				}

				delete (div_history[event.data.i]);

				save_settings();
				return false;
			}
		);
		del.append(undo);

		$(this).replaceWith(del).fadeIn("swing");

		div_history[id] = del;
		delete (currentSettings.actions[id]);

		save_settings();
	});
}

function setup_action(actionSetting: ActionSetting, id: string): JQuery {
	const setting = $("<div class='setting' id='action_" + id + "'>");

	const actionDef = optionsSchema.actions[actionSetting.action];
	const actionName = actionDef ? actionDef.name : actionSetting.action;
	const h3 = "<h3>" + actionName + "</h3>";
	const activateKey = (actionSetting.key > 0 && keys[actionSetting.key]) ? "\"<b>" + keys[actionSetting.key] + "</b>\" key and " : "";
	const triggerDef = optionsSchema.triggers[actionSetting.mouse];
	const triggerName = triggerDef ? triggerDef.name : String(actionSetting.mouse);
	const activateMouse = "\"<b>" + triggerName + "</b>\" mouse button";
	const activate = "<p>Activate by " + activateKey + activateMouse + ".</p>";
	setting.append(h3);
	setting.append(activate);

	const list = $("<ul>");
	for (const j in actionSetting.options) {
		const op = optionsSchema.options[j];
		if (!op) {
			continue;
		}
		const optVal = actionSetting.options[j];
		let text = op.name + ": ";
		switch (op.type) {
			case "number": {
				text += String(optVal ?? "");
				break;
			}
			case "selection": {
				const idx = Number(optVal ?? 0);
				const dataVal = op.data ? op.data[idx] : "";
				text += String(dataVal ?? "");
				break;
			}
			case "textbox": {
				// TODO: not sure if actionSetting.options[j] returns a string or int
				if (optVal === "" || String(optVal) === "0") {
					continue;
				}
				text += String(optVal);
				break;
			}
			case "checkbox": {
				text += String(optVal);
				break;
			}
			case "selection-textbox": {
				if (!Array.isArray(optVal) || optVal.length < 2) {
					continue;
				}
				const selection = Number(optVal[0]);
				let words = "";
				for (let i = 1; i < optVal.length; i++) {
					words += optVal[i];

					if (i < optVal.length - 1) {
						words += ", ";
					}
				}
				const selText = op.data ? op.data[selection] : "";
				text += (selText ?? "") + "; " + words;
				break;
			}
		}

		list.append("<li>" + text + "</li>");
	}
	list.append("<li>selection box color: <span style='background-color: " + actionSetting.color + "' class='color'></span></li>");

	setting.append(list);

	const edit = $("<button class='button edit'>Edit</button>").click({ 'i': id },
		function (event) {
			load_action(event.data.i);
			return false;
		}
	);

	const del = $("<button class='button delete'>Delete</button>").click({ "i": id },
		function (event) {
			delete_action(event.data.i, $(this).parent());
			return false;
		}
	);

	setting.append(del);
	setting.append(edit);

	return setting;
}

function setup_form() {
	const mouse = $("#form_mouse");
	for (let i = 0; i < optionsSchema.triggers.length; i++) {
		const trg = optionsSchema.triggers[i];
		if (trg) {
			mouse.append('<option value="' + i + '">' + trg.name + '</option>');
		}
	}

	mouse.change(function () {
		const select = this as HTMLSelectElement;
		displayKeys(Number(select.value));
		check_selection();
	});

	const color = $("#form_color");
	for (const i in colors) {
		color.append("<option value='" + colors[i] + "'>" + colors[i] + "</option>");
	}

	color.colorpicker({
		size: 30,
		hide: false
	});


	const action = $("#form_action");
	for (const i in optionsSchema.actions) {
		const actDef = optionsSchema.actions[i];
		if (!actDef) {
			continue;
		}
		const act = $('<input type="radio" name="action" value="' + i + '" id="form_' + i + '"/>' + actDef.name + '<br/>');

		act.click(function (event) {
			const target = event.currentTarget as HTMLInputElement;
			displayOptions(target.value);
		});

		action.append(act);
	}

	$('input[value="tabs"]').attr("checked", "checked");
}

function setup_text(keys: Record<number, string>) {
	if (!currentSettings) {
		return;
	}
	let actionSetting: ActionSetting | undefined;
	for (const i in currentSettings.actions) {
		actionSetting = currentSettings.actions[i];
		break;
	}
	if (actionSetting === undefined) {
		return;
	}
	const trigger = optionsSchema.triggers[actionSetting.mouse];
	const actionDef = optionsSchema.actions[actionSetting.action];
	if (trigger) {
		$("#mouse_name").text(trigger.name);
	}
	if (actionDef) {
		$("#action_name").text(actionDef.name);
	}
	if (actionSetting.key > 0 && keys[actionSetting.key]) {
		$("#key_name").html("the <b>" + keys[actionSetting.key] + "</b> key and");
	} else {
		$("#key_name").html("");
	}
}

function check_selection() {
	const m = $("#form_mouse").val();
	const k = $("#form_key").val();
	const id = $("#form_id").val();


	const keyWarning = $('#key_warning');
	keyWarning.empty();
	if (k === "0") {
		keyWarning.append("WARNING: Not using a key could cause unexpected behavior on some websites");
		if ($(".warning2").is(":hidden")) {
			$(".warning2").fadeIn();
		}
	} else {
		if (!$(".warning2").is(":hidden")) {
			$(".warning2").fadeOut();
		}
	}

	if (!currentSettings) {
		return;
	}

	for (const i in currentSettings.actions) {
		const act = currentSettings.actions[i];
		if (!act) {
			continue;
		}
		// not sure if mouse/key are strings or ints
		if (i !== id && Number(act.mouse) === Number(m) && Number(act.key) === Number(k)) {
			if ($(".warning").is(":hidden")) {
				$(".warning").fadeIn();
			}

			return;
		}
	}

	if (!$(".warning").is(":hidden")) {
		$(".warning").fadeOut();
	}
}

function displayOptions(action: string) {
	const options = $("#form_options");
	options.empty();

	const actionDef = optionsSchema.actions[action];
	if (!actionDef) {
		return;
	}

	for (const optKey of actionDef.options) {
		const op = optionsSchema.options[optKey];
		if (!op) {
			continue;
		}
		const title = $("<label>" + op.name + "</label>");
		const p = $("<p class=\"clearfix\"/>");
		p.append(title);

		switch (op.type) {
			case "number": {
				const def = op.data ? op.data[0] : 0;
				const min = op.data ? op.data[1] : 0;
				const max = op.data ? op.data[2] : 100;

				p.append(`<input type="number" name="${op.name}" id="form_option_${optKey}" value="${def}" step="1" min="${min}" max="${max}" />`);
				break;
			}
			case "selection": {
				const selector = $("<select id='form_option_" + optKey + "'>");
				if (op.data) {
					for (const j in op.data) {
						selector.append('<option value="' + j + '">' + op.data[j] + '</option>');
					}
				}
				p.append(selector);
				break;
			}
			case "textbox": {
				p.append('<input type="text" name="' + op.name + '" id="form_option_' + optKey + '"/>');
				break;
			}
			case "checkbox": {
				p.append('<input type="checkbox" name="' + op.name + '" id="form_option_' + optKey + '"/>');
				break;
			}
			case "selection-textbox": {
				const selector = $("<select id='form_option_selection_" + optKey + "'>");
				if (op.data) {
					for (const j in op.data) {
						selector.append('<option value="' + j + '">' + op.data[j] + '</option>');
					}
				}
				p.append(selector);
				p.append('</p><label></label><p>');
				p.append('<input type="text" name="' + op.name + '" id="form_option_text_' + optKey + '"/>');
				break;
			}
		}

		const label = p.find("label").eq(0);
		label.mouseover({ "extra": op.extra }, function (event) {
			const extra = $("#form_extra");
			extra.html(event.data.extra);
			extra.css("top", $(this).position().top);
			extra.css("left", $(this).position().left + 500);
			extra.show();
		}).mouseout(function () {
			$("#form_extra").hide();
		});

		options.append(p);

	}
}

function displayKeys(mouseButton: number): Record<number, string> {
	const key = $("#form_key");
	key.empty();
	const keys: Record<number, string> = [];

	keys[16] = "shift";
	keys[17] = "ctrl";

	if (os !== OS_LINUX) {
		keys[18] = "alt";
	}

	// if not left or windows then allow no key
	// NOTE mouseButton is sometimes a string, sometimes an int
	const mb = (typeof mouseButton === "string") ? Number.parseInt(mouseButton, 10) : mouseButton;
	if (mb !== 2 || os === OS_WIN) {
		keys[0] = '';
	}

	// add on alpha characters
	for (let i = 0; i < 26; i++) {
		keys[65 + i] = String.fromCharCode(97 + i);
	}

	for (const i in keys) {
		key.append('<option value="' + i + '">' + keys[i] + '</option>');
	}

	// set selected value to z
	key.val(90);

	return keys;
}

function load_new_action(event: Event | JQuery.TriggeredEvent) {
	load_action(null);
	event.preventDefault();
}

function save_action(event: Event | JQuery.TriggeredEvent) {
	if (!currentSettings) {
		return;
	}
	let id = String($("#form_id").val() ?? "");

	const mouseVal = Number($("#form_mouse").val() ?? 0);
	const keyVal = Number($("#form_key").val() ?? 0);
	const colorVal = $(".colorpicker-trigger").css("background-color") || "";
	const actionVal = String($("input[name=action]:radio:checked").val() ?? "tabs");

	const actionOptions: Record<string, ActionOptionValue | undefined> = {};
	const actionSetting: ActionSetting = {
		mouse: mouseVal,
		key: keyVal,
		color: colorVal,
		action: actionVal,
		options: actionOptions
	};

	const actionDef = optionsSchema.actions[actionSetting.action];
	if (actionDef) {
		for (const name of actionDef.options) {
			const op = optionsSchema.options[name];
			if (!op) {
				continue;
			}
			if (op.type === "checkbox") {
				actionOptions[name] = $("#form_option_" + name).is(":checked");
			} else if (name === "ignore") {
				const rawText = String($("#form_option_text_" + name).val() ?? "");
				const ignore: (number | string)[] = rawText.replace(/^ */, "").replace(/, */g, ",").toLowerCase().split(",");
				// if the last entry is empty then just remove from array
				if (ignore.length > 0 && ignore[ignore.length - 1] === "") {
					ignore.pop();
				}
				const selVal = Number($("#form_option_selection_" + name).val() ?? 0);
				ignore.unshift(selVal);

				actionOptions[name] = ignore;
			} else if (name === "delay" || name === "close" || name === "copy") {
				let value = parseFloat(String($("#form_option_" + name).val() ?? "0"));
				if (isNaN(value)) {
					value = 0;
				}

				actionOptions[name] = value;
			} else if (op.type === "number") {
				let value = parseFloat(String($("#form_option_" + name).val() ?? "0"));
				const def = op.data ? Number(op.data[0]) : 0;
				const min = op.data ? Number(op.data[1]) : 0;
				const max = op.data ? Number(op.data[2]) : 100;

				if (!value || isNaN(value)) {
					value = def;
				}
				if (value < min || max < value) {
					value = def;
				}

				actionOptions[name] = value;
			} else {
				actionOptions[name] = String($("#form_option_" + name).val() ?? "");
			}
		}
	}

	if (id === "" || !currentSettings.actions[id]) {
		const newDate = new Date();
		id = String(newDate.getTime());

		currentSettings.actions[id] = actionSetting;
		$("#settings").append(setup_action(actionSetting, id));
	} else {
		currentSettings.actions[id] = actionSetting;
		const update = setup_action(actionSetting, id);
		$("#action_" + id).replaceWith(update);
	}

	save_settings();
	close_form(event);
}

function save_settings() {
	if (!currentSettings) {
		return;
	}

	browser.runtime.sendMessage({
		message: "update",
		settings: currentSettings
	});
}

function save_block() {
	if (!currentSettings) {
		return;
	}

	// replace any whitespace at end to stop empty site listings
	const rawSites = String($("#form_block").val() ?? "");
	const sites = rawSites.replace(/^\s+|\s+$/g, "").split("\n");

	if (Array.isArray(sites)) {
		currentSettings.blocked = sites;

		save_settings();
	}
}


async function import_setting() {
	const result = await importFile<Settings>();

	// If the user cancels the file selection, result will be null
	if (result === null) {
		return;
	}

	if (isSettings(result)) {
		currentSettings = result;

		const obj = currentSettings.actions;
		$("#settings").empty();

		for (const key in obj) {
			const act = obj[key];
			if (!act) {
				continue;
			}
			$("#settings").append(setup_action(act, key));
		}

		setup_text(keys);

		save_settings();
	} else {
		console.error("Failed to import settings:", result);
	}
}

function export_setting() {
	if (currentSettings) {
		exportFile(currentSettings);
	}
}
