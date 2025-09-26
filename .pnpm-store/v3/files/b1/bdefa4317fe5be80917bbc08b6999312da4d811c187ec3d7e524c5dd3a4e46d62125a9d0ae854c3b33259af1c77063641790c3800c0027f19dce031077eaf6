'use strict'

function get(uri) {
	var xhr = new XMLHttpRequest()
	xhr.open('GET', uri, false)
	xhr.send()
	if(xhr.status !== 200)
		console.error('SVG.js fixture could not be loaded. Tests will fail.')
	return xhr.responseText
}

function main() {
	var style = document.createElement("style")
	document.head.appendChild(style)
	style.sheet.insertRule( get('/fixtures/fixture.css'), 0 )

	document.body.innerHTML = get('/fixtures/fixture.svg')
}

main()
