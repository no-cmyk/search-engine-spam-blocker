'use strict'
let settings
let done = {}
const textResult = 'algo'

document.addEventListener('DOMContentLoaded', function(){setTimeout(scanResults, 500)}, true)

/*---Handle settings---*/

browser.runtime.onMessage.addListener(message => {
	settings = message
	update()
})

async function update() {
	if (settings === undefined) {
		settings = await browser.runtime.sendMessage({action: actions.getActiveSettings})
	}
	for (const e of document.querySelectorAll('.' + textResult)) {
		let blockDiv = e.querySelector('.' + css.blockDiv)
		let unblockDiv = e.querySelector('.' + css.unblockDiv)
		if (blockDiv === null || unblockDiv === null) {
			continue
		}
		if (settings.enabled === 0) {
			e.classList.remove(css.hidden, css.blockedShow)
			blockDiv.classList.add(css.hidden)
			unblockDiv.classList.add(css.hidden)
		} else if (e.classList.contains(css.blocked)) {
			settings.showBlocked === 1 ? (e.classList.remove(css.hidden), e.classList.add(css.blockedShow)) : (e.classList.remove(css.blockedShow), e.classList.add(css.hidden))
			blockDiv.classList.add(css.hidden)
			unblockDiv.classList.remove(css.hidden)
		} else {
			e.classList.remove(css.hidden, css.blockedShow)
			blockDiv.classList.toggle(css.hidden, settings.showButtons === 0)
			unblockDiv.classList.add(css.hidden)
		}
	}
	browser.runtime.sendMessage({action: actions.updateBadge, blockedNumber: settings.enabled === 1 ? document.querySelectorAll('.' + css.blocked).length : 0})
}

/*---Scan search results---*/

function scanResults() {
	for (const e of document.querySelectorAll('.' + textResult)) {
		if (e.getAttribute(css.sesbId) === null) {
			e.setAttribute(css.sesbId, Math.random())
		}
		if (!done[e.getAttribute(css.sesbId)]) {
			e.setAttribute(css.sesbId, Math.random())
			done[e.getAttribute(css.sesbId)] = true
			handleResult(e)
		}
	}
	update()
}

async function handleResult(e) {
	const url = getUrl(e)
	if (url === '' || url === undefined) {
		return
	}
	const response = await browser.runtime.sendMessage({action: actions.check, url: url})
	if (response === undefined) {
		return
	}
	if (response.toRemove === true && !e.classList.contains(css.blocked)) {
		e.classList.add(css.blocked)
	}
	if (e.querySelector('.' + css.blockDiv) === null) {
		addButton(e, response.domains, true, response.toRemove === false)
	}
	if (e.querySelector('.' + css.unblockDiv) === null) {
		addButton(e, response.domains, false, response.toRemove === true)
	}
}

function getUrl(e) {
	return e.getElementsByTagName('span')[0].innerText.replace(regex.urlRegexWithArrow, '')
}

/*---Add block/unblock buttons---*/

function addButton(e, domains, block, toHide) {
	const div = document.createElement('div')
	div.classList.add(block === true ? css.blockDiv : css.unblockDiv)
	if (toHide === true) {
		div.classList.add(css.hidden)

	}
	div.innerText = block === true ? texts.block : texts.unblock
	for (let i = domains.length - 1; i >= 0; i--) {
		const button = document.createElement('button')
		button.innerText = domains[i]
		button.addEventListener('click', function(){updateResults(domains[i], block)})
		div.appendChild(button)
	}
	e.prepend(div)
}

async function updateResults(url, block) {
	const response = await browser.runtime.sendMessage({action: block ? actions.update : actions.unblock, url: url})
	if (block === false) {
		for (const e of document.querySelectorAll('.' + textResult)) {
			e.classList.remove(css.blocked, css.blockedShow)
		}
	}
	done = {}
	scanResults()
	setTimeout(update, 200)
}
