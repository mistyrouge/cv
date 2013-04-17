$(document).ready(function () {


    // FIXES FOR PAGE EDITOR MODE
    // remove IFRAMES that have non-local sources
    if (__isPageEditorMode) {
        $(document).find("iframe").each(function () {
            var myUrl = location.href;
            var m = ((myUrl||'')+'').match(/^http:\/\/[^/]+/); 
            var domain = m ? m[0] : "";
            if (this.src.indexOf("http") == 0 && this.src.indexOf(domain) == -1) {
                this.src = "";
            }
        });
    }

});