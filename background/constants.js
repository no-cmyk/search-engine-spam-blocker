'use strict'
const defaultSettings = {
	enabled: 1,
	enableDefaultBlocklist: 1,
	showBlocked: 0,
	showButtons: 0
}
const storedVars = {
	blocklist: 'sesbBlocklist',
	lastUpdate: 'sesbLastUpdate',
	privateSuffixList: 'sesbPrivateSuffixList',
	suffixList: 'sesbSuffixList'
}
const storedResources = {
	settings: 'sesbSettings',
	whitelist: 'sesbWhitelist',
	yourBlocklist: 'sesbYourBlocklist'
}
const css = {
	blockDiv: 'sesb-block-div',
	unblockDiv: 'sesb-unblock-div',
	blockedShow: 'sesb-blocked-show',
	fixHeight: 'sesb-fix-height',
	fixImageSize: 'sesb-fix-image-size',
	hidden: 'sesb-hidden',
	sesbId: 'sesb-id',
	blocked: 'sesb-blocked'
}
const html = {
	addDomainsButton: 'add-domains-button',
	addDomainsTextarea: 'add-domains-textarea',
	clearBlocklist: 'clear-blocklist',
	domain: 'domain',
	domainWhitelist: 'domain-whitelist',
	enabled: 'enabled',
	enableDefaultBlocklist: 'enable-default-blocklist',
	export: 'export',
	import: 'import',
	manageYourBlocklist: 'manage-your-blocklist',
	resultOk: 'result-ok',
	showBlockButtons: 'show-block-buttons',
	showBlocked: 'show-blocked',
	toHide: 'to-hide',
	updateSpamLists: 'update-spam-lists',
	whitelist: 'whitelist',
	whitelistDomainsButton: 'whitelist-domains-button',
	whitelistDomainsTextarea: 'whitelist-domains-textarea',
	yourBlocklist: 'your-blocklist'
}
const regex = {
	urlRegex: /^http.*:\/\/|\/.*$|:\d+/g,
	urlRegexWithArrow: /^http.*:\/\/|\/.*$|:\d+|\s›.*/g
}
const texts = {
	blockAlert: 'This domain must be removed from your whitelist in order to be blocked.\nDo you want to proceed?',
	clearBlocklistAlert: 'WARNING:\n\nThis will irreversibly remove all domains from your blocklist,\ndo you really want to proceed?',
	removeFromBlocklist: 'Remove this domain from your blocklist?',
	removeFromWhitelist: 'Remove this domain from your whitelist?',
	block: 'Block ',
	unblock: 'Unblock ',
	remove: '✖'
}	
const actions = {
	check: 1,
	checkOptionsBlocklistUpdated: 2,
	checkOptionsWhitelistUpdated: 3,
	clearBlocklist: 4,
	loadWhitelist: 5,
	loadYourBlocklist: 6,
	reloadSettings: 7,
	remove: 8,
	removeFromWhitelist: 9,
	removeFromWhitelistAndUpdate: 10,
	unblock: 11,
	update: 12,
	updateMultiple: 13,
	updateSpamLists: 14,
	whitelistMultiple: 15,
	updateBadge: 16,
	getActiveSettings: 17
}	
const unlistedSuffixes = [
	'ac.bd',
	'ac.fk',
	'ac.pg',
	'academy.np',
	'accountants.np',
	'actor.np',
	'aero.np',
	'agency.np',
	'asia.np',
	'associates.np',
	'audio.np',
	'bar.np',
	'bargains.np',
	'beer.np',
	'bid.np',
	'bike.np',
	'bio.np',
	'biz.ck',
	'biz.np',
	'black.np',
	'blue.np',
	'boutique.np',
	'build.np',
	'builders.np',
	'buzz.np',
	'cab.np',
	'camera.np',
	'camp.np',
	'capital.np',
	'cards.np',
	'care.np',
	'careers.np',
	'cash.np',
	'catering.np',
	'center.np',
	'ceo.np',
	'christmas.np',
	'clinic.np',
	'clothing.np',
	'club.np',
	'co.bd',
	'co.ck',
	'co.fk',
	'co.np',
	'codes.np',
	'coffee.np',
	'college.np',
	'com.bd',
	'com.er',
	'com.jm',
	'com.kh',
	'com.mm',
	'com.np',
	'com.pg',
	'community.np',
	'company.np',
	'computer.np',
	'cool.np',
	'coop.np',
	'country.np',
	'credit.np',
	'creditcard.np',
	'dental.np',
	'diamonds.np',
	'edu.bd',
	'edu.ck',
	'edu.er',
	'edu.jm',
	'edu.kh',
	'edu.mm',
	'edu.np',
	'email.np',
	'engineering.np',
	'estate.np',
	'events.np',
	'expert.np',
	'finance.np',
	'financial.np',
	'fish.np',
	'fishing.np',
	'fitness.np',
	'flights.np',
	'florist.np',
	'fund.np',
	'furniture.np',
	'futbol.np',
	'gallery.np',
	'gen.ck',
	'gov.bd',
	'gov.ck',
	'gov.er',
	'gov.fk',
	'gov.jm',
	'gov.kh',
	'gov.mm',
	'gov.np',
	'gov.pg',
	'guitars.np',
	'guru.np',
	'hiphop.np',
	'hiv.np',
	'house.np',
	'ind.er',
	'industries.np',
	'info.bd',
	'info.ck',
	'info.np',
	'ink.np',
	'jobs.np',
	'judiciary.org.bd',
	'limited.np',
	'link.np',
	'management.np',
	'marketing.np',
	'media.np',
	'menu.np',
	'mil.bd',
	'mil.er',
	'mil.jm',
	'mil.kh',
	'mil.np',
	'mil.pg',
	'mobi.np',
	'museum.np',
	'name.np',
	'net.bd',
	'net.ck',
	'net.er',
	'net.fk',
	'net.jm',
	'net.kh',
	'net.mm',
	'net.np',
	'net.pg',
	'ninja.np',
	'nom.fk',
	'onl.np',
	'org.bd',
	'org.ck',
	'org.er',
	'org.fk',
	'org.jm',
	'org.kh',
	'org.mm',
	'org.np',
	'org.pg',
	'partners.np',
	'parts.np',
	'per.kh',
	'photo.np',
	'photos.np',
	'pics.np',
	'pink.np',
	'pro.np',
	'productions.np',
	'products.np',
	'properties.np',
	'pub.np',
	'red.np',
	'rentals.np',
	'repair.np',
	'rest.np',
	'rocks.np',
	'services.np',
	'shiksha.np',
	'shoes.np',
	'social.np',
	'solar.np',
	'solutions.np',
	'space.np',
	'supplies.np',
	'supply.np',
	'support.np',
	'surf.np',
	'surgery.np',
	'sw.bd',
	'systems.np',
	'tattoo.np',
	'tax.np',
	'technology.np',
	'tel.np',
	'tips.np',
	'today.np',
	'tools.np',
	'town.np',
	'trade.np',
	'training.np',
	'travel.np',
	'tv.bd',
	'university.np',
	'vacations.np',
	'ventures.np',
	'villas.np',
	'vision.np',
	'vodka.np',
	'voting.np',
	'voyage.np',
	'watch.np',
	'webcam.np',
	'wiki.np',
	'works.np',
	'wtf.np',
	'xyz.np',
	'zone.np'
]