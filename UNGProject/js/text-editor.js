/**
 * This file provides classes needed by the text editor
 */

/**
 * Editors
 * editors must implement the following methods :
 * load : load the editor in the current page
 * saveEdition : save the edition made by this editor to the current document
 * loadContentFromDocument : display the content of the specified document in the editor
 */
Xinha = function() {
    this.name = "Xinha";                // name to use in dialog boxes
    this.objectName = "Xinha"  // name of the object reference
    this.load = function() {
        _editor_url  = "xinha/";
        getCurrentPage().include("xinha/XinhaCore.js","script");
        getCurrentPage().include("xinha/config.js","script");
        xinha_init();
    }
    this.saveEdition = function() {
        getCurrentDocument().saveEdition(xinha_editors.input_area.getEditorContent());
    }
    this.loadContentFromDocument = function(doc) {
        var setText = function() {xinha_editors.input_area.setEditorContent(doc.getContent());}
        tryUntilSucceed(setText);
    }
    this.load();
}

AlohaInterface = function() {
    this.name = "Aloha";                // name to use in dialog boxes
    this.objectName = "AlohaInterface"  // name of the object reference
    this.load = function() {
        GENTICS_Aloha_base="aloha/aloha/";
        loadFile("aloha/aloha/aloha.js", "script", function(data) {
            eval(data);
            includeJS("aloha/aloha/plugins/com.gentics.aloha.plugins.Format/plugin.js");
            includeJS("aloha/aloha/plugins/com.gentics.aloha.plugins.Table/plugin.js");
            includeJS("aloha/aloha/plugins/com.gentics.aloha.plugins.List/plugin.js");
            includeJS("aloha/aloha/plugins/com.gentics.aloha.plugins.Link/plugin.js");
            $("div#page_content div.input").html("<div id='input_area'>test</div>");
            $("#input_area").css("min-height","15em").css("border","5px solid #3399FF").css("overflow","auto");
            $("#input_area").aloha();
        });
    }
    this.saveEdition = function() {
        getCurrentDocument().saveEdition(GENTICS.Aloha.editables[0].getContents());
    }
    this.loadContentFromDocument = function(doc) {
        var setText = function() {$("div.aloha_editable").html(doc.getContent());}
        tryUntilSucceed(setText);
    }
    this.load();
}

NicEdit = function() {
    this.name = "NicEdit";       // name to use in dialog boxes
    this.objectName = "NicEdit"  // name of the object reference
    this.instance = null;
    this.load = function() {
        var nic = this;
        loadFile("nicEdit/nicEdit.js","script",function(data) {
            eval(data);
            nic.instance = new nicEditor({iconsPath : 'nicEdit/nicEditorIcons.gif',fullPanel : true}).panelInstance('input_area');
        });
    }
    this.saveEdition = function() {
        getCurrentDocument().saveEdition($("div.input div.nicEdit-main").html());
    }
    this.loadContentFromDocument = function(doc) {
        if(this.instance) {this.instance.removeInstance('input_area');this.instance=null}
        $("#input_area").attr("value",doc.getContent());
        this.instance = new nicEditor({iconsPath : 'nicEdit/nicEditorIcons.gif',fullPanel : true}).panelInstance('input_area');
    }
    this.load();
}


TinyEdit = function() {
    this.name = "Tiny";       // name to use in dialog boxes
    this.objectName = "TinyEdit"  // name of the object reference
    this.load = function() {
        loadFile("tinyEdit/tinyEdit.js","script",function(data) {
            eval(data);
            new TINY.editor.edit('editor',{
                id:'input_area', // (required) ID of the textarea
                width:584, // (optional) width of the editor
                height:175, // (optional) heightof the editor
                cssclass:'te', // (optional) CSS class of the editor
                controlclass:'tecontrol', // (optional) CSS class of the buttons
                rowclass:'teheader', // (optional) CSS class of the button rows
                dividerclass:'tedivider', // (optional) CSS class of the button diviers
                controls:['bold', 'italic', 'underline', 'strikethrough', '|', 'subscript', 'superscript', '|', 'orderedlist', 'unorderedlist', '|' ,'outdent' ,'indent', '|', 'leftalign', 'centeralign', 'rightalign', 'blockjustify', '|', 'unformat', '|', 'undo', 'redo', 'n', 'font', 'size', 'style', '|', 'image', 'hr', 'link', 'unlink', '|', 'cut', 'copy', 'paste', 'print'], // (required) options you want available, a '|' represents a divider and an 'n' represents a new row
                footer:true, // (optional) show the footer
                fonts:['Verdana','Arial','Georgia','Trebuchet MS'],  // (optional) array of fonts to display
                xhtml:true, // (optional) generate XHTML vs HTML
                //cssfile:'style.css', // (optional) attach an external CSS file to the editor
                content:'starting content', // (optional) set the starting content else it will default to the textarea content
                css:'body{background-color:#ccc}', // (optional) attach CSS to the editor
                bodyid:'editor', // (optional) attach an ID to the editor body
                footerclass:'tefooter', // (optional) CSS class of the footer
                toggle:{text:'source',activetext:'wysiwyg',cssclass:'toggle'}, // (optional) toggle to markup view options
                resize:{cssclass:'resize'} // (optional) display options for the editor resize
            });
        });
    }
    this.saveEdition = function() {
        getCurrentDocument().saveEdition($("#input").attr("value"));
    }
    this.loadContentFromDocument = function(doc) {
        $("#input").attr("value",doc.getContent());
    }
    this.load();
}


/**
 * Text documents
 *
 * editable documents must override the following arguments and methods of JSONDocument prototype
 * type : a unique type ID
 * saveEdition : set the argument as the new content of the document. Change last modification time and display the changes
 * setAsCurrentDocument : set the document as currentDocument in the local storage and display its properties in the current page
 */

JSONDocument.prototype.type = "text";
JSONDocument.prototype.saveEdition = function(content) {
    this.setLastUser(getCurrentUser().getName());
    this.setContent(content);
    this.setLastModification(getCurrentTime());
    getCurrentPage().displayDocumentInformation(this);
}

