import {
    OntegoBuilder
} from './ontegoBuilder'

import {
    OntegoResource, OntegoResourceHandler
} from './ontegoResources'

export {ViewControllerBuilder}

class ViewControllerBuilder extends OntegoBuilder {
    build(ontegoResourceHandler: OntegoResourceHandler, workspaceRoot: string, path: string, rawText: string): void {
        var content = JSON.parse(rawText);
        let res: OntegoResource = new OntegoResource(workspaceRoot, path, content);
        ontegoResourceHandler.update(path, res);
        let childModules: string[] = super.getChildModules(content, "SERVICE", "serviceFile");
        //App Modules -> Mviews
        let childModulesStr: string = "";
        let serviceNames: string = "";
        let services: string = "";
        if (childModules.length > 0) {
            childModulesStr = "'" + childModules.join("', '") + "'";
            serviceNames = ", '" + childModules.join("', '") + "'";
            services = ", " + childModules.join(", ");
        }
        let viewControllerContent: string = "angular.module('" + res.modulePath + "', [" + childModulesStr + "]);\n";
        viewControllerContent += "angular.module('" + res.modulePath + "', [" + childModulesStr + "])\n";

        //Route Provider Function
        viewControllerContent += ".controller('" + res.modulePath + "', [ '$scope', '$rootScope', '$routeParams', '$location', '$translate'" + serviceNames + ",\n";
        viewControllerContent += "function($scope, $rootScope, $routeParams, $location, $translate" + services + ") {\n";
        viewControllerContent += "\t$scope.startItem = $routeParams.startItem;\n";
        if (content.modelElementContainer && content.modelElementContainer.children) {
            for (var i = 0; i < content.modelElementContainer.children.length; i++) {
                var child = content.modelElementContainer.children[i];
                switch (child.modelElementType) {
                    case "START":
                        viewControllerContent += this.buildStart(res, child);
                        break;
                    case "END":
                        viewControllerContent += this.buildEnd(res, child);
                        break;
                    case "GUI":
                        viewControllerContent += this.buildGui(res, child, ontegoResourceHandler);
                        break;
                    case "MODIFYVALUE":
                        viewControllerContent += this.buildModifyValue(res, child);
                        break;
                    case "SERVICE":
                        viewControllerContent += this.buildService(res, child);
                        break;
                    case "JS":
                        viewControllerContent += this.buildJavaScript(res, child);
                        break;
                    case "MSGDIALOG":
                        viewControllerContent += this.buildMsgDialog(res, child);
                        break;
                    default:
                        break;
                }
            }
        }
        viewControllerContent += "\t$scope.start1();\n";

        viewControllerContent += "}]);\n";
        ontegoResourceHandler.writeOuput(false, workspaceRoot, res.projectName, res.name, res.filePath, viewControllerContent);
    }

    buildStart(res: OntegoResource, start: any): string {
        let startContent: string = "\t$scope." + start.properties.name.value + " = function() {\n";
        startContent += "\t\t\t\t\totg.fore.getCrossMapping['" + res.name + "']($rootScope);\n";
        if (start.connections) {
            startContent += super.buildConnections(res, start.connections, function(connection) { return JSON.stringify(connection); }, "$scope");
        }
        startContent += "\t};\n";
        return startContent;
    }

    buildEnd(res: OntegoResource, end: any) {
        let endContent: string = "\t$scope." + end.properties.name.value + " = function() {\n";
        endContent += "\t\tvar result = {\n";
        endContent += "\t\t\tresult : {\n";
        if (end.properties.returnValueList && end.properties.returnValueList.children) {
            for (var i = 0; i < end.properties.returnValueList.children.length; i++) {
                let returnData: any = end.properties.returnValueList.children[i].model;
                endContent += "\t\t\t\t'end_point - " + end.properties.name.value + " - " + super.getConsolidatedName(returnData) + "'";
                endContent += ": " + super.buildValue(returnData);
                if (i < (end.properties.returnValueList.children.length - 1)) {
                    endContent += ",";
                }
                endContent += "\n";
            }
        }
        endContent += "\t\t\t},\n";
        endContent += "\t\t\texit: '" + end.properties.name.value + "'\n";
        endContent += "\t\t};\n";
        endContent += "\t\totg.fore.setCrossMapping['" + res.name + "']($rootScope, result);\n";
        endContent += "\t\t$rootScope.otg.route($location, '" + res.name + "', '" + end.properties.name.value + "');\n";
        endContent += "\t};\n";
        return endContent;
    }

    buildGui(res: OntegoResource, gui: any, ontegoResourceHandler: OntegoResourceHandler) {
        // build scope for mapping
        let guiScript: string = "\t$scope." + gui.properties.name.value + " = function() {\n";
        guiScript += "\t\t$scope.uiData = {};\n";
        if (gui.properties.guiFile) {
            let guiResource: OntegoResource = ontegoResourceHandler.getFromProject(res.workspaceRoot, res.projectName, gui.properties.guiFile.filePath);
            let mappingList = this.getMapping(res, gui.properties.name.value);
            guiScript += this.getUiDataScript(guiResource.content.guiRootDiagram, mappingList);
        }
        guiScript += "\t\t$scope.throwEvent = function(ev, guiElement, guiElementEvent, index) {\n";
        guiScript += "\t\t\t\tif (index != null && $scope.uiData[guiElement]) {\n";
        guiScript += "\t\t\t\t\t$scope.uiData[guiElement].selectedIndex = {};\n";
        guiScript += "\t\t\t\t\t$scope.uiData[guiElement].selectedIndex.flowPropertyValueType = \"STRING_MODEL\";\n";
        guiScript += "\t\t\t\t\t$scope.uiData[guiElement].selectedIndex.value = index;\n"
        guiScript += "\t\t\t\t\tif ($scope.uiData[guiElement].data && $scope.uiData[guiElement].data[index]) {\n";
        guiScript += "\t\t\t\t\t\tfor (var key in $scope.uiData[guiElement].data[index]) {\n";
        guiScript += "\t\t\t\t\t\t\t$scope.uiData[key] = $scope.uiData[guiElement].data[index][key]\n";
        guiScript += "\t\t\t\t\t\t}\n";
        guiScript += "\t\t\t\t\t}\n";
        guiScript += "\t\t\t\t}\n";
        let that: ViewControllerBuilder = this;
        if (gui.connections) {
            guiScript += super.buildConnections(res, gui.connections, function(connection) { return JSON.stringify(connection); }, "$scope", null, false, true);
        }
        guiScript += "\t\t};\n";
        guiScript += "\t};\n";
        return guiScript;
    }

    getParentRepeatInfo(gui: any, element: string): any {
        let elementPath: string = this.getElementPath(gui, element, "");
        let repeatableElementInfos: any[] = [];
        this.getElementPaths(gui, ['repeatable', 'listitem'], "", repeatableElementInfos);
        for (var i=0; i<repeatableElementInfos.length; i++) {
            if (elementPath.startsWith(repeatableElementInfos[i].path)) {
                return {
                    repeatName: repeatableElementInfos[i].name
                };
            }
        } 
        return null;
    }

    getElementPath(guiElement: any, element: string, path: string): string {
        path = path + " - " + guiElement.properties.name;
        if (guiElement.properties.name == element) {
            return path;
        }
        if (guiElement.children) {
            for (var i=0; i<guiElement.children.length; i++) {
                let child = guiElement.children[i];
                let childPath = this.getElementPath(child, element, path);
                if (childPath) {
                    return childPath;
                }
            }
        }
    }

    getElementPaths(guiElement: any, types: string[], path: string, repeatableElementInfos: any[]) {
        path = path + " - " + guiElement.properties.name;
        if (types.indexOf(guiElement.type) > -1) {
            repeatableElementInfos.push({
                name: guiElement.properties.name,
                path: path
            });
        }
        if (guiElement.children) {
            for (var i=0; i<guiElement.children.length; i++) {
                let child = guiElement.children[i];
                this.getElementPaths(child, types, path, repeatableElementInfos);
            }
        }
    }

    // getUiSaveData(flowRes: OntegoResource, guiElement: any, parent: any): string {
    //     let saveDataContent: string = "";
    //     if (parent.children) {
    //         for (var i=0; i<parent.children.length; i++) {
    //             var child = parent.children[i];
    //             if (child.properties) {
    //                 if (child.type == "input") {
    //                     saveDataContent += "\t\t\t\t\t$rootScope.otg.data.set('" + flowRes.filePath + "', '" + guiElement.value + "', '" + child.properties.name.value + ".value', $scope.uiData." + child.properties.name.value + ".value);\n";
    //                 }
    //             }
    //             saveDataContent += this.getUiSaveData(flowRes, guiElement, child);
    //         }
    //     }
    //     return saveDataContent;
    // }

    getRepeatUiDataScript(parent: any, repeatParent: any) {
        let uiDataScript: string = "";
        for (var k = 0; k < parent.children.length; k++) {
            var innerChild = parent.children[k];
            uiDataScript += "\t\t\t\tif (!$scope.uiData." + repeatParent.properties.name.value + ".data[i]." + innerChild.properties.name.value + ") {\n";
            uiDataScript += "\t\t\t\t\t$scope.uiData." + repeatParent.properties.name.value + ".data[i]." + innerChild.properties.name.value + " = " + JSON.stringify(innerChild.properties) + ";\n";
            uiDataScript += "\t\t\t\t}\n";
            uiDataScript += this.getRepeatUiDataScript(innerChild, repeatParent);
        }
        return uiDataScript;
    }

    getUiDataScript(parent: any, mappingList: any[], parentRepeatElement?: any) {
        let uiDataScript: string = "";
        if (parent.children) {
            for (var i = 0; i < parent.children.length; i++) {
                var child = parent.children[i];
                if (child.properties) {
                    if (parent.type != "listitem" && !parentRepeatElement) {
                        uiDataScript += "\t\t$scope.uiData." + child.properties.name.value + " = " + JSON.stringify(child.properties) + "\n";
                        if (child.type == "listitem") {
                            uiDataScript += "\t\tif (!$scope.uiData." + child.properties.name.value + ".data) {\n";
                            uiDataScript += "\t\t\t$scope.uiData." + child.properties.name.value + ".data = [];\n";
                            uiDataScript += "\t\t}\n";
                        }
                    }
                    for (var j = 0; j < mappingList.length; j++) {
                        var mapping = mappingList[j];
                        if (mapping.rightColumn.parent.name == child.properties.name.value) {
                            if (parent.type == "listitem") {
                                uiDataScript += "\t\tif (Object.prototype.toString.call(" + super.buildValue(mapping.leftColumn) + ") === '[object Array]') {\n";
                                uiDataScript += "\t\t\tvar mappingArray = " + super.buildValue(mapping.leftColumn) + ";\n";
                                uiDataScript += "\t\t\tfor (var i = 0; i < mappingArray.length; i++) {\n";
                                uiDataScript += "\t\t\t\tif (!$scope.uiData." + parent.properties.name.value + ".data[i]) {\n";
                                uiDataScript += "\t\t\t\t\t$scope.uiData." + parent.properties.name.value + ".data.push({});\n";
                                uiDataScript += "\t\t\t\t}\n";
                                uiDataScript += this.getRepeatUiDataScript(parent, parent);
                                uiDataScript += "\t\t\t\t$scope.uiData." + parent.properties.name.value + ".data[i]." + child.properties.name.value + "." + mapping.rightColumn.name + ".value = mappingArray[i];\n";
                                uiDataScript += "\t\t\t}\n";
                                uiDataScript += "\t\t}\n";
                            }
                            else if (parentRepeatElement) {
                                uiDataScript += "\t\tif (Object.prototype.toString.call(" + super.buildValue(mapping.leftColumn) + ") === '[object Array]') {\n";
                                uiDataScript += "\t\t\tvar mappingArray = " + super.buildValue(mapping.leftColumn) + ";\n";
                                uiDataScript += "\t\t\tfor (var i = 0; i < mappingArray.length; i++) {\n";
                                uiDataScript += "\t\t\t\tif (!$scope.uiData." + parentRepeatElement.properties.name.value + ".data[i]) {\n";
                                uiDataScript += "\t\t\t\t\t$scope.uiData." + parentRepeatElement.properties.name.value + ".data.push({});\n";
                                uiDataScript += "\t\t\t\t}\n";
                                uiDataScript += this.getRepeatUiDataScript(parentRepeatElement, parentRepeatElement);
                                uiDataScript += "\t\t\t\t$scope.uiData." + parentRepeatElement.properties.name.value + ".data[i]." + child.properties.name.value + "." + mapping.rightColumn.name + ".value = mappingArray[i];\n";
                                uiDataScript += "\t\t\t}\n";
                                uiDataScript += "\t\t}\n";
                            }
                            else {
                                if (child.properties[mapping.rightColumn.name] && (child.properties[mapping.rightColumn.name].value || child.properties[mapping.rightColumn.name].value == "")) {
                                    uiDataScript += "\t\t$scope.uiData." + child.properties.name.value + "." + mapping.rightColumn.name + ".value = " + super.buildValue(mapping.leftColumn) + "\n";
                                }
                            }
                        }
                    }
                }
                if (parent.type == "listitem") {
                    uiDataScript += this.getUiDataScript(child, mappingList, parent);
                }
                else if (parentRepeatElement) {
                    uiDataScript += this.getUiDataScript(child, mappingList, parentRepeatElement);
                }
                else {
                    uiDataScript += this.getUiDataScript(child, mappingList);
                }
            }
        }
        return uiDataScript;
    }

    buildModifyValue(res: OntegoResource, modifyValue: any) {
        // route
        let modifyValueContent: string = "\t$scope." + modifyValue.properties.name.value + " = function() {\n";
        modifyValueContent += super.buildModifyValueContent(res, modifyValue);
        if (modifyValue.connections) {
            modifyValueContent += super.buildConnections(res, modifyValue.connections, function(connection) { return JSON.stringify(connection); }, "$scope");
        }
        modifyValueContent += "\t};\n";
        return modifyValueContent;
    }

    buildService(res: OntegoResource, service: any) {
        let serviceContent: string = "\t$scope." + service.properties.name.value + " = function(conn) {\n";
        serviceContent += super.buildServiceContent(res, service, "$rootScope.otg.showError", function(connection) { return JSON.stringify(connection); }, "$scope");
        serviceContent += "\t};\n";
        return serviceContent;
    }

    buildJavaScript(res: OntegoResource, javaScript: any) {
        let javaScriptContent: string = "\t$scope." + javaScript.properties.name.value + " = function(conn) {\n";
        javaScriptContent += super.buildJavaScriptContent(res, javaScript, "$rootScope.otg.showError", function(connection) { return JSON.stringify(connection); }, "$scope");
        javaScriptContent += "\t};\n";
        return javaScriptContent;
    }

    buildMsgDialog(res: OntegoResource, msgDialog: any) {
        let msgDialogContent: string = "\t$scope." + msgDialog.properties.name.value + " = function(conn) {\n";
        let message: string = "";
		if (msgDialog.properties.message && msgDialog.properties.message.value) {
            message = msgDialog.properties.message.value;
            let mappingList = this.getMapping(res, msgDialog.properties.name.value);
            let wordArray = message.split(" ");
            for (var i = 0; i < wordArray.length; i++) {
                let word: string = wordArray[i];
                if (word.charAt(0) == '$') {
                    for (var j = 0; j < mappingList.length; j++) {
                        var mapping = mappingList[j];
                        if (mapping.rightColumn.name == word.substring(1)) {
                            message = message.replace(word, "' + " + this.buildValue(mapping.leftColumn) + " + '");
                        }
                    }
                }
            }
		}
        msgDialogContent += "\t\t$rootScope.otg.showMessage('" + msgDialog.properties.type.value + "', '" + msgDialog.properties.title.value + "', '" + message + "', '" + msgDialog.properties.buttons.value + "').then(function() {\n";
        if (msgDialog.connections) {
            msgDialogContent += super.buildConnections(res, msgDialog.connections, function(connection) { return JSON.stringify(connection); }, "$scope");
        }
        msgDialogContent += "\t\t});\n";
        msgDialogContent += "\t};\n";
        return msgDialogContent;
    }
}