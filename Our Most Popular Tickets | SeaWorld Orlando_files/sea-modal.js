
(function ($) {

    var defaults = {
        css: {},
        iframeSrc: "",
        useIframe: true,                           // load external content in iframe
        position: "center",                      // center|target|targetCenter|css
        positionOffset: { top: 0, left: 0 },
        target: null,
        overflow: "scroll",
        autoOpen: true,
        iframeContentSelector: "",
        noShadow: false,
        scrolling: "yes"
    }

    $.fn.modal = function (command, options, onClose, onLoad) {
        return this.each(function () {
            if (typeof ($(this).data("modal")) == "undefined")
                $(this).data('modal', new $m(this, command, options, onClose, onLoad));
            else {
                var modal = $(this).data("modal");

                if (command == "open") {
                    modal.options.autoOpen = true;
                    if (typeof (options) != "undefined") {
                        for (prop in options) {
                            //alert(prop);
                            modal.options[prop] = options[prop];
                        }

                        //alert(modal.options.target.tagName);
                    }
                    modal.build();
                }
                else {
                    $(this).data('modal', new $m(this, command, options, onClose, onLoad));
                }
            }
        });
    }

    $.modal = function (e, c, o, oc, ol) {
        this.command = null;
        this.options = null;
        this.onClose = null;

        if (typeof (c) == "object") {
            this.options = $.extend(true, {}, defaults, c || {});
            this.onClose = o;
            this.onLoad = oc;
        }
        else if (typeof (c) != "undefined") {
            this.command = c;
            //this.options = $.extend({}, defaults, o || {});
        }
        else {
            this.options = $.extend({}, defaults, o || {});
            this.onClose = oc;
            this.onLoad = ol;
        }
        this.element = e;
        this.dialogBox = null;
        this.dialogBoxWrap = null;
        this.shadow = null;
        this.close = null;
        this.loader = null;
        this.name = "seaModal";

        if (this.options.autoOpen) {
            this.build();
        }
    }

    var $m = $.modal;
    $m.fn = $m.prototype = {
        rcmodal: '1.0.0'
    };

    $m.fn.extend = $m.extend = $.extend;

    $m.fn.extend({
        build: function () {
            var me = this;
            this.shadow = null;
            this.targetElement = this.options.target;

            if ($(".modal-overlay-shadow").length == 0)
                this.shadow = $("<div class=\"modal-overlay-shadow\"><div class=\"p2p-overlay-close\">&nbsp;</div></div>").appendTo("body");
            else
                this.shadow = $(".modal-overlay-shadow").get(0);

            this.dialogBoxWrap = $("<div class=\"modal-overlay\"></div>").appendTo("body");

            this.dialogBox = $('<div class="modal-overlay-inner"></div>').appendTo(this.dialogBoxWrap);
            $('<div class="modal-overlay-corner top-left">&nbsp;</div>').appendTo(this.dialogBox);
            $('<div class="modal-overlay-corner top-right">&nbsp;</div>').appendTo(this.dialogBox);
            $('<div class="modal-overlay-corner btm-left">&nbsp;</div>').appendTo(this.dialogBox);
            $('<div class="modal-overlay-corner btm-right">&nbsp;</div>').appendTo(this.dialogBox);

            // show a progress image when content is external
            this.loader = $("<div class='loader' style='float: left'><img src=\"/_assets/ParkSites/Images/ico/loading-white.gif\" /></div>").appendTo(this.shadow);

            var centerTop = Math.max(0, (($(window).height() - $(this.loader).height()) / 2) + $(window).scrollTop()) + "px";
            var centerLeft = Math.max(0, (($(window).width() - $(this.loader).width()) / 2) + $(window).scrollLeft()) + "px";
            $(this.loader).css({ position: "absolute", top: centerTop, left: centerLeft });

            if (me.options.noShadow != true) {
                $(this.shadow).css("display", "block").animate({ opacity: 0.7 }, 0);
            } else {
                $(this.shadow).css("display", "block");
            }

            // by default, content is from a URL but an in-page content can also be used
            if (this.options.iframeSrc == "") {
                var content = $(this.element).clone().html();
                if (content.indexOf("<") != 0)
                    content = "<span>" + content + "</span>";

                content = content.replace(/<:/g, "<").replace(/<\/:/g, "</");
                content = $.trim(content);

                $(content).appendTo(this.dialogBox);

                // css styles: height/width
                $(this.dialogBoxWrap).css({
                    display: "block",
                    opacity: 0
                })
            .css(this.options.css);

                var innerCss = {
                    width: this.options.css.width - 50,
                    height: this.options.css.height - 50
                };

                $(this.dialogBox).css(innerCss);

                this.positionModal();


                if (this.options.autoOpen)
                    this.open();

                // bind any events with the new markup
                this.bind();

            }
            // it's an external content, put it in an iframe
            else {


                this.showExternal();
                // bind any events with the new markup

            }
        }, // end build

        positionModal: function () {
            // position
            if (this.options.target == null)
                this.options.position = "center";

            switch (this.options.position) {
                case "target":
                    var top = $(this.targetElement).offset().top + 20 + this.options.positionOffset.top;
                    var left = $(this.targetElement).offset().left + this.options.positionOffset.left;

                    $(this.dialogBoxWrap).css({
                        top: top,
                        left: left
                    });
                    break;
                case "targetCenter":
                    var top = $(this.targetElement).offset().top + 20;
                    var left = $(this.targetElement).offset().left;
                    var bottom = ($(this.targetElement).offset().top - $(window).scrollTop()) + $(this.dialogBoxWrap).height();
                    var right = left + $(this.dialogBoxWrap).width();
                    var tempCss = {
                        top: top,
                        left: left
                    };

                    // if the dialog will require scrolling, let's move it
                    if ((bottom > $(window).height()) || (right > $(window).width())) {
                        var centerTop = Math.max(0, (($(window).height() - $(this.dialogBoxWrap).height()) / 2) + $(window).scrollTop()) + "px";
                        var centerLeft = Math.max(0, (($(window).width() - $(this.dialogBoxWrap).width()) / 2) + $(window).scrollLeft()) + "px";
                        tempCss = {
                            top: centerTop,
                            left: centerLeft
                        }

                    }

                    $(this.dialogBoxWrap).css(tempCss);
                    break;
                default: // center
                    var centerTop = Math.max(0, (($(window).height() - $(this.dialogBoxWrap).height()) / 2) + $(window).scrollTop()) + "px";
                    var centerLeft = Math.max(0, (($(window).width() - $(this.dialogBoxWrap).width()) / 2) + $(window).scrollLeft()) + "px";
                    $(this.dialogBoxWrap).css({
                        top: centerTop,
                        left: centerLeft
                    });
                    break;

            }
        }, // end positionModal

        showExternal: function () {
            var me = this;

            // css styles: height/width
            $(this.dialogBoxWrap).css({
                display: "block",
                opacity: 0
            })
            .css(this.options.css);

            var innerCss = {
                width: this.options.css.width - 50,
                height: this.options.css.height - 50
            };

            $(this.dialogBox).css(innerCss);

            var tempContent;
            var tempHeight = 0;

            if (this.options.useIframe) {

                this.element = $("<iframe ID=\"iframePopup\" frameborder='no' src='" + this.options.iframeSrc + "' style='overflow:" + this.options.overflow + "' scrolling='" + this.options.scrolling + "'></iframe>").appendTo(this.dialogBox);
                //                    $(this.dialogContent).load(function () {
                //                        //alert($(me.dialogBoxWrap.get(0)).height);
                //                        $(me.dialogBoxWrap).css("height", this.contentWindow.document.body.offsetHeight + 40 + "px");
                //                        //this.style.width = this.contentWindow.document.body.offsetWidth + "px";
                //                    });
                $(this.element).load(function () {
                    $(me.loader).remove();
                    $(tempContent).remove();

                    if (!me.options.useIframe && typeof (me.options.iframeContentSelector) != "undefined") {
                        me.element = $(me.options.iframeContentSelector, this.element).get(0);
                    }

                    if (me.options.autoOpen)
                        me.open();

                    me.bind();

                    var innerDoc = ($(me.element).get(0).contentDocument) ? $(me.element).get(0).contentDocument : $(me.element).get(0).contentWindow.document;
                    $(innerDoc).width(me.options.css.width);
                    $(innerDoc).height(me.options.css.height);

                    var heightAdjust = 10;
                    if ($.browser.msie && parseInt($.browser.version, 10) <= 7) {
                        heightAdjust += 100;
                    }

                    $(me.element).height($(innerDoc).height() - heightAdjust);

                    me.positionModal();
                });
            }
            else {
                $.ajax({
                    url: this.options.iframeSrc,
                    dataType: "html",
                    success: function (data) {
                        var content;
                        if (!me.options.useIframe && typeof (me.options.iframeContentSelector) != "undefined") {
                            content = $(me.options.iframeContentSelector, data).get(0);
                        }

                        //content = content.replace(/<:/g, "<").replace(/<\/:/g, "</");

                        me.element = $(content).appendTo(me.dialogBox);

                        $(me.element).addWidgets();

                        if (me.options.autoOpen)
                            me.open();

                        me.bind();

                        me.positionModal();
                    },
                    error: function (o, status, errorThrown) {
                        $("<p class='error'>ERROR: " + errorThrown + "</p>").appendTo(me.dialogBox);
                    }
                });
            }



        },  // end showIframe

        bind: function () {
            var me = this;

            $(this.close).bind("click", { me: this }, this.closeDialog);

            $(this.dialogBoxWrap).bind("closeDialog", { me: this }, function (e) { me.closeDialog(e, true); });

            $("html").bind("keyup", { me: this }, this.closeDialog);

        },  // end bind
        open: function () {
            // show the dialog
            $(this.dialogBoxWrap).animate({ opacity: 1.0 }, 0);
            $(this.loader).hide();
            this.close = $("<div class=\"modal-overlay-close\">&nbsp;</div>").appendTo(this.dialogBoxWrap);
            if (typeof (this.onLoad) == "function")
                this.onLoad(this);
        },  // end open
        closeDialog: function (e, force) {
            if (force || ($(e.target).attr("class") == "modal-overlay-close" || e.keyCode === 27) && $(e.data.me.shadow).css("display") == "block") {
                $(e.data.me.close).unbind("click", e.data.me.closeDialog);
                $("html").unbind("keyup", e.data.me.closeDialog);
                $(e.data.me.dialogBoxWrap).remove();

                $(e.data.me.shadow).remove();

                if (typeof (e.data.me.onClose) == "function")
                    e.data.me.onClose();
            }
        } // end close
    }); //end extend
})(jQuery);




