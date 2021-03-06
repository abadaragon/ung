/*
ERP5 dynamic gadget loader
Issues:
  - Browser allows load gadgets' file sonly from same origin (conisder use eval?)
  - 
*/


var ERP5={
    load: function () {
            // Load gadget layoyut by traversing DOM
            application = $("#application")
            gadget_list = application.find("[gadget]");
            
            // load application gadget
            ERP5.loadGadgetFromUrl(application);
            
            // Load siblings
            //gadget_list.each(function(i,v){ERP5.loadGadgetFromUrl($(this));});
    },

    save: function () {
            // XXX: Save gadget layoyut by traversing DOM and using some kind of storage
            console.log("save"); 
    },
        
    parse: function (data){
             // XXX: Parse an HTML document and get out .js and .css
             // XXX: load .css
             // XXX: load .jss (see requirejs)
//               $.ajax({url:"jquery-ui.js",
//                       type: "script"});

    },
      
    loadGadgetFromUrl: function(gadget) {
            // Load gadget's SPECs from URL
            url = gadget.attr("gadget")
            $.ajax({url:url,
                    success: function (data) {
                              ERP5.parse (data);
                              gadget.append("<div>" + data +  "</div>");
                              gadget.find("a").each(
                                function(){
                                  $(this).click(
                                    function(){
                                      alert("disabled"); return false;})}
                              )
                     
                  },
            });
            
    }
}
   

// init all when DOM is ready
$(document).ready(function() {
   ERP5.load();
 });
     
