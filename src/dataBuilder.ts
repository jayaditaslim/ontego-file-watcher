declare function require(path: string): any;
var jaydata_dynamic_metadata_1 = require("jaydata-dynamic-metadata");
var js_beautify = require("js-beautify");

import {} from "js-beautify";

import {
    OntegoBuilder
} from './ontegoBuilder'

import {
    OntegoResource, OntegoResourceHandler
} from './ontegoResources'

export {DataBuilder}

class DataBuilder extends OntegoBuilder {
    build(ontegoResourceHandler: OntegoResourceHandler, workspaceRoot: string, path: string, rawText: string): void {
        
        let res: OntegoResource = new OntegoResource(workspaceRoot, path, "{}");
        var $metadata = rawText;
        var namespace = rawText.split("Namespace=")[1].split("\"")[1];

        var process = function (factory) {
            var src = js_beautify(factory.src);
            if (src.length > 0) {
                src = src.replace(/"elementType": "(.*)"/g, '"elementType": "' + namespace + '.$1"');
                ontegoResourceHandler.writeOuput(false, workspaceRoot, res.projectName, res.name, res.filePath, src.toString());
            }
        };

        process(new jaydata_dynamic_metadata_1.MetadataHandler({}, {
            debug: true,
            autoCreateContext: undefined,
            namespace: namespace,
            contextName: ('JayDataContext.d.ts').split('.')[0],
            baseType: "$data.Entity",
            entitySetType: "$data.EntitySet",
            contextType: "$data.EntityContext",
            collectionBaseType: "ODataDemo",
            generateTypes: false
        }).parse($metadata));
    }
}