// Copyright (c) 2015 Rogier Schouten <github@workingcode.ninja>
// License: ISC

"use strict";

const colors = require("ansi-colors");
const es = require("event-stream");
const log = require("fancy-log");
const PluginError = require("plugin-error");
const typedocModule = require("typedoc");
const semver = require("semver");

const PLUGIN_NAME = "gulp-typedoc";

function typedoc(options) {
	const files = [];
	const opts = { ...options };

	return es.through(function(file) {
		files.push(file.path);
	}, async function() {
		// end of stream, start typedoc
		const stream = this;

		if (files.length === 0) {
			stream.emit("end");
			return;
		} else if (!opts.out && !opts.json) {
			stream.emit("error", new PluginError(PLUGIN_NAME, "You must either specify the 'out' or 'json' option."));
			stream.emit("end");
			return;
		} else {
			const out = opts.out;
			const json = opts.json;
			const version = opts.version;

			// typedoc instance
			let app;
			if (opts.plugin) {
				app = await typedocModule.Application.bootstrapWithPlugins({ ...opts, entryPoints: files });
			} else {
				app = await typedocModule.Application.bootstrap({ ...opts, entryPoints: files });
			}
			if (semver.gte(typedocModule.Application.VERSION, '0.25.0')) {
				app.options.addReader(new typedocModule.TSConfigReader());
				app.options.addReader(new typedocModule.TypeDocReader());
			}

			if (version && opts.logLevel !== "None") {
				log(app.toString());
			}
			try {
				// Specify the entry points to be documented by TypeDoc.
				const project = await app.convert();
				if (project) {
					if (out) await app.generateDocs(project, out);  // TODO promisified!!
					if (json) await app.generateJson(project, json); // TODO promisified!!
					if (app.logger.hasErrors()) {
						stream.emit("error", new PluginError(PLUGIN_NAME, "There were errors generating TypeDoc output, see above."));
						stream.emit("end");
						return;
					}
				} else {
					stream.emit("error", new PluginError(PLUGIN_NAME, "Failed to generate load TypeDoc project."));
					stream.emit("end");
					return;
				}
				stream.emit("end");
				return;
			} catch (e) {
				stream.emit("error", e);
				stream.emit("end");
				return;
			}
		}
	});
}

module.exports = typedoc;
