const textResult = 'result'
const imgResult = 'tile--img'
let updated
const mo = new MutationObserver(onMutation)
mo.observe(document, {subtree: true, childList: true})
document.addEventListener('load', setInterval(redo, 500))

// Workaround to catch nodes that slip through the MutationObserver
function redo() {
	document.querySelectorAll('.' + textResult + '\,.' + imgResult).forEach(
		function(n) {
			if (!n.matches('.sesb-fix-height')) {
				removeElement(n)
			}
		}
	)
}

const done = {}
function onMutation(mutations) {
	for (const {addedNodes} of mutations) {
		for (const n of addedNodes) {
			if (n.tagName === 'DIV' && (n.matches('.' + textResult) || n.matches('.' + imgResult)) && !done[n.getAttribute('id')]) {
				removeElement(n)
			}
		}
	}
}

function getClassToAdd(showBlocked) {
	return showBlocked === 1 ? 'sesb-blocked-show' : 'sesb-hidden'
}

function findAndBlock(response, url) {
	if (response.whitelisted === true) {
		if (confirm('This domain must be removed from your whitelist in order to be blocked.\nDo you want to proceed?')) {
			browser.runtime.sendMessage({action: 'remove-from-whitelist-and-update', url: url})
		} else {
			return
		}
	}
	const classToAdd = getClassToAdd(response.showBlocked)
	document.querySelectorAll('.' + textResult + '\,.' + imgResult).forEach(
		function(elem) {
			const elemUrl = getUrl(elem)
			if (elemUrl.endsWith(url)) {
				elem.querySelector('.sesb-block-div').classList.add('sesb-hidden')
				elem.classList.add(classToAdd)
				if (response.showBlocked) {
					elem.querySelector('.sesb-unblock-div').classList.remove('sesb-hidden')
				}
			}
		}
	)
}

function findAndUnblock(response, url) {
	document.querySelectorAll('.' + textResult + '\,.' + imgResult).forEach(
		function(elem) {
			const elemUrl = getUrl(elem)
			if (elemUrl.endsWith(url)) {
				elem.classList.remove('sesb-hidden', 'sesb-blocked-show')
				if (response.showBlocked) {
					elem.querySelector('.sesb-block-div').classList.remove('sesb-hidden')
				}
				elem.querySelector('.sesb-unblock-div').classList.add('sesb-hidden')
			}
		}
	)
}

function updateYourBlocklist(event, url) {
	event.stopPropagation()
	browser.runtime.sendMessage({action: 'update', url: url}).then((resp) => findAndBlock(resp, url))
}

function unblock(event, url, isSub) {
	event.stopPropagation()
	browser.runtime.sendMessage({action: 'unblock', url: url, isSub: isSub}).then((resp) => findAndUnblock(resp, url))
}

function createBlockButton(url, div, elem) {
	const button = document.createElement('button')
	button.innerText = url
	button.title = 'Block ' + url + '?'
	button.addEventListener('click', function(event){updateYourBlocklist(event, url)})
	div.appendChild(button)
}

function addBlockButtons(elem, url, domain, privateDomain, showButtons, showBlocked, toRemove) {
	const div = document.createElement('div')
	div.classList.add('sesb-block-div')
	if (showButtons !== 1 || toRemove === true) {
		div.classList.add('sesb-hidden')
	}
	if (showBlocked === 1) {
		addUnblockButtons(elem, url, domain, privateDomain, showBlocked, toRemove)
	}
	div.innerHTML = 'Block '
	if (domain !== undefined) {
		createBlockButton(domain, div, elem)
	}
	if (privateDomain !== undefined && privateDomain !== url) {
		createBlockButton(privateDomain, div, elem)
	}
	if (url !== domain) {
		createBlockButton(url, div, elem)
	}
	elem.classList.add('sesb-fix-height')
	elem.classList.contains(textResult) ? elem.prepend(div) : fixDimensions(elem, div)
}

function createUnblockButton(url, div, elem, isSub) {
	const button = document.createElement('button')
	button.innerText = url
	button.title = 'Unblock ' + url + '?'
	button.addEventListener('click', function(event){unblock(event, url, isSub)})
	div.appendChild(button)
}

function fixDimensions(elem, div) {
	const dim = elem.querySelectorAll('.tile--img__dimensions')[1]
	const sub = elem.querySelector('.tile--img__sub')
	dim.remove()
	elem.insertBefore(dim, sub)
	dim.classList.add('sesb-fix-image-size')
	elem.appendChild(div)
}

function addUnblockButtons(elem, url, domain, privateDomain, showButtons, toRemove) {
	const div = document.createElement('div')
	div.classList.add('sesb-unblock-div')
	if (showButtons !== 1 || toRemove !== true) {
		div.classList.add('sesb-hidden')
	}
	div.innerHTML = 'Unblock '
	createUnblockButton(domain, div, elem, false)
	if (privateDomain !== undefined && privateDomain !== url) {
		createUnblockButton(privateDomain, div, elem, false)
	}
	if (url !== domain) {
		createUnblockButton(url, div, elem, true)
	}
	elem.classList.add('sesb-fix-height')
	elem.classList.contains(textResult) ? elem.prepend(div) : fixDimensions(elem, div)
}

function getUrl(e) {
	return e.classList.contains(textResult) ?
		e.querySelector('.result__url__domain').innerText.replace(/^http.*:\/\/|\/.*$|:\d+/g, '')
		: e.querySelector('.tile--img__sub').href.replace(/^http.*:\/\/|\/.*$|:\d+/g, '')
}

async function removeElement(e) {
	const url = getUrl(e)
	if (url === '' || url === undefined) {
		return
	}
	const response = await browser.runtime.sendMessage({action: 'check', url: url}).catch((e) => console.error(e))
	if (response !== undefined) {
		if (response.domain === undefined && updated === undefined) {
			browser.runtime.sendMessage({action: 'update-spam-lists'})
			updated = true
			return
		}
		addBlockButtons(e, url, response.domain, response.privateDomain, response.showButtons, response.showBlocked, response.toRemove)
		if (response.toRemove === true) {
			const classToAdd = getClassToAdd(response.showBlocked)
			e.classList.add(classToAdd)
		}
	}
}
