let defaultSettings = {showBlocked: 0, showButtons: 0, enabled: 1, enableDefaultBlocklist: 1}
let settings
document.addEventListener('click', handleClicks)

function handleClicks(click) {
	switch (click.srcElement.id) {
		case 'enabled':
			settings.enabled ^= true
			showOrHideSettings()
			updateSettings()
			break
		case 'show-blocked':
			settings.showBlocked ^= true
			updateSettings()
			break
		case 'show-block-buttons':
			settings.showButtons ^= true
			updateSettings()
			break
		case 'enable-default-blocklist':
			settings.enableDefaultBlocklist ^= true
			updateSettings()
			break
		case 'update-spam-lists':
			browser.runtime.sendMessage({action: 'update-spam-lists'})
			break
		case 'manage-your-blocklist':
			browser.tabs.create({url: browser.runtime.getURL('options/options.html')})
			window.close()
		default:
			break
	}
}

function updateSettings() {
	browser.storage.local.set({sesbSettings: settings}).then(browser.runtime.sendMessage({action: 'reload-settings'}))
}

function handleNullSettings(savedSettings) {
	settings = savedSettings === undefined ? defaultSettings : savedSettings
	document.getElementById('enabled').checked = settings.enabled
	document.getElementById('show-blocked').checked = settings.showBlocked
	document.getElementById('show-block-buttons').checked = settings.showButtons
	document.getElementById('enable-default-blocklist').checked = settings.enableDefaultBlocklist
	showOrHideSettings()
}

function showOrHideSettings() {
	if (settings.enabled === 0) {
		document.querySelectorAll('.to-hide').forEach(function(e) {e.classList.add('hidden')})
		document.getElementById('manage-your-blocklist').classList.add('hidden')
	} else {
		document.querySelectorAll('.to-hide').forEach(function(e) {e.classList.remove('hidden')})
		document.getElementById('manage-your-blocklist').classList.remove('hidden')
	}
}

function loadSettings() {
	browser.storage.local.get('sesbSettings').then((r) => r.sesbSettings).then((r) => handleNullSettings(r))
}

loadSettings()
