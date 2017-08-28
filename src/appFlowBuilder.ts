import {
    OntegoBuilder
} from './ontegoBuilder'

import {
    OntegoResource, OntegoResourceHandler
} from './ontegoResources'

export {AppFlowBuilder}

class AppFlowBuilder extends OntegoBuilder {
    build(ontegoResourceHandler: OntegoResourceHandler, workspaceRoot: string, path: string, rawText: string): void {
        var content = JSON.parse(rawText);
        let res: OntegoResource = new OntegoResource(workspaceRoot, path, content);
        ontegoResourceHandler.update(path, res);

        this.buildContent(ontegoResourceHandler, workspaceRoot, res);
    }

    buildContent(ontegoResourceHandler: OntegoResourceHandler, workspaceRoot: string, res: OntegoResource): void {
        let childModules: string[] = super.getChildModules(res.content, "VIEW", "viewFlow");
        //App Modules -> Mviews
        let childModulesStr: string = "";
        if (childModules.length > 0) {
            childModulesStr = ", '" + childModules.join("','") + "'";
        }
        let routeFileContent: string = "";
        routeFileContent += "angular.module('" + res.modulePath + "', ['ngRoute'" + childModulesStr + "]);\n";
        routeFileContent += "angular.module('" + res.modulePath + "', ['ngRoute'" + childModulesStr + "])\n";

        //Route Provider Function
        routeFileContent += ".config([ '$routeProvider', function($routeProvider) {\n";
        let endStartMappings: {[end: string]: string} = {};
        if (res.content.modelElementContainer && res.content.modelElementContainer.children) {
            for (var i = 0; i  < res.content.modelElementContainer.children.length; i++) {
                var child = res.content.modelElementContainer.children[i];
                if (child.connections) {
                    for (var j = 0; j < child.connections.length; j++) {
                        let source: string = child.connections[j].properties.source.value;
                        let target: string = child.connections[j].properties.target.value;
                        let exit: string = "ERROR:UNSPECIFIED";
                        if(child.connections[j].properties.exitPoint) {
                            exit = child.connections[j].properties.exitPoint.value;
                        }
                        let templateUrl: string = "notImplemented.html";
                        let sourceElement = super.getChildByName(res.content, source);
                        let targetElement = super.getChildByName(res.content, target);
                        let uri: string = null;
                        if (sourceElement.modelElementType == "START") {
                            uri = res.name + "______" + sourceElement.properties.name.value;
                        } else {
                            if (sourceElement.properties.viewFlow) {
                                let viewModuleName: string = OntegoResource.getModuleName(sourceElement.properties.viewFlow.filePath);
                                uri = res.name + "___" + viewModuleName + "___" + exit;
                                if (targetElement.modelElementType != "END" && child.connections[j].properties.entryPoint) {
                                    endStartMappings[viewModuleName + "___" + exit] = child.connections[j].properties.entryPoint.value;
                                }
                            }
                        }
                        if (uri) {
                            if (targetElement.modelElementType == "END") {
                                //TODO
                            } else {
                                if (targetElement.properties.viewFlow) {
                                    let targetViewFlowRes: OntegoResource = ontegoResourceHandler.getFromProject(res.workspaceRoot, res.projectName, targetElement.properties.viewFlow.filePath);
                                    let guis: any[] = targetViewFlowRes.getChildren("GUI");
                                    if (guis.length > 0 && guis[0].properties && guis[0].properties.guiFile) {
                                        templateUrl = guis[0].properties.guiFile.filePath + ".html";
                                    }
                                    routeFileContent += "\t$routeProvider.when('/" + uri + "/:startItem', {\n";
                                    routeFileContent += "\t\ttemplateUrl : '" + templateUrl + "',\n";
                                    routeFileContent += "\t\tcontroller : '" + targetViewFlowRes.name + "',\n";
                                    routeFileContent += "\t\tresolve : otg.fore.initResolver\n";
                                    routeFileContent += "\t})\n";
                                    if (guis.length > 0 && guis[0].properties && guis[0].properties.guiFile) {
                                        ontegoResourceHandler.addViewGUIMap(guis[0].properties.guiFile.filePath, targetViewFlowRes.fullFilePath);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        routeFileContent += "}]);\n";
        routeFileContent += "otg.fore.appFlowEndStartMapping['" + res.name + "'] = " + JSON.stringify(endStartMappings) + ";\n";
        routeFileContent += "otg.fore.setCrossMapping = [];\n";
        routeFileContent += "otg.fore.getCrossMapping = [];\n";
        if (res.content.modelElementContainer && res.content.modelElementContainer.children) {
            for (var i = 0; i  < res.content.modelElementContainer.children.length; i++) {
                var child = res.content.modelElementContainer.children[i];
                if (child.modelElementType == "VIEW" && child.properties.viewFlow && child.properties.viewFlow.filePath) {
                    let viewFlowRes: OntegoResource = ontegoResourceHandler.getFromProject(res.workspaceRoot, res.projectName, child.properties.viewFlow.filePath);
                    routeFileContent += "otg.fore.setCrossMapping['" + viewFlowRes.name + "'] = function($rootScope, result) {\n";
                    routeFileContent += "\t$rootScope.otg.data.setItemData('" + res.filePath + "', '" + child.properties.name.value + "', result.result);\n";
                    routeFileContent += "}\n";
                    routeFileContent += "otg.fore.getCrossMapping['" + viewFlowRes.name + "'] = function($rootScope) {\n";
                    let mappingList = super.getMapping(res, child.properties.name.value);
                    for (var j = 0; j  < mappingList.length; j++) {
                        var mapping = mappingList[j];
                        if (mapping.rightColumn.parent) {
                            routeFileContent += "\t\t\t$rootScope.otg.data.set('" + mapping.rightColumn.filePath + "', '" + mapping.rightColumn.modelElementName + "', '" + this.getParentName(mapping.rightColumn) + " - " + mapping.rightColumn.name + "', " + this.buildValue(mapping.leftColumn) + ");\n";
                        }
                        else {
                            routeFileContent += "\t\t\t$rootScope.otg.data.set('" + mapping.rightColumn.filePath + "', '" + mapping.rightColumn.modelElementName + "', '" + mapping.rightColumn.name + "', " + this.buildValue(mapping.leftColumn) + ");\n";
                        }
                    }
                    routeFileContent += "}\n";
                }
            }
        }
        ontegoResourceHandler.writeOuput(false, workspaceRoot, res.projectName, res.name, res.filePath, routeFileContent);
    }
    
}