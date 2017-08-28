import {
    OntegoResource, OntegoResourceHandler
} from './ontegoResources'

export { OntegoBuilder, OntegoResource }

abstract class OntegoBuilder {
    abstract build(ontegoResoureHandler: OntegoResourceHandler, workspaceRoot: string, path: string, rawText: string): void;

    getChildModules(content, itemType: string, property: string): string[] {
        let childModules: string[] = [];
        if (content.modelElementContainer && content.modelElementContainer.children) {
            for (var i = 0; i < content.modelElementContainer.children.length; i++) {
                var child = content.modelElementContainer.children[i];
                if (child.properties && child.modelElementType == itemType && child.properties[property]) {
                    childModules.push(OntegoResource.getModuleName(child.properties[property].filePath));
                }
            }
        }
        return childModules;
    }

    getChildFilePaths(content, itemType: string, property: string): string[] {
        let childModules: string[] = [];
        if (content.flowRootDiagram && content.flowRootDiagram.children) {
            for (var i=0; i<content.flowRootDiagram.children.length; i++) {
                var child = content.flowRootDiagram.children[i];
                if (child.properties && child.type == itemType && child.properties[property]) {
                    childModules.push(child.properties[property]);
                }
            }
        }
        return childModules;
    }

    buildIncludeChildJs(content, itemType: string, property: string, moduleName: string): string {
        let includeChildJs: string = "";
        let childFiles: string[] = this.getChildFilePaths(content, itemType, property);
        let lastCallback: string = "init_" + moduleName;
        for (var i=0; i<childFiles.length; i++) {
            if (i < childFiles.length - 1) {
                includeChildJs += "function callback_" + moduleName + "_" + OntegoResource.getModuleName(childFiles[i]) + "() {\n";
            }
            includeChildJs += "    if (!window.includeScripts) includeScripts = {};\n";
            includeChildJs += "    if (!includeScripts['" + childFiles[i] + ".js']) {\n";
            includeChildJs += "        includeScripts['" + childFiles[i] + ".js'] = true;\n";
            includeChildJs += "        $.getScript('" + childFiles[i] + ".js', " + lastCallback + ");\n";
            includeChildJs += "    } else {\n";
            includeChildJs += "        " + lastCallback + "();\n";
            includeChildJs += "    }\n";
            if (i < childFiles.length - 1) {
                includeChildJs += "}\n";
            }
            lastCallback = "callback_" + moduleName + "_" + OntegoResource.getModuleName(childFiles[i]);
        }
        return includeChildJs;
    }

    getChildByName(content:any, name: string):any {
         if (content.modelElementContainer && content.modelElementContainer.children) {
            for (var i = 0; i < content.modelElementContainer.children.length; i++) {
                var child = content.modelElementContainer.children[i];
                if (child.properties && child.properties.name.value == name) {
                    return child;
                }
            }
        }
        return null;
    }

    buildConnections(res: OntegoResource, connections: any[], connectionData, context: string, saveValues?: Function, exitCheck?: boolean, avoidDefaultConnection?: boolean): string {
        let connectionsScript: string = "";
        let defaultConnection: any = null;

        let foundTrigger: boolean = false;
        let first: boolean = true;
        for (var i = 0; i < connections.length; i++) {
            if ((connections[i].properties.condition && connections[i].properties.condition.children && connections[i].properties.condition.children.length > 0) || connections[i].properties.exitPoint) {
                if (!first) {
                    connectionsScript += "\t\t\t\t} else ";
                }
                first = false;
                connectionsScript += "\t\t\t\tif (";
                if (connections[i].properties.condition && connections[i].properties.condition.children && connections[i].properties.condition.children.length > 0) {
                    connectionsScript += "(" + this.buildTrigger(res, connections[i].properties.condition.children) + ")";
                    if (exitCheck) {
                        connectionsScript += " && ";
                    }
                }
                if (exitCheck) {
                    connectionsScript += "result.exit == '" + connections[i].properties.exitPoint.value + "'";
                }
                connectionsScript += ") {\n";
                if (saveValues) {
                    connectionsScript += saveValues();
                }
                connectionsScript += "\t\t\t\t\t" + context + "." + connections[i].properties.target.value + "(" + connectionData(connections[i]) + ((connectionData(connections[i]) == "deferred" && connectionData(connections[i], true) != "deferred") ? ", " + connectionData(connections[i], true) : "") + ");\n";
                foundTrigger = true;
            } else {
                if (defaultConnection) {
                    connectionsScript += "\t\t\t\tconsole.error('Error more than one default connection');\n";
                } else {
                    defaultConnection = connections[i];
                }
            }
        }

        if (defaultConnection && !avoidDefaultConnection) {
            if (foundTrigger) {
                connectionsScript += "\t\t\t\t} else {\n";
            }
            connectionsScript += "\t\t\t\t\t" + context + "." + defaultConnection.properties.target.value + "(" + connectionData(defaultConnection) + ((connectionData(defaultConnection) == "deferred" && connectionData(defaultConnection, true) != "deferred") ? ", " + connectionData(defaultConnection, true) : "") + ");\n";
        }
        if (foundTrigger) {
            connectionsScript += "\t\t\t\t}\n";
        }
        return connectionsScript;
    }

    buildTrigger(res: OntegoResource, conditionList: any[]): string {
        let triggerScript: string = "";
        if (conditionList && conditionList.length > 0) {
            for (var i = 0; i < conditionList.length; i++) {
                let condition: any = conditionList[i];
                if (condition.conjunction) {
                    if (condition.conjunction == "AND") {
                        triggerScript += " && ";
                    }
                    else if (condition.conjunction == "OR") {
                        triggerScript += " || ";
                    }
                }
                if (condition.conditionType == "UI_EVENT" && condition.leftColumn && condition.rightColumn) {
                    let elementPath: string = condition.leftColumn.elementPath;
                    if (elementPath) {
                        let element: string = elementPath.split(" - ")[elementPath.split(" - ").length - 1];
                        let elementEvent: string = condition.rightColumn.uiEventType.toLowerCase();
                        triggerScript += "(guiElement == '" + element + "' && guiElementEvent == '" + elementEvent + "')";
                    }
                } else if (condition.conditionType == "BASE" && condition.leftColumn && condition.rightColumn) {
                    triggerScript += "(";
                    triggerScript += "(" + this.buildValue(condition.leftColumn) + "+'')";
                    triggerScript += " " + this.convertOperator(condition.conditionOperator) + " ";
                    triggerScript += "(" + this.buildValue(condition.rightColumn) + "+'')";
                    if (condition.children && condition.children.length > 0) {
                        triggerScript += this.buildTrigger(res, condition.children);
                    }
                    triggerScript += ")";
                }
            }
        }
        if (triggerScript.length == 0) {
            triggerScript = "false";
        }
        /*if (trigger.type == 'value') {
            let quotes: string = "'";
            if (trigger.operator == ">" || trigger.operator == "<") {
                quotes == "";
            }
            triggerScript += "($rootScope.otg.data.get('" + trigger.flow + "', '" + trigger.item + "', '" + trigger.property + "') " + trigger.operator + " " + quotes + trigger.value + quotes + ")";
        } else if (trigger.type == 'field') {
            triggerScript += "($rootScope.otg.data.get('" + trigger.flow + "', '" + trigger.item + "', '" + trigger.property + "') " + trigger.operator + " $rootScope.otg.data.get('" + trigger.valueFlow + "', '" + trigger.valueItem + "', '" + trigger.valueProperty + "'))";
        } else if (trigger.type == 'element') {
            triggerScript += "(guiElement == '" + trigger.element + "' && guiElementEvent == '" + trigger.elementEvent + "')";
        } else if (trigger.type == 'or') {
            triggerScript += " || ";
        } else if (trigger.type == 'and') {
            triggerScript += " && ";
        } else if (trigger.type == 'bracket_open') {
            triggerScript += "(";
        } else if (trigger.type == 'bracket_close') {
            triggerScript += ")";
        }*/
        return triggerScript;
    }

    convertOperator(operator: string): string {
        switch (operator) {
            case "=": return "==";
            case "≠": return "!=";
            case "≥": return ">="; 
            case "≤": return "<=";
            case "<": return "<";
            case ">": return ">";
        }
        return operator;
    }

    getMapping(res: OntegoResource, modelElementName: string): any[] {
        var mappingList = [];
        if (res.content && res.content.modelElementContainer && res.content.modelElementContainer.children) {
            for (var i = 0; i < res.content.modelElementContainer.children.length; i++) {
                let child = res.content.modelElementContainer.children[i];
                if (child.connections) {
                    for (var j = 0; j < child.connections.length; j++) {
                        let connection = child.connections[j];
                        if ((connection.properties.target.value == modelElementName) && connection.properties.dataMappingList && connection.properties.dataMappingList.children) {
                            for (var k = 0; k < connection.properties.dataMappingList.children.length; k++) {
                                var mapping = connection.properties.dataMappingList.children[k];
                                mappingList.push(mapping);
                            }
                        }
                    }
                }
            }
        }
        return mappingList;
    }

    buildMappingFrom(res: OntegoResource, mapping): string {
        let mappingScript: string = "";
        if (mapping.leftColumn.flowPropertyValueType == "STRING_MODEL") {
            mappingScript += "'" + mapping.leftColumn.value + "'";
        } else if (mapping.leftColumn.flowPropertyValueType == "OUTPUT_MODEL") {
            mappingScript += "$rootScope.otg.data.get('" + mapping.leftColumn.filePath + "', '" + mapping.leftColumn.modelElementName + "', '" + mapping.leftColumn.name + "')";
        }
        return mappingScript;
    }

    buildValue(selectedData, consolidatedName?:boolean): string {
        let valueScript: string = "";
        if (selectedData.flowPropertyValueType == "STRING_MODEL") {
            valueScript += "'" + selectedData.value + "'";
        } else if (selectedData.flowPropertyValueType == "PROPERTY_MODEL") {
            valueScript += "$rootScope.otg.data.get('" + selectedData.filePath + "', '" + selectedData.modelElementName + "', '" + selectedData.propertyDescriptorId + "')";
        } else if (selectedData.flowPropertyValueType == "OUTPUT_MODEL") {
            let rootParent: any = null;
            if (selectedData.parent) {
                rootParent = selectedData.parent;
                while (rootParent.parent) {
                    rootParent = rootParent.parent;
                }
            }
            if (rootParent != null && rootParent.name == "gui_element") {
                if (consolidatedName) {
                    valueScript += "uiData - " + selectedData.parent.name + " - " + selectedData.name + " - value";
                }
                else {
                    valueScript += "$scope.uiData." + selectedData.parent.name + "." + selectedData.name + ".value";
                }
            }
            else {
                if (consolidatedName) {
                    valueScript += selectedData.filePath + " - " + selectedData.modelElementName + " - " + this.getParentName(selectedData) + " - " + selectedData.name;
                }
                else {
                    valueScript += "$rootScope.otg.data.get('" + selectedData.filePath + "', '" + selectedData.modelElementName + "', '" + this.getParentName(selectedData) + " - " + selectedData.name + "')";
                }
            }
        }
        return valueScript;
    }

    buildModifyValueContent(res: OntegoResource, modifyValue): string {
        let modifyValueScript: string = "";
        if (modifyValue.properties.modifyValueList && modifyValue.properties.modifyValueList.children) {
            for (var i = 0; i < modifyValue.properties.modifyValueList.children.length; i++) {
                var valueEntry = modifyValue.properties.modifyValueList.children[i];
                modifyValueScript += "\t\t\t$rootScope.otg.data.set('" + valueEntry.leftColumn.filePath + "', '" + valueEntry.leftColumn.modelElementName + "', '" + valueEntry.leftColumn.propertyDescriptorId + "', ";
                if (valueEntry.rightColumn.flowPropertyValueType == "STRING_MODEL") {
                    //TODO clear data
                    modifyValueScript += "'" + valueEntry.rightColumn.value + "'";
                } else if (valueEntry.rightColumn.flowPropertyValueType == "OUTPUT_MODEL") {
                    modifyValueScript += "$rootScope.otg.data.get('" + valueEntry.rightColumn.filePath + "', '" + valueEntry.rightColumn.modelElementName + "', '" + valueEntry.rightColumn.propertyDescriptorId + "')";
                }
                modifyValueScript += ");\n";
            }
        }
        return modifyValueScript;
    }

    buildServiceContent(res: OntegoResource, service, errorHandler: string, connectionData, context: string): string {
        let serviceContent: string = "";
        let mappingList = this.getMapping(res, service.properties.name.value);
        for (var i = 0; i < mappingList.length; i++) {
            var mapping = mappingList[i];
            if (mapping.rightColumn.parent) {
                serviceContent += "\t\t\t$rootScope.otg.data.set('" + mapping.rightColumn.filePath + "', '" + mapping.rightColumn.modelElementName + "', '" + this.getParentName(mapping.rightColumn) + " - " + mapping.rightColumn.name + "', " + this.buildValue(mapping.leftColumn) + ");\n";
            }
            else {
                serviceContent += "\t\t\t$rootScope.otg.data.set('" + mapping.rightColumn.filePath + "', '" + mapping.rightColumn.modelElementName + "', '" + mapping.rightColumn.name + "', " + this.buildValue(mapping.leftColumn) + ");\n";
            }
        }
        if (service.properties.serviceFile) {
            serviceContent += "\t\t\t" + OntegoResource.getModuleName(service.properties.serviceFile.filePath) + "[conn.properties.entryPoint.value]().then(function(result){\n";
            serviceContent += "\t\t\t\t$rootScope.otg.data.setItemData('" + res.filePath + "', '" + service.properties.name.value + "', result.result);\n";
            if (service.connections) {
                serviceContent += this.buildConnections(res, service.connections, connectionData, context, null, true);
            }
            serviceContent += "\t\t\t}, " + errorHandler + ");\n";
        } else {
            if (service.connections) {
                serviceContent += this.buildConnections(res, service.connections, connectionData, context);
            }
        }
        return serviceContent;
    }

    buildJavaScriptContent(res: OntegoResource, javaScript: any, errorHandler: string, connectionData, context: string) {
        let javaScriptContent: string = "";
        if (javaScript.properties.javaScriptFunction && javaScript.properties.javaScriptFunction.functionHeader) {
            javaScriptContent += "\t\t\tvar result = " + javaScript.properties.javaScriptFunction.functionHeader.substring(0, javaScript.properties.javaScriptFunction.functionHeader.indexOf("(")) + "(";
            let mappingList = this.getMapping(res, javaScript.properties.name.value);
            if (javaScript.properties.javaScriptFunction && javaScript.properties.javaScriptFunction.functionHeader) {
                let functionHeader: string = javaScript.properties.javaScriptFunction.functionHeader;
                let inputParameters: string = functionHeader.substring(functionHeader.indexOf("(") + 1, functionHeader.indexOf(")"));
                var inputParametersArray = inputParameters.split(",");
                for (var i = 0; i < inputParametersArray.length; i++) {
                    let trimmedParameter: string = inputParametersArray[i].trim();
                    if (trimmedParameter.length > 0) {
                        if (i > 0) {
                            javaScriptContent += ", ";
                        }
                        let hasMapping: boolean = false;
                        for (var j = 0; j < mappingList.length; j++) {
                            var mapping = mappingList[j];
                            if (mapping.rightColumn.name == trimmedParameter) {
                                hasMapping = true;
                                javaScriptContent += this.buildValue(mapping.leftColumn);
                            }
                        }
                        if (!hasMapping) {
                            javaScriptContent += "null";
                        }
                    }
                }
            }
            javaScriptContent += ");\n";
        }
        javaScriptContent += "\t\t\tif (result.then) {\n";
        javaScriptContent += "\t\t\t\tresult.then(function (result) {\n";
        let resultContent: string = "";
        resultContent += this.buildJsResultContent(res, javaScript);
        
        if (javaScript.connections) {
            resultContent += this.buildConnections(res, javaScript.connections, connectionData, context);
        }
        javaScriptContent += resultContent;
        javaScriptContent += "\t\t\t\t}, " + errorHandler + ");\n";
        javaScriptContent += "\t\t\t} else {\n";
        javaScriptContent += resultContent;
        javaScriptContent += "\t\t\t}\n";
        return javaScriptContent;
    }

    buildJsResultContent(res: OntegoResource, javaScript: any): string {
        let resultContent: string = "";
        if (javaScript.properties.javaScriptFunction && javaScript.properties.javaScriptFunction.children) {
            // TODO recursive
            let dataStructureList: any = javaScript.properties.javaScriptFunction.children;
            for (var i = 0; i < dataStructureList.length; i++) {
                resultContent += "\t\t\t\t\t$rootScope.otg.data.set('" + res.filePath + "', '" + javaScript.properties.name.value + "', 'output_parameter - " + dataStructureList[i].name + "', result);\n";
            }
        }
        return resultContent;
    }

    getConsolidatedName(outputModel: any): string {
        if (outputModel.parent) {
            return outputModel.modelElementName + " - " + this.getParentName(outputModel) + " - " + outputModel.name;
        }
        else {
            return outputModel.modelElementName + " - " + outputModel.name;
        }
    }

    getParentName(outputModel: any): string {
        let tempParent: any = outputModel.parent;
        let parentName: string = tempParent.name;
        while (tempParent.parent) {
            tempParent = tempParent.parent;
            parentName = tempParent.name + " - " + parentName;
        }
        return parentName;
    }
}