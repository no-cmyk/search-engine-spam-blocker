const textResult = '.b_algo'
const imgResult = '.imgpt'
const mo = new MutationObserver(onMutation)
observe()

function onMutation(mutations) {
	for (const {addedNodes} of mutations) {
		for (const n of addedNodes) {
			if (n.tagName === 'LI' && n.matches(textResult)) {
				removeElement(n, 0)
			} else if (n.tagName === 'DIV' && n.matches(imgResult)) {
				removeElement(n, 1)
			}
		}
	}
}

function observe() {
	mo.observe(document, {
		subtree: true,
		childList: true,
	})
}

function getClassToAdd(showBlocked) {
	return showBlocked === 1 ? 'sesb-blocked-show' : 'sesb-hidden'
}

function findAndBlock(response, url) {
	const classToAdd = getClassToAdd(response.showBlocked)
	document.querySelectorAll(textResult + '\,' + imgResult).forEach(
		function(elem) {
			const pos = elem.classList.contains('b_algo') ? 0 : 1
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
	document.querySelectorAll(textResult + '\,' + imgResult).forEach(
		function(elem) {
			const pos = elem.classList.contains('b_algo') ? 0 : 1
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

function fixHeight(elem, div) {
	elem.parentElement.parentElement.classList.add('sesb-fix-height')
	elem.prepend(div)
}

function createBlockButton(url, div, elem) {
	const button = document.createElement('button')
	button.innerText = url
	button.title = 'Block ' + url + '?'
	button.addEventListener('click', function(){updateYourBlocklist(url)})
	div.appendChild(button)
}

function addBlockButtons(elem, url, domain, showButtons, showBlocked, toRemove) {
	const div = document.createElement('div')
	div.classList.add('sesb-block-div')
	if (showButtons !== 1 || toRemove === true) {
		div.classList.add('sesb-hidden')
	}
	if (showBlocked === 1) {
		addUnblockButtons(elem, url, domain, showBlocked, toRemove)
	}
	div.innerHTML = 'Block '
	createBlockButton(domain, div, elem)
	if (url !== domain && url !== 'www.' + domain) {
		createBlockButton(url, div, elem)
	}
	elem.classList.add('sesb-fix-height')
	elem.classList.contains('b_algo') ? elem.prepend(div) : fixHeight(elem, div)
}

function createUnblockButton(url, div, elem, isSub) {
	const button = document.createElement('button')
	button.innerText = url
	button.title = 'Unblock ' + url + '?'
	button.addEventListener('click', function(){unblock(url, isSub)})
	div.appendChild(button)
}

function addUnblockButtons(elem, url, domain, showButtons, toRemove) {
	const div = document.createElement('div')
	div.classList.add('sesb-unblock-div')
	if (showButtons !== 1 || toRemove !== true) {
		div.classList.add('sesb-hidden')
	}
	div.innerHTML = 'Unblock '
	createUnblockButton(domain, div, elem, false)
	if (url !== domain && !url.startsWith('www.')) {
		createUnblockButton(url, div, elem, true)
	}
	elem.classList.add('sesb-fix-height')
	elem.classList.contains('b_algo') ? elem.prepend(div) : fixHeight(elem, div)
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
	addBlockButtons(e, url, response.domain, response.showButtons, response.showBlocked, response.toRemove)
	if (response.toRemove === true) {
		const classToAdd = getClassToAdd(response.showBlocked)
		e.classList.add(classToAdd)
	}
}
