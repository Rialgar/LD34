/**
 * Created by Rialgar on 13.12.2015.
 */
var readline = require('readline');
var fs = require('fs');

var arg = process.argv[2];
var mapNumber = parseInt(arg);
if (!mapNumber) {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function askForNumber(){
        rl.question('Please enter map number.', function (cmd) {
            rl.close();
            mapNumber = parseInt(cmd);
            if(!mapNumber){
                console.log(cmd + " is not a valid number");
                askForNumber();
            } else {
                rl.close();
                readFile();
            }
        });
    }
    askForNumber();
} else {
    readFile();
}

function readFile(){
    if(!mapNumber){
        console.error("No map number");
        process.exit(2);
        return;
    }

    var fileName = (mapNumber < 10 ? "0" : "") + mapNumber;
    var inputFilename = fileName+".c";
    var outputFilename = fileName+".blob";
    if(!fs.existsSync(inputFilename)){
        console.error("File not found: " + inputFilename);
        process.exit(3);
    }
    var rl = readline.createInterface({
        input: fs.createReadStream(inputFilename)
    });
    var regex = /^ *(".+"),?$/;
    var map = "";
    rl.on("line", function(line){
        var match = regex.exec(line);
        if(match){
            map += eval(match[1]);
        }
    });
    rl.on("close", function(){
        fs.writeFile(outputFilename, map, function(err) {
            if(err) {
                console.error(err);
                process.exit(4);
            } else {
                console.log("map saved to " + outputFilename);
                process.exit(0);
            }
        });
    });
}