var cas = require('./src/cas').cas,
    css = require('./lib/css'), 
    fs = require('fs'),
    path = require("path"),
    read = fs.readFileSync, 
    program, 
    folder = process.argv[2], 
    compiledFileName;

fs.readdirSync(folder).forEach(function (item) {
	console.log(item);
	if (/.cas$/.test(item)) {
		cas.precompile(read(folder + "/" + item, 'utf8'));
		program = "document.addEventListener('DOMContentLoaded', function(){ cas.init(" + cas.compile() + ");},false);"
		compiledFileName = path.normalize(folder + path.sep + item.replace(/.cas$/,".cas.js"));
		console.log("compiled file name: " + compiledFileName);
		console.log("program: \n" + program);
		fs.writeFileSync(compiledFileName, program);	
		cas.reset();
		
	}
});


console.log("done.");
