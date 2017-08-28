declare function require(path: string): any;

var fs = require('fs');

import {
    OntegoBuilder
} from './ontegoBuilder'

import {
    OntegoResource, OntegoResourceHandler
} from './ontegoResources'

import {
	AppFlowBuilder
} from './appFlowBuilder';

export {AppBuilder}

class AppBuilder extends OntegoBuilder {
    build(ontegoResourceHandler: OntegoResourceHandler, workspaceRoot: string, path: string, rawText: string): void {
        var content = JSON.parse(rawText);
        let res: OntegoResource = new OntegoResource(workspaceRoot, path, content);
        ontegoResourceHandler.update(path, res);

        this.buildContent(ontegoResourceHandler, workspaceRoot, res, false);
        this.buildContent(ontegoResourceHandler, workspaceRoot, res, true);
    }

    buildContent(ontegoResourceHandler: OntegoResourceHandler, workspaceRoot: string, res: OntegoResource, preview: boolean): void {
        let appFileContent: string = "";
        let startFlowRes: OntegoResource = null;
        let startItem = null;
        if (!preview) {
            appFileContent += "otg.fore.initResolver = {\n";
            appFileContent += "    init : [ '$q', '$rootScope', '$location', '$translate', '$mdDialog', function($q, $rootScope, $location, $translate, $mdDialog) {\n";
            appFileContent += "        if (!otg.fore.initialized) {\n";
            appFileContent += "            otg.fore.initialized = true;\n";
            appFileContent += "            $rootScope.otg = {\n";
            appFileContent += "                route: function(location, module, exit) {\n";

            startFlowRes = ontegoResourceHandler.getFromProject(workspaceRoot, res.projectName, res.content.mainMappFlow);
            this.buildAppFlow(ontegoResourceHandler, workspaceRoot, startFlowRes.fullFilePath);
            startItem = startFlowRes.getChildren("START")[0];

            appFileContent += "                    if (!otg.fore.currentAppFlow) otg.fore.currentAppFlow = '" + OntegoResource.getModuleName(res.content.mainMappFlow) + "';\n";
            appFileContent += "                    var start = 'start1';\n";
            appFileContent += "                    if (!otg.fore.appFlowEndStartMapping && otg.fore.appFlowEndStartMapping[otg.fore.currentAppFlow] && otg.fore.appFlowEndStartMapping[otg.fore.currentAppFlow][module + '___' + exit]) start = otg.fore.appFlowEndStartMapping[otg.fore.currentAppFlow][module + '___' + exit];\n";
            appFileContent += "                    location.path(otg.fore.currentAppFlow + '___' + module + '___' + exit + '/' + start);\n";
            appFileContent += "                },\n";
            appFileContent += "                data: {\n";
            appFileContent += "                    set: function(file, item, property, value) {\n";
            appFileContent += "                        if (!otg.fore.data[file]) otg.fore.data[file] = {};\n";
            appFileContent += "                        if (!otg.fore.data[file][item]) otg.fore.data[file][item] = {};\n";
            appFileContent += "                        otg.fore.data[file][item][property] = value;\n";
            appFileContent += "                    },\n";
            appFileContent += "                    setItemData: function(file, item, itemValue) {\n";
            appFileContent += "                        if (!otg.fore.data[file]) otg.fore.data[file] = {};\n";
            appFileContent += "                        if (!otg.fore.data[file][item]) otg.fore.data[file][item] = {};\n";
            appFileContent += "                        if (itemValue) {\n";
            appFileContent += "                            for (var property in itemValue) {\n";
            appFileContent += "                                otg.fore.data[file][item][property] = itemValue[property];\n"; 
            appFileContent += "                            }\n";
            appFileContent += "                        }\n";
            appFileContent += "                    },\n";
            appFileContent += "                    get: function(file, item, property) {\n";
            appFileContent += "                        if (otg.fore.data[file] && otg.fore.data[file][item]) {\n";
            appFileContent += "                            return otg.fore.data[file][item][property];\n";
            appFileContent += "                        }\n";
            appFileContent += "                        return null;\n";
            appFileContent += "                    },\n";
            appFileContent += "                    clear: function(file) {\n";
            appFileContent += "                        if (otg.fore.data[file]) {\n";
            appFileContent += "                            delete otg.fore.data[file];\n";
            appFileContent += "                        }\n";
            appFileContent += "                    }\n";
            appFileContent += "                },\n";
            appFileContent += "                showMessage: function(type, title, msg, buttons) {\n";
            appFileContent += "                    var deferred = $q.defer();\n";
            appFileContent += "                    var dialog = $mdDialog.alert().parent(angular.element(document.body)).clickOutsideToClose(false).title(title).content(msg).ok('OK');\n";
            appFileContent += "                    $mdDialog.show(dialog).finally(function() {\n";
            appFileContent += "                        deferred.resolve();\n";
            appFileContent += "                    });\n";
            appFileContent += "                    return deferred.promise;\n";
            appFileContent += "                }\n";
            appFileContent += "            }\n";
            appFileContent += "            $rootScope.otg.route($location, '', '" + startItem.properties.name.value + "');\n";
            appFileContent += "        }\n";
            appFileContent += "    }]\n";
            appFileContent += "};\n\n";
        }

        //Route Provider Function
        if (preview) {
            appFileContent += "angular.module('" + res.modulePath + "', ['ngMaterial', 'ngRoute']);\n";
            appFileContent += "angular.module('" + res.modulePath + "', ['ngMaterial', 'ngRoute'])\n";
            appFileContent += ".config([ '$routeProvider', '$mdThemingProvider', function($routeProvider, $mdThemingProvider) {\n";
        } else {
            appFileContent += "angular.module('" + res.modulePath + "', ['" + OntegoResource.getModuleName(res.content.mainMappFlow) + "', 'ngRoute', 'ngMaterial', 'ngMessages', 'pascalprecht.translate']);\n";
            appFileContent += "angular.module('" + res.modulePath + "', ['" + OntegoResource.getModuleName(res.content.mainMappFlow) + "', 'ngRoute', 'ngMaterial', 'ngMessages', 'pascalprecht.translate'])\n";
            appFileContent += ".config([ '$routeProvider', '$mdThemingProvider', '$translateProvider', function($routeProvider, $mdThemingProvider, $translateProvider) {\n";
        }

        //Restructure Coloring
        var primaryJson = res.content.primary;
        var accentJson = res.content.accent;

        if(primaryJson.palette.indexOf(" ") != -1) {
            primaryJson.palette = primaryJson.palette.toLowerCase();
            primaryJson.palette = primaryJson.palette.replace(" ", "-");
        }

        if(accentJson.palette.indexOf(" ") != -1) {
            accentJson.palette = accentJson.palette.toLowerCase();
            accentJson.palette = accentJson.palette.replace(" ", "-");
        }

        appFileContent += "var colors = {\n";
        appFileContent += "    'primary' : " + JSON.stringify(primaryJson) + ",\n";
        appFileContent += "    'accent' : " + JSON.stringify(accentJson) + ",\n";
        appFileContent += "    'background' : {\n";
        appFileContent += "        'palette' : 'grey',\n";
        appFileContent += "        'base' : '50',\n";
        appFileContent += "        'hue1' : '100',\n";
        appFileContent += "        'hue2' : '200',\n";
        appFileContent += "        'hue3' : '300'\n";
        appFileContent += "    }\n";
        appFileContent += "}\n";

        //Theming
        appFileContent += "$mdThemingProvider.theme('default')\n";
        appFileContent += "    .primaryPalette(colors.primary.palette, {'default' : colors.primary.base,  'hue-1': colors.primary.hue1,  'hue-2': colors.primary.hue2,  'hue-3': colors.primary.hue3})\n";
        appFileContent += "    .accentPalette(colors.accent.palette, {'default' : colors.accent.base,  'hue-1': colors.accent.hue1,  'hue-2': colors.accent.hue2,  'hue-3': colors.accent.hue3})\n";
        appFileContent += "    .backgroundPalette(colors.background.palette, {'default' : colors.background.base,  'hue-1': colors.background.hue1,  'hue-2': colors.background.hue2,  'hue-3': colors.background.hue3});\n";

         if (preview) {
            appFileContent += "    $routeProvider.when('/:gui/:rid', {\n";
            appFileContent += "        templateUrl : function(urlParams) {\n";
            appFileContent += "            return urlParams.gui.replace(/____/g, '/') + '.html';\n";
            appFileContent += "        },\n";
            appFileContent += "        controller : 'previewController'\n";
            appFileContent += "    });\n";
            appFileContent += "    $routeProvider.when('/:gui/cordova/:rid', {\n";
            appFileContent += "        templateUrl : function(urlParams) {\n";
            appFileContent += "            setTimeout(function(){\n";
            appFileContent += "                angular.element($('[ng-view]')[0]).scope().refreshView(urlParams.gui).$apply();\n";
            appFileContent += "            }, 500);\n";
            appFileContent += "            return urlParams.gui.replace(/____/g, '/') + '.html';\n";
            appFileContent += "        },\n";
            appFileContent += "        controller : 'cordovaController'\n";
            appFileContent += "    });\n";
            appFileContent += "}])\n\n";
            appFileContent += ".controller('previewController', [ '$scope', '$rootScope', '$routeParams', '$location', '$templateCache', function($scope, $rootScope, $routeParams, $location, $templateCache) {\n";
            appFileContent += "    $scope.templateCache = $templateCache;\n";
            appFileContent += "    // angular.element($('[ng-view]')[0]).scope().refreshView('test.mgui').$apply()\n";
            appFileContent += "    $scope.refreshView = function(gui) {\n";
            appFileContent += "        $scope.templateCache.remove(gui + '.html');\n";
            appFileContent += "        $location.path('/' + gui.replace(/\\//g, '____') + '/' + new Date().getTime());\n";
            appFileContent += "        return $scope;\n";
            appFileContent += "    }\n";
            appFileContent += "}])\n";
            appFileContent += ".controller('cordovaController', [ '$scope', '$rootScope', '$routeParams', '$location', '$templateCache', function($scope, $rootScope, $routeParams, $location, $templateCache) {\n";
            appFileContent += "    $scope.templateCache = $templateCache;\n";
            appFileContent += "    // angular.element($('[ng-view]')[0]).scope().refreshView('test.mgui').$apply()\n";
            appFileContent += "    $scope.refreshView = function(gui) {\n";
            appFileContent += "        $scope.templateCache.remove(gui + '.html');\n";
            appFileContent += "        $location.path('/' + gui.replace(/\\//g, '____') + '/cordova/' + new Date().getTime());\n";
            appFileContent += "\n";
            appFileContent += "        return $scope;\n";
            appFileContent += "    }\n";
            appFileContent += "}]);\n";
         } else {
            appFileContent += "$routeProvider.otherwise({\n";
            appFileContent += "    redirectTo : '/" + startFlowRes.name + "______start1/" + startItem.properties.name.value + "'\n";
            appFileContent += "});\n";
            appFileContent += "} ]);\n";
         }
        
        ontegoResourceHandler.writeOuput(preview, workspaceRoot, res.projectName, res.name, res.filePath, appFileContent);
        
        let indexFileContent: string = "<!DOCTYPE html>\n";
        indexFileContent += "<html ng-app='" + res.modulePath + "'>\n";
        indexFileContent += "<head>\n";
        indexFileContent += "    <title>" + res.content.appName + "</title>\n";

        indexFileContent += "    <script>\n";
        indexFileContent += "    window.addEventListener('message', function(evt) {\n";
        indexFileContent += "    \tif (evt.data.command == \"selectGuiElement\") {\n";
        indexFileContent += "    \t\t$(\"[style*='rgb(78, 171, 255)']\").css(\"background-color\", \"\");\n";
        indexFileContent += "    \t\t$(\"[style*='2px dotted orange']\").css(\"border\", \"\");\n";
        indexFileContent += "    \t\t$(\"#\" + evt.data.name).css(\"background-color\", \"rgb(78, 171, 255)\");\n";
        indexFileContent += "    \t\t$(\"#\" + evt.data.name).css(\"border\", \"2px dotted orange\");\n";
        indexFileContent += "    \t}\n";
        indexFileContent += "    \telse if (evt.data.command == \"refreshPreview\") {\n";
        indexFileContent += "    \t\ttry {\n";
        indexFileContent += "    \t\t\tangular.element($(\"[ng-view]\")[0]).scope().refreshView(evt.data.path).$apply();\n";
        indexFileContent += "    \t\t}\n";
        indexFileContent += "    \t\tcatch(err) {\n";
        indexFileContent += "    \t\t\tlocation.reload();\n";
        indexFileContent += "    \t\t}\n";
        indexFileContent += "    \t}\n";
        indexFileContent += "    });\n";
        indexFileContent += "    \n";
        indexFileContent += "    function messageParent(data) {\n";
        indexFileContent += "    \tparent.postMessage(data,'*');\n";
        indexFileContent += "    }\n";
        indexFileContent += "    </script>\n";

        indexFileContent += "    <script src='../../bower_components/jquery/dist/jquery.js'></script>\n";
        indexFileContent += "    <script src='../../bower_components/angular/angular.js'></script>\n";
        indexFileContent += "    <script src='../../bower_components/angular-route/angular-route.js'></script>\n";
        indexFileContent += "    <script src='../../bower_components/angular-material/angular-material.js'></script>\n";
        indexFileContent += "    <script src='../../bower_components/angular-animate/angular-animate.js'></script>\n";
        indexFileContent += "    <script src='../../bower_components/angular-aria/angular-aria.js'></script>\n";
        indexFileContent += "    <script src='../../bower_components/angular-messages/angular-messages.js'></script>\n";
        indexFileContent += "    <script src='../../bower_components/angular-translate/angular-translate.js'></script>\n";
        indexFileContent += "    <script src='../../bower_components/moment/min/moment-with-locales.min.js'></script>\n";
        indexFileContent += "    <script src='../../bower_components/angular-i18n/angular-locale_de-de.js'></script>\n";
        indexFileContent += "    <script src='../../bower_components/numeral/min/numeral.min.js'></script>\n";
        if (!preview) {
            indexFileContent += "    <script src='../../bower_components/jaydata/jaydata.min.js'></script>\n";
            indexFileContent += "    <script src='../../bower_components/jaydata/jaydataproviders/IndexedDbProvider.min.js'></script>\n";
            indexFileContent += "    <script src='../../bower_components/jaydata/jaydataproviders/oDataProvider.min.js'></script>\n";
            indexFileContent += "    <script src='init_context.js'></script>\n";
        }
        if (!preview) {
            let dataStr: string = ontegoResourceHandler.readFile(workspaceRoot + "/" + res.projectName + "/data.mdata");
            if (dataStr.length > 0) {
                indexFileContent += "    <script src='OData.odataxml.js'></script>\n";
            }
            if (res.content.javascriptFiles) {
                for (var i=0; i<res.content.javascriptFiles.length; i++) {
                    ontegoResourceHandler.copyResource(preview, workspaceRoot, res.projectName, res.content.javascriptFiles[i]);
                    indexFileContent += "    <script src='" + res.content.javascriptFiles[i]  + "'></script>\n";
                }
            }
            let projectScripts: string[] = [];
            ontegoResourceHandler.getProjectScriptFiles(projectScripts, workspaceRoot, res.projectName, res.content.mainMappFlow);
            for (var i=(projectScripts.length - 1); i>=0; i--) {
                indexFileContent += "    <script src='" + projectScripts[i]  + "'></script>\n";
            }
        }
        indexFileContent += "    <script src='" + res.filePath  + ".js'></script>\n";
        
        indexFileContent += "    <link rel='stylesheet' href='../../bower_components/angular-material/angular-material.css'/>\n";

        indexFileContent += "    <meta name='format-detection' content='telephone=no'>\n";
        indexFileContent += "    <meta name='msapplication-tap-highlight' content='no'>\n";
        indexFileContent += "    <meta name='viewport' content='user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width'>\n";
        indexFileContent += "    <meta charset='utf-8'/>\n";
        indexFileContent += "</head>\n";
        
        indexFileContent += "<body layout='column' class='flex'>\n";
        indexFileContent += "    <div ng-view layout='column' class='flex' style='overflow:hidden;'>\n";
        indexFileContent += "    </div>\n";
        indexFileContent += "</body>\n";
        indexFileContent += "</html>\n";
        ontegoResourceHandler.writeOuput(preview, workspaceRoot, res.projectName, "index", "index", indexFileContent, "html");

        let initContextFileContent: string = "if (!window.otg) otg = {};\n";
        initContextFileContent += "if (!otg.fore) otg.fore = {\n";
        initContextFileContent += "\tinitialized: false,\n";
        initContextFileContent += "\tdata: {},\n";
        initContextFileContent += "\ttempdata: {},\n";
        initContextFileContent += "\tappFlowEndStartMapping: {}\n";
        initContextFileContent += "};\n";

        initContextFileContent += "$(function() {\n";
        initContextFileContent += "\ttry {\n";
        initContextFileContent += "\t\tvar oProviderConfig = {\n";
        initContextFileContent += "\t\t\tname: 'oData',\n";
        initContextFileContent += "\t\t\toDataServiceHost: 'http://" + res.content.odataEndpoint + "/odata'\n";
        initContextFileContent += "\t\t};\n";
        initContextFileContent += "\t\tvar ODataDemoContext = $data('employee.EntityContainer');\n";
        initContextFileContent += "\t\twindow.ODataDemo = new ODataDemoContext(oProviderConfig);\n";
        initContextFileContent += "\t\twindow.ODataDemo.onReady(function () {\n";
        initContextFileContent += "\t\t\tconsole.log('oData Ready');\n";
        initContextFileContent += "\t\t});\n";
        initContextFileContent += "\t} catch (e) {}\n";
        initContextFileContent += "});\n";

        ontegoResourceHandler.writeOuput(preview, workspaceRoot, res.projectName, "init_context", "init_context", initContextFileContent, "js");
    }

    buildAppFlow(ontegoResourceHandler: OntegoResourceHandler, workspaceRoot: string, path: string): void {
        let appFlowBuilder: OntegoBuilder = new AppFlowBuilder();
        fs.readFile(`${path}`, 'utf8', function(err, contents) {
            if(err) {
                console.log("FILE READ ERROR: " + err);
            }

            try {
			    console.log("Building " + path + "...");
                appFlowBuilder.build(ontegoResourceHandler, workspaceRoot, path, contents);
                console.log("mappflow" + " file successfully built.");
            } catch (e) {
                console.log("Build failed - Error: " + JSON.stringify(e), e);
            }
        });
    }
}