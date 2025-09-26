/**
* Sanitises title, removing any unwanted characters that might break XML.
*
* This is a very basic funciton, not full parser.
*/
function sanitiseTitleAttribute(content) {
	return content.replace(/[<>&]+/g, "");
}

export { sanitiseTitleAttribute };