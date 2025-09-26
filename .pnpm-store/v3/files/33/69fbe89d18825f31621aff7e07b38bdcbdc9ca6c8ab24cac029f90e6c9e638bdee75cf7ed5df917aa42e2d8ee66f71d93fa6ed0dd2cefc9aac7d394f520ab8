minify: real-minify test-minified

real-minify: strftime.js
	rm -f strftime-min.js
	closure-compiler <strftime.js >|strftime-min.js

test:
	TZ=America/Vancouver node test.js
	TZ=Europe/Amsterdam node test.js

test-minified: minify
	TZ=America/Vancouver node test.js ./strftime-min.js
	TZ=Europe/Amsterdam node test.js ./strftime-min.js

.PHONY: test test-minified
