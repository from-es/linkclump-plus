import dayjs from "dayjs";



/**
 * Generate Unique ID
 * @param {number} digit
 * @param {object} character - { number: true, alphabet: { uppercase: true, lowercase: true }, symbol: false }
 * @returns {string}
 * @throws {InvalidArgumentException} - If invalid arguments are passed, an error will be thrown
 */
function generateID(digit = 8, character = { number: true, alphabet: { uppercase: true, lowercase: true }, symbol: false }) {
	const validate = (digit && typeof digit === "number" && Number.isInteger(digit));
	if (!validate) {
		throw (`Error, Invalid value passed to generateID(). digit >> ${digit}`);
	}

	const number = Number(digit);
	if (!(Number.MAX_VALUE >= number) && (number > 0)) {
		throw (`Error, Invalid value passed to generateID(). The number generated by the number of digits passed is not within the legal range. digit & generated number >> digit:${digit}, number:${number}`);
	}

	if (!character || typeof character !== "object") {
		throw (`Error, Invalid value passed to generateID(). character >> ${character}`);
	} else if (!character?.number && !character?.alphabet?.uppercase && !character?.alphabet?.lowercase && !character?.symbol) {
		throw (`Error, Invalid value passed to generateID(). character >> ${character}`);
	} else if (character?.number && typeof character.number !== "boolean") {
		throw (`Error, Invalid value passed to generateID(). character.number >> ${character}`);
	} else if (character?.alphabet?.uppercase && typeof character.alphabet.uppercase !== "boolean") {
		throw (`Error, Invalid value passed to generateID(). character.alphabet.uppercase >> ${character}`);
	} else if (character?.alphabet?.lowercase && typeof character.alphabet.lowercase !== "boolean") {
		throw (`Error, Invalid value passed to generateID(). character.alphabet.lowercase >> ${character}`);
	} else if (character?.symbol && typeof character.symbol !== "boolean") {
		throw (`Error, Invalid value passed to generateID(). character.symbol >> ${character}`);
	}

	character = Object.assign({ number: false, alphabet: { uppercase: false, lowercase: false }, symbol: false }, character);

	const stringType = {
		number: "0123456789",
		alphabet: {
			uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
			lowercase: "abcdefghijklmnopqrstuvwxyz"
		},
		symbol: "`~!@#$%^&*()_+-={}[]|:;\"'<>,.?/"
	};
	const getCharacter = (chr) => {
		let str = "";

		if (chr?.number) {
			str += stringType.number;
		}
		if (chr?.alphabet?.uppercase) {
			str += stringType.alphabet.uppercase;
		}
		if (chr?.alphabet?.lowercase) {
			str += stringType.alphabet.lowercase;
		}
		if (chr?.symbol) {
			str += stringType.symbol;
		}

		return str;
	};

	const typedArray = new Uint32Array(digit);
	const cryptoArray = crypto.getRandomValues(typedArray);
	const char = getCharacter(character);
	const rand = Array.from(cryptoArray)
		.map((number) => char[number % char.length])
		.join('');

	return rand;
}

async function eventImportConfig() {
	const filetype = 'application/json';
	const result = await importConfig(filetype);

	return result;
}

function eventExportConfig(param) {
	const manifest = chrome.runtime.getManifest();

	const setting = param;
	const datestr = dayjs().format('YYYY-MM-DD_HH-mm-ss');
	const filetype = 'application/json';
	const name = manifest.name;
	const version = manifest.version;
	const filename = `${name}_v${version}_${datestr}.json`;

	exportConfig(setting, filename, filetype);
}

async function importConfig(filetype) {
	const showOpenFileDialog = () => {
		return new Promise(resolve => {
			const input = document.createElement('input');

			input.type = 'file';
			input.accept = filetype;
			input.onchange = (event) => { resolve(event.target.files[0]); };

			input.click();
		});
	};
	const readAsText = (file) => {
		return new Promise(resolve => {
			const reader = new FileReader();

			reader.readAsText(file);
			reader.onload = () => { resolve(reader.result); };
		});
	};

	const file = await showOpenFileDialog();
	const text = await readAsText(file);
	let setting = null;

	try {
		setting = JSON.parse(text);

		// debug
		console.log('Debug, importConfig() >> setting', { text, setting });
	} catch (ev) {
		// debug
		console.log("Error, can't read Import File.", ev);
	}

	return setting;
}

function exportConfig(setting, filename, filetype) {
	const config = JSON.stringify(setting, null, '\t');
	const file = { minetype: filetype, name: filename };
	const blob = new Blob([ config ], { type: file.minetype });
	const url = URL.createObjectURL(blob);
	const ank = document.createElement('a');

	ank.download = file.name;
	ank.href = url;
	ank.dataset.downloadurl = [ file.minetype, ank.download, ank.href ].join(':');
	ank.click();

	URL.revokeObjectURL(url);
	ank.remove();
}



export { generateID, eventImportConfig, eventExportConfig };