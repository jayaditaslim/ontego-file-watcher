declare function require(path: string): any;

var fs = require("fs");

export { OntegoResource, OntegoResourceHandler }

class OntegoResourceHandler {

    outputFolder: string;
    buildUrl: string;

    constructor(outputFolder: string, buildUrl: string) {
        this.outputFolder = outputFolder;
        this.buildUrl = buildUrl;
    }

    ontegoResoures: {[uri: string]: OntegoResource} = {};
    viewGUIMap: {[guiUri: string]: string} = {};

    update(uri: string, res: OntegoResource): void {
        this.ontegoResoures[uri] = res;
    }

    addViewGUIMap(guiUri, viewUri) : void {
        this.viewGUIMap[guiUri] = viewUri;
    }

    getViewGUIMap(fullGuiPath) : string {
        for (var key in this.viewGUIMap) {
            if (fullGuiPath.endsWith(key)) {
                return this.viewGUIMap[key];
            }
        }
        return null;
    }

    getFromProject(workspaceRoot: string, projectName: string, filePath: string): OntegoResource {
        let fullFilePath: string = workspaceRoot + "/" + projectName + "/" + filePath;
        if (!this.ontegoResoures[fullFilePath]) {
            let content = this.loadFile(fullFilePath);
            this.update(fullFilePath, new OntegoResource(workspaceRoot, fullFilePath, content))
        }
        return this.ontegoResoures[fullFilePath];
    }

    getProjectScriptFiles(scripts: string[], workspaceRoot: string, projectName: string, filePath: string): void {
        let curResource: OntegoResource = this.getFromProject(workspaceRoot, projectName, filePath);
        if (scripts.indexOf(filePath + ".js") == -1) {
            scripts.push(filePath + ".js");
            let extension: string = filePath.substring(filePath.lastIndexOf(".") + 1);
            switch (extension) {
                case "mappflow":
                    let views: any[] = curResource.getChildren("VIEW");
                    for (var i=0; i<views.length; i++) {
                        if (views[i].properties.viewFlow) {
                            this.getProjectScriptFiles(scripts, workspaceRoot, projectName, views[i].properties.viewFlow.filePath);
                        }
                    }
                    break;
                case "mview":
                case "mservice":
                    let services: any[] = curResource.getChildren("SERVICE");
                    for (var i=0; i<services.length; i++) {
                        if (services[i].properties.serviceFile) {
                            this.getProjectScriptFiles(scripts, workspaceRoot, projectName, services[i].properties.serviceFile.filePath);
                        }
                    }
                    break;
            }
        }
    }

    loadFile(fullFilePath: string): any {
        fullFilePath = this.validateFullFilePath(fullFilePath);
        if (fs.existsSync(fullFilePath)) {
            let contentStr: string = fs.readFileSync(fullFilePath, "utf-8");
            if (contentStr.length > 0) {
                return JSON.parse(contentStr);
            }
        }
        return {};
    }

    readFile(fullFilePath: string): string {
        fullFilePath = this.validateFullFilePath(fullFilePath);
        if (fs.existsSync(fullFilePath)) {
            return fs.readFileSync(fullFilePath);
        }
        return "";
    }

    validateFullFilePath(fullFilePath: string): string {
        if (fullFilePath.startsWith("file://")) {
            fullFilePath = fullFilePath.substring(7);
        }
        return fullFilePath;
    }

    writeOuput(preview: boolean, workspaceRoot: string, projectName: string, moduleName: string, filePath: string, fileContent: string, outputFileType?: string): void {
        outputFileType = outputFileType ? outputFileType : "js";
        let outputPath: string = this.outputFolder;

        if (preview) {
            outputPath += "/preview"
        } else {
            outputPath += "/dev"
        }

        //Fix outpath for Windows system
        if(outputPath.indexOf("file:///") != -1) {
            var tempPath = outputPath.substr(12);
            var diskDrive = outputPath.substr(8, 1);
            outputPath = diskDrive + ":" + tempPath;
        }

        let fullFilePath: string = outputPath + "/" + projectName + "/" + filePath + "." + outputFileType;

        OntegoResourceHandler.mkdirs(outputPath, projectName + "/" + filePath.substring(0, filePath.lastIndexOf("/")));
        fs.writeFileSync(fullFilePath, fileContent,  { mode: fs.constants.O_CREAT | fs.constants.O_TRUNC });
        fs.chmodSync(fullFilePath, "777");
    }

    copyResource(preview: boolean, workspaceRoot: string, projectName: string, resourceFile: string): void {
        let inputFilePath: string = workspaceRoot + "/" + projectName + "/" + resourceFile;
        let fileContent = this.readFile(inputFilePath);

        let outputPath: string = this.outputFolder;

        if (preview) {
            outputPath += "/preview"
        } else {
            outputPath += "/dev"
        }
        let fullFilePath: string = outputPath + "/" + projectName + "/" + resourceFile;
        OntegoResourceHandler.mkdirs(outputPath, projectName + "/" + resourceFile.substring(0, resourceFile.lastIndexOf("/")));
        fs.writeFileSync(fullFilePath, fileContent,  { mode: fs.constants.O_CREAT | fs.constants.O_TRUNC });
        fs.chmodSync(fullFilePath, "777");
    }

    static mkdirs(rootPath: string, path: string): void {
        if (path) {
            let pathSegments: string[] = path.split("/");
            let currentPath: string = rootPath;
            if (currentPath.endsWith("/")) {
                currentPath = currentPath.substring(0, currentPath.length-1);
            }
            for (var i=0; i<pathSegments.length; i++) {
                if (pathSegments[i] != "") {
                    currentPath += "/" + pathSegments[i];
                    if (!fs.existsSync(currentPath)) {
                        fs.mkdirSync(currentPath);
                    }
                }
            }
        }
    }
    
}

class OntegoResource {
    name: string;
    uriPath: string;
    filePath: string;
    projectName: string;
    fullProjectPath: string;
    modulePath: string;

    constructor(public workspaceRoot: string, public fullFilePath: string, public content) {
        //Windows encoding problem getting the file uri
        if(fullFilePath.indexOf("/c%3A") != -1){
           fullFilePath = fullFilePath.replace("/c%3A", "C:")
        }
        if (workspaceRoot.indexOf("file://") == 0) {
            workspaceRoot = workspaceRoot.substring(7);
        }
        if (fullFilePath.indexOf("file://") == 0) {
            fullFilePath = fullFilePath.substring(7);
        }

        var decrease = 0;
        //Fix for Windows full file path
        if(!fullFilePath.startsWith("/")) {
            decrease = 2;
        }

        let pathWithProject: string = fullFilePath.substring(workspaceRoot.length - decrease);
        if (pathWithProject.indexOf("/") == 0) {
            pathWithProject = pathWithProject.substring(1);
        }

        //Replace backslash to slash
        while(pathWithProject.indexOf("\\") != -1) {
            pathWithProject = pathWithProject.replace("\\", "/");
        }

        this.filePath = pathWithProject.substring(pathWithProject.indexOf("/") + 1);
        this.projectName = pathWithProject.substring(0, pathWithProject.indexOf("/"));
        this.fullProjectPath = workspaceRoot + "/" + this.projectName;
        this.modulePath = OntegoResource.getModulePath(this.filePath);
        this.uriPath = this.filePath;
        this.name = OntegoResource.getModuleName(this.filePath);
    }

    static getModulePath(filePath: string): string {
        let toReturn: string = filePath;
        toReturn = toReturn.replace("/", "___");
        toReturn = toReturn.replace("\.", "_");
        return toReturn;
    }

    static getModuleName(filePath: string): string {
        return OntegoResource.getModulePath(filePath);
    }

    getChildren(elementType: string): any[] {
        let children = [];
        if (this.content && this.content.modelElementContainer && this.content.modelElementContainer.children) {
            for (var i = 0; i < this.content.modelElementContainer.children.length; i++) {
                let child = this.content.modelElementContainer.children[i];
                if (child.modelElementType == elementType) {
                    children.push(child);
                }
            }
        }
        return children;
    }
}