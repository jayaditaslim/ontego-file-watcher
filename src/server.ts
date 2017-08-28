declare function require(path: string): any;

var chokidar = require('chokidar');
var fs = require('fs');
var os = require('os');
var pathModule = require('path');

import {
	OntegoResource, OntegoResourceHandler
} from './ontegoResources';

import {
	OntegoBuilder
} from './ontegoBuilder';

import {
	AppBuilder
} from './appBuilder';

import {
	AppFlowBuilder
} from './appFlowBuilder';

import {
	ViewControllerBuilder
} from './viewControllerBuilder';

import {
	ServiceBuilder
} from './serviceBuilder';

import {
	GuiBuilder
} from './guiBuilder';

import {
	DataBuilder
} from './dataBuilder';

// DEVELOPMENT SETTINGS & CONFIGURATION
// The default configuration is set for Che implementation
// For local development, insert your OS hostname and configuration in 'else if' brackets

var hostname = os.hostname();

let workspaceFolder: string = "/projects";
let outputFolder = "/home/user/che/ws-agent/webapps/ROOT/ontego_build";
let buildUrl: string = "http://localhost:4401/ontego_build";
let devMode = true;

console.log("Hostname used: " + hostname);
if (hostname == "Jay") {
    workspaceFolder = "C:/Users/jay_t/dockertmp/instance/data/workspaces/wksp-78v6";
    outputFolder = "C:/Users/jay_t/dockertmp/instance/dev/che-tomcat/tomcat/webapps/ROOT/_app/ontego_build";
    buildUrl = "http://192.168.99.100:8080/_app/ontego_build";
}
else if (hostname == "Leonardos-MacBook-Pro.local" || hostname == "leonardos-mbp.pdm-commsult.intranet" || hostname == "eiphone.pdm-commsult.intranet") {
    workspaceFolder = "/Users/leonardokurnia/Desktop/Commsult/tmp/instance/data/workspaces/wksp-6jkf";
    outputFolder = "/Users/leonardokurnia/Desktop/Commsult/tmp/instance/dev/che-tomcat/tomcat/webapps/ROOT/_app/ontego_build";
    buildUrl = "http://localhost:8080/_app/ontego_build";
}

// END OF CONFIGURATION

var initialLoad = true;
var mainMappUrl : string = "";
var initMappFlowUrl : string = "";

let workspaceRoot: string = workspaceFolder;
let ontegoResourceHandler: OntegoResourceHandler = new OntegoResourceHandler(outputFolder, buildUrl);
let builder: { [s: string]: OntegoBuilder; } = {
	"mappflow" 	: new AppFlowBuilder(),
	"mview" 	: new ViewControllerBuilder(),
	"mservice"	: new ServiceBuilder(),
	"mgui" 		: new GuiBuilder(),
	"mapp"		: new AppBuilder(),
	"odataxml"	: new DataBuilder()
};

var watcher = chokidar.watch(workspaceFolder, {
    ignored: /(^|[\/\\])\../,
    persistent: true
});

console.log("Starting the engine....");
console.log("Using workspace folder: " + workspaceFolder);

watcher
    .on('add', path => {
        console.log(`File ${path} has been added to the watch list`);
        let extension: string = extractExtension(path);
        if(initialLoad && extension == "mapp") {
            mainMappUrl = path;
        }
        if (builder[extension]) {
            fs.readFile(`${path}`, 'utf8', function(err, contents) {
                if(err) {
                    console.log("FILE READ ERROR: " + err);
                }
                try {
                    if (contents != "") {
                        console.log("Building " + path + "...");
                        builder[extension].build(ontegoResourceHandler, workspaceRoot, path, contents);
                        console.log(extension + " file successfully built.");
                    }
                } catch (e) {
                    console.log("Build failed - Error: " + JSON.stringify(e), e);
                }
            });
        }
    })
    .on('change', (path: string, details, event, stats) => {
        console.log(`File ${path} has been changed`);
        let extension: string = extractExtension(path);
        console.log("File Extension: " + extension);
        if (builder[extension]) {
            fs.readFile(`${path}`, 'utf8', function(err, contents) {
                if(err) {
                    console.log("FILE READ ERROR: " + err);
                }

                try {
                    console.log("Building " + path + "...");
                    builder[extension].build(ontegoResourceHandler, workspaceRoot, path, contents);
                    if (extension == "mgui") {
                        let viewMap = ontegoResourceHandler.getViewGUIMap(path);
                        if (viewMap) {
                            fs.readFile(`${viewMap}`, 'utf8', function(innererr, innercontents) {
                                if(err) {
                                    console.log("FILE READ ERROR: " + innererr);
                                }

                                try {
                                    console.log("Building " + viewMap + "...");
                                    builder["mview"].build(ontegoResourceHandler, workspaceRoot, viewMap, innercontents);
                                    console.log(extension + " file successfully built.");
                                } catch (e) {
                                    console.log("Build failed - Error: " + JSON.stringify(e), e);
                                }
                            });
                        }
                    }
                    buildMainMapp();
                    console.log(extension + " file successfully built.");
                } catch (e) {
                    console.log("Build failed - Error: " + JSON.stringify(e), e);
                }
            });
        }
    })
    .on('unlink', path => {
        console.log(`File ${path} has been removed from the watch list`);

        var toRemove = extractFileName(path) + ".js";

        var filesReturned = getMatchingFiles(outputFolder, [], toRemove);
        console.log("Size is: " + filesReturned.length);

        filesReturned.forEach(element => {
            console.log(element);
            fs.unlink(element, function(err) {
                if(err) {
                    console.log("Error while trying to delete: " + err);
                }
                else {
                    console.log("File " + element + " successfully deleted");
                }
            })
        });
    })
    .on('ready', () => {
        initialLoad = false;
        buildMainMapp();
        console.log("Engine started. Now watching...");
    });

function extractExtension(str : string) : string {
    let splitted: string[] = str.split(".");
    return splitted[splitted.length - 1];
}

function extractFileName(str : string) : string {
    return str.substr(str.lastIndexOf("\\") + 1);
}

function buildMainMapp() : void {
    if (mainMappUrl != "") {
        fs.readFile(`${mainMappUrl}`, 'utf8', function(err, contents) {
            if(err) {
                console.log("FILE READ ERROR: " + err);
            }

            try {
                console.log("Building " + mainMappUrl + "...");
                builder["mapp"].build(ontegoResourceHandler, workspaceRoot, mainMappUrl, contents);
                console.log("mapp" + " file successfully built.");
            } catch (e) {
                console.log("Build failed - Error: " + JSON.stringify(e), e);
            }
        });
    }
}

function getMatchingFiles(dir, filelist, toRemove) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
        if (fs.statSync(pathModule.join(dir, file)).isDirectory()) {
            if(file != "bower_components") {
                filelist = getMatchingFiles(pathModule.join(dir, file), filelist, toRemove);
            }
        }
        else {
            if(!file.match(/(^|[\/\\])\../) && file == toRemove) {
                filelist.push(pathModule.join(dir, file)); 
            }
        }
    });

    return filelist;
}