'use strict'
let suffixList = {}
let optionsPageListsUpdated = false
let yourBlocklist = {}
let whitelist = {}
let remoteDomainBlocklist = {}
let remoteBlocklists = {}
let remoteDomainWhitelist = {}
let remoteWhitelists = {}
const workerUrl = browser.runtime.getURL('background/worker.js')
let activeSettings
browser.runtime.onMessage.addListener(handleMessages)

function doWithWorker(onMessageFunction) {
	const worker = new Worker(workerUrl)
	worker.onmessage = onMessageFunction
	worker.postMessage('hello')
}

function handleMessages(message, sender) {
	switch (message.action) {
		case actions.check:
			return Promise.resolve(checkUrl(message.url))
		case actions.update:
			return block(message.url)
		case actions.unblock:
			return unblock(message.url, false)
		case actions.updateMultiple:
			doWithWorker(function(){blockMultiple(message.urls)})
			break
		case actions.whitelistMultiple:
			doWithWorker(function(){whitelistMultiple(message.urls)})
			break
		case actions.loadYourBlocklist:
			return Promise.resolve(Object.keys(yourBlocklist).sort())
		case actions.loadWhitelist:
			return Promise.resolve(Object.keys(whitelist).sort())
		case actions.loadRemoteBlocklists:
			return Promise.resolve(Object.keys(remoteBlocklists).sort())
		case actions.loadRemoteWhitelists:
			return Promise.resolve(Object.keys(remoteWhitelists).sort())
		case actions.updateSpamLists:
			doWithWorker(function(){updateOnlineLists(true)})
			break
		case actions.remove:
			removeFromYourBlocklist(message.url)
			break
		case actions.removeFromWhitelist:
			removeFromWhitelist(message.url)
			break
		case actions.clearBlocklist:
			clearBlocklist()
			break
		case actions.reloadSettings:
			loadSettings()
			break
		case actions.checkOptionsListsUpdated:
			if (optionsPageListsUpdated) {
				optionsPageListsUpdated = false
				return Promise.resolve(true)
			}
			return Promise.resolve(false)
		case actions.updateBadge:
			browser.browserAction.setBadgeText({text: String(message.blockedNumber), tabId: sender.tab.id})
			break
		case actions.getActiveSettings:
			return Promise.resolve(activeSettings)
		case actions.addBlocklistsFromUrls:
			doWithWorker(function(){addRemoteBlocklists(message.urls)})
			break
		case actions.removeFromRemoteBlocklists:
			removeFromRemoteBlocklists(message.url)
			break
		case actions.addWhitelistsFromUrls:
			doWithWorker(function(){addRemoteWhitelists(message.urls)})
			break
		case actions.removeFromRemoteWhitelists:
			removeFromRemoteWhitelists(message.url)
			break
		default:
			break
	}
}

/*--- Domain check ---*/

function checkUrl(url) {
	const urlArray = url.split('.')
	let domains = []
	if (!/^\d+\.\d+\.\d+\.\d+$/.test(url)) {
		for (let i = 0; i < urlArray.length; i++) {
			const toCheck = urlArray.slice(i, urlArray.length).join('.')
			if (!suffixList[toCheck]) {
				domains.push(toCheck)
			}
		}
	} else {
		domains.push(urlArray.slice(0, urlArray.length - 1).join('.'))
		domains.push(url)
	}
	let blocked
	let whitelisted
	let remoteBlocklist
	let remoteWhitelist
	for (const domain of domains) {
		if (remoteDomainBlocklist[domain]) {
			remoteBlocklist = remoteDomainBlocklist[domain]
			blocked = domain
		} else if (remoteDomainWhitelist[domain]) {
			remoteWhitelist = remoteDomainWhitelist[domain]
			whitelisted = domain
		} else if (yourBlocklist[domain]) {
			blocked = domain
		} else if (whitelist[domain] || remoteDomainWhitelist[domain]) {
			whitelisted = domain
		}
	}
	return {toRemove: blocked !== undefined && (whitelisted === undefined || !whitelisted.endsWith('.' + blocked)),
		whitelisted: whitelisted !== undefined,
		domains: domains,
		inRemoteBlocklist: remoteBlocklist,
		inRemoteWhitelist: remoteWhitelist}
}

/*--- Your blocklist ---*/

function removeFromYourBlocklist(url) {
	delete yourBlocklist[url]
	browser.storage.local.set({sesbYourBlocklist: JSON.stringify(yourBlocklist)})
}

function clearBlocklist() {
	yourBlocklist = {}
	browser.storage.local.set({sesbYourBlocklist: undefined})
}

function block(toBlock) {
	const blocklistProps = Object.keys(yourBlocklist)
	const whitelistProps = Object.keys(whitelist)
	let blockedSubdomain
	let whitelistedDomainOrUpperDomain = false
	for (const whitelisted of whitelistProps) {
		if (toBlock === whitelisted || toBlock.endsWith('.' + whitelisted)) {
			whitelistedDomainOrUpperDomain = true
			break
		}
	}
	for (const blocked of blocklistProps) {
		if (blocked.endsWith('.' + toBlock)) {
			blockedSubdomain = blocked
			break
		} else if (toBlock === blocked || toBlock.endsWith('.' + blocked)) {
			return Promise.resolve(true)
		}
	}
	if (blockedSubdomain !== undefined) {
		delete yourBlocklist[blockedSubdomain]
		yourBlocklist[toBlock] = true
	}
	if (!whitelistedDomainOrUpperDomain) {
		yourBlocklist[toBlock] = true
	}
	browser.storage.local.set({sesbYourBlocklist: JSON.stringify(yourBlocklist)})
	browser.storage.local.set({sesbWhitelist: JSON.stringify(whitelist)})
	return Promise.resolve(true)
}

function blockMultiple(domains) {
	const sanitizedDomains = sanitizeDomains(domains, false, false)
	for (const domain of sanitizedDomains) {
		block(domain)
	}
	optionsPageListsUpdated = true
}

/*--- Whitelist ---*/

function removeFromWhitelist(url) {
	delete whitelist[url]
	browser.storage.local.set({sesbWhitelist: JSON.stringify(whitelist)})
}

function whitelistMultiple(domains) {
	const sanitizedDomains = sanitizeDomains(domains, false, false)
	for (const domain of sanitizedDomains) {
		unblock(domain, true)
	}
	optionsPageListsUpdated = true
}

/*--- Remote blocklists ---*/

function addRemoteBlocklists(urls) {
	for (const url of urls) {
		fetchRemoteBlocklist(5, url)
		remoteBlocklists[url] = true
	}
	browser.storage.local.set({sesbRemoteBlocklists: JSON.stringify(remoteBlocklists)})
	optionsPageListsUpdated = true
}

function removeFromRemoteBlocklists(url) {
	delete remoteBlocklists[url]
	browser.storage.local.set({sesbRemoteBlocklists: JSON.stringify(remoteBlocklists)})
	updateLists()
}

/*--- Remote whitelists ---*/

function addRemoteWhitelists(urls) {
	for (const url of urls) {
		fetchRemoteWhitelist(5, url)
		remoteWhitelists[url] = true
	}
	browser.storage.local.set({sesbRemoteWhitelists: JSON.stringify(remoteWhitelists)})
	optionsPageListsUpdated = true
}

function removeFromRemoteWhitelists(url) {
	delete remoteWhitelists[url]
	browser.storage.local.set({sesbRemoteWhitelists: JSON.stringify(remoteWhitelists)})
	updateLists()
}


/*--- Unblock ---*/

function unblock(toUnblock, mustBeWhitelisted) {
	const blocklistProps = Object.keys(yourBlocklist)
	const whitelistProps = Object.keys(whitelist)
	let whitelistedSubdomain
	let blockedDomainOrSubdomain
	let blockedUpperDomain = false
	for (const whitelisted of whitelistProps) {
		if (whitelisted !== toUnblock && whitelisted.endsWith('.' + toUnblock)) {
			whitelistedSubdomain = whitelisted
		}  else if (toUnblock === whitelisted || toUnblock.endsWith('.' + whitelisted)) {
			return Promise.resolve(true)
		}
	}
	for (const blocked of blocklistProps) {
		if (blocked === toUnblock || blocked.endsWith('.' + toUnblock)) {
			blockedDomainOrSubdomain = blocked
		} else if (toUnblock.endsWith('.' + blocked)) {
			blockedUpperDomain = true
		}
	}
	if (whitelistedSubdomain !== undefined && mustBeWhitelisted) {
		delete whitelist[whitelistedSubdomain]
	}
	if (blockedDomainOrSubdomain !== undefined) {
		delete yourBlocklist[blockedDomainOrSubdomain]
	} else if (blockedUpperDomain) {
		whitelist[toUnblock] = true
	}
	if (mustBeWhitelisted) {
		whitelist[toUnblock] = true
	}
	browser.storage.local.set({sesbYourBlocklist: JSON.stringify(yourBlocklist)})
	browser.storage.local.set({sesbWhitelist: JSON.stringify(whitelist)})
	return Promise.resolve(true)
}

/*--- Automatic update ---*/

function handleNullSettings(savedSettings) {
	activeSettings = savedSettings === undefined ? defaultSettings : savedSettings
	browser.browserAction.setIcon({path: activeSettings.enabled === 0 ? "../icons/32_off.png" : "../icons/32.png"})
}

function handleNullRemoteBlocklist(savedBlocklists) {
	return savedBlocklists === undefined ? JSON.stringify(defaultBlocklist) : savedBlocklists
}

function loadSettings() {
	browser.storage.local.get(storedResources.settings).then((r) => r.sesbSettings).then((r) => handleNullSettings(r))
}

async function updateLists() {
	suffixList = {}
	yourBlocklist = {}
	whitelist = {}
	remoteBlocklists = {}
	remoteWhitelists = {}
	remoteDomainBlocklist = {}
	remoteDomainWhitelist = {}
	const suffixListJson = await browser.storage.local.get(storedResources.suffixList).then((r) => r.sesbSuffixList)
	const yourBlocklistJson = await browser.storage.local.get(storedResources.yourBlocklist).then((r) => r.sesbYourBlocklist)
	const whitelistJson = await browser.storage.local.get(storedResources.whitelist).then((r) => r.sesbWhitelist)
	const remoteBlocklistsJson = await browser.storage.local.get(storedResources.remoteBlocklists).then((r) => r.sesbRemoteBlocklists).then((r) => handleNullRemoteBlocklist(r))
	const remoteWhitelistsJson = await browser.storage.local.get(storedResources.remoteWhitelists).then((r) => r.sesbRemoteWhitelists)
	if (yourBlocklistJson) {
		yourBlocklist = JSON.parse(yourBlocklistJson)
	}
	if (whitelistJson) {
		whitelist = JSON.parse(whitelistJson)
	}
	if (remoteBlocklistsJson) {
		remoteBlocklists = JSON.parse(remoteBlocklistsJson)
	}
	if (remoteWhitelistsJson) {
		remoteWhitelists = JSON.parse(remoteWhitelistsJson)
	}
	for (const url of Object.keys(remoteBlocklists)) {
		fetchRemoteBlocklist(url)
	}
	for (const url of Object.keys(remoteWhitelists)) {
		fetchRemoteWhitelist(url)
	}
	fetchSuffixList(5, null)
}

function retainSuffixList(text) {
	let validText = []
	let sanitizedText = []
	for (let i = 0; i < text.length; i++) {
		if (text[i].includes('END ICANN DOMAINS')) {
			break
		} else if (text[i].startsWith('*') || text[i].startsWith('!')) {
			validText.push(text[i].substring(2))
		} else if (text[i] !== '' && !text[i].startsWith('/')) {
			validText.push(text[i])
		}
	}
	sanitizedText = sanitizeDomains(validText, true, false)
	for (let i = 0; i < sanitizedText.length; i++) {
		suffixList[sanitizedText[i]] = true
	}
	browser.storage.local.set({sesbSuffixList: JSON.stringify(suffixList)})
	console.log('Suffix list OK')
}

function retainUnlistedSuffixesList(text) {
	for (let i = 0; i < text.length; i++) {
		suffixList[text[i]] = true
	}
	browser.storage.local.set({sesbSuffixList: JSON.stringify(suffixList)})
	console.log('Unlisted suffixes list OK')
}

function retainRemoteBlocklist(text, list) {
	text = sanitizeDomains(text, false, true)
	for (let i = 0; i < text.length; i++) {
		remoteDomainBlocklist[text[i]] = list
	}
	browser.storage.local.set({sesbRemoteDomainBlocklist: JSON.stringify(remoteDomainBlocklist)})
	console.log('Remote blocklist OK')
}

function retainRemoteWhitelist(text, list) {
	text = sanitizeDomains(text, false, true)
	for (let i = 0; i < text.length; i++) {
		remoteDomainWhitelist[text[i]] = list
	}
	browser.storage.local.set({sesbRemoteDomainWhitelist: JSON.stringify(remoteDomainWhitelist)})
	console.log('Remote whitelist OK')
}

function wait(delay){
	return new Promise((resolve) => setTimeout(resolve, delay))
}

function retryFetch(response, tries, functionToRetry, url) {
	if (!response.ok) {
		if (tries !== 0) {
			return wait(4000).then(() => functionToRetry(tries - 1, url))
		} else {
			throw Error(response.statusText)
		}
	}
	return response
}

function fetchSuffixList(tries, url) {
	return fetch('https://raw.githubusercontent.com/publicsuffix/list/master/public_suffix_list.dat')
		.then((r) => retryFetch(r, tries, fetchSuffixList))
		.then((response) => response.text())
		.then((text) => retainSuffixList(text.split('\n')))
		.then(fetchUnlistedSuffixesList(5, null))
}

function fetchUnlistedSuffixesList(tries, url) {
	return fetch('https://raw.githubusercontent.com/no-cmyk/Unlisted-Domain-Suffixes/main/suffixes.txt')
		.then((r) => retryFetch(r, tries, fetchUnlistedSuffixesList))
		.then((response) => response.text())
		.then((text) => retainUnlistedSuffixesList(text.split('\n')))
}

function fetchRemoteBlocklist(tries, url) {
	return fetch(url)
		.then((r) => retryFetch(r, tries, fetchRemoteBlocklist))
		.then((response) => response.text())
		.then((text) => retainRemoteBlocklist(text.split('\n'), url))
}

function fetchRemoteWhitelist(tries, url) {
	return fetch(url)
		.then((r) => retryFetch(r, tries, fetchRemoteWhitelist))
		.then((response) => response.text())
		.then((text) => retainRemoteWhitelist(text.split('\n'), url))
}

/*--- Sanitize URLs ---*/
/*--- Includes code from github.com/bestiejs/punycode.js (provided under MIT license) ---*/
/*--- Copyright Mathias Bynens <https://mathiasbynens.be/> ---*/

function digitToBasic(digit, flag) {
	return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5)
}

function adapt(delta, numPoints, firstTime) {
	let k = 0
	delta = firstTime ? Math.floor(delta / 700) : delta >> 1
	delta += Math.floor(delta / numPoints)
	for (/* no initialization */; delta > 35 * 26 >> 1; k += 36) {
		delta = Math.floor(delta / 35)
	}
	return Math.floor(k + (35 + 1) * delta / (delta + 38))
}

function ucs2decode(string) {
	const output = []
	let counter = 0
	const length = string.length
	while (counter < length) {
		const value = string.charCodeAt(counter++)
		if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
			const extra = string.charCodeAt(counter++)
			if ((extra & 0xFC00) == 0xDC00) {
				output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000)
			} else {
				output.push(value)
				counter--
			}
		} else {
			output.push(value)
		}
	}
	return output
}

function encode(input) {
	const output = []
	input = ucs2decode(input)
	let inputLength = input.length
	let n = 128
	let delta = 0
	let bias = 72
	for (const currentValue of input) {
		if (currentValue < 0x80) {
			output.push(String.fromCharCode(currentValue))
		}
	}
	let basicLength = output.length
	let handledCPCount = basicLength
	if (basicLength) {
		output.push('-')
	}
	while (handledCPCount < inputLength) {
		let m = 2147483647
		for (const currentValue of input) {
			if (currentValue >= n && currentValue < m) {
				m = currentValue
			}
		}
		const handledCPCountPlusOne = handledCPCount + 1
		if (m - n > Math.floor((2147483647 - delta) / handledCPCountPlusOne)) {
			return undefined
		}
		delta += (m - n) * handledCPCountPlusOne
		n = m
		for (const currentValue of input) {
			if (currentValue < n && ++delta > 2147483647) {
				return undefined
			}
			if (currentValue == n) {
				let q = delta
				for (let k = 36; /* no condition */; k += 36) {
					const t = k <= bias ? 1 : (k >= bias + 26 ? 26 : k - bias)
					if (q < t) {
						break
					}
					const qMinusT = q - t
					const baseMinusT = 36 - t
					output.push(String.fromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0)))
					q = Math.floor(qMinusT / baseMinusT)
				}
				output.push(String.fromCharCode(digitToBasic(q, 0)))
				bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength)
				delta = 0
				++handledCPCount
			}
		}
		++delta
		++n
	}
	return output.join('')
}

function sanitizeDomains(domains, skipRegex, forRemoteList) {
	let sanitizedDomains = []
	let reg = new RegExp(/[A-Z0-9][A-Z0-9_-]*(\.[A-Z0-9][A-Z0-9_-]*)+/i)
	for (let i = 0; i < domains.length; i++) {
		let domain = domains[i]
		if (forRemoteList) {
			if (domain.startsWith('#')) {
				continue
			}
			domain = domain.replace(/^(127\.0\.0\.1|0\.0\.0\.0|255\.255\.255\.255|localhost) /, '')
		}
		domain = domain.replace(/^.*:\/\/|[\/,\:].*$/g, '')
		let newDomain = []
		let splitDomain = domain.split('.')
		for (let j = 0; j < splitDomain.length; j++) {
			let ascii = /[^\0-\x7E]/.test(splitDomain[j]) ? 'xn--' + encode(splitDomain[j]) : splitDomain[j]
			newDomain.push(ascii)
		}
		domain = newDomain.join('.')
		if (skipRegex) {
			sanitizedDomains.push(domain.toLowerCase())
		} else {
			let checkedDomain = reg.exec(domain)
			if (checkedDomain !== null) {
				sanitizedDomains.push(checkedDomain[0].toLowerCase())
			}
		}
	}
	return sanitizedDomains
}

loadSettings()
doWithWorker(updateLists)
setInterval(function(){doWithWorker(updateLists)}, 600000)