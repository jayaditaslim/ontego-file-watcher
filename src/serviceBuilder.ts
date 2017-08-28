import {
    OntegoBuilder
} from './ontegoBuilder'

import {
    OntegoResource, OntegoResourceHandler
} from './ontegoResources'

export {ServiceBuilder}

class ServiceBuilder extends OntegoBuilder {
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
        let serviceContent: string = "otg.fore.tempdata['" + res.modulePath + "'] = {};\n";
        serviceContent += "angular.module('" + res.modulePath + "', [" + childModulesStr + "]);\n";
        serviceContent += "angular.module('" + res.modulePath + "', [" + childModulesStr + "])\n";

        //Route Provider Function
        serviceContent += ".factory('" + res.modulePath + "', [ '$q', '$rootScope'" + serviceNames + ",\n";
        serviceContent += "function($q, $rootScope" + services + ") {\n";
        serviceContent += "\treturn {\n";
        if (content.modelElementContainer && content.modelElementContainer.children) {
            for (var i = 0; i < content.modelElementContainer.children.length; i++) {
                var child = content.modelElementContainer.children[i];
                switch (child.modelElementType) {
                    case "START":
                        serviceContent += this.buildStart(res, child, i == 0);
                        break;
                    case "END":
                        serviceContent += this.buildEnd(res, child, i == 0);
                        break;
                    case "MODIFYVALUE":
                        serviceContent += this.buildModifyValue(res, child, i == 0);
                        break;
                    case "SERVICE":
                        serviceContent += this.buildService(res, child, i == 0);
                        break;
                    case "JS":
                        serviceContent += this.buildJavaScript(res, child, i == 0);
                        break;
                    case "ACTION":
                        serviceContent += this.buildAction(res, child, i == 0);
                        break;
                }
            }
        }
        serviceContent += "\t};\n";
        serviceContent += "}]);\n";

        ontegoResourceHandler.writeOuput(false, workspaceRoot, res.projectName, res.name, res.filePath, serviceContent);
    }

    buildStart(res: OntegoResource, start: any, firstElement: boolean): string {
        // TODO write default values
        let startContent: string = "\t\t" + (!firstElement ? ", " : "") + start.properties.name.value + " : function() {\n";
        startContent += "\t\t\tvar deferred = $q.defer();\n";
        startContent += "\t\t\tvar that = this;\n";
        if (start.connections) {
            startContent += super.buildConnections(res, start.connections, function(connection, getConnection?: boolean) { return ((getConnection) ? JSON.stringify(connection) : "deferred"); }, "that");
        }
        startContent += "\t\t\treturn deferred.promise;\n";
        startContent += "\t\t}\n";
        return startContent;
    }

    buildEnd(res: OntegoResource, end: any, firstElement: boolean) {
        let endContent: string = "\t\t" + (!firstElement ? ", " : "") + end.properties.name.value + " : function(deferred) {\n";
        endContent += "\t\t\tvar result = {\n";
        endContent += "\t\t\t\tresult : {\n";
        if (end.properties.returnValueList && end.properties.returnValueList.children) {
            for (var i = 0; i < end.properties.returnValueList.children.length; i++) {
                let returnData: any = end.properties.returnValueList.children[i].model;
                endContent += "\t\t\t\t\t'end_point - " + end.properties.name.value + " - " + super.getConsolidatedName(returnData) + "'";
                endContent += ": " + super.buildValue(returnData);
                if (i < (end.properties.returnValueList.children.length - 1)) {
                    endContent += ",";
                }
                endContent += "\n";
            }
        }
        endContent += "\t\t\t\t},\n";
        endContent += "\t\t\t\texit: '" + end.properties.name.value + "'\n";
        endContent += "\t\t\t};\n";
        endContent += "\t\t\t$rootScope.otg.data.clear('" + res.filePath + "');\n";
        endContent += "\t\t\totg.fore.tempdata['" + res.filePath + "'] = {};\n";
        endContent += "\t\t\tdeferred.resolve(result);\n";
        endContent += "\t\t}\n";
        return endContent;
    }

    buildModifyValue(res: OntegoResource, modifyValue: any, firstElement: boolean) {
        // route
        let modifyValueContent: string = "\t\t" + (!firstElement ? ", " : "") + modifyValue.properties.name.value + " : function(deferred, conn) {\n";
        modifyValueContent += "\t\t\tvar that = this;\n";
        modifyValueContent += super.buildModifyValueContent(res, modifyValue);
        if (modifyValue.connections) {
            modifyValueContent += super.buildConnections(res, modifyValue.connections, function(connection, getConnection?: boolean) { return ((getConnection) ? JSON.stringify(connection) : "deferred"); }, "that");
        }
        modifyValueContent += "\t\t}\n";
        return modifyValueContent;
    }

    buildService(res: OntegoResource, service: any, firstElement: boolean) {
        // route
        let serviceContent: string = "\t\t" + (!firstElement ? ", " : "") + service.properties.name.value + " : function(deferred, conn) {\n";
        serviceContent += "\t\t\tvar that = this;\n";
        serviceContent += super.buildServiceContent(res, service, "deferred.reject", function(connection, getConnection?: boolean) { return ((getConnection) ? JSON.stringify(connection) : "deferred"); }, "that");
        serviceContent += "\t\t}\n";
        return serviceContent;
    }

    buildJavaScript(res: OntegoResource, javaScript: any, firstElement: boolean) {
        let javaScriptContent: string = "\t\t" + (!firstElement ? ", " : "") + javaScript.properties.name.value + " : function(deferred, conn) {\n";
        javaScriptContent += "\t\t\tvar that = this;\n";
        javaScriptContent += super.buildJavaScriptContent(res, javaScript, "deferred.reject", function(connection, getConnection?: boolean) { return ((getConnection) ? JSON.stringify(connection) : "deferred"); }, "that");
        javaScriptContent += "\t\t}\n";
        return javaScriptContent;
    }

    buildAction(res: OntegoResource, action: any, firstElement: boolean) {
        let actionContent: string = "\t\t" + (!firstElement ? ", " : "") + action.properties.name.value + " : function(deferred, conn) {\n";
        actionContent += "\t\t\tvar that = this;\n";
        if (action.properties.action) {
            switch (action.properties.action.flowPropertyValueType) {
                case "SELECT_QUERY_ACTION":
                    actionContent += this.buildActionSelectQuery(res, action);
                    break;
                case "INSERT_QUERY_ACTION":
                    actionContent += this.buildActionInsertQuery(res, action);
                    break;
                case "DELETE_QUERY_ACTION":
                    actionContent += this.buildActionDeleteQuery(res, action);
                    break;
                case "UPDATE_QUERY_ACTION":
                    actionContent += this.buildActionUpdateQuery(res, action);
                    break;
                default:
                    if (action.connections) {
                        actionContent += super.buildConnections(res, action.connections, function(connection, getConnection?: boolean) { return ((getConnection) ? JSON.stringify(connection) : "deferred"); }, "that");
                    }
                    break;
            }            
        } else {
            if (action.connections) {
                actionContent += super.buildConnections(res, action.connections, function(connection, getConnection?: boolean) { return ((getConnection) ? JSON.stringify(connection) : "deferred"); }, "that");
            }
        }
        actionContent += "\t\t}\n";
        return actionContent;
    }

    buildActionSelectQuery(res: OntegoResource, action: any) {
        let queryString: string = "";
        queryString += "\t\t\tvar queryCallback = function(items) {\n";
        if (action.properties.action && action.properties.action.projectionModel) {
            let projectionModel: any = action.properties.action.projectionModel;
            queryString += "\t\t\t\t\tvar columnsData = {};\n"
            queryString += "\t\t\t\t\tfor (var i=0; i<items.length; i++) {\n"
            if (projectionModel.selectionType == 1) {
                queryString += "\t\t\t\t\t\tvar selectedColumns = " + JSON.stringify(projectionModel.allColumns) + ";\n"
            }
            else if (projectionModel.selectionType == 3) {
                queryString += "\t\t\t\t\t\tvar selectedColumns = " + JSON.stringify(projectionModel.selectedColumns) + ";\n"
            }
            queryString += "\t\t\t\t\t\tfor (var c=0; c<selectedColumns.length; c++) {\n"
            queryString += "\t\t\t\t\t\t\tvar col = selectedColumns[c];\n"; //"'"
            queryString += "\t\t\t\t\t\t\tif (!columnsData[col]) columnsData[col] = [];\n"; //"'"
            queryString += "\t\t\t\t\t\t\tcolumnsData[col].push(items[i][col]);\n";
            queryString += "\t\t\t\t\t\t}\n";
            queryString += "\t\t\t\t\t}\n";
            queryString += "\t\t\t\t\tfor (var col in columnsData) {\n";
            queryString += "\t\t\t\t\t\t$rootScope.otg.data.set('" + res.filePath + "', '" + action.properties.name.value + "', 'select_action - columns - ' + col, columnsData[col]);\n";
            queryString += "\t\t\t\t\t}\n";
        }
        if (action.connections) {
            queryString += super.buildConnections(res, action.connections, function(connection, getConnection?: boolean) { return ((getConnection) ? JSON.stringify(connection) : "deferred"); }, "that");
        }
        queryString += "\t\t\t};\n";

        // queryString += action.properties.actionList.jayDataQuery + "\n";

        let projectionModel: any = action.properties.action.projectionModel;
        let filterModel: any = action.properties.action.filterModel;
        let sortModel: any = action.properties.action.sortModel;

        if (filterModel.children && filterModel.children.length != 0) {
            queryString += this.storeToTempData(res, filterModel);
        }

        queryString += "\t\t\twindow.ODataDemo." + projectionModel.table + "\n";

        if(filterModel.children && filterModel.children.length != 0) {
            queryString += "\t\t\t.filter( function(" + projectionModel.entitySetName + ") {\n";
            queryString += "\t\t\t\treturn " + this.resolveFilter(res, projectionModel.entitySetName, filterModel.children, true);
            queryString += "\n\t\t\t})\n";
        }

        if(sortModel.children && sortModel.children.length != 0) {
            for(let row of sortModel.children) {
                queryString += "\t\t\t.orderBy"

                if(row.direction == "Descending") {
                    queryString += "Descending"
                }
                
                queryString += "( function(" + projectionModel.table + ") {\n";
                queryString += "\t\t\t\treturn " + projectionModel.table + "." + this.replaceSlash(row.columnName) + "\n";
                queryString += "\t\t\t})\n";
            }
        }

        if(projectionModel.selectionType == 3) {
            queryString += "\t\t\t.map( function(" + projectionModel.table + ") {\n";
            queryString += "\t\t\t\treturn {\n";

            for(var i = 0; i < projectionModel.selectedColumns.length; i++) {
                queryString += "\t\t\t\t\tdataVar" + i + ": " + projectionModel.table + "." + this.replaceSlash(projectionModel.selectedColumns[i]);

                if(i != projectionModel.selectedColumns.length - 1) {
                    queryString += ",\n";
                }
            }

            queryString += "\n\t\t\t\t}\n";
            queryString += "\t\t\t})\n";
        }

        if(projectionModel.limit > 0) {
            queryString += "\t\t\t.take(" + projectionModel.limit + ")\n";
        }

        if(projectionModel.offset > 0) {
            queryString += "\t\t\t.skip(" + projectionModel.offset + ")\n";
        }

        queryString += "\t\t\t.toArray().then(queryCallback);\n";

        //queryString += "\tqueryCallback([{ID: 1, Name: 'commsult AG', TotalExpense: 1},{ID: 2, Name: 'Samsung', TotalExpense: 10}]);\n";
        return queryString;
    }

    storeToTempData(res: OntegoResource, filterModel : any) : string {
        let storeScript: string = "";
        for (let row of filterModel.children) {
            storeScript += "\t\t\totg.fore.tempdata['" + res.modulePath + "']['" + super.buildValue(row.rightColumn, true) + "'] = " + super.buildValue(row.rightColumn) + ";\n";
            if (row.children) {
                storeScript += this.storeToTempData(res, row);
            }
        }
        return storeScript;
    }

    buildActionInsertQuery(res: OntegoResource, action: any) {
        let queryString: string = "";
        if (action.properties.action && action.properties.action.valuesModel) {
            queryString += "\t\t\tvar queryCallback = function() {\n";

            let valuesModel: any = action.properties.action.valuesModel;

            if (action.connections) {
                queryString += super.buildConnections(res, action.connections, function(connection, getConnection?: boolean) { return ((getConnection) ? JSON.stringify(connection) : "deferred"); }, "that");
            }
            queryString += "\t\t\t};\n";

            let nestedInsertKey: string[] = [];
            let nestedInsertValue: any[] = [];
            let lastClass: string = "";

            queryString += "\t\t\twindow.ODataDemo." + valuesModel.table + ".add({\n";

            for (var i = 0; i < valuesModel.children.length; i++) {
                // Check for nested insert
                let child: any = valuesModel.children[i];
                let currentKey: string = this.replaceSlash(child.columnName);
                let splitKey: string[] = currentKey.split(".");

                if(splitKey.length > 1) { // Nested insert found
                    if(lastClass == "") {
                        lastClass = splitKey[0];
                    }
                    
                    if(currentKey.startsWith(lastClass)) {
                        let cutKey: string = "";
                        for(var j = 1; j < splitKey.length; j++) {
                            cutKey += splitKey[j];

                            if(j < splitKey.length - 1) {
                                cutKey += ".";
                            }
                        }

                        nestedInsertKey.push(cutKey);
                        nestedInsertValue.push(child);

                        if(i == valuesModel.children.length - 1) {
                            queryString += "\t\t\t\t" + lastClass + ": new " + lastClass + "({\n" + this.createInsertSubclass(nestedInsertKey, nestedInsertValue, 5);
                            queryString += "\n";
                            lastClass = "";
                            nestedInsertKey = [];
                            nestedInsertValue = [];
                        }
                    }
                    else {
                        queryString += "\t\t\t\t" + lastClass + ": new " + lastClass + "({\n" + this.createInsertSubclass(nestedInsertKey, nestedInsertValue, 5);
                        if (i < (valuesModel.children.length)) {
                            queryString += ",";
                        }
                        queryString += "\n";
                        lastClass = "";
                        nestedInsertKey = [];
                        nestedInsertValue = [];
                    }
                }
                else {
                    if(lastClass != "") {
                        queryString += "\t\t\t\t" + lastClass + ": new " + lastClass + "({\n" + this.createInsertSubclass(nestedInsertKey, nestedInsertValue, 5);
                        if (i < (valuesModel.children.length)) {
                            queryString += ",";
                        }
                        queryString += "\n";
                        lastClass = "";
                        nestedInsertKey = [];
                        nestedInsertValue = [];
                    }

                    queryString += "\t\t\t\t" + valuesModel.children[i].columnName + ": " + this.buildValue(valuesModel.children[i].value);
                    if (i < (valuesModel.children.length - 1)) {
                        queryString += ",";
                    }
                    queryString += "\n";
                }
            }
            queryString += "\t\t\t});\n";
            queryString += "\t\t\twindow.ODataDemo." + valuesModel.table + ".saveChanges().then(queryCallback);\n";
        }
        return queryString;
    }

    buildActionDeleteQuery(res: OntegoResource, action: any) {
        let queryString = "";
        queryString += "\t\t\tvar queryCallback = function() {\n";
        if (action.connections) {
            queryString += super.buildConnections(res, action.connections, function(connection, getConnection?: boolean) { return ((getConnection) ? JSON.stringify(connection) : "deferred"); }, "that");
        }
        queryString += "\t\t\t};\n";

        let tableModel: any = action.properties.action.tableModel;
        let filterModel: any = action.properties.action.filterModel;

        if (filterModel.children && filterModel.children.length != 0) {
            queryString += this.storeToTempData(res, filterModel);
        }

        queryString += "\t\t\twindow.ODataDemo." + tableModel.table + "\n";

        if(filterModel.children.length != 0) {
            queryString += "\t\t\t.filter( function(" + tableModel.entitySetName + ") {\n";
            queryString += "\t\t\t\treturn " + this.resolveFilter(res, tableModel.entitySetName, filterModel.children, true);
            queryString += "\n\t\t\t})\n";
        }

        queryString += "\t\t\t.forEach( function(" + tableModel.entitySetName + ") {\n";
        queryString += "\t\t\t\twindow.ODataDemo." + tableModel.table + ".remove(" + tableModel.entitySetName + ");\n";
        queryString += "\t\t\t\twindow.ODataDemo." + tableModel.table + ".saveChanges();\n";
        queryString += "\t\t\t})\n";
        queryString += "\t\t\t.then(queryCallback);\n";

        return queryString;
    }

    buildActionUpdateQuery(res: OntegoResource, action: any) {
        let queryString = "";
        queryString += "\t\t\tvar queryCallback = function() {\n";
        if (action.connections) {
            queryString += super.buildConnections(res, action.connections, function(connection, getConnection?: boolean) { return ((getConnection) ? JSON.stringify(connection) : "deferred"); }, "that");
        }
        queryString += "\t\t\t};\n";

        let valuesModel: any = action.properties.action.valuesModel;
        let filterModel: any = action.properties.action.filterModel;
        let filterValue: any = filterModel.children[0];

        queryString += "\t\t\tvar updateVar = window.ODataDemo." + valuesModel.table + ".attachOrGet({" + 
                        filterValue.leftColumn.columnName + ": " + this.buildValue(filterValue.rightColumn) + "});\n";

        for(var i = 0; i < valuesModel.children.length; i++) {
            queryString += "\t\t\tupdateVar." + this.replaceSlash(valuesModel.children[i].columnName) + " = " + this.buildValue(valuesModel.children[i].value) + ";\n";
        }

        queryString += "\t\t\twindow.ODataDemo." + valuesModel.table + ".saveChanges().then(queryCallback);\n";

        return queryString;
    }

    replaceSlash(str: string) : string {
        let split: string[] = str.split(" / ");
        
        if(split.length > 1) {
            let toReturn: string = "";

            for(var i = 0; i < split.length; i++) {
                toReturn += split[i];

                if(i != split.length - 1) {
                    toReturn += ".";
                }
            }

            return toReturn;
        }
        else {
            return str;
        }
    }

    interpret(res: OntegoResource, str: string, arg: any) : string {
        let val: string =  "otg.fore.tempdata['" + res.modulePath + "']['" + super.buildValue(arg, true) + "']";
        
        switch(str) {
        case "=": 
            return " == " + val;
		case "?":
			return " != " + val;
		case ">": 
			return " > " + val;
		case "=": 
			return " >= " + val;
		case "<":
			return " < " + val;
		case "=": 
			return " <= " + val;
		case "in": 
			return " in [" + val + "]";
		case "equals":
			return " == " + val + "";
		case "ends with": 
			return ".endsWith(" + val + ")";
		case "starts with":
			return ".startsWith(" + val + ")";
		case "contains":
			return ".contains(" + val + ")";
		case "before":
			// Seems like unsupported by JayData, need further testing
		case "after":
			// Seems like unsupported by JayData, need further testing
		default: 
			return " == " + val;
        }
    }

    resolveFilter(res: OntegoResource, table: string, model: any, first: boolean): string {
        let query: string = "";
        let addConjunction: boolean = first;

        for(let row of model) {
            let left: any = row.leftColumn;
            let right: any = row.rightColumn;

            // Modify ABSOLUTE_STRING with quotes for IN operator
            // TODO: THIS MIGHT NOT BE NEEDED, need to check for buildValue return value for IN methods
            // As for now, disabled until further notice
            // if(content.conditionOperator == "in") {
            //     if(right.flowPropertyValueType == "ABSOLUTE_STRING") {
            //         if(!right.value.match(".*[0-9,]")) {
            //             let split: string[] = right.value.split(",");

            //             let newValue = "";
            //             for(var i = 0; i < split.length; i++) {
            //                 newValue += "'" + split[i] + "'";

            //                 if(i != split.length - 1) {
            //                     newValue += ", ";
            //                 }
            //             }

            //             right.value = newValue;
            //         }
            //     }
            // }

            // Conjunction
            if(!addConjunction) {
                if(row.conjunction == "AND") {
                    query += "\n\t\t\t\t&& ";
                }
                else {
                    query += "\n\t\t\t\t|| ";
                }
            }
            else {
                addConjunction = false;
            }

            query += "(" + table + "." + this.replaceSlash(left.columnName) + this.interpret(res, row.conditionOperator, right);

            if(row.children && row.children.length != 0) {
                query += this.resolveFilter(res, table, row.children, false);
            }

            query += ")";
        }

        return query;
    }

    createInsertSubclass(keys: string[], values: any[], tab): string {
        let queryString: string = "";
        let lastClass: string = "";
        let nestedInsertKey: string[] = [];
        let nestedInsertValue: any[] = [];

        for (var i = 0; i < keys.length; i++) {
            // Check for nested insert
            let currentKey: string = keys[i];
            let splitKey: string[] = currentKey.split(".");

            if(splitKey.length > 1) { // Nested insert found
                if(lastClass == "") {
                    lastClass = splitKey[0];
                }
                
                if(currentKey.startsWith(lastClass)) {
                    let cutKey: string = "";
                    for(var j = 1; j < splitKey.length; j++) {
                        cutKey += splitKey[j];

                        if(j < splitKey.length - 1) {
                            cutKey += ".";
                        }
                    }

                    nestedInsertKey.push(cutKey);
                    nestedInsertValue.push(values[i]);

                    if(i == keys.length - 1) {
                        queryString += this.retab(tab) + lastClass + ": new " + lastClass + "({\n" + this.createInsertSubclass(nestedInsertKey, nestedInsertValue, tab+1);
                        queryString += "\n";
                        lastClass = "";
                        nestedInsertKey = [];
                        nestedInsertValue = [];
                    }
                }
                else {
                    queryString += this.retab(tab) + lastClass + ": new " + lastClass + "({\n" + this.createInsertSubclass(nestedInsertKey, nestedInsertValue, tab+1);
                    if (i < keys.length) {
                        queryString += ",";
                    }
                    queryString += "\n";
                    lastClass = "";
                    nestedInsertKey = [];
                    nestedInsertValue = [];
                }
            }
            else {
                if(lastClass != "") {
                    queryString += this.retab(tab) + lastClass + ": new " + lastClass + "({\n" + this.createInsertSubclass(nestedInsertKey, nestedInsertValue, tab+1);
                    if (i < keys.length) {
                        queryString += ",";
                    }
                    queryString += "\n";
                    lastClass = "";
                    nestedInsertKey = [];
                    nestedInsertValue = [];
                }

                queryString += this.retab(tab) + keys[i] + ": " + this.buildValue(values[i].value);
                if (i < (keys.length - 1)) {
                    queryString += ",";
                }
                queryString += "\n";
            }
        }
        return queryString += this.retab(tab-1) + "})";
    }

    retab(count): string {
        let txt = "";
        for(var i = 0; i < count; i++) {
            txt += "\t";
        }

        return txt;
    }
}