import dayjs from "dayjs";



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



export { eventImportConfig, eventExportConfig };
