declare function require(path: string): any;
var webshot = require('webshot');
var os = require('os');

import {
    OntegoBuilder
} from './ontegoBuilder'

import {
    OntegoResource, OntegoResourceHandler
} from './ontegoResources'

export {GuiBuilder}

class GuiBuilder extends OntegoBuilder {

    workspaceRoot: string;
    ontegoResourceHandler: OntegoResourceHandler;

    build(ontegoResourceHandler: OntegoResourceHandler, workspaceRoot: string, path: string, rawText: string): void {
        this.ontegoResourceHandler = ontegoResourceHandler;
        this.workspaceRoot =  workspaceRoot;
        
        var content = JSON.parse(rawText);
        let res: OntegoResource = new OntegoResource(workspaceRoot, path, content);
        ontegoResourceHandler.update(path, res);
        this.renderGui(workspaceRoot, content, res, ontegoResourceHandler, false);
        this.renderGui(workspaceRoot, content, res, ontegoResourceHandler, true);

        // ontegoResourceHandler.

        //Thumbnail Rendering
        var webShotFileName = res.filePath;
        var webShotProjectName = res.projectName;

        var thumbnailSrc = ontegoResourceHandler.buildUrl + '/preview/' + webShotProjectName + '/index.html#!/' + webShotFileName.replace(/\//g, '____') + '/0';
        var thumbnailTarget = ontegoResourceHandler.outputFolder + '/preview/' + webShotProjectName + '/' + webShotFileName + '.png';

        var hostname = os.hostname();

        var options = null;

        if (hostname == "Jay") {
            options = {
                windowSize: {
                    width: 375
                , height: 667
                }
                , renderDelay: 150
                , userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us)'
                    + ' AppleWebKit/531.21.20 (KHTML, like Gecko) Mobile/7B298g'
            };
        }
        else if (hostname == "Leonardos-MacBook-Pro.local" || hostname == "leonardos-mbp.pdm-commsult.intranet" || hostname == "eiphone.pdm-commsult.intranet") {
            options = {
                windowSize: {
                    width: 375
                , height: 667
                }
                , renderDelay: 150
                , userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us)'
                    + ' AppleWebKit/531.21.20 (KHTML, like Gecko) Mobile/7B298g'
            };
        }
        else {
            options = {
                windowSize: {
                    width: 375
                , height: 667
                }
                , renderDelay: 150
                , userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us)'
                    + ' AppleWebKit/531.21.20 (KHTML, like Gecko) Mobile/7B298g'
                , phantomPath: '/usr/bin/phantomjs'
            };
        }

        // console.log("thumbnailSrc: " + thumbnailSrc);
        // console.log("thumbnailTarget: " + thumbnailTarget);

        webshot(thumbnailSrc, thumbnailTarget, options, function(err) {
            if (err == null) {
                var thumbnailTargetUrl = ontegoResourceHandler.buildUrl + '/preview/' + webShotProjectName + '/' + webShotFileName + '.png';
                var viewflowGraphic = ontegoResourceHandler.buildUrl + '/viewflow.svg';

                var m_html = '<html><body style="margin:0px"><img style="position:absolute;" width="375" src="' + viewflowGraphic + '"></img><div style="position:absolute; top:59px; object-fit: cover; object-position:top; height:469px; width: 375px; background-image: url(' + thumbnailTargetUrl + '); background-size: cover; background-position: top;"></div></body></html>';
                var m_thumbnailTarget = ontegoResourceHandler.outputFolder + '/preview/' + webShotProjectName + '/' + webShotFileName + '.m.png';

                var m_options = null;

                if (hostname == "Jay") {
                    m_options = {
                        windowSize: {
                            width: 375
                        , height: 644.53
                        }
                        , renderDelay: 150
                        , siteType: 'html'
                        , userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us)'
                            + ' AppleWebKit/531.21.20 (KHTML, like Gecko) Mobile/7B298g'
                    };
                }
                else if (hostname == "Leonardos-MacBook-Pro.local" || hostname == "leonardos-mbp.pdm-commsult.intranet" || hostname == "eiphone.pdm-commsult.intranet") {
                    m_options = {
                        windowSize: {
                            width: 375
                        , height: 644.53
                        }
                        , renderDelay: 150
                        , siteType: 'html'
                        , userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us)'
                            + ' AppleWebKit/531.21.20 (KHTML, like Gecko) Mobile/7B298g'
                    };
                }
                else {
                    m_options = {
                        windowSize: {
                            width: 375
                        , height: 644.53
                        }
                        , renderDelay: 150
                        , siteType: 'html'
                        , userAgent: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_2 like Mac OS X; en-us)'
                            + ' AppleWebKit/531.21.20 (KHTML, like Gecko) Mobile/7B298g'
                        , phantomPath: '/usr/bin/phantomjs'
                    };
                }

                // console.log("thumbnailTargetUrl: " + thumbnailTargetUrl);
                // console.log("viewflowGraphic: " + viewflowGraphic);
                // console.log("m_html: " + m_html);
                // console.log("m_thumbnailTarget: " + m_thumbnailTarget);

                webshot(m_html, m_thumbnailTarget, m_options, function(err) {
                    if (err) {
                        console.log(err);
                    }
                });
            }
            else {
                console.log(err);
            }
        });

    }

    renderGui(workspaceRoot: string, content: any, res: OntegoResource, ontegoResourceHandler: OntegoResourceHandler, preview: boolean): void {
        let guiContent: string = "";
        if (content.guiRootDiagram && content.guiRootDiagram.children) {
            guiContent = this.renderGuiRecursive(content.guiRootDiagram, res, "uiData", preview);
        }

        guiContent = guiContent.replace(/  +/g, ' '); //replace duplicated spaces with single spaces

        ontegoResourceHandler.writeOuput(preview, workspaceRoot, res.projectName, res.name, res.filePath, guiContent, "html");
    }

    renderGuiRecursive(guiElement : any, res: OntegoResource, dataObj : string, preview : boolean) : string{
        let guiContent : string = "";
        
        let guiElementContent:string = this.renderGuiElement(guiElement, res, dataObj,  preview);
        let guiElementContentParts : string[] = guiElementContent.split("<!--otg-inner-html-->");

        //element open tag or complete element if no inner html
        guiContent += guiElementContentParts[0]; 

        if(guiElement.type == "listitem" || guiElement.type  == "repeat"){
            dataObj = guiElement.properties.name.value;
        }

        //render children recursivley
        if(guiElement.children){
            for (var i=0; i<guiElement.children.length; i++) {
                var childElement = guiElement.children[i];
                guiContent +=  this.renderGuiRecursive(childElement, res, dataObj, preview);
            }
        }

        //element close tag
        if(guiElementContentParts.length >= 2){
            guiContent += guiElementContentParts[1]; 
        }

        return guiContent;
    }

    renderGuiElement(guiElement : any, res: OntegoResource, dataObj : string,  preview : boolean) : string{
         switch (guiElement.type) {
            case "button":
                return this.buildButton(res, preview, dataObj,  guiElement);
            case "fab":
                return this.buildFAB(res, preview, dataObj,  guiElement);
            case "content":
                return this.buildContent(res, preview, dataObj,  guiElement);
            case "toolbar":
                return this.buildToolbar(res, preview, dataObj,  guiElement);
            case "layout":
                return this.buildLayout(res, preview, dataObj,  guiElement);
            case "headline":
                return this.buildHeadline(res, preview, dataObj,  guiElement);
            case "subheadline":
                return this.buildSubheadline(res, preview, dataObj, guiElement);
            case "paragraph":
                return this.buildParagraph(res, preview, dataObj, guiElement);
            case "label":
                return this.buildLabel(res, preview, dataObj,  guiElement);  
            case "input":
                return this.buildInput(res, preview, dataObj,  guiElement);     
            case "select":
                return this.buildSelect(res, preview, dataObj,  guiElement); 
            case "list":
                return this.buildList(res, preview, dataObj,  guiElement);     
            case "listitem":
                return this.buildListItem(res, preview, dataObj,  guiElement);           

        }
        return "";
    }

    createCheSelectEvent(preview : boolean, element : any, hasIndex? : boolean) : string{
        if (preview) {
            // return " onclick=\"parent.otg.fore.guiEditor.executeSelection(event, '" + element.properties.name.value + "');\" ";
            var data = {
                'command':'selectGuiElement'
                ,'name':element.properties.name.value
            };
            return " onclick='messageParent(" + JSON.stringify(data) + ");' ";
        }
        return " ng-click=\"throwEvent(event, '" + element.properties.name.value + "', 'onclick', $index);\" ";
    }

    // FIXME added return "" if it is not for preview. Otherwise, it writes 'undefined' to the output.
    createCheDragEvent(preview : boolean, element : any) : string{
        // if (preview) {
        //     // return "ondrop=\"parent.otg.fore.guiEditor.drop(event, '" + element.properties.name.value + "');\" ondragover=\"parent.otg.fore.guiEditor.dragOver(event, '" + element.properties.name.value + "');\" ";
        //     return "ondrop=\"messageParent('dropGuiElement', '" + element.properties.name.value + "', event);\" ondragover=\"messageParent('dragGuiElement', '" + element.properties.name.value + "', event);\" ";
        // }
        return "";
    }

    decideMappingOrDefaultValueLn(res: OntegoResource, preview : boolean, dataObj : string,  element : any, property : string, defaultValue? : string ) : string{
        return " " + this.decideMappingOrDefaultValue(res, preview, dataObj, element, property, defaultValue) + " ";
    }

    decideMappingOrDefaultValue(res: OntegoResource, preview : boolean, dataObj : string,  element : any, property : string, defaultValue? : any) : string{
        if (element.properties[property] && element.properties[property].value) {
            if (!preview) {
                return  "{{" + dataObj + "." + element.properties.name.value + "." + property + ".value}}";
            }
            if (defaultValue) {
                return defaultValue;
            }
            return element.properties[property].value;
        }
        else if (property == "icon") {
            if (!preview) {
                return  "{{" + dataObj + "." + element.properties.name.value + "." + property + ".filePath}}";
            }
            if (defaultValue) {
                return defaultValue;
            }
            return element.properties[property].value;
        }
        return "";
    }

    isUseMapping(res: OntegoResource, preview : boolean,  element : any, property ) : boolean{
        if(!preview && this.hasMapping(res, element, property)){
            return true;
        }else{
            return false;
        }
    }

    hasMapping(res : OntegoResource, element : any, property : string) : boolean {
        let mappingList = this.getMapping(res, element.properties.name.value);
        for (var i = 0; i < mappingList.length; i++) {
            var mapping = mappingList[i];

        }

        return (mappingList.length > 0);
    }

    buildLayoutData(res: OntegoResource, preview: boolean, dataObj : string, element: any) : string{
        let layoutData : string = "";

        layoutData += " flex='" + this.decideMappingOrDefaultValue(res, preview, dataObj, element, "layoutsize") + "' ";

        return layoutData;
    }

    buildCustomization(res : OntegoResource, preview : boolean,  dataObj : string, element : any) : string {
        let customContent :string = "";

        customContent += " ";
        customContent += this.buildCustomAttributes(res, preview,  dataObj, element);
        if (preview) {
            customContent += " style='cursor:pointer; ";
            customContent += this.buildCustomInlineStyles(res, preview,  dataObj, element);
        }
        else {
            customContent += " style='";
            customContent += this.buildCustomInlineStyles(res, preview,  dataObj, element);
        }
        customContent += "' ";

        return customContent;
    }

    buildCustomAttributes(res : OntegoResource, preview : boolean,  dataObj : string, element : any) : string {
        let attrContent :string = "";

        var attrs = element.properties.attributes;
        if (attrs) {
            for(var i = 0; i < attrs.length; i++ ){ //no mapping or preview => generat all options static
                attrContent += attrs[i].key + "='" + attrs[i].value +"' ";
            }
        }

        return attrContent;
    }

    buildCustomInlineStyles(res : OntegoResource, preview : boolean,  dataObj : string, element : any) : string {
        let styleContent :string = "";

        var styles = element.properties.styles;
        if (styles && styles.children) {
            for(var i = 0; i < styles.children.length; i++ ){ //no mapping or preview => generat all options static
                styleContent += styles.children[i].leftColumn + ":" + styles.children[i].rightColumn +"; ";
            }
        }
        return styleContent;
    }

    buildButton(res: OntegoResource, preview: boolean, dataObj : string, button: any): string {
        let buttonContent: string = "<md-button id='" + button.properties.name.value + "' ";
        buttonContent += "class='"
        buttonContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, button, "appearance");
        buttonContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, button, "color");
        buttonContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, button, "hue");
        buttonContent += "' ";
        
        if (button.properties.enabled && button.properties.enabled.value) {
            let isEnabled : string = button.properties.enabled.value;
            if (isEnabled == "true") {
                buttonContent += "ng-disabled='false' "; 
            }
            else {
                buttonContent += "ng-disabled='true' "; 
            }
        }

        buttonContent += this.buildLayoutData(res, preview, dataObj, button);
        buttonContent += this.buildCustomization(res, preview, dataObj, button);

        buttonContent += this.createCheSelectEvent(preview, button); 
        buttonContent += this.createCheDragEvent(preview, button); 
        
        buttonContent += ">";
                
        buttonContent += this.decideMappingOrDefaultValue(res, preview, dataObj, button, "text");
        
        buttonContent += "</md-button>\n";
        return buttonContent;
    }

    buildFAB(res: OntegoResource, preview: boolean, dataObj : string, fab: any): string {
        let fabContent: string = "<md-button id='" + fab.properties.name.value + "' ";
        fabContent += "class='md-fab "
        fabContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, fab, "color");
        fabContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, fab, "positionFixed");
        fabContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, fab, "hue");
        fabContent += "' ";
        
        let isEnabled : string = this.decideMappingOrDefaultValue(res, preview, dataObj, fab, "enabled");
        fabContent += "ng-disabled='"+ !isEnabled + "' "; 

        fabContent += this.buildCustomization(res, preview, dataObj, fab);

        fabContent += this.createCheSelectEvent(preview, fab);
        fabContent += this.createCheDragEvent(preview, fab);
        
        fabContent += ">\n";

        //icon
        fabContent += "<md-icon md-svg-src='"
        fabContent += this.decideMappingOrDefaultValue(res, preview, dataObj, fab, "icon");
        fabContent += "'></md-icon> \n";

        //copy icon
        if(fab.properties.icon && fab.properties.icon.filePath){
            this.ontegoResourceHandler.copyResource(preview, this.workspaceRoot, res.projectName, fab.properties.icon.filePath);
        }

        fabContent += "</md-button>\n";
        return fabContent;
    }

    buildContent(res: OntegoResource, preview: boolean, dataObj : string, content: any): string {
        let contentContent: string = "<md-content id='" + content.properties.name.value + "' ";
        contentContent += this.createCheSelectEvent(preview, content);        
        contentContent += this.createCheDragEvent(preview, content);        
        contentContent += this.buildCustomization(res, preview, dataObj, content);       
        contentContent += "flex='grow' ";    

        if(preview){
            contentContent += " otgcontentwrapper='true' ";
        }

        contentContent += ">\n";
        contentContent += "<!--otg-inner-html-->";
        contentContent += "</md-content>\n";
        return contentContent;
    }

    buildToolbar(res: OntegoResource, preview: boolean, dataObj : string,toolbar: any): string {
        let toolbarContent: string = "<md-toolbar id='" + toolbar.properties.name.value + "' "; 
        
        toolbarContent += "class='"
        toolbarContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, toolbar, "color");
        toolbarContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, toolbar, "hue");
        toolbarContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, toolbar, "size");
        toolbarContent += "' ";   

        toolbarContent += this.buildCustomization(res, preview, dataObj, toolbar);
        toolbarContent += this.createCheSelectEvent(preview, toolbar);
        toolbarContent += this.createCheDragEvent(preview, toolbar);

        toolbarContent += ">\n";

        toolbarContent += "<div class='md-toolbar-tools' ";
        if(preview){
            toolbarContent += " otgcontentwrapper='true' ";
        }
        toolbarContent += ">\n";
                
        toolbarContent += "<!--otg-inner-html-->";
      
        toolbarContent += "</div>\n";
        toolbarContent += "</md-toolbar>\n";
        return toolbarContent;
    }

    buildLayout(res: OntegoResource, preview: boolean, dataObj : string,layout: any): string {
        let layoutContent: string = "<div id='" + layout.properties.name.value + "' "; 

        layoutContent += "layout='" + this.decideMappingOrDefaultValue(res, preview, dataObj, layout, "layout") + "' ";
        
        if(layout.properties.layoutXS != "default"){
            layoutContent += "layout-xs='" + this.decideMappingOrDefaultValue(res, preview, dataObj, layout, "layoutXS") + "' ";
        }

        if(layout.properties.layoutS != "default"){
            layoutContent += "layout-sm ='" + this.decideMappingOrDefaultValue(res, preview, dataObj, layout, "layoutS") + "' ";
        }

        if(layout.properties.layoutM != "default"){
            layoutContent += "layout-md ='" + this.decideMappingOrDefaultValue(res, preview, dataObj, layout, "layoutM") + "' ";
        }

        if(layout.properties.layoutL != "default"){
            layoutContent += "layout-lg ='" + this.decideMappingOrDefaultValue(res, preview, dataObj, layout, "layoutL") + "' ";
        }
        
        if(layout.properties.layoutXL != "default"){
            layoutContent += "layout-xl ='" + this.decideMappingOrDefaultValue(res, preview, dataObj, layout, "layoutXL") + "' ";
        }

        if(preview){
            layoutContent += " otgcontentwrapper='true' ";
        }

        layoutContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, layout, "layoutmargin");
        layoutContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, layout, "layoutpadding");
        layoutContent += this.decideMappingOrDefaultValueLn(res, preview, dataObj, layout, "layoutfill");
        
        layoutContent += this.buildLayoutData(res, preview, dataObj, layout);
        layoutContent += this.buildCustomization(res, preview, dataObj, layout);

        layoutContent += this.createCheSelectEvent(preview, layout);
        layoutContent += this.createCheDragEvent(preview, layout);
        layoutContent += ">\n";
           
        layoutContent += "<!--otg-inner-html-->";
      
        layoutContent += "</div>\n";

        return layoutContent;
    }

    buildHeadline(res: OntegoResource, preview: boolean, dataObj : string, hl: any): string {
        let tag : string = hl.properties.size.value; //h1, h2 and so on
       
        let hlContent: string = "<" + tag + " ";
        hlContent += "id='" + hl.properties.name.value + "' "; 
        hlContent += this.buildCustomization(res, preview, dataObj, hl);
        hlContent += this.buildLayoutData(res, preview, dataObj, hl);
        hlContent += this.createCheSelectEvent(preview, hl);
        hlContent += this.createCheDragEvent(preview, hl);
        hlContent += ">"
        
        hlContent += this.decideMappingOrDefaultValue(res, preview, dataObj, hl, "text");
        
        hlContent += "</" + tag + ">\n";

        return hlContent;
    }

    buildSubheadline(res: OntegoResource, preview: boolean, dataObj : string, shl: any): string {
        let shlContent: string = "<md-subheader ";
        shlContent += "id='" + shl.properties.name.value + "' "; 
        shlContent += this.buildCustomization(res, preview, dataObj, shl);
        shlContent += this.createCheSelectEvent(preview, shl);
        shlContent += this.createCheDragEvent(preview, shl);
        shlContent += this.buildLayoutData(res, preview, dataObj, shl);
        shlContent += ">"

        shlContent += this.decideMappingOrDefaultValue(res, preview, dataObj, shl, "text");
        
        shlContent += "</md-subheader>\n";

        return shlContent;
    }

    buildParagraph(res: OntegoResource, preview: boolean, dataObj : string, p: any): string {
        let pContent: string = "<p ";
        pContent += "id='" + p.properties.name.value + "' "; 
        pContent += this.buildCustomization(res, preview, dataObj, p);
        pContent += this.createCheSelectEvent(preview, p);
        pContent += this.createCheDragEvent(preview, p);
        pContent += this.buildLayoutData(res, preview, dataObj, p);
        pContent += ">"

        pContent += this.decideMappingOrDefaultValue(res, preview, dataObj, p, "text");
        
        pContent += "</p>\n";

        return pContent;
    }

    buildLabel(res: OntegoResource, preview: boolean, dataObj : string, label: any): string {
        let labelContent: string = "<label id='" + label.properties.name.value + "'";
        labelContent += this.buildCustomization(res, preview, dataObj, label);
        labelContent += this.createCheSelectEvent(preview, label);
        labelContent += this.createCheDragEvent(preview, label);
        labelContent += this.buildLayoutData(res, preview, dataObj, label);
        labelContent += ">";
        labelContent += this.decideMappingOrDefaultValue(res, preview, dataObj, label, "text");
        labelContent += "</label>\n";
        return labelContent;
    }

    buildInput(res: OntegoResource, preview: boolean, dataObj : string, input: any): string {
        let inputContent: string = "<md-input-container id='" + input.properties.name.value + "' ";
        inputContent += this.buildCustomization(res, preview, dataObj, input);
        inputContent += this.createCheSelectEvent(preview, input);
        inputContent += this.createCheDragEvent(preview, input);
        inputContent += this.buildLayoutData(res, preview, dataObj, input);
        inputContent += ">\n";

        let label : string = this.decideMappingOrDefaultValue(res, preview, dataObj, input, "label");
        if(label && label.length > 0){
            inputContent += "<label>" + label + "</label>\n";
        }
        
        inputContent += "<input ";
        
        if (preview) {
            inputContent += "value='" + this.decideMappingOrDefaultValue(res, preview, dataObj, input, "value") + "' ";
        } else {
            inputContent += "ng-model='" + dataObj + "." + input.properties.name.value + ".value.value' ";
        }

        let placeholder : string = this.decideMappingOrDefaultValue(res, preview, dataObj, input, "placeholder");
        if(placeholder && placeholder.length > 0){
            inputContent += "placeholder='" + placeholder + "' ";
        }
        inputContent += this.decideMappingOrDefaultValue(res, preview, dataObj, input, "text");
        
        inputContent += ">\n";
        inputContent += "</md-input-container>\n";
        return inputContent;
    }


    buildSelect(res: OntegoResource, preview: boolean, dataObj : string, select: any): string {
        let selectContent: string = "<md-input-container id='" + select.properties.name.value + "' ";
        selectContent += this.buildCustomization(res, preview, dataObj, select);
        selectContent += this.createCheSelectEvent(preview, select);
        selectContent += this.createCheDragEvent(preview, select);
        selectContent += this.buildLayoutData(res, preview, dataObj, select);
        selectContent += ">\n";

        let label : string = this.decideMappingOrDefaultValue(res, preview, dataObj, select, "label");
        if(label && label.length > 0){
            selectContent += "<label>" + label + "</label>\n";
        }
        
        if(preview){ //render selected value for preview
          selectContent += "<script>"
          selectContent += "angular.element($(\"[ng-view]\")[0]).scope()." + select.properties.name.value  + " = {value : \"" + select.properties.value + "\"};"; 
          selectContent += "</script>"
        }

        selectContent += "<md-select ng-model='" + select.properties.name.value + ".value" + "' >\n";

        if(this.isUseMapping(res, preview, select, "options")){ //use ng repeat to generate options from mapping data
            selectContent += "<md-option ng-repeat='option in " + dataObj + "." +  select.properties.name.value + ".options' value='{{option.value}}'>"
            selectContent += "{{option.label}}";
            selectContent += "</md-option>\n"; 
        
        }else{
            var options = select.properties.options;
            for(var i = 0; i < options.length; i++ ){ //no mapping or preview => generat all options static
                selectContent += "<md-option value='" +  options[i].key + "'>"
                selectContent += options[i].value;
                selectContent += "</md-option>\n"; 
            }
        }

        selectContent += "</md-select>\n";
        selectContent += "</md-input-container>\n";
        return selectContent;
    }

    buildList(res: OntegoResource, preview: boolean, dataObj : string, list: any): string {
        let listContent: string = "<md-list id='" + list.properties.name.value + "' flex ";

        listContent += this.buildCustomization(res, preview, dataObj, list);
        listContent += this.createCheSelectEvent(preview, list);
        listContent += this.createCheDragEvent(preview, list);
        listContent += this.buildLayoutData(res, preview, dataObj, list);

        if(preview){
            listContent += " otgcontentwrapper='true' ";
        }

        listContent += ">\n";

        listContent += "<!--otg-inner-html-->";

        listContent += "</md-list>\n";
        return listContent;
    }

    buildListItem(res: OntegoResource, preview: boolean, dataObj : string, listItem: any): string {
        let listItemContent: string = "<md-list-item id='" + listItem.properties.name.value + "' class='md-2-line' ";

        listItemContent += this.buildCustomization(res, preview, dataObj, listItem);
        listItemContent += this.createCheSelectEvent(preview, listItem, true);
        listItemContent += this.createCheDragEvent(preview, listItem);

        if(!preview){
            listItemContent += "ng-repeat='" + listItem.properties.name.value + " in " + dataObj + "." +  listItem.properties.name.value + ".data' "; //ng-repeat ='li1 in uiData.li.data' 
        }
        
        if(preview){
            listItemContent += " otgcontentwrapper='true' ";
        }

        listItemContent += ">\n";

        listItemContent += "<!--otg-inner-html-->";

        listItemContent += "</<md-list-item>\n";
        return listItemContent;
    }
}