const textResult = 'g'
const imgResult = 'isv-r'
const mo = new MutationObserver(onMutation)
mo.observe(document, {subtree: true, childList: true})
document.addEventListener('load', redo)

// Workaround to catch nodes that slip through the MutationObserver
function redo() {
	document.querySelectorAll('.' + textResult + '\,.' + imgResult).forEach(
		function(n) {
			if (n.matches('.' + textResult) && !n.matches('.mnr-c') && !n.matches('.g-blk') && !n.matches('.sesb-fix-height')) {
				removeElement(n, 0)
			} else if (n.matches('.' + imgResult) && !n.matches('.sesb-fix-height')) {
				removeElement(n, 1)
			}
		}
	)
}

const done = {}
function onMutation(mutations) {
	for (const {addedNodes} of mutations) {
		for (const n of addedNodes) {
			if (n.tagName === 'DIV') {
				if (n.matches('.' + textResult) && !n.matches('.mnr-c') && !n.matches('.g-blk')) {
					removeElement(n, 0)
				} else if (n.matches('.' + imgResult) && !done[n.getAttribute('data-id')]) {
					removeElement(n, 1)
					done[n.getAttribute('data-id')] = true
				}
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
			const pos = elem.classList.contains(textResult) ? 0 : 1
			const elemUrl = getUrl(elem, pos)
			if (elemUrl.endsWith(url)) {
				elem.getElementsByClassName('sesb-block-div')[0].classList.add('sesb-hidden')
				elem.classList.add(classToAdd)
				if (response.showBlocked) {
					elem.getElementsByClassName('sesb-unblock-div')[0].classList.remove('sesb-hidden')
				}
			}
		}
	)
}

function findAndUnblock(response, url) {
	document.querySelectorAll('.' + textResult + '\,.' + imgResult).forEach(
		function(elem) {
			const pos = elem.classList.contains(textResult) ? 0 : 1
			const elemUrl = getUrl(elem, pos)
			if (elemUrl.endsWith(url)) {
				elem.classList.remove('sesb-hidden', 'sesb-blocked-show')
				if (response.showBlocked) {
					elem.getElementsByClassName('sesb-block-div')[0].classList.remove('sesb-hidden')
				}
				elem.getElementsByClassName('sesb-unblock-div')[0].classList.add('sesb-hidden')
			}
		}
	)
}

function updateYourBlocklist(url) {
	browser.runtime.sendMessage({action: 'update', url: url}).then((resp) => findAndBlock(resp, url))
}

function unblock(url, isSub) {
	browser.runtime.sendMessage({action: 'unblock', url: url, isSub: isSub}).then((resp) => findAndUnblock(resp, url))
}

function createBlockButton(url, div, elem) {
	const button = document.createElement('button')
	button.innerText = url
	button.title = 'Block ' + url + '?'
	button.addEventListener('click', function(){updateYourBlocklist(url)})
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
	createBlockButton(domain, div, elem)
	if (privateDomain !== undefined) {
		createBlockButton(privateDomain, div, elem)
	}
	if (url !== domain && url !== 'www.' + domain) {
		createBlockButton(url, div, elem)
	}
	elem.classList.add('sesb-fix-height')
	elem.classList.contains(textResult) ? elem.prepend(div) : elem.append(div)
}

function createUnblockButton(url, div, elem, isSub) {
	const button = document.createElement('button')
	button.innerText = url
	button.title = 'Unblock ' + url + '?'
	button.addEventListener('click', function(){unblock(url, isSub)})
	div.appendChild(button)
}

function addUnblockButtons(elem, url, domain, privateDomain, showButtons, toRemove) {
	const div = document.createElement('div')
	div.classList.add('sesb-unblock-div')
	if (showButtons !== 1 || toRemove !== true) {
		div.classList.add('sesb-hidden')
	}
	div.innerHTML = 'Unblock '
	createUnblockButton(domain, div, elem, false)
	if (privateDomain !== undefined) {
		createUnblockButton(privateDomain, div, elem, false)
	}
	if (url !== domain && !url.startsWith('www.')) {
		createUnblockButton(url, div, elem, true)
	}
	elem.classList.add('sesb-fix-height')
	elem.classList.contains(textResult) ? elem.prepend(div) : elem.append(div)
}

function getUrl(e, pos) {
	return e.getElementsByTagName('a')[pos].href.replace(/^http.*:\/\/|\/.*$/g, '')
}

async function removeElement(e, pos) {
	const url = getUrl(e, pos)
	if (url === '' || url === undefined) {
		return
	}
	const response = await browser.runtime.sendMessage({action: 'check', url: url}).catch((e) => console.error(e))
	addBlockButtons(e, url, response.domain, response.privateDomain, response.showButtons, response.showBlocked, response.toRemove)
	if (response.toRemove === true) {
		const classToAdd = getClassToAdd(response.showBlocked)
		e.classList.add(classToAdd)
	}
}
