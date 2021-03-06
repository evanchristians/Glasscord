/*
   Copyright 2020 AryToNeX

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
"use strict";

// JSON5
require("json5/lib/register");

// Glasstron init
const glasstron = require("glasstron");
glasstron.init();

const electron = require("electron");
const path = require("path");
const fs = require("fs-extra");
const Module = require("module");
const Main = require("./main.js");
const Utils = require("./utils.js");
const BrowserWindow = require("./browser_window.js");

// We want to make sure our working directory for config files is present
fs.ensureDir(Utils.getSavePath());

// Check for bundled configuration now; this can be useful for homebrew glassy app releases
Utils.copyBundledConfiguration();

// Require our version checker
require("./version_check.js")();

// Inject the GlasscordApi module for third party communication (on Main)
injectGlasscordNodeModule();

// Require the featured modules downloader
require("./featured_modules.js")();

// Init main
Main.getInstance();

// Inject Glasscord's stuff
injectGlasscordClass();
module.exports = {isGlasscord: true};
if(require.main.exports.isGlasscord) // we can assume we're injecting
	injectFromResources();
module.exports = {};

// ------------------------------------------------------------- FUNCTIONS

function injectGlasscordClass(){
	// Replacing BrowserWindow with our wrapper class
	const electronPath = require.resolve("electron");
	const newElectron = Object.assign({}, electron, {BrowserWindow}); // Create new electron object

	delete require.cache[electronPath].exports; // Delete exports
	require.cache[electronPath].exports = newElectron; // Assign the exports as the new electron

	if(require.cache[electronPath].exports !== newElectron)
		console.log("Something's wrong! Glasscord can't be injected properly!");
};

function injectFromResources(){
	// Use the app's original info to run it
	const probablePkgs = [
		path.join(electron.app.getAppPath(), "package.original.json"),
		path.join(electron.app.getAppPath(), "..", "app.original", "package.json"),
		path.join(electron.app.getAppPath(), "..", "app.asar", "package.json")
	];
	let pkgDir;
	let basePath;
	for(let _pkgDir of probablePkgs){
		if(!fs.existsSync(_pkgDir)) continue;
		pkgDir = _pkgDir;
		basePath = path.dirname(_pkgDir);
		break;
	}
	if(!pkgDir) throw "There's no package.json to load!";
	const pkg = require(pkgDir);
	//electron.app.setPath("userData", path.join(electron.app.getPath("appData"), pkg.name));
	electron.app.setAppPath(basePath);
	electron.app.name = pkg.name;
	Module._load(path.join(basePath, pkg.main), null, true);
}

function injectGlasscordNodeModule(){
	const oldResolveFilename = Module._resolveFilename;
	Module._resolveFilename = function (request, parentModule, isMain, options) {
		if(request == "glasscord") request = path.resolve(__dirname, "api.js");
		return oldResolveFilename.call(this, request, parentModule, isMain, options);
	}
}
