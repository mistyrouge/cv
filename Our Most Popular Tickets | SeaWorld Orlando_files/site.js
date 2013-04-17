// ColorBox v1.3.10 - a full featured, light-weight, customizable lightbox based on jQuery 1.3
// Copyright (c) 2010 Jack Moore - jack@colorpowered.com
// Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
(function ($, window) {

    var 
    // ColorBox Default Settings.	
    // See http://colorpowered.com/colorbox for details.
	defaults = {
	    transition: "elastic",
	    speed: 300,
	    width: false,
	    initialWidth: "600",
	    innerWidth: false,
	    maxWidth: false,
	    height: false,
	    initialHeight: "450",
	    innerHeight: false,
	    maxHeight: false,
	    scalePhotos: true,
	    scrolling: true,
	    inline: false,
	    html: false,
	    iframe: false,
	    photo: false,
	    href: false,
	    title: false,
	    rel: false,
	    opacity: 0.9,
	    preloading: true,
	    current: "image {current} of {total}",
	    previous: "previous",
	    next: "next",
	    close: "close",
	    open: false,
	    loop: true,
	    slideshow: false,
	    slideshowAuto: true,
	    slideshowSpeed: 2500,
	    slideshowStart: "start slideshow",
	    slideshowStop: "stop slideshow",
	    onOpen: false,
	    onLoad: false,
	    onComplete: false,
	    onCleanup: false,
	    onClosed: false,
	    overlayClose: true,
	    escKey: true,
	    arrowKey: true
	},

    // Abstracting the HTML and event identifiers for easy rebranding
	colorbox = 'colorbox',
	prefix = 'cbox',

    // Events	
	event_open = prefix + '_open',
	event_load = prefix + '_load',
	event_complete = prefix + '_complete',
	event_cleanup = prefix + '_cleanup',
	event_closed = prefix + '_closed',
	event_purge = prefix + '_purge',
	event_loaded = prefix + '_loaded',

    // Special Handling for IE
	isIE = $.browser.msie && !$.support.opacity, // feature detection alone gave a false positive on at least one phone browser and on some development versions of Chrome.
	isIE6 = isIE && $.browser.version < 7,
	event_ie6 = prefix + '_IE6',

    // Cached jQuery Object Variables
	$overlay,
	$box,
	$wrap,
	$content,
	$topBorder,
	$leftBorder,
	$rightBorder,
	$bottomBorder,
	$related,
	$window,
	$loaded,
	$loadingBay,
	$loadingOverlay,
	$title,
	$current,
	$slideshow,
	$next,
	$prev,
	$close,

    // Variables for cached values or use across multiple functions
	interfaceHeight,
	interfaceWidth,
	loadedHeight,
	loadedWidth,
	element,
	bookmark,
	index,
	settings,
	open,
	active,
	closing = false,

	publicMethod,
	boxElement = prefix + 'Element';

    // ****************
    // HELPER FUNCTIONS
    // ****************

    // jQuery object generator to reduce code size
    function $div(id, css) {
        id = id ? ' id="' + prefix + id + '"' : '';
        css = css ? ' style="' + css + '"' : '';
        return $('<div' + id + css + '/>');
    }

    // Convert % values to pixels
    function setSize(size, dimension) {
        dimension = dimension === 'x' ? $window.width() : $window.height();
        return (typeof size === 'string') ? Math.round((size.match(/%/) ? (dimension / 100) * parseInt(size, 10) : parseInt(size, 10))) : size;
    }

    // Checks an href to see if it is a photo.
    // There is a force photo option (photo: true) for hrefs that cannot be matched by this regex.
    function isImage(url, target) {
        url = $.isFunction(url) ? url.call(target) : url;
        return settings.photo || url.match(/\.(gif|png|jpg|jpeg|bmp)(?:\?([^#]*))?(?:#(\.*))?$/i);
    }

    // Assigns function results to their respective settings.  This allows functions to be used as values.
    function process(settings) {
        for (var i in settings) {
            if ($.isFunction(settings[i]) && i.substring(0, 2) !== 'on') { // checks to make sure the function isn't one of the callbacks, they will be handled at the appropriate time.
                settings[i] = settings[i].call(element);
            }
        }
        settings.rel = settings.rel || element.rel || 'nofollow';
        settings.href = settings.href || $(element).attr('href');
        settings.title = settings.title || element.title;
        return settings;
    }

    function trigger(event, callback) {
        if (callback) {
            callback.call(element);
        }
        $.event.trigger(event);
    }

    // Slideshow functionality
    function slideshow() {
        var 
		timeOut,
		className = prefix + 'Slideshow_',
		start,
		stop,
		clear;

        if (settings.slideshow && $related[1]) {
            start = function () {
                $slideshow
					.text(settings.slideshowStop)
					.bind(event_complete, function () {
					    timeOut = setTimeout(publicMethod.next, settings.slideshowSpeed);
					})
					.bind(event_load, function () {
					    clearTimeout(timeOut);
					}).one("click", function () {
					    stop();
					});
                $box.removeClass(className + "off").addClass(className + "on");
            };

            stop = function () {
                clearTimeout(timeOut);
                $slideshow
					.text(settings.slideshowStart)
					.unbind(event_complete + ' ' + event_load)
					.one("click", function () {
					    start();
					    timeOut = setTimeout(publicMethod.next, settings.slideshowSpeed);
					});
                $box.removeClass(className + "on").addClass(className + "off");
            };

            $slideshow.bind(event_closed, function () {
                $slideshow.unbind();
                clearTimeout(timeOut);
                $box.removeClass(className + "off " + className + "on");
            });

            if (settings.slideshowAuto) {
                start();
            } else {
                stop();
            }
        }
    }

    function launch(elem) {
        if (!closing) {

            element = elem;

            settings = process($.extend({}, $.data(element, colorbox)));

            $related = $(element);

            index = 0;

            if (settings.rel !== 'nofollow') {
                $related = $('.' + boxElement).filter(function () {
                    var relRelated = $.data(this, colorbox).rel || this.rel;
                    return (relRelated === settings.rel);
                });
                index = $related.index(element);

                // Check direct calls to ColorBox.
                if (index === -1) {
                    $related = $related.add(element);
                    index = $related.length - 1;
                }
            }

            if (!open) {
                open = active = true; // Prevents the page-change action from queuing up if the visitor holds down the left or right keys.

                $box.show();

                bookmark = element;

                try {
                    bookmark.blur(); // Remove the focus from the calling element.
                } catch (e) { }

                // +settings.opacity avoids a problem in IE when using non-zero-prefixed-string-values, like '.5'
                $overlay.css({ "opacity": +settings.opacity, "cursor": settings.overlayClose ? "pointer" : "auto" }).show();

                // Opens inital empty ColorBox prior to content being loaded.
                settings.w = setSize(settings.initialWidth, 'x');
                settings.h = setSize(settings.initialHeight, 'y');
                publicMethod.position(0);

                if (isIE6) {
                    $window.bind('resize.' + event_ie6 + ' scroll.' + event_ie6, function () {
                        $overlay.css({ width: $window.width(), height: $window.height(), top: $window.scrollTop(), left: $window.scrollLeft() });
                    }).trigger('scroll.' + event_ie6);
                }

                trigger(event_open, settings.onOpen);

                $current.add($prev).add($next).add($slideshow).add($title).hide();

                $close.html(settings.close).show();
            }

            publicMethod.load(true);
        }
    }

    // ****************
    // PUBLIC FUNCTIONS
    // Usage format: $.fn.colorbox.close();
    // Usage from within an iframe: parent.$.fn.colorbox.close();
    // ****************

    publicMethod = $.fn[colorbox] = $[colorbox] = function (options, callback) {
        var $this = this, autoOpen;

        if (!$this[0] && $this.selector) { // if a selector was given and it didn't match any elements, go ahead and exit.
            return $this;
        }

        options = options || {};

        if (callback) {
            options.onComplete = callback;
        }

        if (!$this[0] || $this.selector === undefined) { // detects $.colorbox() and $.fn.colorbox()
            $this = $('<a/>');
            options.open = true; // assume an immediate open
        }

        $this.each(function () {
            $.data(this, colorbox, $.extend({}, $.data(this, colorbox) || defaults, options));
            $(this).addClass(boxElement);
        });

        autoOpen = options.open;

        if ($.isFunction(autoOpen)) {
            autoOpen = autoOpen.call($this);
        }

        if (autoOpen) {
            launch($this[0]);
        }

        return $this;
    };

    // Initialize ColorBox: store common calculations, preload the interface graphics, append the html.
    // This preps colorbox for a speedy open when clicked, and lightens the burdon on the browser by only
    // having to run once, instead of each time colorbox is opened.
    publicMethod.init = function () {
        // Create & Append jQuery Objects
        $window = $(window);
        $box = $div().attr({ id: colorbox, 'class': isIE ? prefix + 'IE' : '' });
        $overlay = $div("Overlay", isIE6 ? 'position:absolute' : '').hide();

        $wrap = $div("Wrapper");
        $content = $div("Content").append(
			$loaded = $div("LoadedContent", 'width:0; height:0; overflow:hidden'),
			$loadingOverlay = $div("LoadingOverlay").add($div("LoadingGraphic")),
			$title = $div("Title"),
			$current = $div("Current"),
			$next = $div("Next"),
			$prev = $div("Previous"),
			$slideshow = $div("Slideshow").bind(event_open, slideshow),
			$close = $div("Close")
		);
        $wrap.append( // The 3x3 Grid that makes up ColorBox
			$div().append(
				$div("TopLeft"),
				$topBorder = $div("TopCenter"),
				$div("TopRight")
			),
			$div(false, 'clear:left').append(
				$leftBorder = $div("MiddleLeft"),
				$content,
				$rightBorder = $div("MiddleRight")
			),
			$div(false, 'clear:left').append(
				$div("BottomLeft"),
				$bottomBorder = $div("BottomCenter"),
				$div("BottomRight")
			)
		).children().children().css({ 'float': 'left' });

        $loadingBay = $div(false, 'position:absolute; width:9999px; visibility:hidden; display:none');

        $('.content-container').append($overlay, $box.append($wrap, $loadingBay));

        $content.children()
		.hover(function () {
		    $(this).addClass('hover');
		}, function () {
		    $(this).removeClass('hover');
		}).addClass('hover');

        // Cache values needed for size calculations
        interfaceHeight = $topBorder.height() + $bottomBorder.height() + $content.outerHeight(true) - $content.height(); //Subtraction needed for IE6
        interfaceWidth = $leftBorder.width() + $rightBorder.width() + $content.outerWidth(true) - $content.width();
        loadedHeight = $loaded.outerHeight(true);
        loadedWidth = $loaded.outerWidth(true);

        // Setting padding to remove the need to do size conversions during the animation step.
        $box.css({ "padding-bottom": interfaceHeight, "padding-right": interfaceWidth }).hide();

        // Setup button events.
        $next.click(publicMethod.next);
        $prev.click(publicMethod.prev);
        $close.click(publicMethod.close);

        // Adding the 'hover' class allowed the browser to load the hover-state
        // background graphics.  The class can now can be removed.
        $content.children().removeClass('hover');

        $('.' + boxElement).live('click', function (e) {
            // checks to see if it was a non-left mouse-click and for clicks modified with ctrl, shift, or alt.
            if (!((e.button !== 0 && typeof e.button !== 'undefined') || e.ctrlKey || e.shiftKey || e.altKey)) {
                e.preventDefault();
                launch(this);
            }
        });

        $overlay.click(function () {
            if (settings.overlayClose) {
                publicMethod.close();
            }
        });

        // Set Navigation Key Bindings
        $(document).bind("keydown", function (e) {
            if (open && settings.escKey && e.keyCode === 27) {
                e.preventDefault();
                publicMethod.close();
            }
            if (open && settings.arrowKey && !active && $related[1]) {
                if (e.keyCode === 37 && (index || settings.loop)) {
                    e.preventDefault();
                    $prev.click();
                } else if (e.keyCode === 39 && (index < $related.length - 1 || settings.loop)) {
                    e.preventDefault();
                    $next.click();
                }
            }
        });
    };

    publicMethod.remove = function () {
        $box.add($overlay).remove();
        $('.' + boxElement).die('click').removeData(colorbox).removeClass(boxElement);
    };

    publicMethod.position = function (speed, loadedCallback) {
        var 
		animate_speed,
        // keeps the top and left positions within the browser's viewport.
		posTop = Math.max(document.documentElement.clientHeight - settings.h - loadedHeight - interfaceHeight, 0) / 2 + $window.scrollTop(),
		posLeft = Math.max($window.width() - settings.w - loadedWidth - interfaceWidth, 0) / 2 + $window.scrollLeft();

        // setting the speed to 0 to reduce the delay between same-sized content.
        animate_speed = ($box.width() === settings.w + loadedWidth && $box.height() === settings.h + loadedHeight) ? 0 : speed;

        // this gives the wrapper plenty of breathing room so it's floated contents can move around smoothly,
        // but it has to be shrank down around the size of div#colorbox when it's done.  If not,
        // it can invoke an obscure IE bug when using iframes.
        $wrap[0].style.width = $wrap[0].style.height = "9999px";

        function modalDimensions(that) {
            // loading overlay height has to be explicitly set for IE6.
            $topBorder[0].style.width = $bottomBorder[0].style.width = $content[0].style.width = that.style.width;
            $loadingOverlay[0].style.height = $loadingOverlay[1].style.height = $content[0].style.height = $leftBorder[0].style.height = $rightBorder[0].style.height = that.style.height;
        }

        $box.dequeue().animate({ width: settings.w + loadedWidth, height: settings.h + loadedHeight, top: posTop, left: posLeft }, {
            duration: animate_speed,
            complete: function () {
                modalDimensions(this);

                active = false;

                // shrink the wrapper down to exactly the size of colorbox to avoid a bug in IE's iframe implementation.
                $wrap[0].style.width = (settings.w + loadedWidth + interfaceWidth) + "px";
                $wrap[0].style.height = (settings.h + loadedHeight + interfaceHeight) + "px";

                if (loadedCallback) {
                    loadedCallback();
                }
            },
            step: function () {
                modalDimensions(this);
            }
        });
    };

    publicMethod.resize = function (options) {
        if (open) {
            options = options || {};

            if (options.width) {
                settings.w = setSize(options.width, 'x') - loadedWidth - interfaceWidth;
            }
            if (options.innerWidth) {
                settings.w = setSize(options.innerWidth, 'x');
            }
            $loaded.css({ width: settings.w });

            if (options.height) {
                settings.h = setSize(options.height, 'y') - loadedHeight - interfaceHeight;
            }
            if (options.innerHeight) {
                settings.h = setSize(options.innerHeight, 'y');
            }
            if (!options.innerHeight && !options.height) {
                var $child = $loaded.wrapInner("<div style='overflow:auto'></div>").children(); // temporary wrapper to get an accurate estimate of just how high the total content should be.
                settings.h = $child.height();
                $child.replaceWith($child.children()); // ditch the temporary wrapper div used in height calculation
            }
            $loaded.css({ height: settings.h });

            publicMethod.position(settings.transition === "none" ? 0 : settings.speed);
        }
    };

    publicMethod.prep = function (object) {
        if (!open) {
            return;
        }

        var photo,
		speed = settings.transition === "none" ? 0 : settings.speed;

        $window.unbind('resize.' + prefix);
        $loaded.remove();
        $loaded = $div('LoadedContent').html(object);

        function getWidth() {
            settings.w = settings.w || $loaded.width();
            settings.w = settings.mw && settings.mw < settings.w ? settings.mw : settings.w;
            return settings.w;
        }
        function getHeight() {
            settings.h = settings.h || $loaded.height();
            settings.h = settings.mh && settings.mh < settings.h ? settings.mh : settings.h;
            return settings.h;
        }

        $loaded.hide()
		.appendTo($loadingBay.show())// content has to be appended to the DOM for accurate size calculations.
		.css({ width: getWidth(), overflow: settings.scrolling ? 'auto' : 'hidden' })
		.css({ height: getHeight() })// sets the height independently from the width in case the new width influences the value of height.
		.prependTo($content);

        $loadingBay.hide();

        // floating the IMG removes the bottom line-height and fixed a problem where IE miscalculates the width of the parent element as 100% of the document width.
        $('#' + prefix + 'Photo').css({ cssFloat: 'none', marginLeft: 'auto', marginRight: 'auto' });

        // Hides SELECT elements in IE6 because they would otherwise sit on top of the overlay.
        if (isIE6) {
            $('select').not($box.find('select')).filter(function () {
                return this.style.visibility !== 'hidden';
            }).css({ 'visibility': 'hidden' }).one(event_cleanup, function () {
                this.style.visibility = 'inherit';
            });
        }

        function setPosition(s) {
            var prev, prevSrc, next, nextSrc, total = $related.length, loop = settings.loop;
            publicMethod.position(s, function () {
                function defilter() {
                    if (isIE) {
                        //IE adds a filter when ColorBox fades in and out that can cause problems if the loaded content contains transparent pngs.
                        $box[0].style.filter = false;
                    }
                }

                if (!open) {
                    return;
                }

                if (isIE) {
                    //This fadeIn helps the bicubic resampling to kick-in.
                    if (photo) {
                        $loaded.fadeIn(100);
                    }
                }

                $loaded.show();

                trigger(event_loaded);

                $title.show().html(settings.title);

                if (total > 1) { // handle grouping
                    $current.html(settings.current.replace(/\{current\}/, index + 1).replace(/\{total\}/, total)).show();

                    $next[(loop || index < total - 1) ? "show" : "hide"]().html(settings.next);
                    $prev[(loop || index) ? "show" : "hide"]().html(settings.previous);

                    prev = index ? $related[index - 1] : $related[total - 1];
                    next = index < total - 1 ? $related[index + 1] : $related[0];

                    if (settings.slideshow) {
                        $slideshow.show();
                        if (index === total - 1 && !loop && $box.is('.' + prefix + 'Slideshow_on')) {
                            $slideshow.click();
                        }
                    }

                    // Preloads images within a rel group
                    if (settings.preloading) {
                        nextSrc = $.data(next, colorbox).href || next.href;
                        prevSrc = $.data(prev, colorbox).href || prev.href;

                        if (isImage(nextSrc, next)) {
                            $('<img/>')[0].src = nextSrc;
                        }

                        if (isImage(prevSrc, prev)) {
                            $('<img/>')[0].src = prevSrc;
                        }
                    }
                }

                $loadingOverlay.hide();

                if (settings.transition === 'fade') {
                    $box.fadeTo(speed, 1, function () {
                        defilter();
                    });
                } else {
                    defilter();
                }

                $window.bind('resize.' + prefix, function () {
                    publicMethod.position(0);
                });

                trigger(event_complete, settings.onComplete);
            });
        }

        if (settings.transition === 'fade') {
            $box.fadeTo(speed, 0, function () {
                setPosition(0);
            });
        } else {
            setPosition(speed);
        }
    };

    publicMethod.load = function (launched) {
        var href, img, setResize, prep = publicMethod.prep;

        active = true;
        element = $related[index];

        if (!launched) {
            settings = process($.extend({}, $.data(element, colorbox)));
        }

        trigger(event_purge);

        trigger(event_load, settings.onLoad);

        settings.h = settings.height ?
				setSize(settings.height, 'y') - loadedHeight - interfaceHeight :
				settings.innerHeight && setSize(settings.innerHeight, 'y');

        settings.w = settings.width ?
				setSize(settings.width, 'x') - loadedWidth - interfaceWidth :
				settings.innerWidth && setSize(settings.innerWidth, 'x');

        // Sets the minimum dimensions for use in image scaling
        settings.mw = settings.w;
        settings.mh = settings.h;

        // Re-evaluate the minimum width and height based on maxWidth and maxHeight values.
        // If the width or height exceed the maxWidth or maxHeight, use the maximum values instead.
        if (settings.maxWidth) {
            settings.mw = setSize(settings.maxWidth, 'x') - loadedWidth - interfaceWidth;
            settings.mw = settings.w && settings.w < settings.mw ? settings.w : settings.mw;
        }
        if (settings.maxHeight) {
            settings.mh = setSize(settings.maxHeight, 'y') - loadedHeight - interfaceHeight;
            settings.mh = settings.h && settings.h < settings.mh ? settings.h : settings.mh;
        }

        href = settings.href;

        $loadingOverlay.show();

        if (settings.inline) {
            // Inserts an empty placeholder where inline content is being pulled from.
            // An event is bound to put inline content back when ColorBox closes or loads new content.
            $div().hide().insertBefore($(href)[0]).one(event_purge, function () {
                $(this).replaceWith($loaded.children());
            });
            prep($(href));
        } else if (settings.iframe) {
            // IFrame element won't be added to the DOM until it is ready to be displayed,
            // to avoid problems with DOM-ready JS that might be trying to run in that iframe.
            $box.one(event_loaded, function () {
                var $iframe = $("<iframe name='" + new Date().getTime() + "' frameborder=0" + (settings.scrolling ? "" : " scrolling='no'") + (isIE ? " allowtransparency='true'" : '') + " style='width:100%; height:100%; border:0; display:block;'/>");
                $iframe[0].src = settings.href;
                $iframe.appendTo($loaded).one(event_purge, function () {
                    $iframe[0].src = 'about:blank';
                });
            });

            prep(" ");
        } else if (settings.html) {
            prep(settings.html);
        } else if (isImage(href, element)) {
            img = new Image();
            img.onload = function () {
                var percent;
                img.onload = null;
                img.id = prefix + 'Photo';
                $(img).css({ border: 'none', display: 'block', cssFloat: 'left' });
                if (settings.scalePhotos) {
                    setResize = function () {
                        img.height -= img.height * percent;
                        img.width -= img.width * percent;
                    };
                    if (settings.mw && img.width > settings.mw) {
                        percent = (img.width - settings.mw) / img.width;
                        setResize();
                    }
                    if (settings.mh && img.height > settings.mh) {
                        percent = (img.height - settings.mh) / img.height;
                        setResize();
                    }
                }

                if (settings.h) {
                    img.style.marginTop = Math.max(settings.h - img.height, 0) / 2 + 'px';
                }

                if ($related[1] && (index < $related.length - 1 || settings.loop)) {
                    $(img).css({ cursor: 'pointer' }).click(publicMethod.next);
                }

                if (isIE) {
                    img.style.msInterpolationMode = 'bicubic';
                }

                setTimeout(function () { // Chrome will sometimes report a 0 by 0 size if there isn't pause in execution
                    prep(img);
                }, 1);
            };

            setTimeout(function () { // Opera 10.6+ will sometimes load the src before the onload function is set
                img.src = href;
            }, 1);

        } else {
            $div().appendTo($loadingBay).load(href, function (data, status, xhr) {
                prep(status === 'error' ? 'Request unsuccessful: ' + xhr.statusText : this);
            });
        }
    };

    // Navigates to the next page/image in a set.
    publicMethod.next = function () {
        if (!active) {
            index = index < $related.length - 1 ? index + 1 : 0;
            publicMethod.load();
        }
    };

    publicMethod.prev = function () {
        if (!active) {
            index = index ? index - 1 : $related.length - 1;
            publicMethod.load();
        }
    };

    // Note: to use this within an iframe use the following format: parent.$.fn.colorbox.close();
    publicMethod.close = function () {
        if (open && !closing) {
            closing = true;

            open = false;

            trigger(event_cleanup, settings.onCleanup);

            $window.unbind('.' + prefix + ' .' + event_ie6);

            $overlay.fadeTo('fast', 0);

            $box.stop().fadeTo('fast', 0, function () {

                trigger(event_purge);

                $loaded.remove();

                $box.add($overlay).css({ 'opacity': 1, cursor: 'auto' }).hide();

                try {
                    bookmark.focus();
                } catch (e) {
                    // do nothing
                }

                setTimeout(function () {
                    closing = false;
                    trigger(event_closed, settings.onClosed);
                }, 1);
            });
        }
    };

    // A method for fetching the current element ColorBox is referencing.
    // returns a jQuery object.
    publicMethod.element = function () {
        return $(element);
    };

    publicMethod.settings = defaults;

    // Initializes ColorBox when the DOM has loaded
    $(publicMethod.init);

} (jQuery, this));
; (function ($) {
    $.fn.trimWhiteSpace = function (recursive) {
        recursive = typeof (recursive) != 'undefined' ? recursive : false;

        this.contents().filter(function () {
            if (this.nodeType != 3 && recursive) {
                $(this).trimWhiteSpace();

                return false;
            }
            else {
                return !/\S/.test(this.nodeValue);
            }
        }).remove().css('word-spacing', 'normal');

        return this;
    }
})(jQuery);

/*
* jQuery carouselFrame 1.0
* Adds fly-up info tabs to carousel frames
*/
; (function ($) {
    $.fn.carouselFrame = function () {
        // define hoverIntent plugin as hover if it does not exist
        $.fn.hoverIntent = $.fn.hoverIntent || $.fn.hover;

        // handle hover on each frame
        this.hoverIntent(function () {
            // create reference variables
            var info = $('.info', this);
            var content = $('.content', info);

            // check if content exists
            if (content.text().length > 0) {
                // reposition the info container, store the top value and show the content
                info.not('.positioned').positionAbsolute()
					.data('top', parseInt(info.css('top')));

                // get height of content
                var contentHeight = parseInt($(content).outerHeight(true));

                // create initial value for top offset
                var offsetTop = 0;

                // add value to top offset if carousel is large style
                if ($(this).parents('.carousel-image-large').length > 0) {
                    offsetTop = 13;
                }

                // check if content height is greater than the image height
                if (contentHeight > (info.data('top') - offsetTop)) {
                    // set content height to same as image height
                    contentHeight = (info.data('top') - offsetTop);
                }

                // show content
                content.show();

                // show carousel item content
                $(info).animate({ top: '-=' + contentHeight }, {
                    duration: 100,
                    easing: 'easeOutCubic'
                });
            }
        }, function () {
            // create reference variables
            var info = $('.info', this);
            var content = $('.content', info);

            // check if content exists
            if (content.text().length > 0) {
                // hide carousel item content
                $(info).animate({ top: info.data('top') }, 100, 'easeOutCubic', function () {
                    // hide content
                    content.hide();
                });
            }
        }).bind('click', function (e) {
            e.preventDefault();

            // get href from frame header
            var href = $('.info > h3 a', this).attr('href');

            // check if href is set
            if (typeof href != 'undefined') {
                // redirect to href location
                if (href.indexOf(window.location.domain) == -1) {
                    window.open(href);
                } else {
                    self.document.location = href;
                }
            }
        }).each(function () {
            // get href from frame header
            var href = $('.info > h3 a', this).attr('href');

            // check if href is set
            if (typeof href != 'undefined') {
                $(this).addClass('frame-linked');
            }
        }).find('.info').not('.info-structured').addClass('info-structured').after('<div class="info-b"><div class="info-bl"><div class="info-br"></div></div></div>');

        return this;
    };
})(jQuery);
/*
* jQuery statusFill 1.0
* Fills status bar based on specified percent value
*/
; (function ($) {
    $.fn.statusFill = function (fill) {
        // set default for static fill
        var staticFill = true;

        // check if fill variable was passed
        if (typeof fill == 'undefined') {
            staticFill = false;
        }

        // iterate through each status bar
        this.each(function (i) {
            // default the "fill" variable to 0 if not passed
            if (!staticFill) {
                var currentVal = parseInt($(this).text());

                if (isNaN(currentVal)) {
                    fill = 0;
                }
                else {
                    fill = currentVal;
                }
            }

            // set a max fill of 100
            if (fill > 100) {
                fill = 100;
            }

            // set default width
            var width = 'auto';

            // set width
            if (fill < 99) {
                width = fill + '%';
            }

            // set new width and add text value
            $(this).width(width).text(fill + '%');
        });

        return this;
    }
})(jQuery);
/*
* jQuery Form Example Plugin 1.4.3
* Populate form inputs with example text that disappears on focus.
*
* e.g.
*  $('input#name').example('Bob Smith');
*  $('input[@title]').example(function() {
*    return $(this).attr('title');
*  });
*  $('textarea#message').example('Type your message here', {
*    className: 'example_text'
*  });
*
* Copyright (c) Paul Mucur (http://mucur.name), 2007-2008.
* Dual-licensed under the BSD (BSD-LICENSE.txt) and GPL (GPL-LICENSE.txt)
* licenses.
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation; either version 2 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*/
(function ($) {

    $.fn.example = function (text, args) {

        /* Only calculate once whether a callback has been used. */
        var isCallback = $.isFunction(text);

        /* Merge the arguments and given example text into one options object. */
        var options = $.extend({}, args, { example: text });

        return this.each(function () {

            /* Reduce method calls by saving the current jQuery object. */
            var $this = $(this);

            /* Merge the plugin defaults with the given options and, if present,
            * any metadata.
            */
            if ($.metadata) {
                var o = $.extend({}, $.fn.example.defaults, $this.metadata(), options);
            } else {
                var o = $.extend({}, $.fn.example.defaults, options);
            }

            /* The following event handlers only need to be bound once
            * per class name. In order to do this, an array of used
            * class names is stored and checked on each use of the plugin.
            * If the class name is in the array then this whole section
            * is skipped. If not, the events are bound and the class name
            * added to the array.
            *
            * As of 1.3.2, the class names are stored as keys in the
            * array, rather than as elements. This removes the need for
            * $.inArray().
            */
            if (!$.fn.example.boundClassNames[o.className]) {

                /* Because Gecko-based browsers cache form values
                * but ignore all other attributes such as class, all example
                * values must be cleared on page unload to prevent them from
                * being saved.
                */
                $(window).unload(function () {
                    $('.' + o.className).val('');
                });

                /* Clear fields that are still examples before any form is submitted
                * otherwise those examples will be sent along as well.
                *
                * Prior to 1.3, this would only be bound to forms that were
                * parents of example fields but this meant that a page with
                * multiple forms would not work correctly.
                */
                $('form').submit(function () {

                    /* Clear only the fields inside this particular form. */
                    $(this).find('.' + o.className).val('');
                });

                /* Add the class name to the array. */
                $.fn.example.boundClassNames[o.className] = true;
            }

            /* Several browsers will cache form values even if they are cleared
            * on unload, so this will clear any value that matches the example
            * text and hasn't been specified in the value attribute.
            *
            * If a callback is used, it is not possible or safe to predict
            * what the example text is going to be so all non-default values
            * are cleared. This means that caching is effectively disabled for
            * that field.
            *
            * Many thanks to Klaus Hartl for helping resolve this issue.
            */
            if (!$this.attr('defaultValue') && (isCallback || $this.val() == o.example))
                $this.val('');

            /* Initially place the example text in the field if it is empty
            * and doesn't have focus yet.
            */
            if ($this.val() == '' && this != document.activeElement) {
                $this.addClass(o.className);

                /* The text argument can now be a function; if this is the case,
                * call it, passing the current element as `this`.
                */
                $this.val(isCallback ? o.example.call(this) : o.example);
            }

            /* Make the example text disappear when someone focuses.
            *
            * To determine whether the value of the field is an example or not,
            * check for the example class name only; comparing the actual value
            * seems wasteful and can stop people from using example values as real
            * input.
            */
            $this.focus(function () {

                /* jQuery 1.1 has no hasClass(), so is() must be used instead. */
                if ($(this).is('.' + o.className)) {
                    $(this).val('');
                    $(this).removeClass(o.className);
                }
            });

            /* Detect a change event to the field and remove the example class. */
            $this.change(function () {
                if ($(this).is('.' + o.className)) {
                    $(this).removeClass(o.className);
                }
            });

            /* Make the example text reappear if the input is blank on blurring. */
            $this.blur(function () {
                if ($(this).val() == '') {
                    $(this).addClass(o.className);

                    /* Re-evaluate the callback function every time the user
                    * blurs the field without entering anything. While this
                    * is not as efficient as caching the value, it allows for
                    * more dynamic applications of the plugin.
                    */
                    $(this).val(isCallback ? o.example.call(this) : o.example);
                }
            });
        });
    };

    /* Users can override the defaults for the plugin like so:
    *
    *   $.fn.example.defaults.className = 'not_example';
    */
    $.fn.example.defaults = {
        className: 'example'
    };

    /* All the class names used are stored as keys in the following array. */
    $.fn.example.boundClassNames = [];

})(jQuery);
/*
* Provides methods for structuring common site-specific markup.
*/
; (function ($) {
    // create structure for stylization of navigation
    $.fn.structureMenuItem = function () {
        this.not('.structured').addClass('structured').wrapInner('<span><span><span><span></span></span></span></span>').each(function (index) {
            if ($(this).siblings('ul').length <= 0) {
                $('> span', this).addClass('no-sub');
            }
        });

        return this;
    }

    // create structure for stylization of tabs
    $.fn.structureTabs = function () {
        this.not('.ui-tabs-structured').addClass('ui-tabs-structured')
			.find('> .ui-tabs-nav li')
			.filter(':first-child').addClass('first').end()
			.filter(':last-child').addClass('last').end()
			.find('a').wrapInner('<span><span><span></span></span></span>').end().end()
			.find('> .ui-tabs-panel').wrapInner('<div class="ui-tabs-panel-l"><div class="ui-tabs-panel-r"><div class="ui-tabs-panel-b"><div class="ui-tabs-panel-t"></div></div></div>');

        return this;
    }

    // create structure for breadcrumb
    $.fn.structureBreadcrumb = function () {
        var breadcrumbs = this.not('.structured').addClass('structured').find('> a, > span').not('.home').wrapInner('<span><span></span></span>').parent().find('> a, > span');
        var breaddcrumbCount = breadcrumbs.length;

        breadcrumbs.each(function (i) {
            $(this).css('z-index', breaddcrumbCount - i);
        });

        return this;
    };

    // create structure for stylization of tables
    $.fn.structureTable = function () {
        $('tr, tr th, tr td', this)
			.filter(':first-child').addClass('first').end()
			.filter(':last-child').addClass('last').end()
			.filter(':nth-child(odd)').addClass('odd').end()
			.filter(':nth-child(even)').addClass('even');

        $('thead tr th.first, thead tr th.last', this).wrapInner('<span />');

        return this;
    };
})(jQuery);
/*
* jQuery positionAbsolute 1.0
* Asbsolute positions elements
*/
; (function ($) {
    $.fn.positionAbsolute = function () {
        // create array of positions
        var entryPositions = new Array();

        // get height of parent
        var parentHeight = this.parent().height('auto').height();

        // do not continue if parent height is null
        if (parentHeight != null) {
            // set a relative position on the parent element and loop through each element twice
            // first, storing the element's position value and then setting it's styles
            // this is needed to negate the position changing before calculation
            this.not('.positioned').parent().css('position', 'relative').height(parentHeight).end().each(function (i) {
                // add position to entryPositions array
                entryPositions.push($(this).position());
            }).each(function (i) {
                // set the CSS for the element
                $(this).css({
                    position: 'absolute',
                    top: entryPositions[i].top,
                    left: entryPositions[i].left,
                    zIndex: entryPositions.length - i
                });
            }).addClass('positioned');
        }

        return this;
    }
})(jQuery);
/**
* hoverIntent is similar to jQuery's built-in "hover" function except that
* instead of firing the onMouseOver event immediately, hoverIntent checks
* to see if the user's mouse has slowed down (beneath the sensitivity
* threshold) before firing the onMouseOver event.
* 
* hoverIntent r5 // 2007.03.27 // jQuery 1.1.2+
* <http://cherne.net/brian/resources/jquery.hoverIntent.html>
* 
* hoverIntent is currently available for use in all personal or commercial 
* projects under both MIT and GPL licenses. This means that you can choose 
* the license that best suits your project, and use it accordingly.
* 
* // basic usage (just like .hover) receives onMouseOver and onMouseOut functions
* $("ul li").hoverIntent( showNav , hideNav );
* 
* // advanced usage receives configuration object only
* $("ul li").hoverIntent({
*	sensitivity: 7, // number = sensitivity threshold (must be 1 or higher)
*	interval: 100,   // number = milliseconds of polling interval
*	over: showNav,  // function = onMouseOver callback (required)
*	timeout: 0,   // number = milliseconds delay before onMouseOut function call
*	out: hideNav    // function = onMouseOut callback (required)
* });
* 
* @param  f  onMouseOver function || An object with configuration options
* @param  g  onMouseOut function  || Nothing (use configuration options object)
* @author    Brian Cherne <brian@cherne.net>
*/
; (function ($) {
    $.fn.hoverIntent = function (f, g, c) {
        // default configuration options
        var cfg = {
            sensitivity: 7,
            interval: 25,
            timeout: 0
        };

        // override configuration options with user supplied object
        cfg = $.extend(cfg, g ? { over: f, out: g} : f, c || {});

        // instantiate variables
        // cX, cY = current X and Y position of mouse, updated by mousemove event
        // pX, pY = previous X and Y position of mouse, set by mouseover and polling interval
        var cX, cY, pX, pY;

        // A private function for getting mouse position
        var track = function (ev) {
            cX = ev.pageX;
            cY = ev.pageY;
        };

        // A private function for comparing current and previous mouse position
        var compare = function (ev, ob) {
            ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t);
            // compare mouse positions to see if they've crossed the threshold
            if ((Math.abs(pX - cX) + Math.abs(pY - cY)) < cfg.sensitivity) {
                $(ob).unbind("mousemove", track);
                // set hoverIntent state to true (so mouseOut can be called)
                ob.hoverIntent_s = 1;
                return cfg.over.apply(ob, [ev]);
            } else {
                // set previous coordinates for next time
                pX = cX; pY = cY;
                // use self-calling timeout, guarantees intervals are spaced out properly (avoids JavaScript timer bugs)
                ob.hoverIntent_t = setTimeout(function () { compare(ev, ob); }, cfg.interval);
            }
        };

        // A private function for delaying the mouseOut function
        var delay = function (ev, ob) {
            ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t);
            ob.hoverIntent_s = 0;
            return cfg.out.apply(ob, [ev]);
        };

        // A private function for handling mouse 'hovering'
        var handleHover = function (e) {
            // next three lines copied from jQuery.hover, ignore children onMouseOver/onMouseOut
            var p = (e.type == "mouseover" ? e.fromElement : e.toElement) || e.relatedTarget;
            while (p && p != this) { try { p = p.parentNode; } catch (e) { p = this; } }
            if (p == this) { return false; }

            // copy objects to be passed into t (required for event object to be passed in IE)
            var ev = jQuery.extend({}, e);
            var ob = this;

            // cancel hoverIntent timer if it exists
            if (ob.hoverIntent_t) { ob.hoverIntent_t = clearTimeout(ob.hoverIntent_t); }

            // else e.type == "onmouseover"
            if (e.type == "mouseover") {
                // set "previous" X and Y position based on initial entry point
                pX = ev.pageX; pY = ev.pageY;
                // update "current" X and Y position based on mousemove
                $(ob).bind("mousemove", track);
                // start polling interval (self-calling timeout) to compare mouse coordinates over time
                if (ob.hoverIntent_s != 1) { ob.hoverIntent_t = setTimeout(function () { compare(ev, ob); }, cfg.interval); }

                // else e.type == "onmouseout"
            } else {
                // unbind expensive mousemove event
                $(ob).unbind("mousemove", track);
                // if hoverIntent state is true, then call the mouseOut function after the specified delay
                if (ob.hoverIntent_s == 1) { ob.hoverIntent_t = setTimeout(function () { delay(ev, ob); }, cfg.timeout); }
            }
        };

        // bind the function to the two event listeners
        return this.mouseover(handleHover).mouseout(handleHover);
    };
})(jQuery);
/*
* jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
*
* Uses the built in easing capabilities added In jQuery 1.1
* to offer multiple easing options
*
* TERMS OF USE - jQuery Easing
* 
* Open source under the BSD License. 
* 
* Copyright Ã‚Â© 2008 George McGinley Smith
* All rights reserved.
* 
* Redistribution and use in source and binary forms, with or without modification, 
* are permitted provided that the following conditions are met:
* 
* Redistributions of source code must retain the above copyright notice, this list of 
* conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list 
* of conditions and the following disclaimer in the documentation and/or other materials 
* provided with the distribution.
* 
* Neither the name of the author nor the names of contributors may be used to endorse 
* or promote products derived from this software without specific prior written permission.
* 
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
* EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
* MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
*  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
*  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
*  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
* AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
*  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
* OF THE POSSIBILITY OF SUCH DAMAGE. 
*
*/

// t: current time, b: begInnIng value, c: change In value, d: duration
jQuery.easing['jswing'] = jQuery.easing['swing'];

jQuery.extend(jQuery.easing,
{
    def: 'easeOutQuad',
    swing: function (x, t, b, c, d) {
        //alert(jQuery.easing.default);
        return jQuery.easing[jQuery.easing.def](x, t, b, c, d);
    },
    easeInQuad: function (x, t, b, c, d) {
        return c * (t /= d) * t + b;
    },
    easeOutQuad: function (x, t, b, c, d) {
        return -c * (t /= d) * (t - 2) + b;
    },
    easeInOutQuad: function (x, t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t + b;
        return -c / 2 * ((--t) * (t - 2) - 1) + b;
    },
    easeInCubic: function (x, t, b, c, d) {
        return c * (t /= d) * t * t + b;
    },
    easeOutCubic: function (x, t, b, c, d) {
        return c * ((t = t / d - 1) * t * t + 1) + b;
    },
    easeInOutCubic: function (x, t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
        return c / 2 * ((t -= 2) * t * t + 2) + b;
    },
    easeInQuart: function (x, t, b, c, d) {
        return c * (t /= d) * t * t * t + b;
    },
    easeOutQuart: function (x, t, b, c, d) {
        return -c * ((t = t / d - 1) * t * t * t - 1) + b;
    },
    easeInOutQuart: function (x, t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
        return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
    },
    easeInQuint: function (x, t, b, c, d) {
        return c * (t /= d) * t * t * t * t + b;
    },
    easeOutQuint: function (x, t, b, c, d) {
        return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
    },
    easeInOutQuint: function (x, t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t * t * t * t + b;
        return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
    },
    easeInSine: function (x, t, b, c, d) {
        return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
    },
    easeOutSine: function (x, t, b, c, d) {
        return c * Math.sin(t / d * (Math.PI / 2)) + b;
    },
    easeInOutSine: function (x, t, b, c, d) {
        return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
    },
    easeInExpo: function (x, t, b, c, d) {
        return (t == 0) ? b : c * Math.pow(2, 10 * (t / d - 1)) + b;
    },
    easeOutExpo: function (x, t, b, c, d) {
        return (t == d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    },
    easeInOutExpo: function (x, t, b, c, d) {
        if (t == 0) return b;
        if (t == d) return b + c;
        if ((t /= d / 2) < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
        return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
    },
    easeInCirc: function (x, t, b, c, d) {
        return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
    },
    easeOutCirc: function (x, t, b, c, d) {
        return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
    },
    easeInOutCirc: function (x, t, b, c, d) {
        if ((t /= d / 2) < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
        return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
    },
    easeInElastic: function (x, t, b, c, d) {
        var s = 1.70158; var p = 0; var a = c;
        if (t == 0) return b; if ((t /= d) == 1) return b + c; if (!p) p = d * .3;
        if (a < Math.abs(c)) { a = c; var s = p / 4; }
        else var s = p / (2 * Math.PI) * Math.asin(c / a);
        return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
    },
    easeOutElastic: function (x, t, b, c, d) {
        var s = 1.70158; var p = 0; var a = c;
        if (t == 0) return b; if ((t /= d) == 1) return b + c; if (!p) p = d * .3;
        if (a < Math.abs(c)) { a = c; var s = p / 4; }
        else var s = p / (2 * Math.PI) * Math.asin(c / a);
        return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
    },
    easeInOutElastic: function (x, t, b, c, d) {
        var s = 1.70158; var p = 0; var a = c;
        if (t == 0) return b; if ((t /= d / 2) == 2) return b + c; if (!p) p = d * (.3 * 1.5);
        if (a < Math.abs(c)) { a = c; var s = p / 4; }
        else var s = p / (2 * Math.PI) * Math.asin(c / a);
        if (t < 1) return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
        return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * .5 + c + b;
    },
    easeInBack: function (x, t, b, c, d, s) {
        if (s == undefined) s = 1.70158;
        return c * (t /= d) * t * ((s + 1) * t - s) + b;
    },
    easeOutBack: function (x, t, b, c, d, s) {
        if (s == undefined) s = 1.70158;
        return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
    },
    easeInOutBack: function (x, t, b, c, d, s) {
        if (s == undefined) s = 1.70158;
        if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
        return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
    },
    easeInBounce: function (x, t, b, c, d) {
        return c - jQuery.easing.easeOutBounce(x, d - t, 0, c, d) + b;
    },
    easeOutBounce: function (x, t, b, c, d) {
        if ((t /= d) < (1 / 2.75)) {
            return c * (7.5625 * t * t) + b;
        } else if (t < (2 / 2.75)) {
            return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
        } else if (t < (2.5 / 2.75)) {
            return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
        } else {
            return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
        }
    },
    easeInOutBounce: function (x, t, b, c, d) {
        if (t < d / 2) return jQuery.easing.easeInBounce(x, t * 2, 0, c, d) * .5 + b;
        return jQuery.easing.easeOutBounce(x, t * 2 - d, 0, c, d) * .5 + c * .5 + b;
    }
});

/*
*
* TERMS OF USE - EASING EQUATIONS
* 
* Open source under the BSD License. 
* 
* Copyright Ã‚Â© 2001 Robert Penner
* All rights reserved.
* 
* Redistribution and use in source and binary forms, with or without modification, 
* are permitted provided that the following conditions are met:
* 
* Redistributions of source code must retain the above copyright notice, this list of 
* conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list 
* of conditions and the following disclaimer in the documentation and/or other materials 
* provided with the distribution.
* 
* Neither the name of the author nor the names of contributors may be used to endorse 
* or promote products derived from this software without specific prior written permission.
* 
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
* EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
* MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
*  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
*  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
*  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
* AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
*  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
* OF THE POSSIBILITY OF SUCH DAMAGE. 
*
*/
/*
* jQuery dateCalendar 1.0
* Extends jQuery UI DatePicker to allow for dynmically highlighted dates and binding of the select event for each date.
*/
; (function ($) {
    $.fn.dateCalendar = function (options) {
        var $this = this;

        // create carousel data object if not set
        if ($this.length > 0 && $this.data('calendar') == null) {
            // create calendar data object
            var calendar = $this.data('calendar', {
                options: new Object(),
                url: options.url,
                dates: new Array(),
                events: new Array()
            }).data('calendar');

            // merge default options object with that of the supplied options
            $.extend(true, calendar.options, $.fn.dateCalendar.options, (typeof options == 'undefined') ? {} : options);

            // overwrite datePicker events with custom ones
            $.extend(true, calendar.options.datePicker, $.fn.dateCalendar.events);

            // get current date
            var time = new Date();
            var monthYear = {
                month: time.getMonth() + 1,
                year: time.getFullYear()
            };

            // set data and create datePicker
            $this.datepicker(calendar.options.datePicker);
            $.fn.dateCalendar.setData.call($this, calendar.options.url, monthYear);
        }

        return this;
    }

    // set data from JSON source
    $.fn.dateCalendar.setData = function (url, monthYear, callback) {
        var $this = this;
        var calendar = $this.data('calendar');

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            data: $.param(monthYear),
            success: function (events) {
                calendar.events = events;
                calendar.dates = new Array();

                numEvents = events.length;

                $.each(events, function (i) {
                    var date = new Date(events[i].date);
                    var dateStr = $.datepicker.formatDate('yy-mm-dd', date);

                    calendar.dates.push(dateStr);

                    if ((i + 1) == numEvents) {
                        $.fn.dateCalendar.highlightDays.call($this, calendar);
                    }
                });
            },
            complete: function () {
                if ($.isFunction(callback)) {
                    callback.call();
                }
            }
        });
    };

    $.fn.dateCalendar.highlightDays = function (calendar) {
        var datePickerInst = this.data('datepicker');

        var year = $.fn.dateCalendar.zeroFill(datePickerInst.drawYear, 2);
        var month = $.fn.dateCalendar.zeroFill(datePickerInst.drawMonth + 1, 2);

        $('table.ui-datepicker-calendar tbody tr td span', this).each(function (i) {
            var day = $(this).text();
            var dateStr = year + '-' + month + '-' + $.fn.dateCalendar.zeroFill(day, 2);

            var eventIndex = $.inArray(dateStr, calendar.dates);

            if (eventIndex > -1 && eventIndex < numEvents) {
                var anchor = $('<a />', {
                    href: calendar.events[eventIndex].url,
                    text: day
                });

                var addClass = '';
                var removeClass = 'ui-state-disabled';

                if (typeof calendar.events[eventIndex].url == 'string') {
                    addClass = 'ui-datepicker-selectable';
                    removeClass += ' ui-datepicker-unselectable';
                }

                $(this).parent('td').removeClass(removeClass).addClass(addClass).end().replaceWith(anchor);
            }
        });
    }

    $.fn.dateCalendar.zeroFill = function (n, l) {
        n = n.toString();

        var fill = '';

        if (l > n.length) {
            for (i = 0; i < (l - n.length); i++) {
                fill += '0';
            }
        }

        return fill + n;
    }

    // create datePicker events
    $.fn.dateCalendar.events = {
        beforeShowDay: function (date) {
            var selectable = [
				false,
				''
			];

            return selectable;
        },
        onChangeMonthYear: function (year, month, inst) {
            var $this = $(this);

            var monthYear = {
                month: month,
                year: year
            }

            var url = $(this).data('calendar').url;

            $.fn.dateCalendar.setData.call($this, url, monthYear);
        }
    }

    // set default options
    $.fn.dateCalendar.options = {
        url: '',
        datePicker: {
            dayNamesMin: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            nextText: '&#x25B6;',
            prevText: '&#x25C0;'
        }
    };
})(jQuery);
// jQuery URL Toolbox beta 
// Created by Mark Perkins - mark@allmarkedup.com

(function ($) {

    // a few helper functions

    var isStr = function (item) { return typeof item === 'string'; };
    var isObj = function (item) { return typeof item === 'object'; };
    var isfunc = function (item) { return typeof item === 'function'; };

    var isGetter = function (args) { return (args.length == 1 && !isObj(args[0])); }
    var isSetter = function (args) { return (args.length >= 2 || (args.length == 1 && isObj(args[0]))); }

    var stripQ = function (str) { return str.replace(/\?.*$/, ''); }
    var stripH = function (str) { return str.replace(/^#/, ''); }

    // set up a few constants & shortcuts
    var loc = document.location,
	tag2attr = { a: 'href', img: 'src', form: 'action', base: 'href', script: 'src', iframe: 'src', link: 'href' };

    // split up a query sting
    function splitQuery(string) {
        var ret = {},
		seg = string.replace(/^\?/, '').split('&'),
		len = seg.length, i = 0, s;
        for (; i < len; i++) {
            if (!seg[i]) { continue; }
            s = seg[i].split('=');
            ret[s[0]] = s[1];
        }
        return ret;
    }

    // reconstructs a query string from an object of key:value pairs
    var combineQuery = function (params, prefixQM) {
        var queryString = (prefixQM === true) ? '?' : '';
        for (i in params) queryString += i + '=' + params[i] + '&';
        return queryString.slice(0, -1);
    };

    // reconstructs a path string from an array of parts
    var combinePath = function (segments) {
        return segments.join('/');
    };

    function splitHashSegments(hash) {
        if (hash.indexOf('=') === -1) {
            if (hash.charAt(hash.length - 1) == '/') hash = hash.slice(0, -1);
            return hash.replace(/^\//, '').split('/');
        }
        return null;
    }

    function splitHashParams(hash) {
        if (hash.indexOf('=') !== -1) return splitQuery(hash);
        return null;
    }

    // utility function to get tag name of $ objects
    var getTagName = function (elm) {
        var tg = $(elm).get(0).tagName;
        if (tg !== undefined) return tg.toLowerCase();
        return tg;
    }

    var throwParserError = function (msg) {
        if (msg === undefined) msg = 'url parser error';
        // console.log( msg ); 
    };

    var getHost = function (hostname, port) {
        // deals with non-standard port name issues, mostly in safari
        var portRegex = new RegExp(':' + port); // need to strip the non-standard ports out of safari
        return hostname.replace(portRegex, '');
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////

    // create :internal and :external URL filters	

    $.extend($.expr[':'], {
        external: function (elm, i, m) {
            var tagName = elm.tagName;

            if (tagName !== undefined) {
                var tg = tagName.toLowerCase();
                var attr = tag2attr[tg];
                if (elm[attr]) {
                    if (tg !== 'a') {
                        var a = document.createElement('a');
                        a.href = elm[attr];
                    }
                    else var a = elm;
                    return a.hostname && getHost(a.hostname, a.port) !== getHost(loc.hostname, loc.port);
                }
            }
            return false;
        },
        internal: function (elm, i, m) {
            var tagName = elm.tagName;
            if (tagName !== undefined) {
                var tg = tagName.toLowerCase();
                var attr = tag2attr[tg];
                if (elm[attr]) {
                    if (tg !== 'a') {
                        var a = document.createElement('a');
                        a.href = elm[attr];
                    }
                    else var a = elm;
                    return a.hostname && getHost(a.hostname, a.port) === getHost(loc.hostname, loc.port);
                }
            }
            return false;
        }
    });

    /////// two essentially analagous functions to return an activeUrl object (just in different ways) ////////

    // this one is for when you just want to use a manually passed in URL string
    $.url = function (urlString) {
        return new activeUrl(urlString);
    };

    // this one is when using DOM objects as the source for the URL
    $.fn.url = function () {
        if (this.size() > 1) {
            // more than one object, return a collection of activeUrls
            var activeUrls = {};

            this.each(function (i) {
                activeUrls[i] = new activeUrl($(this));
            });

            return activeUrls;
        }
        else {
            // just one item, return just the one active url
            return new activeUrl(this);
        }
    };

    /////// guts of the parser /////////////////////////////////////////////////////////////

    function parseUrl(url) {
        var urlRegEx = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

        var keys = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"];

        var m = urlRegEx.exec(url);
        var uri = {};
        var i = keys.length;

        while (i--) {
            uri[keys[i]] = m[i] || '';
        }

        var a = $('<a />').attr('href', url).get(0);

        a.hostname = (a.hostname == '') ? self.document.location.hostname : a.hostname;
        a.protocol = (a.protocol == '') ? self.document.location.protocol : a.protocol;

        uri = $.extend(true, uri, {
            host: getHost(a.hostname, a.port),
            base: (function () {
                if (a.port != 0 && a.port !== null && a.port !== "") return a.protocol + "//" + getHost(a.hostname, a.port) + ":" + a.port;
                return a.protocol + "//" + a.hostname;
            })(),
            params: splitQuery(uri.query),
            hash: stripH(a.hash),
            segments: uri.path.replace(/^\//, '').split('/'),
            hashSegments: splitHashSegments(stripH(a.hash)),
            hashParams: splitHashParams(stripH(a.hash))
        });

        return uri;
    };

    // this is the 'active' URL object that gets returned

    var activeUrl = function (source) {
        var sourceType = null, // elm | doc | str
			ref = null, // if it is attached to a $ object, keep the reference here
			parsed = {}; // the parsed url

        // reconstructs the hash
        var makeHash = function (prefixHash) {
            var hash = '';

            if (parsed.hashParams != null) {
                // treated as query string
                hash = makeQueryString(parsed.hashParams);
            }
            else if (parsed.hashSegments != null) {
                //treat as segments
                hash = makePathString(parsed.hashSegments);
            }

            if (hash !== '') {
                if (parsed.hash.charAt(0) == '/') hash = '/' + hash;
                if (prefixHash === true) return '#' + hash;
                return hash;
            }

            return '';
        };

        /////////////////////////////////

        var updateElement = function () {
            if (sourceType == 'elm') {
                ref.attr(tag2attr[getTagName(ref)], parsed.source);
            }
            else if (sourceType == 'doc') {
                loc.href = parsed.source;
            }
        };

        var updateSource = function () {
            parsed.source = parsed.base + parsed.path + parsed.query;
            if (parsed.hash && parsed.hash != '') parsed.source += '#' + parsed.hash;
        }

        var updateParsedAttrs = function (key, val) {
            switch (key) {
                case 'source':
                    parsed = parseUrl(val); // need to reparse the entire URL
                    break;

                case 'base':
                    // need to update: host, protocol, port
                    if (val.charAt(val.length - 1) == '/') val = val.slice(0, -1); // remove the trailing slash if present
                    var a = document.createElement('a');
                    a.href = parsed.base = val;
                    parsed.protocol = a.protocol.replace(':', '');
                    parsed.host = getHost(a.hostname, a.port);
                    parsed.port = a.port;
                    break;

                case 'protocol':
                case 'host':
                case 'port':
                    // need to update: base
                    parsed[key] = val;
                    if (a.port != 0 && a.port !== null && a.port !== "") parsed.base = a.protocol + "//" + getHost(a.hostname, a.port) + ":" + a.port;
                    else parsed.base = a.protocol + "//" + a.host;
                    break;

                case 'query':
                    // need to update: params
                    parsed.query = '?' + val.replace(/\?/, '');
                    parsed.params = splitQuery(val);
                    break;

                case 'file':
                    // need to update: path, segments
                    parsed.path = parsed.path.replace(new RegExp(parsed.file + '$'), val);
                    parsed.file = val;
                    break;

                case 'hash':
                    // need to update: hashParams, hashSegments
                    parsed.hash = val;
                    parsed.hashSegments = splitHashSegments(val);
                    parsed.hashParams = splitHashParams(val);
                    break;

                case 'path':
                    // need to update: file, segments
                    if (val.charAt(0) != '/') val = '/' + val;
                    parsed.path = val;
                    parsed.file = (val.match(/\/([^\/?#]+)$/i) || [, ''])[1];
                    parsed.segments = val.replace(/^\//, '').split('/');
                    break;

                default:
                    throwParserError('you can\'t update this property directly');
                    break;
            }

            updateSource(); // update the source
        };

        var updateParsedParams = function (key, val) {
            // set the value, then update the query string
            parsed.params[key] = val;
            parsed.query = combineQuery(parsed.params, true);
            updateSource();
        };

        var updateParsedSegments = function (key, val) {
            // set the value, then update the segments
            parsed.segments[key] = val;
            parsed.path = '/' + combinePath(parsed.segments);
            parsed.file = (parsed.path.match(/\/([^\/?#]+)$/i) || [, ''])[1];
            updateSource();
        };

        var updateHashParams = function (key, val) {
            parsed.hashParams[key] = val;
            parsed.hash = combineQuery(parsed.hashParams, true);
            updateSource();
        };

        var updateHashSegments = function (key, val) {
            var slash = (parsed.hash.charAt(0) == '/') ? '/' : '';
            parsed.hashSegments[key] = val;
            parsed.hash = slash + combinePath(parsed.hashSegments);
            updateSource();
        };

        var action = function (gettObj, sett, args) {
            if (isGetter(args)) {
                var key = args[0];
                return (gettObj === undefined || gettObj[key] === undefined || gettObj[key] === "") ? null : gettObj[key];
            }
            else if (isSetter(args)) {
                if (isObj(args[0])) {
                    for (var key in args[0]) sett(key, args[0][key]); // set multiple properties
                    if (args[1] !== false) updateElement(); // now update the value of the attached element
                }
                else {
                    sett(args[0], args[1]); // set a single property	
                    if (args[2] !== false) updateElement(); // now update the value of the attached element
                }

                return this; // return reference to this object
            }
        };

        var init = function () {
            if (isObj(source) && source.size()) {
                urlAttr = undefined;

                var tagName = getTagName(source);
                if (tagName !== undefined) urlAttr = tag2attr[tagName];

                if (tagName !== undefined && urlAttr !== undefined) {
                    // using a valid $ element as the source of the URL
                    sourceType = 'elm';
                    ref = source;
                    var url = source.attr(urlAttr);
                }
                else if (tagName !== undefined && urlAttr === undefined) {
                    // passed a $ element, but not one that can contain a URL. throw an error.
                    throwParserError('no valid URL on object');
                    return;
                }
                else {
                    // use the document location as the source
                    sourceType = 'doc';
                    var url = loc.href;

                    $(window).bind('hashchange', function (hash) {
                        // listen out for hashChanges, if one is triggered then update the hash
                        updateParsedAttrs('hash', stripH(loc.hash));
                    });
                }
            }
            else if (!isObj(source)) {
                // just a URL string
                sourceType = 'str';
                var url = source;
            }
            else {
                // passed an empty $ item.... don't return anything
                throwParserError('no valid item');
                return;
            }

            parsed = parseUrl(url); // parse the URL.

        } ();

        return {

            // set/get attributes of the URL
            attr: function () { return action(parsed, updateParsedAttrs, arguments) },

            // get/set query string parameters
            param: function () { return action(parsed.params, updateParsedParams, arguments) },

            // get/set segments in the URL
            segment: function () { return action(parsed.segments, updateParsedSegments, arguments) },

            // get/set 'query string' parameters in the FRAGMENT
            hashParam: function () { return action(parsed.hashParams, updateHashParams, arguments) },

            // get/set segments in the FRAGMENT
            hashSegment: function () { return action(parsed.hashSegments, updateHashSegments, arguments) },

            // apply some tests
            is: function (test) {
                if (test === 'internal' || test === ':internal') {
                    return parsed.host && parsed.host === getHost(loc.hostname);
                }
                else if (test === 'external' || test === ':external') {
                    return parsed.host && parsed.host !== getHost(loc.hostname);
                }
            },

            // return the current URL  as a string
            toString: function () { return parsed.source; }
        };

    };

})(jQuery);
/**
* Cookie plugin
*
* Copyright (c) 2006 Klaus Hartl (stilbuero.de)
* Dual licensed under the MIT and GPL licenses:
* http://www.opensource.org/licenses/mit-license.php
* http://www.gnu.org/licenses/gpl.html
*
*/

/**
* Create a cookie with the given name and value and other optional parameters.
*
* @example $.cookie('the_cookie', 'the_value');
* @desc Set the value of a cookie.
* @example $.cookie('the_cookie', 'the_value', { expires: 7, path: '/', domain: 'jquery.com', secure: true });
* @desc Create a cookie with all available options.
* @example $.cookie('the_cookie', 'the_value');
* @desc Create a session cookie.
* @example $.cookie('the_cookie', null);
* @desc Delete a cookie by passing null as value. Keep in mind that you have to use the same path and domain
*       used when the cookie was set.
*
* @param String name The name of the cookie.
* @param String value The value of the cookie.
* @param Object options An object literal containing key/value pairs to provide optional cookie attributes.
* @option Number|Date expires Either an integer specifying the expiration date from now on in days or a Date object.
*                             If a negative value is specified (e.g. a date in the past), the cookie will be deleted.
*                             If set to null or omitted, the cookie will be a session cookie and will not be retained
*                             when the the browser exits.
* @option String path The value of the path atribute of the cookie (default: path of page that created the cookie).
* @option String domain The value of the domain attribute of the cookie (default: domain of page that created the cookie).
* @option Boolean secure If true, the secure attribute of the cookie will be set and the cookie transmission will
*                        require a secure protocol (like HTTPS).
* @type undefined
*
* @name $.cookie
* @cat Plugins/Cookie
* @author Klaus Hartl/klaus.hartl@stilbuero.de
*/

/**
* Get the value of a cookie with the given name.
*
* @example $.cookie('the_cookie');
* @desc Get the value of a cookie.
*
* @param String name The name of the cookie.
* @return The value of the cookie.
* @type String
*
* @name $.cookie
* @cat Plugins/Cookie
* @author Klaus Hartl/klaus.hartl@stilbuero.de
*/
jQuery.cookie = function (name, value, options) {
    if (typeof value != 'undefined') { // name and value given, set cookie
        options = options || {};
        if (value === null) {
            value = '';
            options.expires = -1;
        }
        var expires = '';
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
            var date;
            if (typeof options.expires == 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        // CAUTION: Needed to parenthesize options.path and options.domain
        // in the following expressions, otherwise they evaluate to undefined
        // in the packed version for some reason...
        var path = options.path ? '; path=' + (options.path) : '';
        var domain = options.domain ? '; domain=' + (options.domain) : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
    } else { // only name given, get cookie
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
};
/*
* jQuery hoverClass
* Adds hover classes for use with IE6
*/
; (function ($) {
    $.fn.hoverClass = function (config) {
        // set default, empty, config object
        var config = config || {};

        // define hoverIntent plugin as hover if it does not exist
        $.fn.hoverIntent = $.fn.hoverIntent || $.fn.hover;

        // return object with hoverIntent event bound
        return this.hoverIntent(function () {
            var hoverClasses = $(this).data('hoverClass');

            if (typeof hoverClasses === 'undefined') {

                if (typeof $(this).attr('class') == "undefined") {
                    $(this).attr("class","");
                }
                // get all classes for element
                hoverClasses = $(this).attr('class').split(' ');

                // add "-hover" to each class and add to 
                $.each(hoverClasses, function (i) {
                    hoverClasses[i] += (hoverClasses[i] == '') ? '' : '-hover';
                });

                // add default "hover" class
                hoverClasses.push('hover');

                // store hoverClasses for element
                $(this).data('hoverClass', hoverClasses.join(' '));

                // retrieve hover Classes
                hoverClasses = $(this).data('hoverClass');
            }

            $(this).addClass(hoverClasses);
        }, function () {
            var hoverClasses = $(this).data('hoverClass');

            $(this).removeClass(hoverClasses);
        }, config);
    }
})(jQuery);
/*! Copyright (c) 2010 Brandon Aaron (http://brandonaaron.net)
* Licensed under the MIT License (LICENSE.txt).
*
* Version 2.1.3-pre
*/

; (function ($) {

    $.fn.bgiframe = ($.browser.msie && /msie 6\.0/i.test(navigator.userAgent) ? function (s) {
        s = $.extend({
            top: 'auto', // auto == .currentStyle.borderTopWidth
            left: 'auto', // auto == .currentStyle.borderLeftWidth
            width: 'auto', // auto == offsetWidth
            height: 'auto', // auto == offsetHeight
            opacity: true,
            src: 'javascript:false;'
        }, s);
        var html = '<iframe class="bgiframe"frameborder="0"tabindex="-1"src="' + s.src + '"' +
                   'style="display:block;position:absolute;z-index:-1;' +
                       (s.opacity !== false ? 'filter:Alpha(Opacity=\'0\');' : '') +
                       'top:' + (s.top == 'auto' ? 'expression(((parseInt(this.parentNode.currentStyle.borderTopWidth)||0)*-1)+\'px\')' : prop(s.top)) + ';' +
                       'left:' + (s.left == 'auto' ? 'expression(((parseInt(this.parentNode.currentStyle.borderLeftWidth)||0)*-1)+\'px\')' : prop(s.left)) + ';' +
                       'width:' + (s.width == 'auto' ? 'expression(this.parentNode.offsetWidth+\'px\')' : prop(s.width)) + ';' +
                       'height:' + (s.height == 'auto' ? 'expression(this.parentNode.offsetHeight+\'px\')' : prop(s.height)) + ';' +
                '"/>';
        return this.each(function () {
            if ($(this).children('iframe.bgiframe').length === 0)
                this.insertBefore(document.createElement(html), this.firstChild);
        });
    } : function () { return this; });

    // old alias
    $.fn.bgIframe = $.fn.bgiframe;

    function prop(n) {
        return n && n.constructor === Number ? n + 'px' : n;
    }

})(jQuery);
/*!
* jScrollPane - v2.0.0beta9 - 2011-02-04
* http://jscrollpane.kelvinluck.com/
*
* Copyright (c) 2010 Kelvin Luck
* Dual licensed under the MIT and GPL licenses.
*/

// Script: jScrollPane - cross browser customisable scrollbars
//
// *Version: 2.0.0beta10, Last updated: 2011-02-04*
//
// Project Home - http://jscrollpane.kelvinluck.com/
// GitHub       - http://github.com/vitch/jScrollPane
// Source       - http://github.com/vitch/jScrollPane/raw/master/script/jquery.jscrollpane.js
// (Minified)   - http://github.com/vitch/jScrollPane/raw/master/script/jquery.jscrollpane.min.js
//
// About: License
//
// Copyright (c) 2010 Kelvin Luck
// Dual licensed under the MIT or GPL Version 2 licenses.
// http://jscrollpane.kelvinluck.com/MIT-LICENSE.txt
// http://jscrollpane.kelvinluck.com/GPL-LICENSE.txt
//
// About: Examples
//
// All examples and demos are available through the jScrollPane example site at:
// http://jscrollpane.kelvinluck.com/
//
// About: Support and Testing
//
// This plugin is tested on the browsers below and has been found to work reliably on them. If you run
// into a problem on one of the supported browsers then please visit the support section on the jScrollPane
// website (http://jscrollpane.kelvinluck.com/) for more information on getting support. You are also
// welcome to fork the project on GitHub if you can contribute a fix for a given issue. 
//
// jQuery Versions - tested in 1.4.2+ - reported to work in 1.3.x
// Browsers Tested - Firefox 3.6.8, Safari 5, Opera 10.6, Chrome 5.0, IE 6, 7, 8
//
// About: Release History
//
// 2.0.0beta10 - (in progress)
// 2.0.0beta9 - (2011-01-31) new API methods, bug fixes and correct keyboard support for FF/OSX
// 2.0.0beta8 - (2011-01-29) touchscreen support, improved keyboard support
// 2.0.0beta7 - (2011-01-23) scroll speed consistent (thanks Aivo Paas)
// 2.0.0beta6 - (2010-12-07) scrollToElement horizontal support
// 2.0.0beta5 - (2010-10-18) jQuery 1.4.3 support, various bug fixes
// 2.0.0beta4 - (2010-09-17) clickOnTrack support, bug fixes
// 2.0.0beta3 - (2010-08-27) Horizontal mousewheel, mwheelIntent, keyboard support, bug fixes
// 2.0.0beta2 - (2010-08-21) Bug fixes
// 2.0.0beta1 - (2010-08-17) Rewrite to follow modern best practices and enable horizontal scrolling, initially hidden
//							 elements and dynamically sized elements.
// 1.x - (2006-12-31 - 2010-07-31) Initial version, hosted at googlecode, deprecated

(function ($, window, undefined) {

    $.fn.jScrollPane = function (settings) {
        // JScrollPane "class" - public methods are available through $('selector').data('jsp')
        function JScrollPane(elem, s) {
            var settings, jsp = this, pane, paneWidth, paneHeight, container, contentWidth, contentHeight,
				percentInViewH, percentInViewV, isScrollableV, isScrollableH, verticalDrag, dragMaxY,
				verticalDragPosition, horizontalDrag, dragMaxX, horizontalDragPosition,
				verticalBar, verticalTrack, scrollbarWidth, verticalTrackHeight, verticalDragHeight, arrowUp, arrowDown,
				horizontalBar, horizontalTrack, horizontalTrackWidth, horizontalDragWidth, arrowLeft, arrowRight,
				reinitialiseInterval, originalPadding, originalPaddingTotalWidth, previousContentWidth,
				wasAtTop = true, wasAtLeft = true, wasAtBottom = false, wasAtRight = false,
				originalElement = elem.clone(false, false).empty(),
				mwEvent = $.fn.mwheelIntent ? 'mwheelIntent.jsp' : 'mousewheel.jsp';

            originalPadding = elem.css('paddingTop') + ' ' +
								elem.css('paddingRight') + ' ' +
								elem.css('paddingBottom') + ' ' +
								elem.css('paddingLeft');
            originalPaddingTotalWidth = (parseInt(elem.css('paddingLeft'), 10) || 0) +
										(parseInt(elem.css('paddingRight'), 10) || 0);

            function initialise(s) {

                var clonedElem, tempWrapper, /*firstChild, lastChild, */isMaintainingPositon, lastContentX, lastContentY,
						hasContainingSpaceChanged, originalScrollTop, originalScrollLeft;

                settings = s;

                if (pane === undefined) {
                    originalScrollTop = elem.scrollTop();
                    originalScrollLeft = elem.scrollLeft();
                    elem.css(
						{
						    overflow: 'hidden',
						    padding: 0
						}
					);
                    // TODO: Deal with where width/ height is 0 as it probably means the element is hidden and we should
                    // come back to it later and check once it is unhidden...
                    paneWidth = elem.innerWidth() + originalPaddingTotalWidth;
                    paneHeight = elem.innerHeight();

                    elem.width(paneWidth);

                    pane = $('<div class="jspPane" />').css('padding', originalPadding).append(elem.children());
                    container = $('<div class="jspContainer" />')
						.css({
						    'width': paneWidth + 'px',
						    'height': paneHeight + 'px'
						}
					).append(pane).appendTo(elem);

                    /*
                    // Move any margins from the first and last children up to the container so they can still
                    // collapse with neighbouring elements as they would before jScrollPane 
                    firstChild = pane.find(':first-child');
                    lastChild = pane.find(':last-child');
                    elem.css(
                    {
                    'margin-top': firstChild.css('margin-top'),
                    'margin-bottom': lastChild.css('margin-bottom')
                    }
                    );
                    firstChild.css('margin-top', 0);
                    lastChild.css('margin-bottom', 0);
                    */
                } else {
                    elem.css('width', '');

                    hasContainingSpaceChanged = elem.innerWidth() + originalPaddingTotalWidth != paneWidth || elem.outerHeight() != paneHeight;

                    if (hasContainingSpaceChanged) {
                        paneWidth = elem.innerWidth() + originalPaddingTotalWidth;
                        paneHeight = elem.innerHeight();
                        container.css({
                            width: paneWidth + 'px',
                            height: paneHeight + 'px'
                        });
                    }

                    // If nothing changed since last check...
                    if (!hasContainingSpaceChanged && previousContentWidth == contentWidth && pane.outerHeight() == contentHeight) {
                        elem.width(paneWidth);
                        return;
                    }
                    previousContentWidth = contentWidth;

                    pane.css('width', '');
                    elem.width(paneWidth);

                    container.find('>.jspVerticalBar,>.jspHorizontalBar').remove().end();
                }

                // Unfortunately it isn't that easy to find out the width of the element as it will always report the
                // width as allowed by its container, regardless of overflow settings.
                // A cunning workaround is to clone the element, set its position to absolute and place it in a narrow
                // container. Now it will push outwards to its maxium real width...
                clonedElem = pane.clone(false, false).css('position', 'absolute');
                tempWrapper = $('<div style="width:1px; position: relative;" />').append(clonedElem);
                $('body').append(tempWrapper);
                contentWidth = Math.max(pane.outerWidth(), clonedElem.outerWidth());
                tempWrapper.remove();

                contentHeight = pane.outerHeight();
                percentInViewH = contentWidth / paneWidth;
                percentInViewV = contentHeight / paneHeight;
                isScrollableV = percentInViewV > 1;

                isScrollableH = percentInViewH > 1;

                //console.log(paneWidth, paneHeight, contentWidth, contentHeight, percentInViewH, percentInViewV, isScrollableH, isScrollableV);

                if (!(isScrollableH || isScrollableV)) {
                    elem.removeClass('jspScrollable');
                    pane.css({
                        top: 0,
                        width: container.width() - originalPaddingTotalWidth
                    });
                    removeMousewheel();
                    removeFocusHandler();
                    removeKeyboardNav();
                    removeClickOnTrack();
                    unhijackInternalLinks();
                } else {
                    elem.addClass('jspScrollable');

                    isMaintainingPositon = settings.maintainPosition && (verticalDragPosition || horizontalDragPosition);
                    if (isMaintainingPositon) {
                        lastContentX = contentPositionX();
                        lastContentY = contentPositionY();
                    }

                    initialiseVerticalScroll();
                    initialiseHorizontalScroll();
                    resizeScrollbars();

                    if (isMaintainingPositon) {
                        scrollToX(lastContentX, false);
                        scrollToY(lastContentY, false);
                    }

                    initFocusHandler();
                    initMousewheel();
                    initTouch();

                    if (settings.enableKeyboardNavigation) {
                        initKeyboardNav();
                    }
                    if (settings.clickOnTrack) {
                        initClickOnTrack();
                    }

                    observeHash();
                    if (settings.hijackInternalLinks) {
                        hijackInternalLinks();
                    }
                }

                if (settings.autoReinitialise && !reinitialiseInterval) {
                    reinitialiseInterval = setInterval(
						function () {
						    initialise(settings);
						},
						settings.autoReinitialiseDelay
					);
                } else if (!settings.autoReinitialise && reinitialiseInterval) {
                    clearInterval(reinitialiseInterval);
                }

                originalScrollTop && elem.scrollTop(0) && scrollToY(originalScrollTop, false);
                originalScrollLeft && elem.scrollLeft(0) && scrollToX(originalScrollLeft, false);

                elem.trigger('jsp-initialised', [isScrollableH || isScrollableV]);
            }

            function initialiseVerticalScroll() {
                if (isScrollableV) {

                    container.append(
						$('<div class="jspVerticalBar" />').append(
							$('<div class="jspCap jspCapTop" />'),
							$('<div class="jspTrack" />').append(
								$('<div class="jspDrag" />').append(
									$('<div class="jspDragTop" />'),
									$('<div class="jspDragBottom" />')
								)
							),
							$('<div class="jspCap jspCapBottom" />')
						)
					);

                    verticalBar = container.find('>.jspVerticalBar');
                    verticalTrack = verticalBar.find('>.jspTrack');
                    verticalDrag = verticalTrack.find('>.jspDrag');

                    if (settings.showArrows) {
                        arrowUp = $('<a class="jspArrow jspArrowUp" />').bind(
							'mousedown.jsp', getArrowScroll(0, -1)
						).bind('click.jsp', nil);
                        arrowDown = $('<a class="jspArrow jspArrowDown" />').bind(
							'mousedown.jsp', getArrowScroll(0, 1)
						).bind('click.jsp', nil);
                        if (settings.arrowScrollOnHover) {
                            arrowUp.bind('mouseover.jsp', getArrowScroll(0, -1, arrowUp));
                            arrowDown.bind('mouseover.jsp', getArrowScroll(0, 1, arrowDown));
                        }

                        appendArrows(verticalTrack, settings.verticalArrowPositions, arrowUp, arrowDown);
                    }

                    verticalTrackHeight = paneHeight;
                    container.find('>.jspVerticalBar>.jspCap:visible,>.jspVerticalBar>.jspArrow').each(
						function () {
						    verticalTrackHeight -= $(this).outerHeight();
						}
					);


                    verticalDrag.hover(
						function () {
						    verticalDrag.addClass('jspHover');
						},
						function () {
						    verticalDrag.removeClass('jspHover');
						}
					).bind(
						'mousedown.jsp',
						function (e) {
						    // Stop IE from allowing text selection
						    $('html').bind('dragstart.jsp selectstart.jsp', nil);

						    verticalDrag.addClass('jspActive');

						    var startY = e.pageY - verticalDrag.position().top;

						    $('html').bind(
								'mousemove.jsp',
								function (e) {
								    positionDragY(e.pageY - startY, false);
								}
							).bind('mouseup.jsp mouseleave.jsp', cancelDrag);
						    return false;
						}
					);
                    sizeVerticalScrollbar();
                }
            }

            function sizeVerticalScrollbar() {
                verticalTrack.height(verticalTrackHeight + 'px');
                verticalDragPosition = 0;
                scrollbarWidth = settings.verticalGutter + verticalTrack.outerWidth();

                // Make the pane thinner to allow for the vertical scrollbar
                pane.width(paneWidth - scrollbarWidth - originalPaddingTotalWidth);

                // Add margin to the left of the pane if scrollbars are on that side (to position
                // the scrollbar on the left or right set it's left or right property in CSS)
                if (verticalBar.position().left === 0) {
                    pane.css('margin-left', scrollbarWidth + 'px');
                }
            }

            function initialiseHorizontalScroll() {
                if (isScrollableH) {

                    container.append(
						$('<div class="jspHorizontalBar" />').append(
							$('<div class="jspCap jspCapLeft" />'),
							$('<div class="jspTrack" />').append(
								$('<div class="jspDrag" />').append(
									$('<div class="jspDragLeft" />'),
									$('<div class="jspDragRight" />')
								)
							),
							$('<div class="jspCap jspCapRight" />')
						)
					);

                    horizontalBar = container.find('>.jspHorizontalBar');
                    horizontalTrack = horizontalBar.find('>.jspTrack');
                    horizontalDrag = horizontalTrack.find('>.jspDrag');

                    if (settings.showArrows) {
                        arrowLeft = $('<a class="jspArrow jspArrowLeft" />').bind(
							'mousedown.jsp', getArrowScroll(-1, 0)
						).bind('click.jsp', nil);
                        arrowRight = $('<a class="jspArrow jspArrowRight" />').bind(
							'mousedown.jsp', getArrowScroll(1, 0)
						).bind('click.jsp', nil);
                        if (settings.arrowScrollOnHover) {
                            arrowLeft.bind('mouseover.jsp', getArrowScroll(-1, 0, arrowLeft));
                            arrowRight.bind('mouseover.jsp', getArrowScroll(1, 0, arrowRight));
                        }
                        appendArrows(horizontalTrack, settings.horizontalArrowPositions, arrowLeft, arrowRight);
                    }

                    horizontalDrag.hover(
						function () {
						    horizontalDrag.addClass('jspHover');
						},
						function () {
						    horizontalDrag.removeClass('jspHover');
						}
					).bind(
						'mousedown.jsp',
						function (e) {
						    // Stop IE from allowing text selection
						    $('html').bind('dragstart.jsp selectstart.jsp', nil);

						    horizontalDrag.addClass('jspActive');

						    var startX = e.pageX - horizontalDrag.position().left;

						    $('html').bind(
								'mousemove.jsp',
								function (e) {
								    positionDragX(e.pageX - startX, false);
								}
							).bind('mouseup.jsp mouseleave.jsp', cancelDrag);
						    return false;
						}
					);
                    horizontalTrackWidth = container.innerWidth();
                    sizeHorizontalScrollbar();
                }
            }

            function sizeHorizontalScrollbar() {
                container.find('>.jspHorizontalBar>.jspCap:visible,>.jspHorizontalBar>.jspArrow').each(
					function () {
					    horizontalTrackWidth -= $(this).outerWidth();
					}
				);

                horizontalTrack.width(horizontalTrackWidth + 'px');
                horizontalDragPosition = 0;
            }

            function resizeScrollbars() {
                if (isScrollableH && isScrollableV) {
                    var horizontalTrackHeight = horizontalTrack.outerHeight(),
						verticalTrackWidth = verticalTrack.outerWidth();
                    verticalTrackHeight -= horizontalTrackHeight;
                    $(horizontalBar).find('>.jspCap:visible,>.jspArrow').each(
						function () {
						    horizontalTrackWidth += $(this).outerWidth();
						}
					);
                    horizontalTrackWidth -= verticalTrackWidth;
                    paneHeight -= verticalTrackWidth;
                    paneWidth -= horizontalTrackHeight;
                    horizontalTrack.parent().append(
						$('<div class="jspCorner" />').css('width', horizontalTrackHeight + 'px')
					);
                    sizeVerticalScrollbar();
                    sizeHorizontalScrollbar();
                }
                // reflow content
                if (isScrollableH) {
                    pane.width((container.outerWidth() - originalPaddingTotalWidth) + 'px');
                }
                contentHeight = pane.outerHeight();
                percentInViewV = contentHeight / paneHeight;

                if (isScrollableH) {
                    horizontalDragWidth = Math.ceil(1 / percentInViewH * horizontalTrackWidth);
                    if (horizontalDragWidth > settings.horizontalDragMaxWidth) {
                        horizontalDragWidth = settings.horizontalDragMaxWidth;
                    } else if (horizontalDragWidth < settings.horizontalDragMinWidth) {
                        horizontalDragWidth = settings.horizontalDragMinWidth;
                    }
                    horizontalDrag.width(horizontalDragWidth + 'px');
                    dragMaxX = horizontalTrackWidth - horizontalDragWidth;
                    _positionDragX(horizontalDragPosition); // To update the state for the arrow buttons
                }
                if (isScrollableV) {
                    verticalDragHeight = Math.ceil(1 / percentInViewV * verticalTrackHeight);
                    if (verticalDragHeight > settings.verticalDragMaxHeight) {
                        verticalDragHeight = settings.verticalDragMaxHeight;
                    } else if (verticalDragHeight < settings.verticalDragMinHeight) {
                        verticalDragHeight = settings.verticalDragMinHeight;
                    }
                    verticalDrag.height(verticalDragHeight + 'px');
                    dragMaxY = verticalTrackHeight - verticalDragHeight;
                    _positionDragY(verticalDragPosition); // To update the state for the arrow buttons
                }
            }

            function appendArrows(ele, p, a1, a2) {
                var p1 = "before", p2 = "after", aTemp;

                // Sniff for mac... Is there a better way to determine whether the arrows would naturally appear
                // at the top or the bottom of the bar?
                if (p == "os") {
                    p = /Mac/.test(navigator.platform) ? "after" : "split";
                }
                if (p == p1) {
                    p2 = p;
                } else if (p == p2) {
                    p1 = p;
                    aTemp = a1;
                    a1 = a2;
                    a2 = aTemp;
                }

                ele[p1](a1)[p2](a2);
            }

            function getArrowScroll(dirX, dirY, ele) {
                return function () {
                    arrowScroll(dirX, dirY, this, ele);
                    this.blur();
                    return false;
                };
            }

            function arrowScroll(dirX, dirY, arrow, ele) {
                arrow = $(arrow).addClass('jspActive');

                var eve,
					scrollTimeout,
					isFirst = true,
					doScroll = function () {
					    if (dirX !== 0) {
					        jsp.scrollByX(dirX * settings.arrowButtonSpeed);
					    }
					    if (dirY !== 0) {
					        jsp.scrollByY(dirY * settings.arrowButtonSpeed);
					    }
					    scrollTimeout = setTimeout(doScroll, isFirst ? settings.initialDelay : settings.arrowRepeatFreq);
					    isFirst = false;
					};

                doScroll();

                eve = ele ? 'mouseout.jsp' : 'mouseup.jsp';
                ele = ele || $('html');
                ele.bind(
					eve,
					function () {
					    arrow.removeClass('jspActive');
					    scrollTimeout && clearTimeout(scrollTimeout);
					    scrollTimeout = null;
					    ele.unbind(eve);
					}
				);
            }

            function initClickOnTrack() {
                removeClickOnTrack();
                if (isScrollableV) {
                    verticalTrack.bind(
						'mousedown.jsp',
						function (e) {
						    if (e.originalTarget === undefined || e.originalTarget == e.currentTarget) {
						        var clickedTrack = $(this),
									offset = clickedTrack.offset(),
									direction = e.pageY - offset.top - verticalDragPosition,
									scrollTimeout,
									isFirst = true,
									doScroll = function () {
									    var offset = clickedTrack.offset(),
											pos = e.pageY - offset.top - verticalDragHeight / 2,
											contentDragY = paneHeight * settings.scrollPagePercent,
											dragY = dragMaxY * contentDragY / (contentHeight - paneHeight);
									    if (direction < 0) {
									        if (verticalDragPosition - dragY > pos) {
									            jsp.scrollByY(-contentDragY);
									        } else {
									            positionDragY(pos);
									        }
									    } else if (direction > 0) {
									        if (verticalDragPosition + dragY < pos) {
									            jsp.scrollByY(contentDragY);
									        } else {
									            positionDragY(pos);
									        }
									    } else {
									        cancelClick();
									        return;
									    }
									    scrollTimeout = setTimeout(doScroll, isFirst ? settings.initialDelay : settings.trackClickRepeatFreq);
									    isFirst = false;
									},
									cancelClick = function () {
									    scrollTimeout && clearTimeout(scrollTimeout);
									    scrollTimeout = null;
									    $(document).unbind('mouseup.jsp', cancelClick);
									};
						        doScroll();
						        $(document).bind('mouseup.jsp', cancelClick);
						        return false;
						    }
						}
					);
                }

                if (isScrollableH) {
                    horizontalTrack.bind(
						'mousedown.jsp',
						function (e) {
						    if (e.originalTarget === undefined || e.originalTarget == e.currentTarget) {
						        var clickedTrack = $(this),
									offset = clickedTrack.offset(),
									direction = e.pageX - offset.left - horizontalDragPosition,
									scrollTimeout,
									isFirst = true,
									doScroll = function () {
									    var offset = clickedTrack.offset(),
											pos = e.pageX - offset.left - horizontalDragWidth / 2,
											contentDragX = paneWidth * settings.scrollPagePercent,
											dragX = dragMaxX * contentDragX / (contentWidth - paneWidth);
									    if (direction < 0) {
									        if (horizontalDragPosition - dragX > pos) {
									            jsp.scrollByX(-contentDragX);
									        } else {
									            positionDragX(pos);
									        }
									    } else if (direction > 0) {
									        if (horizontalDragPosition + dragX < pos) {
									            jsp.scrollByX(contentDragX);
									        } else {
									            positionDragX(pos);
									        }
									    } else {
									        cancelClick();
									        return;
									    }
									    scrollTimeout = setTimeout(doScroll, isFirst ? settings.initialDelay : settings.trackClickRepeatFreq);
									    isFirst = false;
									},
									cancelClick = function () {
									    scrollTimeout && clearTimeout(scrollTimeout);
									    scrollTimeout = null;
									    $(document).unbind('mouseup.jsp', cancelClick);
									};
						        doScroll();
						        $(document).bind('mouseup.jsp', cancelClick);
						        return false;
						    }
						}
					);
                }
            }

            function removeClickOnTrack() {
                if (horizontalTrack) {
                    horizontalTrack.unbind('mousedown.jsp');
                }
                if (verticalTrack) {
                    verticalTrack.unbind('mousedown.jsp');
                }
            }

            function cancelDrag() {
                $('html').unbind('dragstart.jsp selectstart.jsp mousemove.jsp mouseup.jsp mouseleave.jsp');

                if (verticalDrag) {
                    verticalDrag.removeClass('jspActive');
                }
                if (horizontalDrag) {
                    horizontalDrag.removeClass('jspActive');
                }
            }

            function positionDragY(destY, animate) {
                if (!isScrollableV) {
                    return;
                }
                if (destY < 0) {
                    destY = 0;
                } else if (destY > dragMaxY) {
                    destY = dragMaxY;
                }

                // can't just check if(animate) because false is a valid value that could be passed in...
                if (animate === undefined) {
                    animate = settings.animateScroll;
                }
                if (animate) {
                    jsp.animate(verticalDrag, 'top', destY, _positionDragY);
                } else {
                    verticalDrag.css('top', destY);
                    _positionDragY(destY);
                }

            }

            function _positionDragY(destY) {
                if (destY === undefined) {
                    destY = verticalDrag.position().top;
                }

                container.scrollTop(0);
                verticalDragPosition = destY;

                var isAtTop = verticalDragPosition === 0,
					isAtBottom = verticalDragPosition == dragMaxY,
					percentScrolled = destY / dragMaxY,
					destTop = -percentScrolled * (contentHeight - paneHeight);

                if (wasAtTop != isAtTop || wasAtBottom != isAtBottom) {
                    wasAtTop = isAtTop;
                    wasAtBottom = isAtBottom;
                    elem.trigger('jsp-arrow-change', [wasAtTop, wasAtBottom, wasAtLeft, wasAtRight]);
                }

                updateVerticalArrows(isAtTop, isAtBottom);
                pane.css('top', destTop);
                elem.trigger('jsp-scroll-y', [-destTop, isAtTop, isAtBottom]).trigger('scroll');
            }

            function positionDragX(destX, animate) {
                if (!isScrollableH) {
                    return;
                }
                if (destX < 0) {
                    destX = 0;
                } else if (destX > dragMaxX) {
                    destX = dragMaxX;
                }

                if (animate === undefined) {
                    animate = settings.animateScroll;
                }
                if (animate) {
                    jsp.animate(horizontalDrag, 'left', destX, _positionDragX);
                } else {
                    horizontalDrag.css('left', destX);
                    _positionDragX(destX);
                }
            }

            function _positionDragX(destX) {
                if (destX === undefined) {
                    destX = horizontalDrag.position().left;
                }

                container.scrollTop(0);
                horizontalDragPosition = destX;

                var isAtLeft = horizontalDragPosition === 0,
					isAtRight = horizontalDragPosition == dragMaxX,
					percentScrolled = destX / dragMaxX,
					destLeft = -percentScrolled * (contentWidth - paneWidth);

                if (wasAtLeft != isAtLeft || wasAtRight != isAtRight) {
                    wasAtLeft = isAtLeft;
                    wasAtRight = isAtRight;
                    elem.trigger('jsp-arrow-change', [wasAtTop, wasAtBottom, wasAtLeft, wasAtRight]);
                }

                updateHorizontalArrows(isAtLeft, isAtRight);
                pane.css('left', destLeft);
                elem.trigger('jsp-scroll-x', [-destLeft, isAtLeft, isAtRight]).trigger('scroll');
            }

            function updateVerticalArrows(isAtTop, isAtBottom) {
                if (settings.showArrows) {
                    arrowUp[isAtTop ? 'addClass' : 'removeClass']('jspDisabled');
                    arrowDown[isAtBottom ? 'addClass' : 'removeClass']('jspDisabled');
                }
            }

            function updateHorizontalArrows(isAtLeft, isAtRight) {
                if (settings.showArrows) {
                    arrowLeft[isAtLeft ? 'addClass' : 'removeClass']('jspDisabled');
                    arrowRight[isAtRight ? 'addClass' : 'removeClass']('jspDisabled');
                }
            }

            function scrollToY(destY, animate) {
                var percentScrolled = destY / (contentHeight - paneHeight);
                positionDragY(percentScrolled * dragMaxY, animate);
            }

            function scrollToX(destX, animate) {
                var percentScrolled = destX / (contentWidth - paneWidth);
                positionDragX(percentScrolled * dragMaxX, animate);
            }

            function scrollToElement(ele, stickToTop, animate) {
                var e, eleHeight, eleWidth, eleTop = 0, eleLeft = 0, viewportTop, maxVisibleEleTop, maxVisibleEleLeft, destY, destX;

                // Legal hash values aren't necessarily legal jQuery selectors so we need to catch any
                // errors from the lookup...
                try {
                    e = $(ele);
                } catch (err) {
                    return;
                }
                eleHeight = e.outerHeight();
                eleWidth = e.outerWidth();

                container.scrollTop(0);
                container.scrollLeft(0);

                // loop through parents adding the offset top of any elements that are relatively positioned between
                // the focused element and the jspPane so we can get the true distance from the top
                // of the focused element to the top of the scrollpane...
                while (!e.is('.jspPane')) {
                    eleTop += e.position().top;
                    eleLeft += e.position().left;
                    e = e.offsetParent();
                    if (/^body|html$/i.test(e[0].nodeName)) {
                        // we ended up too high in the document structure. Quit!
                        return;
                    }
                }

                viewportTop = contentPositionY();
                maxVisibleEleTop = viewportTop + paneHeight;
                if (eleTop < viewportTop || stickToTop) { // element is above viewport
                    destY = eleTop - settings.verticalGutter;
                } else if (eleTop + eleHeight > maxVisibleEleTop) { // element is below viewport
                    destY = eleTop - paneHeight + eleHeight + settings.verticalGutter;
                }
                if (destY) {
                    scrollToY(destY, animate);
                }

                viewportLeft = contentPositionX();
                maxVisibleEleLeft = viewportLeft + paneWidth;
                if (eleLeft < viewportLeft || stickToTop) { // element is to the left of viewport
                    destX = eleLeft - settings.horizontalGutter;
                } else if (eleLeft + eleWidth > maxVisibleEleLeft) { // element is to the right viewport
                    destX = eleLeft - paneWidth + eleWidth + settings.horizontalGutter;
                }
                if (destX) {
                    scrollToX(destX, animate);
                }

            }

            function contentPositionX() {
                return -pane.position().left;
            }

            function contentPositionY() {
                return -pane.position().top;
            }

            function initMousewheel() {
                container.unbind(mwEvent).bind(
					mwEvent,
					function (event, delta, deltaX, deltaY) {
					    var dX = horizontalDragPosition, dY = verticalDragPosition;
					    jsp.scrollBy(deltaX * settings.mouseWheelSpeed, -deltaY * settings.mouseWheelSpeed, false);
					    // return true if there was no movement so rest of screen can scroll
					    return dX == horizontalDragPosition && dY == verticalDragPosition;
					}
				);
            }

            function removeMousewheel() {
                container.unbind(mwEvent);
            }

            function nil() {
                return false;
            }

            function initFocusHandler() {
                pane.find(':input,a').unbind('focus.jsp').bind(
					'focus.jsp',
					function (e) {
					    scrollToElement(e.target, false);
					}
				);
            }

            function removeFocusHandler() {
                pane.find(':input,a').unbind('focus.jsp');
            }

            function initKeyboardNav() {
                var keyDown, elementHasScrolled;
                // IE also focuses elements that don't have tabindex set.
                pane.focus(
					function () {
					    elem.focus();
					}
				);

                elem.attr('tabindex', 0)
					.unbind('keydown.jsp keypress.jsp')
					.bind(
						'keydown.jsp',
						function (e) {
						    if (e.target !== this) {
						        return;
						    }
						    var dX = horizontalDragPosition, dY = verticalDragPosition;
						    switch (e.keyCode) {
						        case 40: // down
						        case 38: // up
						        case 34: // page down
						        case 32: // space
						        case 33: // page up
						        case 39: // right
						        case 37: // left
						            keyDown = e.keyCode;
						            keyDownHandler();
						            break;
						        case 35: // end
						            scrollToY(contentHeight - paneHeight);
						            keyDown = null;
						            break;
						        case 36: // home
						            scrollToY(0);
						            keyDown = null;
						            break;
						    }

						    elementHasScrolled = e.keyCode == keyDown && dX != horizontalDragPosition || dY != verticalDragPosition;
						    return !elementHasScrolled;
						}
					).bind(
						'keypress.jsp', // For FF/ OSX so that we can cancel the repeat key presses if the JSP scrolls...
						function (e) {
						    if (e.keyCode == keyDown) {
						        keyDownHandler();
						    }
						    return !elementHasScrolled;
						}
					);

                if (settings.hideFocus) {
                    elem.css('outline', 'none');
                    if ('hideFocus' in container[0]) {
                        elem.attr('hideFocus', true);
                    }
                } else {
                    elem.css('outline', '');
                    if ('hideFocus' in container[0]) {
                        elem.attr('hideFocus', false);
                    }
                }

                function keyDownHandler() {
                    var dX = horizontalDragPosition, dY = verticalDragPosition;
                    switch (keyDown) {
                        case 40: // down
                            jsp.scrollByY(settings.keyboardSpeed, false);
                            break;
                        case 38: // up
                            jsp.scrollByY(-settings.keyboardSpeed, false);
                            break;
                        case 34: // page down
                        case 32: // space
                            jsp.scrollByY(paneHeight * settings.scrollPagePercent, false);
                            break;
                        case 33: // page up
                            jsp.scrollByY(-paneHeight * settings.scrollPagePercent, false);
                            break;
                        case 39: // right
                            jsp.scrollByX(settings.keyboardSpeed, false);
                            break;
                        case 37: // left
                            jsp.scrollByX(-settings.keyboardSpeed, false);
                            break;
                    }

                    elementHasScrolled = dX != horizontalDragPosition || dY != verticalDragPosition;
                    return elementHasScrolled;
                }
            }

            function removeKeyboardNav() {
                elem.attr('tabindex', '-1')
					.removeAttr('tabindex')
					.unbind('keydown.jsp keypress.jsp');
            }

            function observeHash() {
                if (location.hash && location.hash.length > 1) {
                    var e, retryInt;
                    try {
                        e = $(location.hash);
                    } catch (err) {
                        return;
                    }

                    if (e.length && pane.find(location.hash)) {
                        // nasty workaround but it appears to take a little while before the hash has done its thing
                        // to the rendered page so we just wait until the container's scrollTop has been messed up.
                        if (container.scrollTop() === 0) {
                            retryInt = setInterval(
								function () {
								    if (container.scrollTop() > 0) {
								        scrollToElement(location.hash, true);
								        $(document).scrollTop(container.position().top);
								        clearInterval(retryInt);
								    }
								},
								50
							);
                        } else {
                            scrollToElement(location.hash, true);
                            $(document).scrollTop(container.position().top);
                        }
                    }
                }
            }

            function unhijackInternalLinks() {
                $('a.jspHijack').unbind('click.jsp-hijack').removeClass('jspHijack');
            }

            function hijackInternalLinks() {
                unhijackInternalLinks();
                $('a[href^=#]').addClass('jspHijack').bind(
					'click.jsp-hijack',
					function () {
					    var uriParts = this.href.split('#'), hash;
					    if (uriParts.length > 1) {
					        hash = uriParts[1];
					        if (hash.length > 0 && pane.find('#' + hash).length > 0) {
					            scrollToElement('#' + hash, true);
					            // Need to return false otherwise things mess up... Would be nice to maybe also scroll
					            // the window to the top of the scrollpane?
					            return false;
					        }
					    }
					}
				);
            }

            // Init touch on iPad, iPhone, iPod, Android
            function initTouch() {
                var startX,
					startY,
					touchStartX,
					touchStartY,
					moved,
					moving = false;

                container.unbind('touchstart.jsp touchmove.jsp touchend.jsp click.jsp-touchclick').bind(
					'touchstart.jsp',
					function (e) {
					    var touch = e.originalEvent.touches[0];
					    startX = contentPositionX();
					    startY = contentPositionY();
					    touchStartX = touch.pageX;
					    touchStartY = touch.pageY;
					    moved = false;
					    moving = true;
					}
				).bind(
					'touchmove.jsp',
					function (ev) {
					    if (!moving) {
					        return;
					    }

					    var touchPos = ev.originalEvent.touches[0],
							dX = horizontalDragPosition, dY = verticalDragPosition;

					    jsp.scrollTo(startX + touchStartX - touchPos.pageX, startY + touchStartY - touchPos.pageY);

					    moved = moved || Math.abs(touchStartX - touchPos.pageX) > 5 || Math.abs(touchStartY - touchPos.pageY) > 5;

					    // return true if there was no movement so rest of screen can scroll
					    return dX == horizontalDragPosition && dY == verticalDragPosition;
					}
				).bind(
					'touchend.jsp',
					function (e) {
					    moving = false;
					    /*if(moved) {
					    return false;
					    }*/
					}
				).bind(
					'click.jsp-touchclick',
					function (e) {
					    if (moved) {
					        moved = false;
					        return false;
					    }
					}
				);
            }

            function destroy() {
                var currentY = contentPositionY(),
					currentX = contentPositionX();
                elem.removeClass('jspScrollable').unbind('.jsp');
                elem.replaceWith(originalElement.append(pane.children()));
                originalElement.scrollTop(currentY);
                originalElement.scrollLeft(currentX);
            }

            // Public API
            $.extend(
				jsp,
				{
				    // Reinitialises the scroll pane (if it's internal dimensions have changed since the last time it
				    // was initialised). The settings object which is passed in will override any settings from the
				    // previous time it was initialised - if you don't pass any settings then the ones from the previous
				    // initialisation will be used.
				    reinitialise: function (s) {
				        s = $.extend({}, settings, s);
				        initialise(s);
				    },
				    // Scrolls the specified element (a jQuery object, DOM node or jQuery selector string) into view so
				    // that it can be seen within the viewport. If stickToTop is true then the element will appear at
				    // the top of the viewport, if it is false then the viewport will scroll as little as possible to
				    // show the element. You can also specify if you want animation to occur. If you don't provide this
				    // argument then the animateScroll value from the settings object is used instead.
				    scrollToElement: function (ele, stickToTop, animate) {
				        scrollToElement(ele, stickToTop, animate);
				    },
				    // Scrolls the pane so that the specified co-ordinates within the content are at the top left
				    // of the viewport. animate is optional and if not passed then the value of animateScroll from
				    // the settings object this jScrollPane was initialised with is used.
				    scrollTo: function (destX, destY, animate) {
				        scrollToX(destX, animate);
				        scrollToY(destY, animate);
				    },
				    // Scrolls the pane so that the specified co-ordinate within the content is at the left of the
				    // viewport. animate is optional and if not passed then the value of animateScroll from the settings
				    // object this jScrollPane was initialised with is used.
				    scrollToX: function (destX, animate) {
				        scrollToX(destX, animate);
				    },
				    // Scrolls the pane so that the specified co-ordinate within the content is at the top of the
				    // viewport. animate is optional and if not passed then the value of animateScroll from the settings
				    // object this jScrollPane was initialised with is used.
				    scrollToY: function (destY, animate) {
				        scrollToY(destY, animate);
				    },
				    // Scrolls the pane to the specified percentage of its maximum horizontal scroll position. animate
				    // is optional and if not passed then the value of animateScroll from the settings object this
				    // jScrollPane was initialised with is used.
				    scrollToPercentX: function (destPercentX, animate) {
				        scrollToX(destPercentX * (contentWidth - paneWidth), animate);
				    },
				    // Scrolls the pane to the specified percentage of its maximum vertical scroll position. animate
				    // is optional and if not passed then the value of animateScroll from the settings object this
				    // jScrollPane was initialised with is used.
				    scrollToPercentY: function (destPercentY, animate) {
				        scrollToY(destPercentY * (contentHeight - paneHeight), animate);
				    },
				    // Scrolls the pane by the specified amount of pixels. animate is optional and if not passed then
				    // the value of animateScroll from the settings object this jScrollPane was initialised with is used.
				    scrollBy: function (deltaX, deltaY, animate) {
				        jsp.scrollByX(deltaX, animate);
				        jsp.scrollByY(deltaY, animate);
				    },
				    // Scrolls the pane by the specified amount of pixels. animate is optional and if not passed then
				    // the value of animateScroll from the settings object this jScrollPane was initialised with is used.
				    scrollByX: function (deltaX, animate) {
				        var destX = contentPositionX() + deltaX,
							percentScrolled = destX / (contentWidth - paneWidth);
				        positionDragX(percentScrolled * dragMaxX, animate);
				    },
				    // Scrolls the pane by the specified amount of pixels. animate is optional and if not passed then
				    // the value of animateScroll from the settings object this jScrollPane was initialised with is used.
				    scrollByY: function (deltaY, animate) {
				        var destY = contentPositionY() + deltaY,
							percentScrolled = destY / (contentHeight - paneHeight);
				        positionDragY(percentScrolled * dragMaxY, animate);
				    },
				    // Positions the horizontal drag at the specified x position (and updates the viewport to reflect
				    // this). animate is optional and if not passed then the value of animateScroll from the settings
				    // object this jScrollPane was initialised with is used.
				    positionDragX: function (x, animate) {
				        positionDragX(x, animate);
				    },
				    // Positions the vertical drag at the specified y position (and updates the viewport to reflect
				    // this). animate is optional and if not passed then the value of animateScroll from the settings
				    // object this jScrollPane was initialised with is used.
				    positionDragY: function (y, animate) {
				        positionDragX(y, animate);
				    },
				    // This method is called when jScrollPane is trying to animate to a new position. You can override
				    // it if you want to provide advanced animation functionality. It is passed the following arguments:
				    //  * ele          - the element whose position is being animated
				    //  * prop         - the property that is being animated
				    //  * value        - the value it's being animated to
				    //  * stepCallback - a function that you must execute each time you update the value of the property
				    // You can use the default implementation (below) as a starting point for your own implementation.
				    animate: function (ele, prop, value, stepCallback) {
				        var params = {};
				        params[prop] = value;
				        ele.animate(
							params,
							{
							    'duration': settings.animateDuration,
							    'ease': settings.animateEase,
							    'queue': false,
							    'step': stepCallback
							}
						);
				    },
				    // Returns the current x position of the viewport with regards to the content pane.
				    getContentPositionX: function () {
				        return contentPositionX();
				    },
				    // Returns the current y position of the viewport with regards to the content pane.
				    getContentPositionY: function () {
				        return contentPositionY();
				    },
				    // Returns the width of the content within the scroll pane.
				    getContentWidth: function () {
				        return contentWidth();
				    },
				    // Returns the height of the content within the scroll pane.
				    getContentHeight: function () {
				        return contentHeight();
				    },
				    // Returns the horizontal position of the viewport within the pane content.
				    getPercentScrolledX: function () {
				        return contentPositionX() / (contentWidth - paneWidth);
				    },
				    // Returns the vertical position of the viewport within the pane content.
				    getPercentScrolledY: function () {
				        return contentPositionY() / (contentHeight - paneHeight);
				    },
				    // Returns whether or not this scrollpane has a horizontal scrollbar.
				    getIsScrollableH: function () {
				        return isScrollableH;
				    },
				    // Returns whether or not this scrollpane has a vertical scrollbar.
				    getIsScrollableV: function () {
				        return isScrollableV;
				    },
				    // Gets a reference to the content pane. It is important that you use this method if you want to
				    // edit the content of your jScrollPane as if you access the element directly then you may have some
				    // problems (as your original element has had additional elements for the scrollbars etc added into
				    // it).
				    getContentPane: function () {
				        return pane;
				    },
				    // Scrolls this jScrollPane down as far as it can currently scroll. If animate isn't passed then the
				    // animateScroll value from settings is used instead.
				    scrollToBottom: function (animate) {
				        positionDragY(dragMaxY, animate);
				    },
				    // Hijacks the links on the page which link to content inside the scrollpane. If you have changed
				    // the content of your page (e.g. via AJAX) and want to make sure any new anchor links to the
				    // contents of your scroll pane will work then call this function.
				    hijackInternalLinks: function () {
				        hijackInternalLinks();
				    },
				    // Removes the jScrollPane and returns the page to the state it was in before jScrollPane was
				    // initialised.
				    destroy: function () {
				        destroy();
				    }
				}
			);

            initialise(s);
        }

        // Pluginifying code...
        settings = $.extend({}, $.fn.jScrollPane.defaults, settings);

        // Apply default speed
        $.each(['mouseWheelSpeed', 'arrowButtonSpeed', 'trackClickSpeed', 'keyboardSpeed'], function () {
            settings[this] = settings[this] || settings.speed;
        });

        var ret;
        this.each(
			function () {
			    var elem = $(this), jspApi = elem.data('jsp');
			    if (jspApi) {
			        jspApi.reinitialise(settings);
			    } else {
			        jspApi = new JScrollPane(elem, settings);
			        elem.data('jsp', jspApi);
			    }
			    ret = ret ? ret.add(elem) : elem;
			}
		);
        return ret;
    };

    $.fn.jScrollPane.defaults = {
        showArrows: false,
        maintainPosition: true,
        clickOnTrack: true,
        autoReinitialise: false,
        autoReinitialiseDelay: 500,
        verticalDragMinHeight: 0,
        verticalDragMaxHeight: 99999,
        horizontalDragMinWidth: 0,
        horizontalDragMaxWidth: 99999,
        animateScroll: false,
        animateDuration: 300,
        animateEase: 'linear',
        hijackInternalLinks: false,
        verticalGutter: 4,
        horizontalGutter: 4,
        mouseWheelSpeed: 0,
        arrowButtonSpeed: 0,
        arrowRepeatFreq: 50,
        arrowScrollOnHover: false,
        trackClickSpeed: 0,
        trackClickRepeatFreq: 70,
        verticalArrowPositions: 'split',
        horizontalArrowPositions: 'split',
        enableKeyboardNavigation: true,
        hideFocus: false,
        keyboardSpeed: 0,
        initialDelay: 300,        // Delay before starting repeating
        speed: 30, 	// Default speed when others falsey
        scrollPagePercent: .8		// Percent of visible area scrolled when pageUp/Down or track area pressed
    };

})(jQuery, this);


/*
* jQuery Ultimate Carousel 2.0
* Creates a carousel from a set of elements, allowing for pagers.
*
* Based on:
* jQuery Infinite Carousel Plugin (http://code.google.com/p/jquery-infinite-carousel)
*/
; (function ($) {
    $.fn.carousel = function (options) {
        // iterate through each item
        this.each(function (i) {
            // create instance
            var inst = $(this);

            // create carousel data object if not set
            if (inst.data('carousel') == null) {
                inst.data('carousel', {
                    options: $.fn.carousel.options,
                    initialized: false,
                    animating: false
                });
            }

            // create carousel data object minipulation
            var carousel = inst.data('carousel');

            // merge options for carousel object with that of the supplied options
            carousel.options = $.extend(true, carousel.options, (typeof options == 'undefined') ? {} : options);

            // set easing mode to default if easing mode is not available
            carousel.options.easing = $.isFunction($.easing[carousel.options.easing]) ? carousel.options.easing : $.fn.carousel.options.easing;

            // initialize carousel for instance
            $.fn.carousel.init(inst);
        });

        return this;
    }

    // initilize carousel, making any nescessary calculations and adding nescessary markup
    $.fn.carousel.init = function (inst) {
        // ensure inst is a jQuery object
        var inst = $(inst);

        // get carousel object for instance
        var carousel = inst.data('carousel');
        var options = carousel.options;

        // set the carousel's width and height
        carousel.width = (typeof carousel.width == 'number' && carousel.width > 0) ? carousel.width : parseInt(inst.width());

        // continue only if carousel's width is greater than 0
        if (carousel.width > 0 && !carousel.initialized) {
            // get all slides within instance
            var slides = inst.children();

            // set references for slides
            carousel.slides = {
                current: 1,
                count: slides.length,
                width: 0,
                height: 0,
                outerWidth: 0,
                outerHeight: 0,
                shown: 1,
                template: slides.first().clone().addClass('empty').empty()
            };

            // iterate through each slide
            slides.each(function (i) {
                // get the dimensions of the current slide
                var width = parseInt($(this).width());
                var height = parseInt($(this).height());
                var outerWidth = parseInt($(this).outerWidth(true));
                var outerHeight = parseInt($(this).outerHeight(true));

                // increase the width/height values of slides if the current slide's is greater
                carousel.slides.width = (width > carousel.slides.width) ? width : carousel.slides.width;
                carousel.slides.height = (height > carousel.slides.height) ? height : carousel.slides.height;

                // increase the outerWidth/outerHeight values of slides if the current slide's is greater
                carousel.slides.outerWidth = (outerWidth > carousel.slides.outerWidth) ? outerWidth : carousel.slides.outerWidth;
                carousel.slides.outerHeight = (outerHeight > carousel.slides.outerHeight) ? outerHeight : carousel.slides.outerHeight;
            });

            // if more than one slide may be shown, determine slides shown based on width of carousel and outerWidth of slides
            if (inst.width() > carousel.slides.outerWidth) {
                carousel.slides.shown = Math.floor(inst.width() / carousel.slides.outerWidth);
            }

            // set the height of the instance
            inst.height(carousel.slides.outerHeight);

            // set the width of the instance
            inst.width(carousel.width);

            // continue if the number of slides is greater than the number of slides shown
            if (carousel.slides.count > carousel.slides.shown) {
                // add the viewport division if it does not exist and set it's width explicitly
                if (inst.parent('div.carousel-viewport').length <= 0) {
                    inst.wrap('<div class="carousel-viewport"></div>').parent('.carousel-viewport').width((carousel.slides.outerWidth * carousel.slides.shown) - (carousel.slides.outerWidth - carousel.slides.width));
                }

                // set the width and height of all slides
                slides.width(carousel.slides.width);
                slides.height(carousel.slides.height);

                // set the width and height of the slide template
                carousel.slides.template.width(carousel.slides.width).height(carousel.slides.height);

                // calculate the number of empty slides to create
                carousel.slides.empty = (carousel.slides.shown - (carousel.slides.count % carousel.slides.shown)) % carousel.slides.shown;

                // add number of empty slides needed to create 
                for (i = 0; i < carousel.slides.empty; i++) {
                    inst.append(carousel.slides.template.clone());
                }

                // add duplicate slides for purposes of facilitating an infinite scroll
                for (i = 0; i < carousel.slides.shown; i++) {
                    inst.append($(slides[i]).clone());
                }

                // calculate the new width of the carousel based on the number of slides now present
                carousel.width = inst.children().length * carousel.slides.outerWidth;

                // set the width of the instance
                inst.width(carousel.width);

                // add the carousel pager
                $.fn.carousel.pagerAdd(inst);

                // set carousel as initialized
                carousel.initialized = true;
            }
        }
    };

    // add pager for carousel
    $.fn.carousel.pagerAdd = function (inst) {
        // ensure inst is a jQuery object
        var inst = $(inst);

        // get carousel object for instance
        var carousel = inst.data('carousel');
        var options = carousel.options;

        // add the pager list if it should be shown and it doesn't already exist
        if (options.pager.show && inst.siblings('ul.carousel-pager').length <= 0) {
            // create pager list
            var pager = $('<ul class="carousel-pager"></ul>').width((carousel.slides.outerWidth * carousel.slides.shown) - (carousel.slides.outerWidth - carousel.slides.width)).bind('click', function (e) {
                // set references to target and the target's parent
                target = $(e.target);
                parentEl = target.parent();

                // check if the target is an anchor
                if (target.is('a')) {
                    // prevent the default click behavior
                    e.preventDefault();

                    var fromPager = false;

                    // handle the click based on whether it is a page button or prev/next button
                    if (parentEl.hasClass('prev')) {
                        i = carousel.slides.current - carousel.slides.shown;
                    }
                    else if (parentEl.hasClass('next')) {
                        i = carousel.slides.current + carousel.slides.shown;
                    }
                    else {
                        var page = $('li:not(.prev, .next)', this).index(parentEl) + 1;

                        i = (page * carousel.slides.shown) - (carousel.slides.shown - 1);

                        fromPager = true;
                    }

                    $.fn.carousel.goTo(inst, i, fromPager);
                }
            });

            // create template for pager button
            var pagerTemplate = $('<li><a href="#"></a></li>');

            // calculate number of pages
            carousel.pages = Math.ceil(carousel.slides.count / carousel.slides.shown);

            // add page button for each page
            for (i = 1; i <= carousel.pages; i++) {
                // build the button
                var pageButton = pagerTemplate.clone().find('a').parent();

                // add active class to first pager button
                if (i == 1) {
                    pageButton.addClass('active');
                }

                // add the button
                pager.append(pageButton);
            }

            // add previous button to pager
            if (options.pager.prevButton.show) {
                // build the button
                var pagerPrev = pagerTemplate.clone().addClass('prev').find('a').html(options.pager.prevButton.text).parent();

                // add the button
                pager.append(pagerPrev);
            }

            // add next button to pager
            if (options.pager.nextButton.show) {
                // build the button
                var pagerNext = pagerTemplate.clone().addClass('next').find('a').html(options.pager.nextButton.text).parent();

                // add the button
                pager.append(pagerNext);
            }

            // add the pager
            if (options.pager.position == 'before') {
                inst.parent('.carousel-viewport').before(pager);
            }
            else {
                inst.parent('.carousel-viewport').after(pager);
            }

            // create reference to pager
            carousel.pager = inst.addClass('carousel-with-pager').parent('.carousel-viewport').siblings('ul.carousel-pager');
        }
    }

    // advance to a specific item within the carousel
    $.fn.carousel.goTo = function (inst, i, fromPager) {
        // define default fromPager value
        var fromPager = (typeof fromPager == 'undefined') ? false : fromPager;

        // ensure inst is a jQuery object
        var inst = $(inst);

        // get carousel object for instance
        var carousel = inst.data('carousel');
        var options = carousel.options;

        // set index to valid slide index
        var firstToLast = false;
        var lastToFirst = false;

        if (i > carousel.slides.count) {
            i = i - carousel.slides.count - carousel.slides.empty;
            lastToFirst = true;
        }
        else if (i <= 0) {
            i = i + carousel.slides.count + carousel.slides.empty;
            firstToLast = true;
        }

        // only animate if the carousel is not animating and the current slide is not the same as requested
        if (!(carousel.slides.current == i) && !carousel.animating) {
            var distance = {
                left: {
                    slides: carousel.slides.current - i
                },
                right: {
                    slides: carousel.slides.count + carousel.slides.empty + i - carousel.slides.current
                }
            }

            if (i > carousel.slides.current) {
                distance.left.slides = carousel.slides.count + carousel.slides.empty - i + carousel.slides.current;
                distance.right.slides = i - carousel.slides.current;
            }

            distance.left.pages = Math.ceil(distance.left.slides / carousel.slides.shown);
            distance.right.pages = Math.ceil(distance.right.slides / carousel.slides.shown);

            var currentPage = Math.ceil(carousel.slides.current / carousel.slides.shown);
            var goToPage = Math.ceil(i / carousel.slides.shown);
            var animateProperties = {};

            // animate right
            if (((goToPage > currentPage && distance.right.pages < carousel.pages) || (distance.right.pages == 1 && currentPage == carousel.pages && !fromPager) && !(firstToLast || (!firstToLast && !lastToFirst))) && !(currentPage == 1 && distance.left.pages == 1 && !fromPager && !(lastToFirst || (!firstToLast && !lastToFirst)))) {
                if (carousel.slides.current <= carousel.slides.shown) {
                    var left = -(carousel.slides.outerWidth * (carousel.slides.current - 1));
                }

                var rightAnimate = '-=' + (carousel.slides.outerWidth * distance.right.slides);
                animateProperties = { left: rightAnimate }
            }
            // animate left
            else {
                if (carousel.slides.current <= carousel.slides.shown) {
                    var left = -(carousel.slides.outerWidth * (carousel.slides.count + carousel.slides.empty + carousel.slides.current - 1));
                }

                var leftAnimate = '+=' + (carousel.slides.outerWidth * distance.left.slides);
                animateProperties = { left: leftAnimate }
            }

            // set initial state if left value is set
            if (typeof left != 'undefined') {
                inst.css('left', left + 'px');
            }

            // set the active pager item
            if (options.pager.show) {
                eq = Math.ceil(i / carousel.slides.shown) - 1;

                $('li:not(.prev, .next)', carousel.pager).removeClass('active').filter(':eq(' + eq + ')').addClass('active');
            }

            // set slider to animating
            carousel.animating = true;

            // call slideStart function
            carousel.options.slideStart(inst);

            // animate slider
            inst.animate(animateProperties, options.duration, options.easing, function () {
                // set slider to not animating
                carousel.animating = false;

                // call slideComplete function
                carousel.options.slideComplete(inst);
            });

            // set first slide reference
            carousel.slides.current = i;
        }
    };

    // set default options
    $.fn.carousel.options = {
        pager: {
            show: true,
            position: 'before',
            prevButton: {
                show: true,
                // position: 'before',
                text: 'Previous'
            },
            nextButton: {
                show: true,
                // position: 'after',
                text: 'Next'
            }
        },
        slideStart: function (inst) { },
        slideComplete: function (inst) { },
        easing: 'swing',
        duration: 300
    };
})(jQuery);
/*! Copyright (c) 2010 Brandon Aaron (http://brandonaaron.net)
* Licensed under the MIT License (LICENSE.txt).
*
* Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
* Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
* Thanks to: Seamus Leahy for adding deltaX and deltaY
*
* Version: 3.0.4
* 
* Requires: 1.2.2+
*/

(function ($) {

    var types = ['DOMMouseScroll', 'mousewheel'];

    $.event.special.mousewheel = {
        setup: function () {
            if (this.addEventListener) {
                for (var i = types.length; i; ) {
                    this.addEventListener(types[--i], handler, false);
                }
            } else {
                this.onmousewheel = handler;
            }
        },

        teardown: function () {
            if (this.removeEventListener) {
                for (var i = types.length; i; ) {
                    this.removeEventListener(types[--i], handler, false);
                }
            } else {
                this.onmousewheel = null;
            }
        }
    };

    $.fn.extend({
        mousewheel: function (fn) {
            return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
        },

        unmousewheel: function (fn) {
            return this.unbind("mousewheel", fn);
        }
    });


    function handler(event) {
        var orgEvent = event || window.event, args = [].slice.call(arguments, 1), delta = 0, returnValue = true, deltaX = 0, deltaY = 0;
        event = $.event.fix(orgEvent);
        event.type = "mousewheel";

        // Old school scrollwheel delta
        if (event.wheelDelta) { delta = event.wheelDelta / 120; }
        if (event.detail) { delta = -event.detail / 3; }

        // New school multidimensional scroll (touchpads) deltas
        deltaY = delta;

        // Gecko
        if (orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS) {
            deltaY = 0;
            deltaX = -1 * delta;
        }

        // Webkit
        if (orgEvent.wheelDeltaY !== undefined) { deltaY = orgEvent.wheelDeltaY / 120; }
        if (orgEvent.wheelDeltaX !== undefined) { deltaX = -1 * orgEvent.wheelDeltaX / 120; }

        // Add event and delta to the front of the arguments
        args.unshift(event, delta, deltaX, deltaY);

        return $.event.handle.apply(this, args);
    }

})(jQuery);
/*!
* jquery.qtip. The jQuery tooltip plugin
*
* Copyright (c) 2009 Craig Thompson
* http://craigsworks.com
*
* Licensed under MIT
* http://www.opensource.org/licenses/mit-license.php
*
* Launch  : February 2009
* Version : 1.0.0-rc3
* Released: Tuesday 12th May, 2009 - 00:00
* Debug: jquery.qtip.debug.js
* A few minor fixes added by Dustin Moore, dustmoo@gmail.com---
* ---Added Craigs opacity fix for to the afterShow function to prevent the tip opacity rendering
* ---Raised the z-index to a higher maximum to prevent z-index conflicts
* ---Added functionality so that unfocus can be used with other hide actions, i.e. unfocus and mouseout
* ---Various IE fixes as well as jQuery 1.4.1 compatability updates.
*/
(function ($) {
    // Implementation
    $.fn.qtip = function (options, blanket) {
        var i, id, interfaces, opts, obj, command, config, api;

        // Return API / Interfaces if requested
        if (typeof options == 'string') {
            // Make sure API data exists if requested
            if ($.isPlainObject($(this).data('qtip')))
                $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.NO_TOOLTIP_PRESENT, false);

            // Return requested object
            if (options == 'api')
                return $(this).data('qtip').interfaces[$(this).data('qtip').current];
            else if (options == 'interfaces')
                return $(this).data('qtip').interfaces;
        }

        // Validate provided options
        else {
            // Set null options object if no options are provided
            if (!options) options = {};

            // Sanitize option data
            if (typeof options.content !== 'object' || (options.content.jquery && options.content.length > 0)) options.content = { text: options.content };
            if (typeof options.content.title !== 'object') options.content.title = { text: options.content.title };
            if (typeof options.position !== 'object') options.position = { corner: options.position };
            if (typeof options.position.corner !== 'object') options.position.corner = { target: options.position.corner, tooltip: options.position.corner };
            if (typeof options.show !== 'object') options.show = { when: options.show };
            if (typeof options.show.when !== 'object') options.show.when = { event: options.show.when };
            if (typeof options.show.effect !== 'object') options.show.effect = { type: options.show.effect };
            if (typeof options.hide !== 'object') options.hide = { when: options.hide };
            if (typeof options.hide.when !== 'object') options.hide.when = { event: options.hide.when };
            if (typeof options.hide.effect !== 'object') options.hide.effect = { type: options.hide.effect };
            if (typeof options.style !== 'object') options.style = { name: options.style };
            options.style = sanitizeStyle(options.style);

            // Build main options object
            opts = $.extend(true, {}, $.fn.qtip.defaults, options);

            // Inherit all style properties into one syle object and include original options
            opts.style = buildStyle.call({ options: opts }, opts.style);
            opts.user = $.extend(true, {}, options);
        };

        // Iterate each matched element
        return $(this).each(function () // Return original elements as per jQuery guidelines
        {
            // Check for API commands
            if (typeof options == 'string') {
                command = options.toLowerCase();
                interfaces = $(this).qtip('interfaces');

                // Make sure API data exists$('.qtip').qtip('destroy')
                if (typeof interfaces == 'object') {
                    // Check if API call is a BLANKET DESTROY command
                    if (blanket === true && command == 'destroy')
                        while (interfaces.length > 0) interfaces[interfaces.length - 1].destroy();

                    // API call is not a BLANKET DESTROY command
                    else {
                        // Check if supplied command effects this tooltip only (NOT BLANKET)
                        if (blanket !== true) interfaces = [$(this).qtip('api')];

                        // Execute command on chosen qTips
                        for (i = 0; i < interfaces.length; i++) {
                            // Destroy command doesn't require tooltip to be rendered
                            if (command == 'destroy') interfaces[i].destroy();

                            // Only call API if tooltip is rendered and it wasn't a destroy call
                            else if (interfaces[i].status.rendered === true) {
                                if (command == 'show') interfaces[i].show();
                                else if (command == 'hide') interfaces[i].hide();
                                else if (command == 'focus') interfaces[i].focus();
                                else if (command == 'disable') interfaces[i].disable(true);
                                else if (command == 'enable') interfaces[i].disable(false);
                            };
                        };
                    };
                };
            }

            // No API commands, continue with qTip creation
            else {
                // Create unique configuration object
                config = $.extend(true, {}, opts);
                config.hide.effect.length = opts.hide.effect.length;
                config.show.effect.length = opts.show.effect.length;

                // Sanitize target options
                if (config.position.container === false) config.position.container = $(document.body);
                if (config.position.target === false) config.position.target = $(this);
                if (config.show.when.target === false) config.show.when.target = $(this);
                if (config.hide.when.target === false) config.hide.when.target = $(this);

                // Determine tooltip ID (Reuse array slots if possible)
                id = $.fn.qtip.interfaces.length;
                for (i = 0; i < id; i++) {
                    if (typeof $(this).data('qtip') === 'object' && $(this).data('qtip'));
                };

                // Instantiate the tooltip
                obj = new qTip($(this), config, id);

                // Add API references
                $.fn.qtip.interfaces[id] = obj;

                // Check if element already has qTip data assigned
                if ($.isPlainObject($(this).data('qtip'))) {
                    // Set new current interface id
                    if (typeof $(this).attr('qtip') === 'undefined')
                        $(this).data('qtip').current = $(this).data('qtip').interfaces.length;

                    // Push new API interface onto interfaces array
                    $(this).data('qtip').interfaces.push(obj);
                }

                // No qTip data is present, create now
                else $(this).data('qtip', { current: 0, interfaces: [obj] });

                // If prerendering is disabled, create tooltip on showEvent
                if (config.content.prerender === false && config.show.when.event !== false && config.show.ready !== true) {
                    config.show.when.target.bind(config.show.when.event + '.qtip-' + id + '-create', { qtip: id }, function (event) {
                        // Retrieve API interface via passed qTip Id
                        api = $.fn.qtip.interfaces[event.data.qtip];

                        // Unbind show event and cache mouse coords
                        api.options.show.when.target.unbind(api.options.show.when.event + '.qtip-' + event.data.qtip + '-create');
                        api.cache.mouse = { x: event.pageX, y: event.pageY };

                        // Render tooltip and start the event sequence
                        construct.call(api);
                        api.options.show.when.target.trigger(api.options.show.when.event);
                    });
                }

                // Prerendering is enabled, create tooltip now
                else {
                    // Set mouse position cache to top left of the element
                    obj.cache.mouse = {
                        x: config.show.when.target.offset().left,
                        y: config.show.when.target.offset().top
                    };

                    // Construct the tooltip
                    construct.call(obj);
                }
            };
        });
    };

    // Instantiator
    function qTip(target, options, id) {
        // Declare this reference
        var self = this;

        // Setup class attributes
        self.id = id;
        self.options = options;
        self.status = {
            animated: false,
            rendered: false,
            disabled: false,
            focused: false
        };
        self.elements = {
            target: target.addClass(self.options.style.classes.target),
            tooltip: null,
            wrapper: null,
            content: null,
            contentWrapper: null,
            title: null,
            button: null,
            tip: null,
            bgiframe: null
        };
        self.cache = {
            mouse: {},
            position: {},
            toggle: 0
        };
        self.timers = {};

        // Define exposed API methods
        $.extend(self, self.options.api,
		{
		    show: function (event) {
		        var returned, solo;

		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'show');

		        // Only continue if element is visible
		        if (self.elements.tooltip.css('display') !== 'none') return self;

		        // Clear animation queue
		        self.elements.tooltip.stop(true, false);

		        // Call API method and if return value is false, halt
		        returned = self.beforeShow.call(self, event);
		        if (returned === false) return self;

		        // Define afterShow callback method
		        function afterShow() {
		            $(this).css({ opacity: '' });
		            // Call API method and focus if it isn't static
		            if (self.options.position.type !== 'static') self.focus();
		            self.onShow.call(self, event);

		            // Prevent antialias from disappearing in IE7 by removing filter attribute
		            if ($.browser.msie) self.elements.tooltip.get(0).style.removeAttribute('filter');
		        };

		        // Maintain toggle functionality if enabled
		        self.cache.toggle = 1;

		        // Update tooltip position if it isn't static
		        if (self.options.position.type !== 'static')
		            self.updatePosition(event, (self.options.show.effect.length > 0));

		        // Hide other tooltips if tooltip is solo
		        if (typeof self.options.show.solo == 'object') solo = $(self.options.show.solo);
		        else if (self.options.show.solo === true) solo = $('div.qtip').not(self.elements.tooltip);
		        if (solo) solo.each(function () { if ($(this).qtip('api').status.rendered === true) $(this).qtip('api').hide(); });

		        // Show tooltip
		        if (typeof self.options.show.effect.type == 'function') {
		            self.options.show.effect.type.call(self.elements.tooltip, self.options.show.effect.length);
		            self.elements.tooltip.queue(function () { afterShow(); $(this).dequeue(); });
		        }
		        else {
		            switch (self.options.show.effect.type.toLowerCase()) {
		                case 'fade':
		                    self.elements.tooltip.fadeIn(self.options.show.effect.length, afterShow);
		                    break;
		                case 'slide':
		                    self.elements.tooltip.slideDown(self.options.show.effect.length, function () {
		                        afterShow();
		                        if (self.options.position.type !== 'static') self.updatePosition(event, true);
		                    });
		                    break;
		                case 'grow':
		                    self.elements.tooltip.show(self.options.show.effect.length, afterShow);
		                    break;
		                default:
		                    self.elements.tooltip.show(null, afterShow);
		                    self.elements.tooltip.css({ opacity: '' });
		                    break;
		            };

		            // Add active class to tooltip
		            self.elements.tooltip.addClass(self.options.style.classes.active);
		        };

		        // Log event and return
		        return $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_SHOWN, 'show');
		    },

		    hide: function (event) {
		        var returned;

		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'hide');

		        // Only continue if element is visible
		        else if (self.elements.tooltip.css('display') === 'none') return self;

		        // Stop show timer and animation queue
		        clearTimeout(self.timers.show);
		        self.elements.tooltip.stop(true, false);

		        // Call API method and if return value is false, halt
		        returned = self.beforeHide.call(self, event);
		        if (returned === false) return self;

		        // Define afterHide callback method
		        function afterHide() { self.onHide.call(self, event); };

		        // Maintain toggle functionality if enabled
		        self.cache.toggle = 0;

		        // Hide tooltip
		        if (typeof self.options.hide.effect.type == 'function') {
		            self.options.hide.effect.type.call(self.elements.tooltip, self.options.hide.effect.length);
		            self.elements.tooltip.queue(function () { afterHide(); $(this).dequeue(); });
		        }
		        else {
		            switch (self.options.hide.effect.type.toLowerCase()) {
		                case 'fade':
		                    self.elements.tooltip.fadeOut(self.options.hide.effect.length, afterHide);
		                    break;
		                case 'slide':
		                    self.elements.tooltip.slideUp(self.options.hide.effect.length, afterHide);
		                    break;
		                case 'grow':
		                    self.elements.tooltip.hide(self.options.hide.effect.length, afterHide);
		                    break;
		                default:
		                    self.elements.tooltip.hide(null, afterHide);
		                    break;
		            };

		            // Remove active class to tooltip
		            self.elements.tooltip.removeClass(self.options.style.classes.active);
		        };

		        // Log event and return
		        return $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_HIDDEN, 'hide');
		    },

		    updatePosition: function (event, animate) {
		        var i, target, tooltip, coords, mapName, imagePos, newPosition, ieAdjust, ie6Adjust, borderAdjust, mouseAdjust, offset, curPosition, returned

		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'updatePosition');

		        // If tooltip is static, return
		        else if (self.options.position.type == 'static')
		            return $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.CANNOT_POSITION_STATIC, 'updatePosition');

		        // Define property objects
		        target = {
		            position: { left: 0, top: 0 },
		            dimensions: { height: 0, width: 0 },
		            corner: self.options.position.corner.target
		        };
		        tooltip = {
		            position: self.getPosition(),
		            dimensions: self.getDimensions(),
		            corner: self.options.position.corner.tooltip
		        };

		        // Target is an HTML element
		        if (self.options.position.target !== 'mouse') {
		            // If the HTML element is AREA, calculate position manually
		            if (self.options.position.target.get(0).nodeName.toLowerCase() == 'area') {
		                // Retrieve coordinates from coords attribute and parse into integers
		                coords = self.options.position.target.attr('coords').split(',');
		                for (i = 0; i < coords.length; i++) coords[i] = parseInt(coords[i]);

		                // Setup target position object
		                mapName = self.options.position.target.parent('map').attr('name');
		                imagePos = $('img[usemap="#' + mapName + '"]:first').offset();
		                target.position = {
		                    left: Math.floor(imagePos.left + coords[0]),
		                    top: Math.floor(imagePos.top + coords[1])
		                };

		                // Determine width and height of the area
		                switch (self.options.position.target.attr('shape').toLowerCase()) {
		                    case 'rect':
		                        target.dimensions = {
		                            width: Math.ceil(Math.abs(coords[2] - coords[0])),
		                            height: Math.ceil(Math.abs(coords[3] - coords[1]))
		                        };
		                        break;

		                    case 'circle':
		                        target.dimensions = {
		                            width: coords[2] + 1,
		                            height: coords[2] + 1
		                        };
		                        break;

		                    case 'poly':
		                        target.dimensions = {
		                            width: coords[0],
		                            height: coords[1]
		                        };

		                        for (i = 0; i < coords.length; i++) {
		                            if (i % 2 == 0) {
		                                if (coords[i] > target.dimensions.width)
		                                    target.dimensions.width = coords[i];
		                                if (coords[i] < coords[0])
		                                    target.position.left = Math.floor(imagePos.left + coords[i]);
		                            }
		                            else {
		                                if (coords[i] > target.dimensions.height)
		                                    target.dimensions.height = coords[i];
		                                if (coords[i] < coords[1])
		                                    target.position.top = Math.floor(imagePos.top + coords[i]);
		                            };
		                        };

		                        target.dimensions.width = target.dimensions.width - (target.position.left - imagePos.left);
		                        target.dimensions.height = target.dimensions.height - (target.position.top - imagePos.top);
		                        break;

		                    default:
		                        return $.fn.qtip.log.error.call(self, 4, $.fn.qtip.constants.INVALID_AREA_SHAPE, 'updatePosition');
		                        break;
		                };

		                // Adjust position by 2 pixels (Positioning bug?)
		                target.dimensions.width -= 2; target.dimensions.height -= 2;
		            }

		            // Target is the document
		            else if (self.options.position.target.add(document.body).length === 1) {
		                target.position = { left: $(document).scrollLeft(), top: $(document).scrollTop() };
		                target.dimensions = { height: $(window).height(), width: $(window).width() };
		            }

		            // Target is a regular HTML element, find position normally
		            else {
		                // Check if the target is another tooltip. If its animated, retrieve position from newPosition data
		                if (typeof self.options.position.target.attr('qtip') !== 'undefined')
		                    target.position = self.options.position.target.qtip('api').cache.position;
		                else
		                    target.position = self.options.position.target.offset();

		                // Setup dimensions objects
		                target.dimensions = {
		                    height: self.options.position.target.outerHeight(),
		                    width: self.options.position.target.outerWidth()
		                };
		            };

		            // Calculate correct target corner position
		            newPosition = $.extend({}, target.position);
		            if ((/right/i).test(target.corner))
		                newPosition.left += target.dimensions.width;

		            if ((/bottom/i).test(target.corner))
		                newPosition.top += target.dimensions.height;

		            if ((/((top|bottom)Middle)|center/).test(target.corner))
		                newPosition.left += (target.dimensions.width / 2);

		            if ((/((left|right)Middle)|center/).test(target.corner))
		                newPosition.top += (target.dimensions.height / 2);
		        }

		        // Mouse is the target, set position to current mouse coordinates
		        else {
		            // Setup target position and dimensions objects
		            target.position = newPosition = { left: self.cache.mouse.x, top: self.cache.mouse.y };
		            target.dimensions = { height: 1, width: 1 };
		        };

		        // Calculate correct target corner position
		        if ((/right/i).test(tooltip.corner))
		            newPosition.left -= tooltip.dimensions.width;

		        if ((/bottom/i).test(tooltip.corner))
		            newPosition.top -= tooltip.dimensions.height;

		        if ((/((top|bottom)Middle)|center/).test(tooltip.corner))
		            newPosition.left -= (tooltip.dimensions.width / 2);

		        if ((/((left|right)Middle)|center/).test(tooltip.corner))
		            newPosition.top -= (tooltip.dimensions.height / 2);

		        // Setup IE adjustment variables (Pixel gap bugs)
		        ieAdjust = ($.browser.msie) ? 1 : 0; // And this is why I hate IE...
		        ie6Adjust = ($.browser.msie && parseInt($.browser.version.charAt(0)) === 6) ? 1 : 0; // ...and even more so IE6!

		        // Adjust for border radius
		        if (self.options.style.border.radius > 0) {
		            if ((/Left/i).test(tooltip.corner))
		                newPosition.left -= self.options.style.border.radius;
		            else if ((/Right/i).test(tooltip.corner))
		                newPosition.left += self.options.style.border.radius;

		            if ((/Top/i).test(tooltip.corner))
		                newPosition.top -= self.options.style.border.radius;
		            else if ((/Bottom/i).test(tooltip.corner))
		                newPosition.top += self.options.style.border.radius;
		        };

		        // IE only adjustments (Pixel perfect!)
		        if (ieAdjust) {
		            if ((/top/i).test(tooltip.corner))
		                newPosition.top -= ieAdjust
		            else if ((/bottom/i).test(tooltip.corner))
		                newPosition.top += ieAdjust

		            if ((/left/i).test(tooltip.corner))
		                newPosition.left -= ieAdjust
		            else if ((/right/i).test(tooltip.corner))
		                newPosition.left += ieAdjust

		            if ((/leftMiddle|rightMiddle/).test(tooltip.corner))
		                newPosition.top -= 1
		        };

		        // If screen adjustment is enabled, apply adjustments
		        if (self.options.position.adjust.screen === true)
		            newPosition = screenAdjust.call(self, newPosition, target, tooltip);

		        // If mouse is the target, prevent tooltip appearing directly under the mouse
		        if (self.options.position.target === 'mouse' && self.options.position.adjust.mouse === true) {
		            if (self.options.position.adjust.screen === true && self.elements.tip)
		                mouseAdjust = self.elements.tip.attr('rel');
		            else
		                mouseAdjust = self.options.position.corner.tooltip;

		            newPosition.left += ((/right/i).test(mouseAdjust)) ? -6 : 6;
		            newPosition.top += ((/bottom/i).test(mouseAdjust)) ? -6 : 6;
		        }

		        // Initiate bgiframe plugin in IE6 if tooltip overlaps a select box or object element
		        if (!self.elements.bgiframe && $.browser.msie && parseInt($.browser.version.charAt(0)) == 6) {
		            $('select, object').each(function () {
		                offset = $(this).offset();
		                offset.bottom = offset.top + $(this).height();
		                offset.right = offset.left + $(this).width();

		                if (newPosition.top + tooltip.dimensions.height >= offset.top
						&& newPosition.left + tooltip.dimensions.width >= offset.left)
		                    bgiframe.call(self);
		            });
		        };

		        // Add user xy adjustments
		        newPosition.left += self.options.position.adjust.x;
		        newPosition.top += self.options.position.adjust.y;

		        // Set new tooltip position if its moved, animate if enabled
		        curPosition = self.getPosition();
		        if (newPosition.left != curPosition.left || newPosition.top != curPosition.top) {
		            // Call API method and if return value is false, halt
		            returned = self.beforePositionUpdate.call(self, event);
		            if (returned === false) return self;

		            // Cache new position
		            self.cache.position = newPosition;

		            // Check if animation is enabled
		            if (animate === true) {
		                // Set animated status
		                self.status.animated = true;

		                // Animate and reset animated status on animation end
		                self.elements.tooltip.animate(newPosition, 200, 'swing', function () { self.status.animated = false });
		            }

		            // Set new position via CSS
		            else self.elements.tooltip.css(newPosition);

		            // Call API method and log event if its not a mouse move
		            self.onPositionUpdate.call(self, event);
		            if (typeof event !== 'undefined' && event.type && event.type !== 'mousemove')
		                $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_POSITION_UPDATED, 'updatePosition');
		        };

		        return self;
		    },

		    updateWidth: function (newWidth) {
		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'updateWidth');

		        // Make sure supplied width is a number and if not, return
		        else if (newWidth != undefined && typeof newWidth !== 'number')
		            return $.fn.qtip.log.error.call(self, 2, 'newWidth must be of type number', 'updateWidth');

		        // Setup elements which must be hidden during width update
		        var hidden = self.elements.contentWrapper.siblings().add(self.elements.tip).add(self.elements.button),
					zoom = self.elements.wrapper.add(self.elements.contentWrapper.children()),
					tooltip = self.elements.tooltip,
					max = self.options.style.width.max,
					min = self.options.style.width.min;

		        // Calculate the new width if one is not supplied
		        if (!newWidth) {
		            // Explicit width is set
		            if (typeof self.options.style.width.value === 'number') {
		                newWidth = self.options.style.width.value;
		            }

		            // No width is set, proceed with auto detection
		            else {
		                // Set width to auto initally to determine new width and hide other elements
		                self.elements.tooltip.css({ width: 'auto' });
		                hidden.hide();

		                // Set position and zoom to defaults to prevent IE hasLayout bug
		                if ($.browser.msie) {
		                    zoom.css({ zoom: '' });
		                }

		                // Find current width
		                newWidth = self.getDimensions().width;

		                // Make sure its within the maximum and minimum width boundries
		                if (!self.options.style.width.value) {
		                    newWidth = Math.min(Math.max(newWidth, min), max);
		                }
		            }
		        }

		        // Adjust newWidth by 1px if width is odd (IE6 rounding bug fix)
		        if (newWidth % 2) { newWidth -= 1; }

		        // Set the new calculated width and unhide other elements
		        self.elements.tooltip.width(newWidth);
		        hidden.show();

		        // Set the border width, if enabled
		        if (self.options.style.border.radius) {
		            self.elements.tooltip.find('.qtip-betweenCorners').each(function (i) {
		                $(this).width(newWidth - (self.options.style.border.radius * 2));
		            })
		        };

		        // IE only adjustments
		        if ($.browser.msie) {
		            // Reset position and zoom to give the wrapper layout (IE hasLayout bug)
		            zoom.css({ zoom: 1 });

		            // Adjust BGIframe height and width if enabled
		            if (self.elements.bgiframe) self.elements.bgiframe.width(newWidth).height(self.getDimensions.height);
		        };

		        // Log event and return
		        return $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_WIDTH_UPDATED, 'updateWidth');
		    },

		    updateStyle: function (name) {
		        var tip, borders, context, corner, coordinates;

		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'updateStyle');

		        // Return if style is not defined or name is not a string
		        else if (typeof name !== 'string' || !$.fn.qtip.styles[name])
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.STYLE_NOT_DEFINED, 'updateStyle');

		        // Set the new style object
		        self.options.style = buildStyle.call(self, $.fn.qtip.styles[name], self.options.user.style);

		        // Update initial styles of content and title elements
		        self.elements.content.css(jQueryStyle(self.options.style));
		        if (self.options.content.title.text !== false)
		            self.elements.title.css(jQueryStyle(self.options.style.title, true));

		        // Update CSS border colour
		        self.elements.contentWrapper.css({ borderColor: self.options.style.border.color });

		        // Update tip color if enabled
		        if (self.options.style.tip.corner !== false) {
		            if ($('<canvas>').get(0).getContext) {
		                // Retrieve canvas context and clear
		                tip = self.elements.tooltip.find('.qtip-tip canvas:first');
		                context = tip.get(0).getContext('2d');
		                context.clearRect(0, 0, 300, 300);

		                // Draw new tip
		                corner = tip.parent('div[rel]:first').attr('rel');
		                coordinates = calculateTip(corner, self.options.style.tip.size.width, self.options.style.tip.size.height);
		                drawTip.call(self, tip, coordinates, self.options.style.tip.color || self.options.style.border.color);
		            }
		            else if ($.browser.msie) {
		                // Set new fillcolor attribute
		                tip = self.elements.tooltip.find('.qtip-tip [nodeName="shape"]');
		                tip.attr('fillcolor', self.options.style.tip.color || self.options.style.border.color);
		            };
		        };

		        // Update border colors if enabled
		        if (self.options.style.border.radius > 0) {
		            self.elements.tooltip.find('.qtip-betweenCorners').css({ backgroundColor: self.options.style.border.color });

		            if ($('<canvas>').get(0).getContext) {
		                borders = calculateBorders(self.options.style.border.radius)
		                self.elements.tooltip.find('.qtip-wrapper canvas').each(function () {
		                    // Retrieve canvas context and clear
		                    context = $(this).get(0).getContext('2d');
		                    context.clearRect(0, 0, 300, 300);

		                    // Draw new border
		                    corner = $(this).parent('div[rel]:first').attr('rel')
		                    drawBorder.call(self, $(this), borders[corner],
								self.options.style.border.radius, self.options.style.border.color);
		                });
		            }
		            else if ($.browser.msie) {
		                // Set new fillcolor attribute on each border corner
		                self.elements.tooltip.find('.qtip-wrapper [nodeName="arc"]').each(function () {
		                    $(this).attr('fillcolor', self.options.style.border.color)
		                });
		            };
		        };

		        // Log event and return
		        return $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_STYLE_UPDATED, 'updateStyle');
		    },

		    updateContent: function (content, reposition) {
		        var parsedContent, images, loadedImages;

		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'updateContent');

		        // Make sure content is defined before update
		        else if (!content)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.NO_CONTENT_PROVIDED, 'updateContent');

		        // Call API method and set new content if a string is returned
		        parsedContent = self.beforeContentUpdate.call(self, content);
		        if (typeof parsedContent == 'string') content = parsedContent;
		        else if (parsedContent === false) return;

		        // Set position and zoom to defaults to prevent IE hasLayout bug
		        if ($.browser.msie) self.elements.contentWrapper.children().css({ zoom: 'normal' });

		        // Append new content if its a DOM array and show it if hidden
		        if (content.jquery && content.length > 0)
		            content.clone(true).appendTo(self.elements.content).show();

		        // Content is a regular string, insert the new content
		        else self.elements.content.html(content);

		        // Use preload plugin if available
		        // Check if images need to be loaded before position is updated to prevent mis-positioning
		        loadedImages = 0;
		        images = self.elements.content.find('img');
		        if (images.length) {
		            if ($.fn.qtip.preload) {
		                images.each(function () {
		                    // Use preloaded image dimensions to prevent incorrect positioning
		                    preloaded = $('body > img[src="' + $(this).attr('src') + '"]:first');
		                    if (preloaded.length > 0) $(this).attr('width', preloaded.innerWidth()).attr('height', preloaded.innerHeight());
		                });
		                afterLoad();
		            }

		            // Make sure all iamges are loaded before proceeding with position update
		            else images.bind('load error', function () { if (++loadedImages === images.length) afterLoad(); });
		        }
		        else afterLoad();


		        function afterLoad() {
		            // Update the tooltip width
		            self.updateWidth();

		            // If repositioning is enabled, update positions
		            if (reposition !== false) {
		                // Update position if tooltip isn't static
		                if (self.options.position.type !== 'static')
		                    self.updatePosition(self.elements.tooltip.is(':visible'), true);

		                // Reposition the tip if enabled
		                if (self.options.style.tip.corner !== false)
		                    positionTip.call(self);
		            };
		        };

		        // Update the tooltip width
		        self.updateWidth();

		        // If repositioning is enabled, update positions
		        if (reposition !== false) {
		            // Update position if tooltip isn't static
		            if (self.options.position.type !== 'static')
		                self.updatePosition(self.elements.tooltip.is(':visible'), true);

		            // Reposition the tip if enabled
		            if (self.options.style.tip.corner !== false)
		                positionTip.call(self);
		        };

		        // Call API method and log event
		        self.onContentUpdate.call(self);
		        return $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_CONTENT_UPDATED, 'loadContent');
		    },

		    loadContent: function (url, data, method) {
		        var returned;

		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'loadContent');

		        // Call API method and if return value is false, halt
		        returned = self.beforeContentLoad.call(self);
		        if (returned === false) return self;

		        // Load content using specified request type
		        if (method == 'post')
		            $.post(url, data, setupContent);
		        else
		            $.get(url, data, setupContent);

		        function setupContent(content) {
		            // Call API method and log event
		            self.onContentLoad.call(self);
		            $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_CONTENT_LOADED, 'loadContent');

		            // Update the content
		            self.updateContent(content);
		        };

		        return self;
		    },

		    updateTitle: function (content) {
		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'updateTitle');

		        // Make sure content is defined before update
		        else if (!content)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.NO_CONTENT_PROVIDED, 'updateTitle');

		        // Call API method and if return value is false, halt
		        returned = self.beforeTitleUpdate.call(self);
		        if (returned === false) return self;

		        // Set the new content and reappend the button if enabled
		        if (self.elements.button) self.elements.button = self.elements.button.clone(true);
		        self.elements.title.html(content)
		        if (self.elements.button) self.elements.title.prepend(self.elements.button);

		        // Call API method and log event
		        self.onTitleUpdate.call(self);
		        return $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_TITLE_UPDATED, 'updateTitle');
		    },

		    focus: function (event) {
		        var curIndex, newIndex, elemIndex, returned;

		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'focus');

		        else if (self.options.position.type == 'static')
		            return $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.CANNOT_FOCUS_STATIC, 'focus');

		        // Set z-index variables
		        curIndex = parseInt(self.elements.tooltip.css('z-index'));
		        newIndex = 32001 + $('div.qtip[qtip]').length - 1;

		        // Only update the z-index if it has changed and tooltip is not already focused
		        if (!self.status.focused && curIndex !== newIndex) {
		            // Call API method and if return value is false, halt
		            returned = self.beforeFocus.call(self, event);
		            if (returned === false) return self;

		            // Loop through all other tooltips
		            $('div.qtip[qtip]').not(self.elements.tooltip).each(function () {
		                if ($(this).qtip('api').status.rendered === true) {
		                    elemIndex = parseInt($(this).css('z-index'));

		                    // Reduce all other tooltip z-index by 1
		                    if (typeof elemIndex == 'number' && elemIndex > -1)
		                        $(this).css({ zIndex: parseInt($(this).css('z-index')) - 1 });

		                    // Set focused status to false
		                    $(this).qtip('api').status.focused = false;
		                }
		            })

		            // Set the new z-index and set focus status to true
		            self.elements.tooltip.css({ zIndex: newIndex });
		            self.status.focused = true;

		            // Call API method and log event
		            self.onFocus.call(self, event);
		            $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_FOCUSED, 'focus');
		        };

		        return self;
		    },

		    disable: function (state) {
		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'disable');

		        if (state) {
		            // Tooltip is not already disabled, proceed
		            if (!self.status.disabled) {
		                // Set the disabled flag and log event
		                self.status.disabled = true;
		                $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_DISABLED, 'disable');
		            }

		            // Tooltip is already disabled, inform user via log
		            else $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.TOOLTIP_ALREADY_DISABLED, 'disable');
		        }
		        else {
		            // Tooltip is not already enabled, proceed
		            if (self.status.disabled) {
		                // Reassign events, set disable status and log
		                self.status.disabled = false;
		                $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_ENABLED, 'disable');
		            }

		            // Tooltip is already enabled, inform the user via log
		            else $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.TOOLTIP_ALREADY_ENABLED, 'disable');
		        };

		        return self;
		    },

		    destroy: function () {
		        var i, returned, interfaces;

		        // Call API method and if return value is false, halt
		        returned = self.beforeDestroy.call(self);
		        if (returned === false) return self;

		        // Check if tooltip is rendered
		        if (self.status.rendered) {
		            // Remove event handlers and remove element
		            self.options.show.when.target.unbind('mousemove.qtip', self.updatePosition);
		            self.options.show.when.target.unbind('mouseout.qtip', self.hide);
		            self.options.show.when.target.unbind(self.options.show.when.event + '.qtip');
		            self.options.hide.when.target.unbind(self.options.hide.when.event + '.qtip');
		            self.elements.tooltip.unbind(self.options.hide.when.event + '.qtip');
		            self.elements.tooltip.unbind('mouseover.qtip', self.focus);
		            self.elements.tooltip.remove();
		        }

		        // Tooltip isn't yet rendered, remove render event
		        else self.options.show.when.target.unbind(self.options.show.when.event + '.qtip-create');

		        // Check to make sure qTip data is present on target element
		        if (typeof self.elements.target.data('qtip') == 'object') {
		            // Remove API references from interfaces object
		            interfaces = self.elements.target.data('qtip').interfaces;
		            if (typeof interfaces == 'object' && interfaces.length > 0) {
		                // Remove API from interfaces array
		                for (i = 0; i < interfaces.length - 1; i++)
		                    if (interfaces[i].id == self.id) interfaces.splice(i, 1)
		            }
		        }
		        $.fn.qtip.interfaces.splice(self.id, 1);

		        // Set qTip current id to previous tooltips API if available
		        if (typeof interfaces == 'object' && interfaces.length > 0)
		            self.elements.target.data('qtip').current = interfaces.length - 1;
		        else
		            self.elements.target.removeData('qtip');

		        // Call API method and log destroy
		        self.onDestroy.call(self);
		        $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_DESTROYED, 'destroy');

		        return self.elements.target
		    },

		    getPosition: function () {
		        var show, offset;

		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'getPosition');

		        show = (self.elements.tooltip.css('display') !== 'none') ? false : true;

		        // Show and hide tooltip to make sure coordinates are returned
		        if (show) self.elements.tooltip.css({ visiblity: 'hidden' }).show();
		        offset = self.elements.tooltip.offset();
		        if (show) self.elements.tooltip.css({ visiblity: 'visible' }).hide();

		        return offset;
		    },

		    getDimensions: function () {
		        var show, dimensions;

		        // Make sure tooltip is rendered and if not, return
		        if (!self.status.rendered)
		            return $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.TOOLTIP_NOT_RENDERED, 'getDimensions');

		        show = (!self.elements.tooltip.is(':visible')) ? true : false;

		        // Show and hide tooltip to make sure dimensions are returned
		        if (show) self.elements.tooltip.css({ visiblity: 'hidden' }).show();
		        dimensions = {
		            height: self.elements.tooltip.outerHeight(),
		            width: self.elements.tooltip.outerWidth()
		        };
		        if (show) self.elements.tooltip.css({ visiblity: 'visible' }).hide();

		        return dimensions;
		    }
		});
    };

    // Define priamry construct function
    function construct() {
        var self, adjust, content, url, data, method, tempLength;
        self = this;

        // Call API method
        self.beforeRender.call(self);

        // Set rendered status to true
        self.status.rendered = true;

        // Create initial tooltip elements
        self.elements.tooltip = '<div qtip="' + self.id + '" ' +
			'class="qtip ' + (self.options.style.classes.tooltip || self.options.style) + '"' +
			'style="display:none; -moz-border-radius:0; -webkit-border-radius:0; border-radius:0;' +
			'position:' + self.options.position.type + ';">' +
			'  <div class="qtip-wrapper" style="position:relative; overflow:hidden; text-align:left;">' +
			'    <div class="qtip-contentWrapper" style="overflow:hidden;">' +
			'       <div class="qtip-content ' + self.options.style.classes.content + '"></div>' +
			'</div></div></div>';

        // Append to container element
        self.elements.tooltip = $(self.elements.tooltip);
        self.elements.tooltip.appendTo(self.options.position.container)

        // Setup tooltip qTip data
        self.elements.tooltip.data('qtip', { current: 0, interfaces: [self] });

        // Setup element references
        self.elements.wrapper = self.elements.tooltip.children('div:first');
        self.elements.contentWrapper = self.elements.wrapper.children('div:first').css({ background: self.options.style.background });
        self.elements.content = self.elements.contentWrapper.children('div:first').css(jQueryStyle(self.options.style));

        // Apply IE hasLayout fix to wrapper and content elements
        if ($.browser.msie) self.elements.wrapper.add(self.elements.content).css({ zoom: 1 });

        // Setup tooltip attributes
        if ((/unfocus/i).test(self.options.hide.when.event)) self.elements.tooltip.attr('unfocus', true);

        // If an explicit width is set, updateWidth prior to setting content to prevent dirty rendering
        if (typeof self.options.style.width.value == 'number') self.updateWidth();

        // Create borders and tips if supported by the browser
        if ($('<canvas>').get(0).getContext || $.browser.msie) {
            // Create border
            if (self.options.style.border.radius > 0)
                createBorder.call(self);
            else
                self.elements.contentWrapper.css({ border: self.options.style.border.width + 'px solid ' + self.options.style.border.color });

            // Create tip if enabled
            if (self.options.style.tip.corner !== false)
                createTip.call(self);
        }

        // Neither canvas or VML is supported, tips and borders cannot be drawn!
        else {
            // Set defined border width
            self.elements.contentWrapper.css({ border: self.options.style.border.width + 'px solid ' + self.options.style.border.color });

            // Reset border radius and tip
            self.options.style.border.radius = 0;
            self.options.style.tip.corner = false;

            // Inform via log
            $.fn.qtip.log.error.call(self, 2, $.fn.qtip.constants.CANVAS_VML_NOT_SUPPORTED, 'render');
        };

        // Use the provided content string or DOM array
        if ((typeof self.options.content.text == 'string' && self.options.content.text.length > 0)
		|| (self.options.content.text.jquery && self.options.content.text.length > 0))
            content = self.options.content.text;

        // Use title string for content if present
        else if (typeof self.elements.target.attr('title') == 'string' && self.elements.target.attr('title').length > 0) {
            content = self.elements.target.attr('title').replace("\\n", '<br />');
            self.elements.target.attr('title', ''); // Remove title attribute to prevent default tooltip showing
        }

        // No title is present, use alt attribute instead
        else if (typeof self.elements.target.attr('alt') == 'string' && self.elements.target.attr('alt').length > 0) {
            content = self.elements.target.attr('alt').replace("\\n", '<br />');
            self.elements.target.attr('alt', ''); // Remove alt attribute to prevent default tooltip showing
        }

        // No valid content was provided, inform via log
        else {
            content = ' ';
            $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.NO_VALID_CONTENT, 'render');
        };

        // Set the tooltips content and create title if enabled
        if (self.options.content.title.text !== false) createTitle.call(self);
        self.updateContent(content);

        // Assign events and toggle tooltip with focus
        assignEvents.call(self);
        if (self.options.show.ready === true) self.show();

        // Retrieve ajax content if provided
        if (self.options.content.url !== false) {
            url = self.options.content.url;
            data = self.options.content.data;
            method = self.options.content.method || 'get';
            self.loadContent(url, data, method);
        };

        // Call API method and log event
        self.onRender.call(self);
        $.fn.qtip.log.error.call(self, 1, $.fn.qtip.constants.EVENT_RENDERED, 'render');
    };

    // Create borders using canvas and VML
    function createBorder() {
        var self, i, width, radius, color, coordinates, containers, size, betweenWidth, betweenCorners, borderTop, borderBottom, borderCoord, sideWidth, vertWidth;
        self = this;

        // Destroy previous border elements, if present
        self.elements.wrapper.find('.qtip-borderBottom, .qtip-borderTop').remove();

        // Setup local variables
        width = self.options.style.border.width;
        radius = self.options.style.border.radius;
        color = self.options.style.border.color || self.options.style.tip.color;

        // Calculate border coordinates
        coordinates = calculateBorders(radius);

        // Create containers for the border shapes
        containers = {};
        for (i in coordinates) {
            // Create shape container
            containers[i] = '<div rel="' + i + '" style="' + ((/Left/).test(i) ? 'left' : 'right') + ':0; ' +
				'position:absolute; height:' + radius + 'px; width:' + radius + 'px; overflow:hidden; line-height:0.1px; font-size:1px">';

            // Canvas is supported
            if ($('<canvas>').get(0).getContext)
                containers[i] += '<canvas height="' + radius + '" width="' + radius + '" style="vertical-align: top"></canvas>';

            // No canvas, but if it's IE use VML
            else if ($.browser.msie) {
                size = radius * 2 + 3;
                containers[i] += '<v:arc stroked="false" fillcolor="' + color + '" startangle="' + coordinates[i][0] + '" endangle="' + coordinates[i][1] + '" ' +
					'style="width:' + size + 'px; height:' + size + 'px; margin-top:' + ((/bottom/).test(i) ? -2 : -1) + 'px; ' +
					'margin-left:' + ((/Right/).test(i) ? coordinates[i][2] - 3.5 : -1) + 'px; ' +
					'vertical-align:top; display:inline-block; behavior:url(#default#VML)"></v:arc>';

            };

            containers[i] += '</div>';
        };

        // Create between corners elements
        betweenWidth = self.getDimensions().width - (Math.max(width, radius) * 2);
        betweenCorners = '<div class="qtip-betweenCorners" style="height:' + radius + 'px; width:' + betweenWidth + 'px; ' +
			'overflow:hidden; background-color:' + color + '; line-height:0.1px; font-size:1px;">';

        // Create top border container
        borderTop = '<div class="qtip-borderTop" dir="ltr" style="height:' + radius + 'px; ' +
			'margin-left:' + radius + 'px; line-height:0.1px; font-size:1px; padding:0;">' +
			containers['topLeft'] + containers['topRight'] + betweenCorners;
        self.elements.wrapper.prepend(borderTop);

        // Create bottom border container
        borderBottom = '<div class="qtip-borderBottom" dir="ltr" style="height:' + radius + 'px; ' +
			'margin-left:' + radius + 'px; line-height:0.1px; font-size:1px; padding:0;">' +
			containers['bottomLeft'] + containers['bottomRight'] + betweenCorners;
        self.elements.wrapper.append(borderBottom);

        // Draw the borders if canvas were used (Delayed til after DOM creation)
        if ($('<canvas>').get(0).getContext) {
            self.elements.wrapper.find('canvas').each(function () {
                borderCoord = coordinates[$(this).parent('[rel]:first').attr('rel')];
                drawBorder.call(self, $(this), borderCoord, radius, color);
            })
        }

        // Create a phantom VML element (IE won't show the last created VML element otherwise)
        else if ($.browser.msie) self.elements.tooltip.append('<v:image style="behavior:url(#default#VML);"></v:image>');

        // Setup contentWrapper border
        sideWidth = Math.max(radius, (radius + (width - radius)))
        vertWidth = Math.max(width - radius, 0);
        self.elements.contentWrapper.css({
            border: '0px solid ' + color,
            borderWidth: vertWidth + 'px ' + sideWidth + 'px'
        })
    };

    // Border canvas draw method
    function drawBorder(canvas, coordinates, radius, color) {
        // Create corner
        var context = canvas.get(0).getContext('2d');
        context.fillStyle = color;
        context.beginPath();
        context.arc(coordinates[0], coordinates[1], radius, 0, Math.PI * 2, false);
        context.fill();
    };

    // Create tip using canvas and VML
    function createTip(corner) {
        var self, color, coordinates, coordsize, path, tip;
        self = this;

        // Destroy previous tip, if there is one
        if (self.elements.tip !== null) self.elements.tip.remove();

        // Setup color and corner values
        color = self.options.style.tip.color || self.options.style.border.color;
        if (self.options.style.tip.corner === false) return;
        else if (!corner) corner = self.options.style.tip.corner;

        // Calculate tip coordinates
        coordinates = calculateTip(corner, self.options.style.tip.size.width, self.options.style.tip.size.height);

        // Create tip element
        self.elements.tip = '<div class="' + self.options.style.classes.tip + '" dir="ltr" rel="' + corner + '" style="position:absolute; ' +
			'height:' + self.options.style.tip.size.height + 'px; width:' + self.options.style.tip.size.width + 'px; ' +
			'margin:0 auto; line-height:0.1px; font-size:1px;"></div>';

        // Attach new tip to tooltip element
        self.elements.tooltip.prepend(self.elements.tip);

        // Use canvas element if supported
        if ($('<canvas>').get(0).getContext)
            tip = '<canvas height="' + self.options.style.tip.size.height + '" width="' + self.options.style.tip.size.width + '"></canvas>';

        // Canvas not supported - Use VML (IE)
        else if ($.browser.msie) {
            // Create coordize and tip path using tip coordinates
            coordsize = self.options.style.tip.size.width + ',' + self.options.style.tip.size.height;
            path = 'm' + coordinates[0][0] + ',' + coordinates[0][1];
            path += ' l' + coordinates[1][0] + ',' + coordinates[1][1];
            path += ' ' + coordinates[2][0] + ',' + coordinates[2][1];
            path += ' xe';

            // Create VML element
            tip = '<v:shape fillcolor="' + color + '" stroked="false" filled="true" path="' + path + '" coordsize="' + coordsize + '" ' +
				'style="width:' + self.options.style.tip.size.width + 'px; height:' + self.options.style.tip.size.height + 'px; ' +
				'line-height:0.1px; display:inline-block; behavior:url(#default#VML); ' +
				'vertical-align:' + ((/top/).test(corner) ? 'bottom' : 'top') + '"></v:shape>';

            // Create a phantom VML element (IE won't show the last created VML element otherwise)
            tip += '<v:image style="behavior:url(#default#VML);"></v:image>';

            // Prevent tooltip appearing above the content (IE z-index bug)
            self.elements.contentWrapper.css('position', 'relative');
        };

        // Create element reference and append vml/canvas
        self.elements.tip = self.elements.tooltip.find('.' + self.options.style.classes.tip).eq(0);
        self.elements.tip.html(tip);

        // Draw the canvas tip (Delayed til after DOM creation)
        if ($('<canvas>').get(0).getContext)
            drawTip.call(self, self.elements.tip.find('canvas:first'), coordinates, color);

        // Fix IE small tip bug
        if ((/top/).test(corner) && $.browser.msie && parseInt($.browser.version.charAt(0)) === 6)
            self.elements.tip.css({ marginTop: -4 });

        // Set the tip position
        positionTip.call(self, corner);
    };

    // Canvas tip drawing method
    function drawTip(canvas, coordinates, color) {
        // Setup properties
        var context = canvas.get(0).getContext('2d');
        context.fillStyle = color;

        // Create tip
        context.beginPath();
        context.moveTo(coordinates[0][0], coordinates[0][1]);
        context.lineTo(coordinates[1][0], coordinates[1][1]);
        context.lineTo(coordinates[2][0], coordinates[2][1]);
        context.fill();
    };

    function positionTip(corner) {
        var self, ieAdjust, paddingCorner, paddingSize, newMargin;
        self = this;

        // Return if tips are disabled or tip is not yet rendered
        if (self.options.style.tip.corner === false || !self.elements.tip) return;
        if (!corner) corner = self.elements.tip.attr('rel');

        // Setup adjustment variables
        ieAdjust = positionAdjust = ($.browser.msie) ? 1 : 0;

        // Set initial position
        self.elements.tip.css(corner.match(/left|right|top|bottom/)[0], 0);

        // Set position of tip to correct side
        if ((/top|bottom/).test(corner)) {
            // Adjustments for IE6 - 0.5px border gap bug
            if ($.browser.msie) {
                if (parseInt($.browser.version.charAt(0)) === 6)
                    positionAdjust = ((/top/).test(corner)) ? -3 : 1;
                else
                    positionAdjust = ((/top/).test(corner)) ? 1 : 2;
            };

            if ((/Middle/).test(corner))
                self.elements.tip.css({ left: '50%', marginLeft: -(self.options.style.tip.size.width / 2) });

            else if ((/Left/).test(corner))
                self.elements.tip.css({ left: self.options.style.border.radius - ieAdjust });

            else if ((/Right/).test(corner))
                self.elements.tip.css({ right: self.options.style.border.radius + ieAdjust });

            if ((/top/).test(corner))
                self.elements.tip.css({ top: -positionAdjust });
            else
                self.elements.tip.css({ bottom: positionAdjust });

        }
        else if ((/left|right/).test(corner)) {
            // Adjustments for IE6 - 0.5px border gap bug
            if ($.browser.msie)
                positionAdjust = (parseInt($.browser.version.charAt(0)) === 6) ? 1 : ((/left/).test(corner) ? 1 : 2);

            if ((/Middle/).test(corner))
                self.elements.tip.css({ top: '50%', marginTop: -(self.options.style.tip.size.height / 2) });

            else if ((/Top/).test(corner))
                self.elements.tip.css({ top: self.options.style.border.radius - ieAdjust });

            else if ((/Bottom/).test(corner))
                self.elements.tip.css({ bottom: self.options.style.border.radius + ieAdjust });

            if ((/left/).test(corner))
                self.elements.tip.css({ left: -positionAdjust });
            else
                self.elements.tip.css({ right: positionAdjust });
        };

        // Adjust tooltip padding to compensate for tip
        paddingCorner = 'padding-' + corner.match(/left|right|top|bottom/)[0];
        paddingSize = self.options.style.tip.size[(/left|right/).test(paddingCorner) ? 'width' : 'height'];
        self.elements.tooltip.css('padding', 0);
        self.elements.tooltip.css(paddingCorner, paddingSize);

        // Match content margin to prevent gap bug in IE6 ONLY
        if ($.browser.msie && parseInt($.browser.version.charAt(0)) == 6) {
            newMargin = parseInt(self.elements.tip.css('margin-top')) || 0;
            newMargin += parseInt(self.elements.content.css('margin-top')) || 0;

            self.elements.tip.css({ marginTop: newMargin });
        };
    };

    // Create title bar for content
    function createTitle() {
        var self = this;

        // Destroy previous title element, if present
        if (self.elements.title !== null) self.elements.title.remove();

        // Create title element
        self.elements.title = $('<div class="' + self.options.style.classes.title + '">')
			.css(jQueryStyle(self.options.style.title, true))
			.css({ zoom: ($.browser.msie) ? 1 : 0 })
			.prependTo(self.elements.contentWrapper);

        // Update title with contents if enabled
        if (self.options.content.title.text) self.updateTitle.call(self, self.options.content.title.text);

        // Create title close buttons if enabled
        if (self.options.content.title.button !== false
		&& typeof self.options.content.title.button == 'string') {
            self.elements.button = $('<a class="' + self.options.style.classes.button + '" style="float:right; position: relative"></a>')
				.css(jQueryStyle(self.options.style.button, true))
				.html(self.options.content.title.button)
				.prependTo(self.elements.title)
				.click(function (event) { if (!self.status.disabled) self.hide(event) });
        };
    };

    // Assign hide and show events
    function assignEvents() {
        var self, showTarget, hideTarget, inactiveEvents;
        self = this;

        // Setup event target variables
        showTarget = self.options.show.when.target;
        hideTarget = self.options.hide.when.target;

        // Add tooltip as a hideTarget is its fixed
        if (self.options.hide.fixed) hideTarget = hideTarget.add(self.elements.tooltip);

        // Check if the hide event is special 'inactive' type
        if (self.options.hide.when.event == 'inactive') {
            // Define events which reset the 'inactive' event handler
            inactiveEvents = ['click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
			'mouseout', 'mouseenter', 'mouseleave', 'mouseover', 'touchstart'];

            // Define 'inactive' event timer method
            function inactiveMethod(event) {
                if (self.status.disabled === true) return;

                //Clear and reset the timer
                clearTimeout(self.timers.inactive);
                self.timers.inactive = setTimeout(function () {
                    // Unassign 'inactive' events
                    $(inactiveEvents).each(function () {
                        hideTarget.unbind(this + '.qtip-inactive');
                        self.elements.content.unbind(this + '.qtip-inactive');
                    });

                    // Hide the tooltip
                    self.hide(event);
                }
				, self.options.hide.delay);
            };
        }

        // Check if the tooltip is 'fixed'
        else if (self.options.hide.fixed === true) {
            self.elements.tooltip.bind('mouseover.qtip', function () {
                if (self.status.disabled === true) return;

                // Reset the hide timer
                clearTimeout(self.timers.hide);
            });
        };

        // Define show event method
        function showMethod(event) {
            if (self.status.disabled === true) return;

            // If set, hide tooltip when inactive for delay period
            if (self.options.hide.when.event == 'inactive') {
                // Assign each reset event
                $(inactiveEvents).each(function () {
                    hideTarget.bind(this + '.qtip-inactive', inactiveMethod);
                    self.elements.content.bind(this + '.qtip-inactive', inactiveMethod);
                });

                // Start the inactive timer
                inactiveMethod();
            };

            // Clear hide timers
            clearTimeout(self.timers.show);
            clearTimeout(self.timers.hide);

            // Start show timer
            if (self.options.show.delay > 0) {
                self.timers.show = setTimeout(function () { self.show(event); }, self.options.show.delay);
            }
            else {
                self.show(event);
            }
        };

        // Define hide event method
        function hideMethod(event) {
            if (self.status.disabled === true) return;

            // Prevent hiding if tooltip is fixed and event target is the tooltip
            if (self.options.hide.fixed === true
			&& (/mouse(out|leave)/i).test(self.options.hide.when.event)
			&& $(event.relatedTarget).parents('div.qtip[qtip]').length > 0) {
                // Prevent default and popagation
                event.stopPropagation();
                event.preventDefault();

                // Reset the hide timer
                clearTimeout(self.timers.hide);
                return false;
            };

            // Clear timers and stop animation queue
            clearTimeout(self.timers.show);
            clearTimeout(self.timers.hide);
            self.elements.tooltip.stop(true, true);

            // If tooltip has displayed, start hide timer
            self.timers.hide = setTimeout(function () { self.hide(event); }, self.options.hide.delay);
        };

        // Both events and targets are identical, apply events using a toggle
        if ((self.options.show.when.target.add(self.options.hide.when.target).length === 1
		&& self.options.show.when.event == self.options.hide.when.event
		&& self.options.hide.when.event !== 'inactive')
		|| self.options.hide.when.event == 'unfocus') {
            self.cache.toggle = 0;
            // Use a toggle to prevent hide/show conflicts
            showTarget.bind(self.options.show.when.event + '.qtip', function (event) {
                if (self.cache.toggle == 0) showMethod(event);
                else hideMethod(event);
            });
        }

        // Events are not identical, bind normally
        else {
            showTarget.bind(self.options.show.when.event + '.qtip', showMethod);

            // If the hide event is not 'inactive', bind the hide method
            if (self.options.hide.when.event !== 'inactive')
                hideTarget.bind(self.options.hide.when.event + '.qtip', hideMethod);
        };

        // Focus the tooltip on mouseover
        if ((/(fixed|absolute)/).test(self.options.position.type))
            self.elements.tooltip.bind('mouseover.qtip', self.focus);

        // If mouse is the target, update tooltip position on mousemove
        if (self.options.position.target === 'mouse' && self.options.position.type !== 'static') {
            showTarget.bind('mousemove.qtip', function (event) {
                // Set the new mouse positions if adjustment is enabled
                self.cache.mouse = { x: event.pageX, y: event.pageY };

                // Update the tooltip position only if the tooltip is visible and adjustment is enabled
                if (self.status.disabled === false
				&& self.options.position.adjust.mouse === true
				&& self.options.position.type !== 'static'
				&& self.elements.tooltip.css('display') !== 'none')
                    self.updatePosition(event);
            });
        };
    };

    // Screen position adjustment
    function screenAdjust(position, target, tooltip) {
        var self, adjustedPosition, adjust, newCorner, overflow, corner;
        self = this;

        // Setup corner and adjustment variable
        if (tooltip.corner == 'center') return target.position // TODO: 'center' corner adjustment
        adjustedPosition = $.extend({}, position);
        newCorner = { x: false, y: false };

        // Define overflow properties
        overflow = {
            left: (adjustedPosition.left < $.fn.qtip.cache.screen.scroll.left),
            right: (adjustedPosition.left + tooltip.dimensions.width + 2 >= $.fn.qtip.cache.screen.width + $.fn.qtip.cache.screen.scroll.left),
            top: (adjustedPosition.top < $.fn.qtip.cache.screen.scroll.top),
            bottom: (adjustedPosition.top + tooltip.dimensions.height + 2 >= $.fn.qtip.cache.screen.height + $.fn.qtip.cache.screen.scroll.top)
        };

        // Determine new positioning properties
        adjust = {
            left: (overflow.left && ((/right/i).test(tooltip.corner) || !overflow.right)),
            right: (overflow.right && ((/left/i).test(tooltip.corner) || !overflow.left)),
            top: (overflow.top && !(/top/i).test(tooltip.corner)),
            bottom: (overflow.bottom && !(/bottom/i).test(tooltip.corner))
        };

        // Tooltip overflows off the left side of the screen
        if (adjust.left) {
            if (self.options.position.target !== 'mouse')
                adjustedPosition.left = target.position.left + target.dimensions.width;
            else
                adjustedPosition.left = self.cache.mouse.x

            newCorner.x = 'Left';
        }

        // Tooltip overflows off the right side of the screen
        else if (adjust.right) {
            if (self.options.position.target !== 'mouse')
                adjustedPosition.left = target.position.left - tooltip.dimensions.width;
            else
                adjustedPosition.left = self.cache.mouse.x - tooltip.dimensions.width;

            newCorner.x = 'Right';
        };

        // Tooltip overflows off the top of the screen
        if (adjust.top) {
            if (self.options.position.target !== 'mouse')
                adjustedPosition.top = target.position.top + target.dimensions.height;
            else
                adjustedPosition.top = self.cache.mouse.y

            newCorner.y = 'top';
        }

        // Tooltip overflows off the bottom of the screen
        else if (adjust.bottom) {
            if (self.options.position.target !== 'mouse')
                adjustedPosition.top = target.position.top - tooltip.dimensions.height;
            else
                adjustedPosition.top = self.cache.mouse.y - tooltip.dimensions.height;

            newCorner.y = 'bottom';
        };

        // Don't adjust if resulting position is negative
        if (adjustedPosition.left < 0) {
            adjustedPosition.left = position.left;
            newCorner.x = false;
        };
        if (adjustedPosition.top < 0) {
            adjustedPosition.top = position.top;
            newCorner.y = false;
        };

        // Change tip corner if positioning has changed and tips are enabled
        if (self.options.style.tip.corner !== false) {
            // Determine new corner properties
            adjustedPosition.corner = new String(tooltip.corner);
            if (adjustedPosition.corner.match(/^(right|left)/)) {
                if (newCorner.x !== false) adjustedPosition.corner = adjustedPosition.corner.replace(/(left|right)/, newCorner.x.toLowerCase());
            } else {
                if (newCorner.x !== false) adjustedPosition.corner = adjustedPosition.corner.replace(/Left|Right|Middle/, newCorner.x);
                if (newCorner.y !== false) adjustedPosition.corner = adjustedPosition.corner.replace(/top|bottom/, newCorner.y);
            }

            // Adjust tip if position has changed and tips are enabled
            if (adjustedPosition.corner !== self.elements.tip.attr('rel'))
                createTip.call(self, adjustedPosition.corner);
        };

        return adjustedPosition;
    };

    // Build a jQuery style object from supplied style object
    function jQueryStyle(style, sub) {
        var styleObj, i;

        styleObj = $.extend(true, {}, style);
        for (i in styleObj) {
            if (sub === true && (/(tip|classes)/i).test(i))
                delete styleObj[i];
            else if (!sub && (/(width|border|tip|title|classes|user)/i).test(i))
                delete styleObj[i];
        };

        return styleObj;
    };

    // Sanitize styles
    function sanitizeStyle(style) {
        if (typeof style.tip !== 'object') style.tip = { corner: style.tip };
        if (typeof style.tip.size !== 'object') style.tip.size = { width: style.tip.size, height: style.tip.size };
        if (typeof style.border !== 'object') style.border = { width: style.border };
        if (typeof style.width !== 'object') style.width = { value: style.width };
        if (typeof style.width.max == 'string') style.width.max = parseInt(style.width.max.replace(/([0-9]+)/i, "$1"));
        if (typeof style.width.min == 'string') style.width.min = parseInt(style.width.min.replace(/([0-9]+)/i, "$1"));

        // Convert deprecated x and y tip values to width/height
        if (typeof style.tip.size.x == 'number') {
            style.tip.size.width = style.tip.size.x;
            delete style.tip.size.x;
        };
        if (typeof style.tip.size.y == 'number') {
            style.tip.size.height = style.tip.size.y;
            delete style.tip.size.y;
        };

        return style;
    };

    // Build styles recursively with inheritance
    function buildStyle() {
        var self, i, styleArray, styleExtend, finalStyle, ieAdjust;
        self = this;

        // Build style options from supplied arguments
        styleArray = [true, {}];
        for (i = 0; i < arguments.length; i++)
            styleArray.push(arguments[i]);
        styleExtend = [$.extend.apply($, styleArray)];

        // Loop through each named style inheritance
        while (typeof styleExtend[0].name == 'string') {
            // Sanitize style data and append to extend array
            styleExtend.unshift(sanitizeStyle($.fn.qtip.styles[styleExtend[0].name]));
        };

        // Make sure resulting tooltip className represents final style
        styleExtend.unshift(true, { classes: { tooltip: 'qtip-' + (arguments[0].name || 'defaults')} }, $.fn.qtip.styles.defaults);

        // Extend into a single style object
        finalStyle = $.extend.apply($, styleExtend);

        // Adjust tip size if needed (IE 1px adjustment bug fix)
        ieAdjust = ($.browser.msie) ? 1 : 0;
        finalStyle.tip.size.width += ieAdjust;
        finalStyle.tip.size.height += ieAdjust;

        // Force even numbers for pixel precision
        if (finalStyle.tip.size.width % 2 > 0) finalStyle.tip.size.width += 1;
        if (finalStyle.tip.size.height % 2 > 0) finalStyle.tip.size.height += 1;

        // Sanitize final styles tip corner value
        if (finalStyle.tip.corner === true)
            finalStyle.tip.corner = (self.options.position.corner.tooltip === 'center') ? false : self.options.position.corner.tooltip;

        return finalStyle;
    };

    // Tip coordinates calculator
    function calculateTip(corner, width, height) {
        // Define tip coordinates in terms of height and width values
        var tips = {
            bottomRight: [[0, 0], [width, height], [width, 0]],
            bottomLeft: [[0, 0], [width, 0], [0, height]],
            topRight: [[0, height], [width, 0], [width, height]],
            topLeft: [[0, 0], [0, height], [width, height]],
            topMiddle: [[0, height], [width / 2, 0], [width, height]],
            bottomMiddle: [[0, 0], [width, 0], [width / 2, height]],
            rightMiddle: [[0, 0], [width, height / 2], [0, height]],
            leftMiddle: [[width, 0], [width, height], [0, height / 2]]
        };
        tips.leftTop = tips.bottomRight;
        tips.rightTop = tips.bottomLeft;
        tips.leftBottom = tips.topRight;
        tips.rightBottom = tips.topLeft;

        return tips[corner];
    };

    // Border coordinates calculator
    function calculateBorders(radius) {
        var borders;

        // Use canvas element if supported
        if ($('<canvas>').get(0).getContext) {
            borders = {
                topLeft: [radius, radius], topRight: [0, radius],
                bottomLeft: [radius, 0], bottomRight: [0, 0]
            };
        }

        // Canvas not supported - Use VML (IE)
        else if ($.browser.msie) {
            borders = {
                topLeft: [-90, 90, 0], topRight: [-90, 90, -radius],
                bottomLeft: [90, 270, 0], bottomRight: [90, 270, -radius]
            };
        };

        return borders;
    };

    // BGIFRAME JQUERY PLUGIN ADAPTION
    //   Special thanks to Brandon Aaron for this plugin
    //   http://plugins.jquery.com/project/bgiframe
    function bgiframe() {
        var self, html, dimensions;
        self = this;
        dimensions = self.getDimensions();

        // Setup iframe HTML string
        html = '<iframe class="qtip-bgiframe" frameborder="0" tabindex="-1" src="javascript:false" ' +
			'style="display:block; position:absolute; z-index:-1; filter:alpha(opacity=\'0\'); border: 1px solid red; ' +
			'height:' + dimensions.height + 'px; width:' + dimensions.width + 'px" />';

        // Append the new HTML and setup element reference
        self.elements.bgiframe = self.elements.wrapper.prepend(html).children('.qtip-bgiframe:first');
    };

    // Assign cache and event initialisation on document load
    $(document).ready(function () {
        //Fix links with HTTPS or HTTP
        //Exclude this link processing from the secure checkout site
        if (window.location.protocol == 'https:' && window.location.toString().indexOf('secure.seaworldparks.com') == -1) {
            $('a').each(function (i) {
                if ($(this) != undefined && $(this).attr('href') != undefined && $(this).attr('href').indexOf('http') == -1 && $(this).attr('href').indexOf('javascript') == -1 && $(this).attr('href').indexOf('#') == -1) {
                    if ($(this).attr('href').toString().toLowerCase().indexOf('/user') != -1) {
                        if ($(this).attr('href').toString().indexOf('https') == -1) {
                            var href = $(this).attr('href');
                            if (href.substring(0, 1) != '/') {
                                href = window.location.pathname + '/' + href;
                            }
                            $(this).attr('href', ('https://' + window.location.hostname + href));
                        }
                    } else {
                        var href = $(this).attr('href');
                        if (href.substring(0, 1) != '/') {
                            href = window.location.pathname + '/' + href;
                        }
                        $(this).attr('href', ('http://' + window.location.hostname + href));
                    }
                }
            });
        }

        // Setup library cache with window scroll and dimensions of document
        $.fn.qtip.cache = {
            screen: {
                scroll: { left: $(window).scrollLeft(), top: $(window).scrollTop() },
                width: $(window).width(),
                height: $(window).height()
            }
        };

        // Adjust positions of the tooltips on window resize or scroll if enabled
        var adjustTimer;
        $(window).bind('resize scroll', function (event) {
            clearTimeout(adjustTimer);
            adjustTimer = setTimeout(function () {
                // Readjust cached screen values
                if (event.type === 'scroll')
                    $.fn.qtip.cache.screen.scroll = { left: $(window).scrollLeft(), top: $(window).scrollTop() };
                else {
                    $.fn.qtip.cache.screen.width = $(window).width();
                    $.fn.qtip.cache.screen.height = $(window).height();
                };

                for (i = 0; i < $.fn.qtip.interfaces.length; i++) {
                    // Access current elements API
                    var api = $.fn.qtip.interfaces[i];

                    // Update position if resize or scroll adjustments are enabled
                    if (api.status.rendered === true
					&& (api.options.position.adjust.scroll && event.type === 'scroll'
					|| api.options.position.adjust.resize && event.type === 'resize')) {
                        // Queue the animation so positions are updated correctly
                        api.updatePosition(event, true);
                    }
                };
            }
			, 100);
        })

        // Hide unfocus toolipts on document mousedown
        $(document).bind('touchstart.qtip', function (event) {
            if ($(event.target).parents('div.qtip').length === 0) {
                $('.qtip[unfocus]').each(function () {
                    var api = $(this).qtip("api");

                    // Only hide if its visible and not the tooltips target
                    if ($(this).is(':visible') && !api.status.disabled
					&& $(event.target).add(api.elements.target).length > 1)
                        api.hide(event);
                })
            };
        })


        $(document).bind('mousedown.qtip', function (event) {
            if ($(event.target).parents('div.qtip').length === 0) {
                $('.qtip[unfocus]').each(function () {
                    var api = $(this).qtip("api");

                    // Only hide if its visible and not the tooltips target
                    if ($(this).is(':visible') && !api.status.disabled
					&& $(event.target).add(api.elements.target).length > 1)
                        api.hide(event);
                })
            };
        })
    });

    // Define qTip API interfaces array
    $.fn.qtip.interfaces = []

    // Define log and constant place holders
    $.fn.qtip.log = { error: function () { return this; } };
    $.fn.qtip.constants = {};

    // Define configuration defaults
    $.fn.qtip.defaults = {
        // Content
        content: {
            prerender: false,
            text: false,
            url: false,
            data: null,
            title: {
                text: false,
                button: false
            }
        },
        // Position
        position: {
            target: false,
            corner: {
                target: 'bottomRight',
                tooltip: 'topLeft'
            },
            adjust: {
                x: 0, y: 0,
                mouse: true,
                screen: false,
                scroll: true,
                resize: true
            },
            type: 'absolute',
            container: false
        },
        // Effects
        show: {
            when: {
                target: false,
                event: 'mouseover'
            },
            effect: {
                type: 'fade',
                length: 100
            },
            delay: 140,
            solo: false,
            ready: false
        },
        hide: {
            when: {
                target: false,
                event: 'mouseout'
            },
            effect: {
                type: 'fade',
                length: 100
            },
            delay: 0,
            fixed: false
        },
        // Callbacks
        api: {
            beforeRender: function () { },
            onRender: function () { },
            beforePositionUpdate: function () { },
            onPositionUpdate: function () { },
            beforeShow: function () { },
            onShow: function () { },
            beforeHide: function () { },
            onHide: function () { },
            beforeContentUpdate: function () { },
            onContentUpdate: function () { },
            beforeContentLoad: function () { },
            onContentLoad: function () { },
            beforeTitleUpdate: function () { },
            onTitleUpdate: function () { },
            beforeDestroy: function () { },
            onDestroy: function () { },
            beforeFocus: function () { },
            onFocus: function () { }
        }
    };

    $.fn.qtip.styles = {
        defaults: {
            background: 'white',
            color: '#111',
            overflow: 'hidden',
            textAlign: 'left',
            width: {
                min: 0,
                max: 250
            },
            padding: '5px 9px',
            border: {
                width: 1,
                radius: 0,
                color: '#d3d3d3'
            },
            tip: {
                corner: false,
                color: false,
                size: { width: 13, height: 13 },
                opacity: 1
            },
            title: {
                background: '#e1e1e1',
                fontWeight: 'bold',
                padding: '7px 12px'
            },
            button: {
                cursor: 'pointer'
            },
            classes: {
                target: '',
                tip: 'qtip-tip',
                title: 'qtip-title',
                button: 'qtip-button',
                content: 'qtip-content',
                active: 'qtip-active'
            }
        },
        cream: {
            border: {
                width: 3,
                radius: 0,
                color: '#F9E98E'
            },
            title: {
                background: '#F0DE7D',
                color: '#A27D35'
            },
            background: '#FBF7AA',
            color: '#A27D35',

            classes: { tooltip: 'qtip-cream' }
        },
        light: {
            border: {
                width: 3,
                radius: 0,
                color: '#E2E2E2'
            },
            title: {
                background: '#f1f1f1',
                color: '#454545'
            },
            background: 'white',
            color: '#454545',

            classes: { tooltip: 'qtip-light' }
        },
        dark: {
            border: {
                width: 3,
                radius: 0,
                color: '#303030'
            },
            title: {
                background: '#404040',
                color: '#f3f3f3'
            },
            background: '#505050',
            color: '#f3f3f3',

            classes: { tooltip: 'qtip-dark' }
        },
        red: {
            border: {
                width: 3,
                radius: 0,
                color: '#CE6F6F'
            },
            title: {
                background: '#f28279',
                color: '#9C2F2F'
            },
            background: '#F79992',
            color: '#9C2F2F',

            classes: { tooltip: 'qtip-red' }
        },
        green: {
            border: {
                width: 3,
                radius: 0,
                color: '#A9DB66'
            },
            title: {
                background: '#b9db8c',
                color: '#58792E'
            },
            background: '#CDE6AC',
            color: '#58792E',

            classes: { tooltip: 'qtip-green' }
        },
        blue: {
            border: {
                width: 3,
                radius: 0,
                color: '#ADD9ED'
            },
            title: {
                background: '#D0E9F5',
                color: '#5E99BD'
            },
            background: '#E5F6FE',
            color: '#4D9FBF',

            classes: { tooltip: 'qtip-blue' }
        }
    };
})(jQuery);
/**
@file
jquery.diehard_facebooklike.js
@author
Jake Rutter, William Chang
@version
0.1
@date
- Created: 2010-08-30
- Modified: 2011-02-03
.
@note
Prerequisites:
- jQuery http://www.jquery.com/
- Redirect Page Using CMS (Content Management System).
.
References:
- http://code.google.com/p/jquery-one-fblike/
- http://stackoverflow.com/questions/901115/get-querystring-with-jquery
- http://firequery.binaryage.com/
.
*/

//// Widget: Facebook Like
(function ($) {
    // Extend chain library.
    $.fn.facebookLike = function (optCustoms) {
       
        // Declare options and set default values.
        var optDefaults = {
            appId: '',
            admins: '',
            buttonWidth: 450,
            buttonHeight: 80,
            showfaces: false,
            font: 'lucida grande',
            layout: 'normal',
            action: 'like',
            colorscheme: 'light',
            fnLoad: null
        };
        // Merge two options, modifying the first.
        var opt = $.extend(optDefaults, optCustoms);

        // Required dependencies using Facebook JavaScript SDK.
        $('body').append('<div id=\"fb-root\"></div>');
        window.fbAsyncInit = function () {
            FB.init({
                appId: opt.appId,
                status: true,
                cookie: true,
                xfbml: true
            });
            // Callback on dependencies load.
            if (opt.fnLoad) { opt.fnLoad.call(this); }
        };
        (function () {
            var e = document.createElement('script');
            e.async = true;
            //commented out due to bug on facebook's end
            //forcing https resolves the issue
            //e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
            e.src = 'https://connect.facebook.net/en_US/all.js';
            document.getElementById('fb-root').appendChild(e);
        } ());
       
        // Iterate and return each selected element back to library's chain.
        return this.each(function (_intIndex) {
          
            /** Create query string parameter. */
            function _createParam(strKey, strDataCss) {
                if (_eleDataRegion == null) { return ''; }
                return strKey + '=' + $('> .' + strDataCss, _eleDataRegion).val() + '&';
            }
            /** Parse markup code. */
            function _parseMarkup() {
                // Get URL.
                var strUrl = $(_eleThis).attr('data-url');
                
                var strDataTokens = [];
                // Validate data.
                if (strUrl == null || strUrl.length <= 0) {
                    //throw ('Markup code error, missing value in data-url attribute of element.');
                } else {
                    strDataTokens = strUrl.split(';');
                    if (strDataTokens.length >= 1) {
                        strUrl = strDataTokens[0];
                    }
                }
                // Create and append markup code to document.
                if ($(this).hasClass('share')) {
                    $(_eleThis).html('<a name="fb_share" type="icon_link" share_url="YOUR_URL"></a><script src="http://static.ak.fbcdn.net/connect.php/js/FB.Share" type="text/javascript"></script>');
                } else {
                    $(_eleThis).html('<fb:like send="false" href=\"' + strUrl + '" width=\"' + opt.buttonWidth + '\" height=\"' + opt.buttonHeight + '\" show_faces=\"' + opt.showfaces + '\" font=\"' + opt.font + '\" layout=\"' + opt.layout + '\" action=\"' + opt.action + '\" colorscheme=\"' + opt.colorscheme + '\"/>');
                }
            }
            /** Init widget. */
            this.init = function () {
                // Parse markup code.
              
                _parseMarkup();
            };

            // Fields.
            var _eleDataRegion = null;
            // Procedural.
            var _eleThis = this;
            _eleThis.init();
        });
    };
})(jQuery);
/*
* jQuery starRating 1.0
* Adds star rating functionality
*/
; (function ($) {
    $.fn.starRating = function (options) {
        var options = $.extend(true, {}, $.fn.starRating.options, (typeof options == 'undefined') ? {} : options);

        var starsTemplate = $('<div class="stars stars-structured stars-current" />').bind('click', function (e) {
            if ($(e.target).is('a.star')) {
                e.preventDefault();

                var url = $(this).data('url');
                var rating = $(e.target).data('rating');
                var params = new Object();
                params.name = rating;

                $.fn.starRating.setValue.call(this, rating);

                options.onSelected.call(this, url, rating);
            }
        }).bind('mouseover', function (e) {
            if ($(e.target).is('a.star')) {
                $(this).removeClass('stars-current');

                // create referece object for stars
                var stars = $('a.star', this);

                // add hover class to the current and preceding stars
                stars.removeClass('star-hover').filter(function (i) {
                    return i <= stars.index(e.target);
                }).addClass('star-hover');
            }
        }).bind('mouseleave', function (e) {
            $(this).addClass('stars-current').find('a.star-hover').removeClass('star-hover');
        });

        this.not('.stars-structured').each(function (i) {
            var url = $(this).attr('data-url');

            url = typeof url == 'undefined' ? '' : url;

            var rating = parseFloat($(this).attr('data-value'));
            var max = parseFloat($(this).attr('data-max'));
            var readonly = (typeof $(this).attr('data-readonly') != 'undefined') ? true : false;

            var stars = starsTemplate.clone(!readonly).data('url', url);

            var starTemplate = readonly ? $('<span class="star" />') : $('<a class="star" href="#" />');

            for (i = 1; i <= max; i++) {
                starTemplate.clone().text('Give it a ' + i).data('rating', i).appendTo(stars);
            }

            if (url == '') {
                stars.append('<input type="hidden" name="rating" />');
            }

            stars = $.fn.starRating.setValue.call($(stars), rating);

            $(this).replaceWith(stars);
        });

        return this;
    };

    $.fn.starRating.setValue = function (rating) {
        $('.star', this).removeClass('star-full star-partial').each(function (i) {
            i++;

            var starClass = '';

            if (i <= rating) {
                starClass = 'star-full';
            }
            else if (i - rating < 1) {
                starClass = 'star-partial';
            }

            $(this).addClass(starClass);
        });

        $('input[type=hidden][name=rating]', this).val(rating);

        return this;
    };

    $.fn.starRating.options = {
        onSelected: function (url, rating) { }
    }
})(jQuery);
/*

Uniform v1.7.3
Copyright Â© 2009 Josh Pyles / Pixelmatrix Design LLC
http://pixelmatrixdesign.com

Requires jQuery 1.4 or newer

Much thanks to Thomas Reynolds and Buck Wilson for their help and advice on this

Disabling text selection is made possible by Mathias Bynens <http://mathiasbynens.be/>
and his noSelect plugin. <http://github.com/mathiasbynens/noSelect-jQuery-Plugin>

Also, thanks to David Kaneda and Eugene Bond for their contributions to the plugin

License:
MIT License - http://www.opensource.org/licenses/mit-license.php

Enjoy!

*/

; (function ($) {
    $.uniform = {
        options: {
            selectClass: 'selector',
            radioClass: 'radio',
            checkboxClass: 'checker',
            fileClass: 'uploader',
            filenameClass: 'filename',
            fileBtnClass: 'action',
            fileDefaultText: 'No file selected',
            fileBtnText: 'Choose File',
            checkedClass: 'checked',
            focusClass: 'focus',
            disabledClass: 'disabled',
            buttonClass: 'button',
            activeClass: 'active',
            hoverClass: 'hover',
            useID: true,
            idPrefix: 'uniform',
            resetSelector: false
        },
        elements: []
    };

    if ($.browser.msie && $.browser.version < 7) {
        $.support.selectOpacity = false;
    } else {
        $.support.selectOpacity = true;
    }

    $.fn.uniform = function (options) {

        options = $.extend($.uniform.options, options);

        var el = this;
        //code for specifying a reset button
        if (options.resetSelector != false) {
            $(options.resetSelector).mouseup(function () {
                function resetThis() {
                    $.uniform.update(el);
                }
                setTimeout(resetThis, 10);
            });
        }

        function doInput(elem) {
            $el = $(elem);
            $el.addClass($el.attr("type"));
            storeElement(elem);
        }

        function doTextarea(elem) {
            $(elem).addClass("uniform");
            storeElement(elem);
        }

        function doButton(elem) {
            $el = elem;

            var divTag = $("<div>"),
          spanTag = $("<span>");

            divTag.addClass(options.buttonClass);

            if (options.useID && $el.attr("id") != "") divTag.attr("id", options.idPrefix + "-" + $el.attr("id"));

            var btnText;

            if ($el.is("a")) {
                btnText = $el.text();
            } else if ($el.is("button")) {
                btnText = $el.text();
            } else if ($el.is(":submit") || $el.is("input[type=button]")) {
                btnText = $el.attr("value");
            }

            if (btnText == "") btnText = "Submit";

            spanTag.html(btnText);

            $el.hide();
            $el.wrap(divTag);
            $el.wrap(spanTag);

            //redefine variables
            divTag = $el.closest("div");
            spanTag = $el.closest("span");

            if ($el.is(":disabled")) divTag.addClass(options.disabledClass);

            divTag.bind({
                "mouseenter.uniform": function () {
                    divTag.addClass(options.hoverClass);
                },
                "mouseleave.uniform": function () {
                    divTag.removeClass(options.hoverClass);
                },
                "mousedown.uniform touchbegin.uniform": function () {
                    divTag.addClass(options.activeClass);
                },
                "mouseup.uniform touchend.uniform": function () {
                    divTag.removeClass(options.activeClass);
                },
                "click.uniform touchend.uniform": function (e) {
                    if ($(e.target).is("span") || $(e.target).is("div")) {
                        if (elem[0].dispatchEvent) {
                            var ev = document.createEvent('MouseEvents');
                            ev.initEvent('click', true, true);
                            elem[0].dispatchEvent(ev);
                        } else {
                            elem[0].click();
                        }
                    }
                }
            });

            elem.bind({
                "focus.uniform": function () {
                    divTag.addClass(options.focusClass);
                },
                "blur.uniform": function () {
                    divTag.removeClass(options.focusClass);
                }
            });

            $.uniform.noSelect(divTag);
            storeElement(elem);
        }

        function doSelect(elem) {

            var divTag = $('<div />'),
          spanTag = $('<span />');

            divTag.addClass(options.selectClass);

            if (options.useID && elem.attr("id") != "") {
                divTag.attr("id", options.idPrefix + "-" + elem.attr("id"));
            }

            var selected = elem.find(":selected:first");
            if (selected.length == 0) {
                selected = elem.find("option:first");
            }
            spanTag.html(selected.text());

            elem.css('opacity', 0);
            elem.wrap(divTag);
            elem.before(spanTag);

            //redefine variables
            divTag = elem.parent("div");
            spanTag = elem.siblings("span");

            elem.bind({
                "change.uniform": function () {
                    spanTag.text(elem.find(":selected").text());
                    divTag.removeClass(options.activeClass);
                },
                "focus.uniform": function () {
                    divTag.addClass(options.focusClass);
                },
                "blur.uniform": function () {
                    divTag.removeClass(options.focusClass);
                    divTag.removeClass(options.activeClass);
                },
                "mousedown.uniform touchbegin.uniform": function () {
                    divTag.addClass(options.activeClass);
                },
                "mouseup.uniform touchend.uniform": function () {
                    divTag.removeClass(options.activeClass);
                },
                "click.uniform touchend.uniform": function () {
                    divTag.removeClass(options.activeClass);
                },
                "mouseenter.uniform": function () {
                    divTag.addClass(options.hoverClass);
                },
                "mouseleave.uniform": function () {
                    divTag.removeClass(options.hoverClass);
                },
                "keyup.uniform": function () {
                    spanTag.text(elem.find(":selected").text());
                }
            });

            //handle disabled state
            if ($(elem).attr("disabled")) {
                //box is checked by default, check our box
                divTag.addClass(options.disabledClass);
            }
            $.uniform.noSelect(spanTag);

            storeElement(elem);

        }

        function doCheckbox(elem) {

            var divTag = $('<div />'),
          spanTag = $('<span />');

            divTag.addClass(options.checkboxClass);

            //assign the id of the element
            if (options.useID && elem.attr("id") != "") {
                divTag.attr("id", options.idPrefix + "-" + elem.attr("id"));
            }

            //wrap with the proper elements
            $(elem).wrap(divTag);
            $(elem).wrap(spanTag);

            //redefine variables
            spanTag = elem.parent();
            divTag = spanTag.parent();

            //hide normal input and add focus classes
            $(elem)
      .css("opacity", 0)
      .bind({
          "focus.uniform": function () {
              divTag.addClass(options.focusClass);
          },
          "blur.uniform": function () {
              divTag.removeClass(options.focusClass);
          },
          "click.uniform touchend.uniform": function () {
              if (!$(elem).attr("checked")) {
                  //box was just unchecked, uncheck span
                  spanTag.removeClass(options.checkedClass);
              } else {
                  //box was just checked, check span.
                  spanTag.addClass(options.checkedClass);
              }
          },
          "mousedown.uniform touchbegin.uniform": function () {
              divTag.addClass(options.activeClass);
          },
          "mouseup.uniform touchend.uniform": function () {
              divTag.removeClass(options.activeClass);
          },
          "mouseenter.uniform": function () {
              divTag.addClass(options.hoverClass);
          },
          "mouseleave.uniform": function () {
              divTag.removeClass(options.hoverClass);
          }
      });

            //handle defaults
            if ($(elem).attr("checked")) {
                //box is checked by default, check our box
                spanTag.addClass(options.checkedClass);
            }

            //handle disabled state
            if ($(elem).attr("disabled")) {
                //box is checked by default, check our box
                divTag.addClass(options.disabledClass);
            }

            storeElement(elem);

        }

        function doRadio(elem) {

            var divTag = $('<div />'),
          spanTag = $('<span />');

            divTag.addClass(options.radioClass);

            if (options.useID && elem.attr("id") != "") {
                divTag.attr("id", options.idPrefix + "-" + elem.attr("id"));
            }

            //wrap with the proper elements
            $(elem).wrap(divTag);
            $(elem).wrap(spanTag);

            //redefine variables
            spanTag = elem.parent();
            divTag = spanTag.parent();

            //hide normal input and add focus classes
            $(elem)
      .css("opacity", 0)
      .bind({
          "focus.uniform": function () {
              divTag.addClass(options.focusClass);
          },
          "blur.uniform": function () {
              divTag.removeClass(options.focusClass);
          },
          "click.uniform touchend.uniform": function () {
              if (!$(elem).attr("checked")) {
                  //box was just unchecked, uncheck span
                  spanTag.removeClass(options.checkedClass);
              } else {
                  //box was just checked, check span
                  $("." + options.radioClass + " span." + options.checkedClass + ":has([name='" + $(elem).attr('name') + "'])").removeClass(options.checkedClass);
                  spanTag.addClass(options.checkedClass);
              }
          },
          "mousedown.uniform touchend.uniform": function () {
              if (!$(elem).is(":disabled")) {
                  divTag.addClass(options.activeClass);
              }
          },
          "mouseup.uniform touchbegin.uniform": function () {
              divTag.removeClass(options.activeClass);
          },
          "mouseenter.uniform touchend.uniform": function () {
              divTag.addClass(options.hoverClass);
          },
          "mouseleave.uniform": function () {
              divTag.removeClass(options.hoverClass);
          }
      });

            //handle defaults
            if ($(elem).attr("checked")) {
                //box is checked by default, check span
                spanTag.addClass(options.checkedClass);
            }
            //handle disabled state
            if ($(elem).attr("disabled")) {
                //box is checked by default, check our box
                divTag.addClass(options.disabledClass);
            }

            storeElement(elem);

        }

        function doFile(elem) {
            //sanitize input
            var $el = $(elem);

            var divTag = $('<div />'),
          filenameTag = $('<span>' + options.fileDefaultText + '</span>'),
          btnTag = $('<span>' + options.fileBtnText + '</span>');

            divTag.addClass(options.fileClass);
            filenameTag.addClass(options.filenameClass);
            btnTag.addClass(options.fileBtnClass);

            if (options.useID && $el.attr("id") != "") {
                divTag.attr("id", options.idPrefix + "-" + $el.attr("id"));
            }

            //wrap with the proper elements
            $el.wrap(divTag);
            $el.after(btnTag);
            $el.after(filenameTag);

            //redefine variables
            divTag = $el.closest("div");
            filenameTag = $el.siblings("." + options.filenameClass);
            btnTag = $el.siblings("." + options.fileBtnClass);

            //set the size
            if (!$el.attr("size")) {
                var divWidth = divTag.width();
                //$el.css("width", divWidth);
                $el.attr("size", divWidth / 10);
            }

            //actions
            var setFilename = function () {
                var filename = $el.val();
                if (filename === '') {
                    filename = options.fileDefaultText;
                }
                else {
                    filename = filename.split(/[\/\\]+/);
                    filename = filename[(filename.length - 1)];
                }
                filenameTag.text(filename);
            };

            // Account for input saved across refreshes
            setFilename();

            $el
      .css("opacity", 0)
      .bind({
          "focus.uniform": function () {
              divTag.addClass(options.focusClass);
          },
          "blur.uniform": function () {
              divTag.removeClass(options.focusClass);
          },
          "mousedown.uniform": function () {
              if (!$(elem).is(":disabled")) {
                  divTag.addClass(options.activeClass);
              }
          },
          "mouseup.uniform": function () {
              divTag.removeClass(options.activeClass);
          },
          "mouseenter.uniform": function () {
              divTag.addClass(options.hoverClass);
          },
          "mouseleave.uniform": function () {
              divTag.removeClass(options.hoverClass);
          }
      });

            // IE7 doesn't fire onChange until blur or second fire.
            if ($.browser.msie) {
                // IE considers browser chrome blocking I/O, so it
                // suspends tiemouts until after the file has been selected.
                $el.bind('click.uniform.ie7', function () {
                    setTimeout(setFilename, 0);
                });
            } else {
                // All other browsers behave properly
                $el.bind('change.uniform', setFilename);
            }

            //handle defaults
            if ($el.attr("disabled")) {
                //box is checked by default, check our box
                divTag.addClass(options.disabledClass);
            }

            $.uniform.noSelect(filenameTag);
            $.uniform.noSelect(btnTag);
            storeElement(elem);

        }

        $.uniform.restore = function (elem) {
            if (elem == undefined) {
                elem = $($.uniform.elements);
            }

            $(elem).each(function () {
                if ($(this).is(":checkbox")) {
                    //unwrap from span and div
                    $(this).unwrap().unwrap();
                } else if ($(this).is("select")) {
                    //remove sibling span
                    $(this).siblings("span").remove();
                    //unwrap parent div
                    $(this).unwrap();
                } else if ($(this).is(":radio")) {
                    //unwrap from span and div
                    $(this).unwrap().unwrap();
                } else if ($(this).is(":file")) {
                    //remove sibling spans
                    $(this).siblings("span").remove();
                    //unwrap parent div
                    $(this).unwrap();
                } else if ($(this).is("button, :submit, a, input[type='button']")) {
                    //unwrap from span and div
                    $(this).unwrap().unwrap();
                }

                //unbind events
                $(this).unbind(".uniform");

                //reset inline style
                $(this).css("opacity", "1");

                //remove item from list of uniformed elements
                var index = $.inArray($(elem), $.uniform.elements);
                $.uniform.elements.splice(index, 1);
            });
        };

        function storeElement(elem) {
            //store this element in our global array
            elem = $(elem).get();
            if (elem.length > 1) {
                $.each(elem, function (i, val) {
                    $.uniform.elements.push(val);
                });
            } else {
                $.uniform.elements.push(elem);
            }
        }

        //noSelect v1.0
        $.uniform.noSelect = function (elem) {
            function f() {
                return false;
            };
            $(elem).each(function () {
                this.onselectstart = this.ondragstart = f; // Webkit & IE
                $(this)
        .mousedown(f) // Webkit & Opera
        .css({ MozUserSelect: 'none' }); // Firefox
            });
        };

        $.uniform.update = function (elem) {
            if (elem == undefined) {
                elem = $($.uniform.elements);
            }
            //sanitize input
            elem = $(elem);

            elem.each(function () {
                //do to each item in the selector
                //function to reset all classes
                var $e = $(this);

                if ($e.is("select")) {
                    //element is a select
                    var spanTag = $e.siblings("span");
                    var divTag = $e.parent("div");

                    divTag.removeClass(options.hoverClass + " " + options.focusClass + " " + options.activeClass);

                    //reset current selected text
                    spanTag.html($e.find(":selected").text());

                    if ($e.is(":disabled")) {
                        divTag.addClass(options.disabledClass);
                    } else {
                        divTag.removeClass(options.disabledClass);
                    }

                } else if ($e.is(":checkbox")) {
                    //element is a checkbox
                    var spanTag = $e.closest("span");
                    var divTag = $e.closest("div");

                    divTag.removeClass(options.hoverClass + " " + options.focusClass + " " + options.activeClass);
                    spanTag.removeClass(options.checkedClass);

                    if ($e.is(":checked")) {
                        spanTag.addClass(options.checkedClass);
                    }
                    if ($e.is(":disabled")) {
                        divTag.addClass(options.disabledClass);
                    } else {
                        divTag.removeClass(options.disabledClass);
                    }

                } else if ($e.is(":radio")) {
                    //element is a radio
                    var spanTag = $e.closest("span");
                    var divTag = $e.closest("div");

                    divTag.removeClass(options.hoverClass + " " + options.focusClass + " " + options.activeClass);
                    spanTag.removeClass(options.checkedClass);

                    if ($e.is(":checked")) {
                        spanTag.addClass(options.checkedClass);
                    }

                    if ($e.is(":disabled")) {
                        divTag.addClass(options.disabledClass);
                    } else {
                        divTag.removeClass(options.disabledClass);
                    }
                } else if ($e.is(":file")) {
                    var divTag = $e.parent("div");
                    var filenameTag = $e.siblings(options.filenameClass);
                    btnTag = $e.siblings(options.fileBtnClass);

                    divTag.removeClass(options.hoverClass + " " + options.focusClass + " " + options.activeClass);

                    filenameTag.text($e.val());

                    if ($e.is(":disabled")) {
                        divTag.addClass(options.disabledClass);
                    } else {
                        divTag.removeClass(options.disabledClass);
                    }
                } else if ($e.is(":submit") || $e.is("button") || $e.is("a") || elem.is("input[type=button]")) {
                    var divTag = $e.closest("div");
                    divTag.removeClass(options.hoverClass + " " + options.focusClass + " " + options.activeClass);

                    if ($e.is(":disabled")) {
                        divTag.addClass(options.disabledClass);
                    } else {
                        divTag.removeClass(options.disabledClass);
                    }

                }
            });
        };

        return this.each(function () {
            if ($.support.selectOpacity) {
                var elem = $(this);

                if (elem.is("select")) {
                    //element is a select
                    if (elem.attr("multiple") != true) {
                        //element is not a multi-select
                        if (elem.attr("size") == undefined || elem.attr("size") <= 1) {
                            doSelect(elem);
                        }
                    }
                } else if (elem.is(":checkbox")) {
                    //element is a checkbox
                    doCheckbox(elem);
                } else if (elem.is(":radio")) {
                    //element is a radio
                    doRadio(elem);
                } else if (elem.is(":file")) {
                    //element is a file upload
                    doFile(elem);
                } else if (elem.is(":text, :password, input[type='email']")) {
                    doInput(elem);
                } else if (elem.is("textarea")) {
                    doTextarea(elem);
                } else if (elem.is("a") || elem.is(":submit") || elem.is("button") || elem.is("input[type=button]")) {
                    doButton(elem);
                }

            }
        });
    };
})(jQuery);
; (function ($) {
    $.fn.toggleFormGroup = function (disable) {
        disable = (typeof disable == 'boolean') ? disable : null;

        if (disable == null) {
            disable = (this.hasClass('disabled')) ? true : false;
        }

        if (disable) {
            this.addClass('disabled').find(':input').attr('disabled', 'disabled');
        }
        else {
            this.removeClass('disabled').find(':input').removeAttr('disabled').filter('.uniformed').removeClass('disabled').parents('.disabled').filter('.selector, .radio, .checker, .uploader').removeClass('disabled');
        }

        // fix uniform select boxes in IE
        $('div.selector').css('position', 'static').css('position', 'relative');

        return this;
    }
})(jQuery);

// Declare global variables.
var strFacebookApplicationId = $('body > .data_facebook_application_id').val();
var strUserProfileId = $('body > .data_user_profile_id').val();

if (typeof (window.cms) != "undefined") {
 //
    /** Init Facebook Like button for Favorite CMS module. */
    window.cms.initFacebookLike = function (strSelector) {
        if (typeof strSelector === 'undefined' || strSelector == null || strSelector.length <= 0) {
            strSelector = '.btn_facebook_like';
        }
        if (typeof ($(strSelector).facebookLike) != "undefined") {
            // Create Facebook like widget.
            $(strSelector).facebookLike({
                appId: strFacebookApplicationId,
                buttonWidth: 100,
                buttonHeight: 23,
                font: 'arial',
                layout: 'button_count',
                fnLoad: function () {
                    FB.Event.subscribe('edge.create', function (strUrl, objEvent) {
                        // Get AJAX URL.
                        var strAjaxUrl = $(objEvent.dom.parentNode).attr('data-url');
                        var cmsID = $(objEvent.dom.parentNode).attr('cmsid');
                        AddFavorite(cmsID,strAjaxUrl);
//                        if (strAjaxUrl != null) {
//                            strTokens = strAjaxUrl.split(';');
//                            if (strTokens.length >= 2) {
//                                strAjaxUrl = strTokens[1];
//                            } else {
//                                throw ('Markup code error, missing second string token in data-url attribute.');
//                            }
//                        } else {
//                            throw ('Markup code error, missing value in data-url attribute of element.');
//                        }
//                        // Get id from URL.
//                        var strId = '';
//                        var strParams = new RegExp('[\\?&]' + 'id' + '=([^&#]*)').exec(strUrl);
//                        if (strParams != null && strParams.length == 2) {
//                            strId = strParams[1];
//                        } else { return; }
//                        // Set data parameters.
//                        var objDataParameters = {
//                            userProfileId: strUserProfileId,
//                            cmsItemId: strId,
//                            sourceUrl: window.location.href,
//                            configurationFavorite: window.cms.strConfigurationFavorite
//                        };
                        // Perform AJAX.
//                        $.post(strAjaxUrl, objDataParameters, function (data, status) {
//                            if (status == 'success' && data == '0') {
//                            } else if (status == 'success') {
//                                // Append markup code.
//                                $('#myfavorites_container').empty().append(data).addWidgets();
//                                // Set count view.
//                                window.cms.countFavorites();
//                            } else { throw (status); }
//                        });
                    });
                    FB.Event.subscribe('edge.remove', function (strUrl, objEvent) {
                        // Do something. Reference: http://developers.facebook.com/blog/post/446/
                    });

                }

            });
        }

    }

    /** Count favorites for gutter region of document. */
    window.cms.countFavorites = function () {
        // Init.
        var eleSource = $('#btn_myfavorites').get(0);
        var eleTargets = $('.favorites_count').get();
        if (eleSource == null || eleTargets == null || eleTargets.length <= 0) { return; }
        // Get AJAX URL.
        var strAjaxUrl = $(eleSource).attr('data-url');
        if (strAjaxUrl == null || strAjaxUrl.length <= 0) {
            throw ('Markup code error, missing value in data-url attribute of element.');
        }
        // Set data parameters.
        var objDataParameters = {
            userProfileId: strUserProfileId
        };
        // Perform AJAX.
        $.post(strAjaxUrl, objDataParameters, function (data, status) {
            if (status == 'success' && data == '0') {
            } else if (status == 'success') {
                $(eleTargets).text(data);
            } else { throw (status); }
        });
    }

    /** Reload favorites for gutter region of document. */
    window.cms.reloadFavorites = function () {
        // Get AJAX URL.
        var strAjaxUrl = $('#myfavorites_container').attr('data-reloadurl');
        if (strAjaxUrl == null || strAjaxUrl.length <= 0) {
            throw ('Markup code error, missing value in data-reloadurl attribute of element.');
        }
        // Set data parameters.
        var objDataParameters = {
            userProfileId: strUserProfileId,
            configurationFavorite: window.cms.strConfigurationFavorite
        };
        // Perform AJAX.
        $.post(strAjaxUrl, objDataParameters, function (data, status) {
            if (status == 'success' && data == '0') {
            } else if (status == 'success') {
                // Append markup code.
                $('#myfavorites_container').empty().append(data).addWidgets();
                // Set count view.
                window.cms.countFavorites();
            } else { throw (status); }
        });
    }

    /** Reload cart to gutter region of document. */
    window.cms.reloadCart = function () {
        // Init.
        var eleCount = $('#btn_mycart .count').get(0);
        var eleBody = $('#mycart_container').empty().get(0);
        if (eleCount == null || eleBody == null) { return; }
        // Get AJAX URL.
        var strAjaxUrl = $(eleBody).attr('data-url');
        if (strAjaxUrl == null || strAjaxUrl.length <= 0) {
            throw ('Markup code error, missing value in data-url attribute of element.');
        }
        // Set data parameters.
        var objDataParameters = {
            configurationCart: window.cms.strConfigurationCart
        };
        // Perform AJAX.
        $.post(strAjaxUrl, objDataParameters, function (data, status) {
            if (status == 'success' && data == '0') {
            } else if (status == 'success') {
                // Append markup code.
                var eleList = $(data).appendTo(eleBody);
                // Set count view.
                $(eleCount).text(data.split("<h3>").length - 1); //count number of h3 headers instead *
            } else { throw (status); }
        });
        // Continue default action.
        return true;
    }


    // Procedural.
    window.cms.initFacebookLike();
}
/**
* Equal Heights Plugin
* Equalize the heights of elements. Great for columns or any elements
* that need to be the same size (floats, etc).
* 
* Version 1.0
* Updated 12/10/2008
*
* Copyright (c) 2008 Rob Glazebrook (cssnewbie.com) 
*
* Usage: $(object).equalHeights([minHeight], [maxHeight]);
* 
* Example 1: $(".cols").equalHeights(); Sets all columns to the same height.
* Example 2: $(".cols").equalHeights(400); Sets all cols to at least 400px tall.
* Example 3: $(".cols").equalHeights(100,300); Cols are at least 100 but no more
* than 300 pixels tall. Elements with too much content will gain a scrollbar.
* 
*/
; (function ($) {
    $.fn.equalHeights = function (minHeight, maxHeight) {
        tallest = (minHeight) ? minHeight : 0;

        this.each(function () {
            if ($(this).outerHeight(true) > tallest) {
                tallest = $(this).outerHeight(true);
            }
        });

        if ((maxHeight) && tallest > maxHeight) {
            tallest = maxHeight;
        }

        return this.each(function () {
            var verticalPadding = parseInt($(this).css('padding-top')) + parseInt($(this).css('padding-bottom'));

            $(this).height(tallest - verticalPadding);
        });
    }
})(jQuery);
/**
@file
jquery.diehard_aspnetvalidationhighlighter.js
@author
William Chang
@version
0.1
@date
- Created: 2011-02-03
- Modified: 2011-02-08
.
@note
Prerequisites:
- Microsoft ASP.NET Web Forms
- jQuery http://www.jquery.com/
.
References:
- https://developer.mozilla.org/en/DOM/window
- http://codinglifestyle.wordpress.com/2009/09/16/change-background-color-of-invalid-controls-asp-net-validator/
.
*/

// Widget: Aspnet Validation Highlighter
(function ($) {
    var memberPublic = null;
    var _extensionName = 'aspnetValidationHighlighter';
    // Declare options and set default values.
    var _opt, _optCustoms = null;
    var _optDefaults = {
        strFieldErrorCss: 'error_field'
    };

    /* Private Fields
    //-------------------------------------------------------------------*/

    var _fnAspnetValidatorUpdateDisplay = null;

    /* Public Methods
    //-------------------------------------------------------------------*/

    /** Extend core library. */
    memberPublic = $[_extensionName] = function (optCustoms) {
        // Merge two options, modifying the first.
        _opt = $.extend({}, _optDefaults, optCustoms);
        // Init.
        memberPublic.init();
        // Return library's object.
        return this;
    };
    /** Init widget. */
    memberPublic.init = function () {
        // Validate Aspnet function exist in window and document of browser.
        if (typeof window !== 'object' || typeof window.document !== 'object' || typeof window.ValidatorUpdateDisplay !== 'function') {
            return;
        }
        // Declare reference variable to Aspnet function.
        _fnAspnetValidatorUpdateDisplay = window.ValidatorUpdateDisplay;
        // Override Aspnet function.
        window.ValidatorUpdateDisplay = memberPublic.runValidatorUpdateDisplay;

        // Validate Aspnet variable exist.
        if (typeof Page_IsValid === 'boolean') {
            if (Page_IsValid == false && Page_Validators !== 'undefined') {
                for (var i = 0; i < Page_Validators.length; i += 1) {
                    // Validate Aspnet form fields on page load.
                    memberPublic.validateFormField(document.getElementById(Page_Validators[i].controltovalidate));
                }
            }
        }
    };
    /** Get options. */
    memberPublic.getOptions = function () {
        return _opt;
    };
    /** Run alternative of Aspnet function. */
    memberPublic.runValidatorUpdateDisplay = function (eleValidator) {
        if (typeof _fnAspnetValidatorUpdateDisplay === 'function') {
            _fnAspnetValidatorUpdateDisplay(eleValidator);
        }
        memberPublic.validateFormField(document.getElementById(eleValidator.controltovalidate));
    };
    /** Validate form field. */
    memberPublic.validateFormField = function (eleField) {
        var boolIsAllValid = true;
        for (var i = 0; i < eleField.Validators.length; i += 1) {
            if (!eleField.Validators[i].isvalid) {
                boolIsAllValid = false;
                break;
            }
        }
        $(eleField).toggleClass(_optDefaults.strFieldErrorCss, !boolIsAllValid);
    };

    /* Chainability
    //-------------------------------------------------------------------*/

    /** Extend chain library. */
    $.fn[_extensionName] = function (optCustoms) {
        // Merge two options, modifying the first.
        _opt = $.extend({}, _optDefaults, optCustoms);
        // Iterate and return each selected element back to library's chain.
        return this.each(function (_intIndex) {
            /** Init widget. */
            this.init = function () {
                // Do something.
            };

            // Procedural.
            var _eleThis = this;
            _eleThis.init();
        });
    };

})(jQuery);
/*! Copyright (c) 2010 Brandon Aaron (http://brandonaaron.net)
* Dual licensed under the MIT (MIT_LICENSE.txt)
* and GPL Version 2 (GPL_LICENSE.txt) licenses.
*
* Version: 1.1.1
* Requires jQuery 1.3+
* Docs: http://docs.jquery.com/Plugins/livequery
*/

(function ($) {

    $.extend($.fn, {
        livequery: function (type, fn, fn2) {
            var self = this, q;

            // Handle different call patterns
            if ($.isFunction(type))
                fn2 = fn, fn = type, type = undefined;

            // See if Live Query already exists
            $.each($.livequery.queries, function (i, query) {
                if (self.selector == query.selector && self.context == query.context &&
				type == query.type && (!fn || fn.$lqguid == query.fn.$lqguid) && (!fn2 || fn2.$lqguid == query.fn2.$lqguid))
                // Found the query, exit the each loop
                    return (q = query) && false;
            });

            // Create new Live Query if it wasn't found
            q = q || new $.livequery(this.selector, this.context, type, fn, fn2);

            // Make sure it is running
            q.stopped = false;

            // Run it immediately for the first time
            q.run();

            // Contnue the chain
            return this;
        },

        expire: function (type, fn, fn2) {
            var self = this;

            // Handle different call patterns
            if ($.isFunction(type))
                fn2 = fn, fn = type, type = undefined;

            // Find the Live Query based on arguments and stop it
            $.each($.livequery.queries, function (i, query) {
                if (self.selector == query.selector && self.context == query.context &&
				(!type || type == query.type) && (!fn || fn.$lqguid == query.fn.$lqguid) && (!fn2 || fn2.$lqguid == query.fn2.$lqguid) && !this.stopped)
                    $.livequery.stop(query.id);
            });

            // Continue the chain
            return this;
        }
    });

    $.livequery = function (selector, context, type, fn, fn2) {
        this.selector = selector;
        this.context = context;
        this.type = type;
        this.fn = fn;
        this.fn2 = fn2;
        this.elements = [];
        this.stopped = false;

        // The id is the index of the Live Query in $.livequery.queries
        this.id = $.livequery.queries.push(this) - 1;

        // Mark the functions for matching later on
        fn.$lqguid = fn.$lqguid || $.livequery.guid++;
        if (fn2) fn2.$lqguid = fn2.$lqguid || $.livequery.guid++;

        // Return the Live Query
        return this;
    };

    $.livequery.prototype = {
        stop: function () {
            var query = this;

            if (this.type)
            // Unbind all bound events
                this.elements.unbind(this.type, this.fn);
            else if (this.fn2)
            // Call the second function for all matched elements
                this.elements.each(function (i, el) {
                    query.fn2.apply(el);
                });

            // Clear out matched elements
            this.elements = [];

            // Stop the Live Query from running until restarted
            this.stopped = true;
        },

        run: function () {
            // Short-circuit if stopped
            if (this.stopped) return;
            var query = this;

            var oEls = this.elements,
			els = $(this.selector, this.context),
			nEls = els.not(oEls);

            // Set elements to the latest set of matched elements
            this.elements = els;

            if (this.type) {
                // Bind events to newly matched elements
                nEls.bind(this.type, this.fn);

                // Unbind events to elements no longer matched
                if (oEls.length > 0)
                    $.each(oEls, function (i, el) {
                        if ($.inArray(el, els) < 0)
                            $.event.remove(el, query.type, query.fn);
                    });
            }
            else {
                // Call the first function for newly matched elements
                nEls.each(function () {
                    query.fn.apply(this);
                });

                // Call the second function for elements no longer matched
                if (this.fn2 && oEls.length > 0)
                    $.each(oEls, function (i, el) {
                        if ($.inArray(el, els) < 0)
                            query.fn2.apply(el);
                    });
            }
        }
    };

    $.extend($.livequery, {
        guid: 0,
        queries: [],
        queue: [],
        running: false,
        timeout: null,

        checkQueue: function () {
            if ($.livequery.running && $.livequery.queue.length) {
                var length = $.livequery.queue.length;
                // Run each Live Query currently in the queue
                while (length--)
                    $.livequery.queries[$.livequery.queue.shift()].run();
            }
        },

        pause: function () {
            // Don't run anymore Live Queries until restarted
            $.livequery.running = false;
        },

        play: function () {
            // Restart Live Queries
            $.livequery.running = true;
            // Request a run of the Live Queries
            $.livequery.run();
        },

        registerPlugin: function () {
            $.each(arguments, function (i, n) {
                // Short-circuit if the method doesn't exist
                if (!$.fn[n]) return;

                // Save a reference to the original method
                var old = $.fn[n];

                // Create a new method
                $.fn[n] = function () {
                    // Call the original method
                    var r = old.apply(this, arguments);

                    // Request a run of the Live Queries
                    $.livequery.run();

                    // Return the original methods result
                    return r;
                }
            });
        },

        run: function (id) {
            if (id != undefined) {
                // Put the particular Live Query in the queue if it doesn't already exist
                if ($.inArray(id, $.livequery.queue) < 0)
                    $.livequery.queue.push(id);
            }
            else
            // Put each Live Query in the queue if it doesn't already exist
                $.each($.livequery.queries, function (id) {
                    if ($.inArray(id, $.livequery.queue) < 0)
                        $.livequery.queue.push(id);
                });

            // Clear timeout if it already exists
            if ($.livequery.timeout) clearTimeout($.livequery.timeout);
            // Create a timeout to check the queue and actually run the Live Queries
            $.livequery.timeout = setTimeout($.livequery.checkQueue, 20);
        },

        stop: function (id) {
            if (id != undefined)
            // Stop are particular Live Query
                $.livequery.queries[id].stop();
            else
            // Stop all Live Queries
                $.each($.livequery.queries, function (id) {
                    $.livequery.queries[id].stop();
                });
        }
    });

    // Register core DOM manipulation methods
    $.livequery.registerPlugin('append', 'prepend', 'after', 'before', 'wrap', 'attr', 'removeAttr', 'addClass', 'removeClass', 'toggleClass', 'empty', 'remove', 'html');

    // Run Live Queries when the Document is ready
    $(function () { $.livequery.play(); });

})(jQuery);

; (function ($) {
    // set behavior for external links
    $.fn.externalLink = function () {
        this.addClass('external').live('click', function (e) {
            if ($(this).attr('target') != '_self' && window.location.toString().indexOf('secure.seaworldparks.com') == -1) {

                //Send tracking info to Google Analytics if an external link is clicked.          
                var linkHref = $(this).attr('href');
                var newUrl = _trackLinkClick(['External Links', linkHref]);

                return !window.open(newUrl);
            } else {
                window.location = this.href;
            }
        });

        return this;
    }
})(jQuery);

/*
* jPlayer Plugin for jQuery JavaScript Library
* http://www.happyworm.com/jquery/jplayer
*
* Copyright (c) 2009 - 2010 Happyworm Ltd
* Dual licensed under the MIT and GPL licenses.
*  - http://www.opensource.org/licenses/mit-license.php
*  - http://www.gnu.org/copyleft/gpl.html
*
* Author: Mark J Panaghiston
* Version: 2.0.0
* Date: 20th December 2010
*/

(function ($, undefined) {

    // Adapted from jquery.ui.widget.js (1.8.7): $.widget.bridge
    $.fn.jPlayer = function (options) {
        var name = "jPlayer";
        var isMethodCall = typeof options === "string",
			args = Array.prototype.slice.call(arguments, 1),
			returnValue = this;

        // allow multiple hashes to be passed on init
        options = !isMethodCall && args.length ?
			$.extend.apply(null, [true, options].concat(args)) :
			options;

        // prevent calls to internal methods
        if (isMethodCall && options.charAt(0) === "_") {
            return returnValue;
        }

        if (isMethodCall) {
            this.each(function () {
                var instance = $.data(this, name),
					methodValue = instance && $.isFunction(instance[options]) ?
						instance[options].apply(instance, args) :
						instance;
                if (methodValue !== instance && methodValue !== undefined) {
                    returnValue = methodValue;
                    return false;
                }
            });
        } else {
            this.each(function () {
                var instance = $.data(this, name);
                if (instance) {
                    instance.option(options || {})._init(); // Orig jquery.ui.widget.js code: Not recommend for jPlayer. ie., Applying new options to an existing instance (via the jPlayer constructor) and performing the _init(). The _init() is what concerns me. It would leave a lot of event handlers acting on jPlayer instance and the interface.
                    instance.option(options || {}); // The new constructor only changes the options. Changing options only has basic support atm.
                } else {
                    $.data(this, name, new $.jPlayer(options, this));
                }
            });
        }

        return returnValue;
    };

    $.jPlayer = function (options, element) {
        // allow instantiation without initializing for simple inheritance
        if (arguments.length) {
            this.element = $(element);
            this.options = $.extend(true, {},
				this.options,
				options
			);
            var self = this;
            this.element.bind("remove.jPlayer", function () {
                self.destroy();
            });
            this._init();
        }
    };
    // End of: (Adapted from jquery.ui.widget.js (1.8.7))

    $.jPlayer.event = {
        ready: "jPlayer_ready",
        resize: "jPlayer_resize", // Not implemented.
        error: "jPlayer_error", // Event error code in event.jPlayer.error.type. See $.jPlayer.error
        warning: "jPlayer_warning", // Event warning code in event.jPlayer.warning.type. See $.jPlayer.warning

        // Other events match HTML5 spec.
        loadstart: "jPlayer_loadstart",
        progress: "jPlayer_progress",
        suspend: "jPlayer_suspend",
        abort: "jPlayer_abort",
        emptied: "jPlayer_emptied",
        stalled: "jPlayer_stalled",
        play: "jPlayer_play",
        pause: "jPlayer_pause",
        loadedmetadata: "jPlayer_loadedmetadata",
        loadeddata: "jPlayer_loadeddata",
        waiting: "jPlayer_waiting",
        playing: "jPlayer_playing",
        canplay: "jPlayer_canplay",
        canplaythrough: "jPlayer_canplaythrough",
        seeking: "jPlayer_seeking",
        seeked: "jPlayer_seeked",
        timeupdate: "jPlayer_timeupdate",
        ended: "jPlayer_ended",
        ratechange: "jPlayer_ratechange",
        durationchange: "jPlayer_durationchange",
        volumechange: "jPlayer_volumechange"
    };

    $.jPlayer.htmlEvent = [ // These HTML events are bubbled through to the jPlayer event, without any internal action.
		"loadstart",
    // "progress", // jPlayer uses internally before bubbling.
    // "suspend", // jPlayer uses internally before bubbling.
		"abort",
    // "error", // jPlayer uses internally before bubbling.
		"emptied",
		"stalled",
    // "play", // jPlayer uses internally before bubbling.
    // "pause", // jPlayer uses internally before bubbling.
		"loadedmetadata",
		"loadeddata",
    // "waiting", // jPlayer uses internally before bubbling.
    // "playing", // jPlayer uses internally before bubbling.
    // "canplay", // jPlayer fixes the volume (for Chrome) before bubbling.
		"canplaythrough",
    // "seeking", // jPlayer uses internally before bubbling.
    // "seeked", // jPlayer uses internally before bubbling.
    // "timeupdate", // jPlayer uses internally before bubbling.
    // "ended", // jPlayer uses internally before bubbling.
		"ratechange"
    // "durationchange" // jPlayer uses internally before bubbling.
    // "volumechange" // Handled by jPlayer in volume() method, primarily due to the volume fix (for Chrome) in the canplay event. [*] Need to review whether the latest Chrome still needs the fix sometime.
	];

    $.jPlayer.pause = function () {
        // $.each($.jPlayer.instances, function(i, element) {
        $.each($.jPlayer.prototype.instances, function (i, element) {
            if (element.data("jPlayer").status.srcSet) { // Check that media is set otherwise would cause error event.
                element.jPlayer("pause");
            }
        });
    };

    $.jPlayer.timeFormat = {
        showHour: false,
        showMin: true,
        showSec: true,
        padHour: false,
        padMin: true,
        padSec: true,
        sepHour: ":",
        sepMin: ":",
        sepSec: ""
    };

    $.jPlayer.convertTime = function (sec) {
        var myTime = new Date(sec * 1000);
        var hour = myTime.getUTCHours();
        var min = myTime.getUTCMinutes();
        var sec = myTime.getUTCSeconds();
        var strHour = ($.jPlayer.timeFormat.padHour && hour < 10) ? "0" + hour : hour;
        var strMin = ($.jPlayer.timeFormat.padMin && min < 10) ? "0" + min : min;
        var strSec = ($.jPlayer.timeFormat.padSec && sec < 10) ? "0" + sec : sec;
        return (($.jPlayer.timeFormat.showHour) ? strHour + $.jPlayer.timeFormat.sepHour : "") + (($.jPlayer.timeFormat.showMin) ? strMin + $.jPlayer.timeFormat.sepMin : "") + (($.jPlayer.timeFormat.showSec) ? strSec + $.jPlayer.timeFormat.sepSec : "");
    };

    // Adapting jQuery 1.4.4 code for jQuery.browser. Required since jQuery 1.3.2 does not detect Chrome as webkit.
    $.jPlayer.uaMatch = function (ua) {
        var ua = ua.toLowerCase();

        // Useragent RegExp
        var rwebkit = /(webkit)[ \/]([\w.]+)/;
        var ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/;
        var rmsie = /(msie) ([\w.]+)/;
        var rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/;

        var match = rwebkit.exec(ua) ||
			ropera.exec(ua) ||
			rmsie.exec(ua) ||
			ua.indexOf("compatible") < 0 && rmozilla.exec(ua) ||
			[];

        return { browser: match[1] || "", version: match[2] || "0" };
    };

    $.jPlayer.browser = {
};

var browserMatch = $.jPlayer.uaMatch(navigator.userAgent);
if (browserMatch.browser) {
    $.jPlayer.browser[browserMatch.browser] = true;
    $.jPlayer.browser.version = browserMatch.version;
}

$.jPlayer.prototype = {
    count: 0, // Static Variable: Change it via prototype.
    version: { // Static Object
        script: "2.0.0",
        needFlash: "2.0.0",
        flash: "unknown"
    },
    options: { // Instanced in $.jPlayer() constructor
        swfPath: "js", // Path to Jplayer.swf. Can be relative, absolute or server root relative.
        solution: "html, flash", // Valid solutions: html, flash. Order defines priority. 1st is highest,
        supplied: "mp3", // Defines which formats jPlayer will try and support and the priority by the order. 1st is highest,
        preload: 'metadata',  // HTML5 Spec values: none, metadata, auto.
        volume: 0.8, // The volume. Number 0 to 1.
        muted: false,
        backgroundColor: "#000000", // To define the jPlayer div and Flash background color.
        cssSelectorAncestor: "#jp_interface_1",
        cssSelector: {
            videoPlay: ".jp-video-play",
            play: ".jp-play",
            pause: ".jp-pause",
            stop: ".jp-stop",
            seekBar: ".jp-seek-bar",
            playBar: ".jp-play-bar",
            mute: ".jp-mute",
            unmute: ".jp-unmute",
            volumeBar: ".jp-volume-bar",
            volumeBarValue: ".jp-volume-bar-value",
            currentTime: ".jp-current-time",
            duration: ".jp-duration"
        },
        // globalVolume: false, // Not implemented: Set to make volume changes affect all jPlayer instances
        // globalMute: false, // Not implemented: Set to make mute changes affect all jPlayer instances
        idPrefix: "jp", // Prefix for the ids of html elements created by jPlayer. For flash, this must not include characters: . - + * / \
        errorAlerts: false,
        warningAlerts: false
    },
    instances: {}, // Static Object
    status: { // Instanced in _init()
        src: "",
        media: {},
        paused: true,
        format: {},
        formatType: "",
        waitForPlay: true, // Same as waitForLoad except in case where preloading.
        waitForLoad: true,
        srcSet: false,
        video: false, // True if playing a video
        seekPercent: 0,
        currentPercentRelative: 0,
        currentPercentAbsolute: 0,
        currentTime: 0,
        duration: 0
    },
    _status: { // Instanced in _init(): These status values are persistent. ie., Are not affected by a status reset.
        volume: undefined, // Set by constructor option/default.
        muted: false, // Set by constructor option/default.
        width: 0, // Read from CSS
        height: 0 // Read from CSS
    },
    internal: { // Instanced in _init()
        ready: false,
        instance: undefined,
        htmlDlyCmdId: undefined
    },
    solution: { // Static Object: Defines the solutions built in jPlayer.
        html: true,
        flash: true
    },
    // 'MPEG-4 support' : canPlayType('video/mp4; codecs="mp4v.20.8"')
    format: { // Static Object
        mp3: {
            codec: 'audio/mpeg; codecs="mp3"',
            flashCanPlay: true,
            media: 'audio'
        },
        m4a: { // AAC / MP4
            codec: 'audio/mp4; codecs="mp4a.40.2"',
            flashCanPlay: true,
            media: 'audio'
        },
        oga: { // OGG
            codec: 'audio/ogg; codecs="vorbis"',
            flashCanPlay: false,
            media: 'audio'
        },
        wav: { // PCM
            codec: 'audio/wav; codecs="1"',
            flashCanPlay: false,
            media: 'audio'
        },
        webma: { // WEBM
            codec: 'audio/webm; codecs="vorbis"',
            flashCanPlay: false,
            media: 'audio'
        },
        m4v: { // H.264 / MP4
            codec: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
            flashCanPlay: true,
            media: 'video'
        },
        ogv: { // OGG
            codec: 'video/ogg; codecs="theora, vorbis"',
            flashCanPlay: false,
            media: 'video'
        },
        webmv: { // WEBM
            codec: 'video/webm; codecs="vorbis, vp8"',
            flashCanPlay: false,
            media: 'video'
        }
    },
    _init: function () {
        var self = this;

        this.element.empty();

        this.status = $.extend({}, this.status, this._status); // Copy static to unique instance. Adds the status propeties that persist through a reset. NB: Might want to use $.jPlayer.prototype.status instead once options completely implmented and _init() returned to $.fn.jPlayer plugin. 
        this.internal = $.extend({}, this.internal); // Copy static to unique instance.

        this.formats = []; // Array based on supplied string option. Order defines priority.
        this.solutions = []; // Array based on solution string option. Order defines priority.
        this.require = {}; // Which media types are required: video, audio.

        this.htmlElement = {}; // DOM elements created by jPlayer
        this.html = {}; // In _init()'s this.desired code and setmedia(): Accessed via this[solution], where solution from this.solutions array.
        this.html.audio = {};
        this.html.video = {};
        this.flash = {}; // In _init()'s this.desired code and setmedia(): Accessed via this[solution], where solution from this.solutions array.

        this.css = {};
        this.css.cs = {}; // Holds the css selector strings
        this.css.jq = {}; // Holds jQuery selectors. ie., $(css.cs.method)

        this.status.volume = this._limitValue(this.options.volume, 0, 1); // Set volume status from constructor option.
        this.status.muted = this.options.muted; // Set muted status from constructor option.
        this.status.width = this.element.css('width'); // Sets from CSS.
        this.status.height = this.element.css('height'); // Sets from CSS.

        this.element.css({ 'background-color': this.options.backgroundColor });

        // Create the formats array, with prority based on the order of the supplied formats string
        $.each(this.options.supplied.toLowerCase().split(","), function (index1, value1) {
            var format = value1.replace(/^\s+|\s+$/g, ""); //trim
            if (self.format[format]) { // Check format is valid.
                var dupFound = false;
                $.each(self.formats, function (index2, value2) { // Check for duplicates
                    if (format === value2) {
                        dupFound = true;
                        return false;
                    }
                });
                if (!dupFound) {
                    self.formats.push(format);
                }
            }
        });

        // Create the solutions array, with prority based on the order of the solution string
        $.each(this.options.solution.toLowerCase().split(","), function (index1, value1) {
            var solution = value1.replace(/^\s+|\s+$/g, ""); //trim
            if (self.solution[solution]) { // Check solution is valid.
                var dupFound = false;
                $.each(self.solutions, function (index2, value2) { // Check for duplicates
                    if (solution === value2) {
                        dupFound = true;
                        return false;
                    }
                });
                if (!dupFound) {
                    self.solutions.push(solution);
                }
            }
        });

        this.internal.instance = "jp_" + this.count;
        this.instances[this.internal.instance] = this.element;

        // Check the jPlayer div has an id and create one if required. Important for Flash to know the unique id for comms.
        if (this.element.attr("id") === "") {
            this.element.attr("id", this.options.idPrefix + "_jplayer_" + this.count);
        }

        this.internal.self = $.extend({}, {
            id: this.element.attr("id"),
            jq: this.element
        });
        this.internal.audio = $.extend({}, {
            id: this.options.idPrefix + "_audio_" + this.count,
            jq: undefined
        });
        this.internal.video = $.extend({}, {
            id: this.options.idPrefix + "_video_" + this.count,
            jq: undefined
        });
        this.internal.flash = $.extend({}, {
            id: this.options.idPrefix + "_flash_" + this.count,
            jq: undefined,
            swf: this.options.swfPath + ((this.options.swfPath !== "" && this.options.swfPath.slice(-1) !== "/") ? "/" : "") + "Jplayer.swf"
        });
        this.internal.poster = $.extend({}, {
            id: this.options.idPrefix + "_poster_" + this.count,
            jq: undefined
        });

        // Register listeners defined in the constructor
        $.each($.jPlayer.event, function (eventName, eventType) {
            if (self.options[eventName] !== undefined) {
                self.element.bind(eventType + ".jPlayer", self.options[eventName]); // With .jPlayer namespace.
                self.options[eventName] = undefined; // Destroy the handler pointer copy on the options. Reason, events can be added/removed in other ways so this could be obsolete and misleading.
            }
        });

        // Create the poster image.
        this.htmlElement.poster = document.createElement('img');
        this.htmlElement.poster.id = this.internal.poster.id;
        this.htmlElement.poster.onload = function () { // Note that this did not work on Firefox 3.6: poster.addEventListener("onload", function() {}, false); Did not investigate x-browser.
            if (!self.status.video || self.status.waitForPlay) {
                self.internal.poster.jq.show();
            }
        };
        this.element.append(this.htmlElement.poster);
        this.internal.poster.jq = $("#" + this.internal.poster.id);
        this.internal.poster.jq.css({ 'width': this.status.width, 'height': this.status.height });
        this.internal.poster.jq.hide();

        // Determine if we require solutions for audio, video or both media types.
        this.require.audio = false;
        this.require.video = false;
        $.each(this.formats, function (priority, format) {
            self.require[self.format[format].media] = true;
        });

        this.html.audio.available = false;
        if (this.require.audio) { // If a supplied format is audio
            this.htmlElement.audio = document.createElement('audio');
            this.htmlElement.audio.id = this.internal.audio.id;
            this.html.audio.available = !!this.htmlElement.audio.canPlayType;
        }
        this.html.video.available = false;
        if (this.require.video) { // If a supplied format is video
            this.htmlElement.video = document.createElement('video');
            this.htmlElement.video.id = this.internal.video.id;
            this.html.video.available = !!this.htmlElement.video.canPlayType;
        }

        this.flash.available = this._checkForFlash(10); // IE9 forced to false due to ExternalInterface problem.

        this.html.canPlay = {};
        this.flash.canPlay = {};
        $.each(this.formats, function (priority, format) {
            self.html.canPlay[format] = self.html[self.format[format].media].available && "" !== self.htmlElement[self.format[format].media].canPlayType(self.format[format].codec);
            self.flash.canPlay[format] = self.format[format].flashCanPlay && self.flash.available;
        });
        this.html.desired = false;
        this.flash.desired = false;
        $.each(this.solutions, function (solutionPriority, solution) {
            if (solutionPriority === 0) {
                self[solution].desired = true;
            } else {
                var audioCanPlay = false;
                var videoCanPlay = false;
                $.each(self.formats, function (formatPriority, format) {
                    if (self[self.solutions[0]].canPlay[format]) { // The other solution can play
                        if (self.format[format].media === 'video') {
                            videoCanPlay = true;
                        } else {
                            audioCanPlay = true;
                        }
                    }
                });
                self[solution].desired = (self.require.audio && !audioCanPlay) || (self.require.video && !videoCanPlay);
            }
        });
        // This is what jPlayer will support, based on solution and supplied.
        this.html.support = {};
        this.flash.support = {};
        $.each(this.formats, function (priority, format) {
            self.html.support[format] = self.html.canPlay[format] && self.html.desired;
            self.flash.support[format] = self.flash.canPlay[format] && self.flash.desired;
        });
        // If jPlayer is supporting any format in a solution, then the solution is used.
        this.html.used = false;
        this.flash.used = false;
        $.each(this.solutions, function (solutionPriority, solution) {
            $.each(self.formats, function (formatPriority, format) {
                if (self[solution].support[format]) {
                    self[solution].used = true;
                    return false;
                }
            });
        });

        // If neither html nor flash are being used by this browser, then media playback is not possible. Trigger an error event.
        if (!(this.html.used || this.flash.used)) {
            this._error({
                type: $.jPlayer.error.NO_SOLUTION,
                context: "{solution:'" + this.options.solution + "', supplied:'" + this.options.supplied + "'}",
                message: $.jPlayer.errorMsg.NO_SOLUTION,
                hint: $.jPlayer.errorHint.NO_SOLUTION
            });
        }

        // Init solution active state and the event gates to false.
        this.html.active = false;
        this.html.audio.gate = false;
        this.html.video.gate = false;
        this.flash.active = false;
        this.flash.gate = false;

        // Add the flash solution if it is being used.
        if (this.flash.used) {
            var flashVars = 'id=' + escape(this.internal.self.id) + '&vol=' + this.status.volume + '&muted=' + this.status.muted;

            if ($.browser.msie && Number($.browser.version) <= 8) {
                var html_obj = '<object id="' + this.internal.flash.id + '"';
                html_obj += ' classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"';
                html_obj += ' codebase="' + document.URL.substring(0, document.URL.indexOf(':')) + '://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab"'; // Fixed IE non secured element warning.
                html_obj += ' type="application/x-shockwave-flash"';
                html_obj += ' width="0" height="0">';
                html_obj += '</object>';

                var obj_param = [];
                obj_param[0] = '<param name="movie" value="' + this.internal.flash.swf + '" />';
                obj_param[1] = '<param name="quality" value="high" />';
                obj_param[2] = '<param name="FlashVars" value="' + flashVars + '" />';
                obj_param[3] = '<param name="allowScriptAccess" value="always" />';
                obj_param[4] = '<param name="bgcolor" value="' + this.options.backgroundColor + '" />';

                var ie_dom = document.createElement(html_obj);
                for (var i = 0; i < obj_param.length; i++) {
                    ie_dom.appendChild(document.createElement(obj_param[i]));
                }
                this.element.append(ie_dom);
            } else {
                var html_embed = '<embed name="' + this.internal.flash.id + '" id="' + this.internal.flash.id + '" src="' + this.internal.flash.swf + '"';
                html_embed += ' width="0" height="0" bgcolor="' + this.options.backgroundColor + '"';
                html_embed += ' quality="high" FlashVars="' + flashVars + '"';
                html_embed += ' allowScriptAccess="always"';
                html_embed += ' type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" />';
                this.element.append(html_embed);
            }
            this.internal.flash.jq = $("#" + this.internal.flash.id);
            this.internal.flash.jq.css({ 'width': '0px', 'height': '0px' }); // Must do via CSS as setting attr() to zero causes a jQuery error in IE.
        }

        // Add the HTML solution if being used.
        if (this.html.used) {

            // The HTML Audio handlers
            if (this.html.audio.available) {
                this._addHtmlEventListeners(this.htmlElement.audio, this.html.audio);
                this.element.append(this.htmlElement.audio);
                this.internal.audio.jq = $("#" + this.internal.audio.id);
            }

            // The HTML Video handlers
            if (this.html.video.available) {
                this._addHtmlEventListeners(this.htmlElement.video, this.html.video);
                this.element.append(this.htmlElement.video);
                this.internal.video.jq = $("#" + this.internal.video.id);
                this.internal.video.jq.css({ 'width': '0px', 'height': '0px' }); // Using size 0x0 since a .hide() causes issues in iOS
            }
        }

        if (this.html.used && !this.flash.used) { // If only HTML, then emulate flash ready() call after 100ms.
            window.setTimeout(function () {
                self.internal.ready = true;
                self.version.flash = "n/a";
                self._trigger($.jPlayer.event.ready);
            }, 100);
        }

        // Set up the css selectors for the control and feedback entities.
        $.each(this.options.cssSelector, function (fn, cssSel) {
            self._cssSelector(fn, cssSel);
        });

        this._updateInterface();
        this._updateButtons(false);
        this._updateVolume(this.status.volume);
        this._updateMute(this.status.muted);
        if (this.css.jq.videoPlay.length) {
            this.css.jq.videoPlay.hide();
        }
        $.jPlayer.prototype.count++; // Change static variable via prototype.
    },
    destroy: function () {
        // MJP: The background change remains. Review later.

        // Reset the interface, remove seeking effect and times.
        this._resetStatus();
        this._updateInterface();
        this._seeked();
        if (this.css.jq.currentTime.length) {
            this.css.jq.currentTime.text("");
        }
        if (this.css.jq.duration.length) {
            this.css.jq.duration.text("");
        }

        if (this.status.srcSet) { // Or you get a bogus error event
            this.pause(); // Pauses the media and clears any delayed commands used in the HTML solution.
        }
        $.each(this.css.jq, function (fn, jq) { // Remove any bindings from the interface controls.
            jq.unbind(".jPlayer");
        });
        this.element.removeData("jPlayer"); // Remove jPlayer data
        this.element.unbind(".jPlayer"); // Remove all event handlers created by the jPlayer constructor
        this.element.empty(); // Remove the inserted child elements

        this.instances[this.internal.instance] = undefined; // Clear the instance on the static instance object
    },
    enable: function () { // Plan to implement
        // options.disabled = false
    },
    disable: function () { // Plan to implement
        // options.disabled = true
    },
    _addHtmlEventListeners: function (mediaElement, entity) {
        var self = this;
        mediaElement.preload = this.options.preload;
        mediaElement.muted = this.options.muted;

        // Create the event listeners
        // Only want the active entity to affect jPlayer and bubble events.
        // Using entity.gate so that object is referenced and gate property always current

        mediaElement.addEventListener("progress", function () {
            if (entity.gate && !self.status.waitForLoad) {
                self._getHtmlStatus(mediaElement);
                self._updateInterface();
                self._trigger($.jPlayer.event.progress);
            }
        }, false);
        mediaElement.addEventListener("timeupdate", function () {
            if (entity.gate && !self.status.waitForLoad) {
                self._getHtmlStatus(mediaElement);
                self._updateInterface();
                self._trigger($.jPlayer.event.timeupdate);
            }
        }, false);
        mediaElement.addEventListener("durationchange", function () {
            if (entity.gate && !self.status.waitForLoad) {
                self.status.duration = this.duration;
                self._getHtmlStatus(mediaElement);
                self._updateInterface();
                self._trigger($.jPlayer.event.durationchange);
            }
        }, false);
        mediaElement.addEventListener("play", function () {
            if (entity.gate && !self.status.waitForLoad) {
                self._updateButtons(true);
                self._trigger($.jPlayer.event.play);
            }
        }, false);
        mediaElement.addEventListener("playing", function () {
            if (entity.gate && !self.status.waitForLoad) {
                self._updateButtons(true);
                self._seeked();
                self._trigger($.jPlayer.event.playing);
            }
        }, false);
        mediaElement.addEventListener("pause", function () {
            if (entity.gate && !self.status.waitForLoad) {
                self._updateButtons(false);
                self._trigger($.jPlayer.event.pause);
            }
        }, false);
        mediaElement.addEventListener("waiting", function () {
            if (entity.gate && !self.status.waitForLoad) {
                self._seeking();
                self._trigger($.jPlayer.event.waiting);
            }
        }, false);
        mediaElement.addEventListener("canplay", function () {
            if (entity.gate && !self.status.waitForLoad) {
                mediaElement.volume = self._volumeFix(self.status.volume);
                self._trigger($.jPlayer.event.canplay);
            }
        }, false);
        mediaElement.addEventListener("seeking", function () {
            if (entity.gate && !self.status.waitForLoad) {
                self._seeking();
                self._trigger($.jPlayer.event.seeking);
            }
        }, false);
        mediaElement.addEventListener("seeked", function () {
            if (entity.gate && !self.status.waitForLoad) {
                self._seeked();
                self._trigger($.jPlayer.event.seeked);
            }
        }, false);
        mediaElement.addEventListener("suspend", function () { // Seems to be the only way of capturing that the iOS4 browser did not actually play the media from the page code. ie., It needs a user gesture.
            if (entity.gate && !self.status.waitForLoad) {
                self._seeked();
                self._trigger($.jPlayer.event.suspend);
            }
        }, false);
        mediaElement.addEventListener("ended", function () {
            if (entity.gate && !self.status.waitForLoad) {
                // Order of the next few commands are important. Change the time and then pause.
                // Solves a bug in Firefox, where issuing pause 1st causes the media to play from the start. ie., The pause is ignored.
                if (!$.jPlayer.browser.webkit) { // Chrome crashes if you do this in conjunction with a setMedia command in an ended event handler. ie., The playlist demo.
                    self.htmlElement.media.currentTime = 0; // Safari does not care about this command. ie., It works with or without this line. (Both Safari and Chrome are Webkit.)
                }
                self.htmlElement.media.pause(); // Pause otherwise a click on the progress bar will play from that point, when it shouldn't, since it stopped playback.
                self._updateButtons(false);
                self._getHtmlStatus(mediaElement, true); // With override true. Otherwise Chrome leaves progress at full.
                self._updateInterface();
                self._trigger($.jPlayer.event.ended);
            }
        }, false);
        mediaElement.addEventListener("error", function () {
            if (entity.gate && !self.status.waitForLoad) {
                self._updateButtons(false);
                self._seeked();
                if (self.status.srcSet) { // Deals with case of clearMedia() causing an error event.
                    self.status.waitForLoad = true; // Allows the load operation to try again.
                    self.status.waitForPlay = true; // Reset since a play was captured.
                    if (self.status.video) {
                        self.internal.video.jq.css({ 'width': '0px', 'height': '0px' });
                    }
                    if (self._validString(self.status.media.poster)) {
                        self.internal.poster.jq.show();
                    }
                    if (self.css.jq.videoPlay.length) {
                        self.css.jq.videoPlay.show();
                    }
                    self._error({
                        type: $.jPlayer.error.URL,
                        context: self.status.src, // this.src shows absolute urls. Want context to show the url given.
                        message: $.jPlayer.errorMsg.URL,
                        hint: $.jPlayer.errorHint.URL
                    });
                }
            }
        }, false);
        // Create all the other event listeners that bubble up to a jPlayer event from html, without being used by jPlayer.
        $.each($.jPlayer.htmlEvent, function (i, eventType) {
            mediaElement.addEventListener(this, function () {
                if (entity.gate && !self.status.waitForLoad) {
                    self._trigger($.jPlayer.event[eventType]);
                }
            }, false);
        });
    },
    _getHtmlStatus: function (media, override) {
        var ct = 0, d = 0, cpa = 0, sp = 0, cpr = 0;

        ct = media.currentTime;
        cpa = (this.status.duration > 0) ? 100 * ct / this.status.duration : 0;
        if ((typeof media.seekable === "object") && (media.seekable.length > 0)) {
            sp = (this.status.duration > 0) ? 100 * media.seekable.end(media.seekable.length - 1) / this.status.duration : 100;
            cpr = 100 * media.currentTime / media.seekable.end(media.seekable.length - 1);
        } else {
            sp = 100;
            cpr = cpa;
        }

        if (override) {
            ct = 0;
            cpr = 0;
            cpa = 0;
        }

        this.status.seekPercent = sp;
        this.status.currentPercentRelative = cpr;
        this.status.currentPercentAbsolute = cpa;
        this.status.currentTime = ct;
    },
    _resetStatus: function () {
        var self = this;
        this.status = $.extend({}, this.status, $.jPlayer.prototype.status); // Maintains the status properties that persist through a reset. ie., The properties of this._status, contained in the current this.status.

    },
    _trigger: function (eventType, error, warning) { // eventType always valid as called using $.jPlayer.event.eventType
        var event = $.Event(eventType);
        event.jPlayer = {};
        event.jPlayer.version = $.extend({}, this.version);
        event.jPlayer.status = $.extend(true, {}, this.status); // Deep copy
        event.jPlayer.html = $.extend(true, {}, this.html); // Deep copy
        event.jPlayer.flash = $.extend(true, {}, this.flash); // Deep copy
        if (error) event.jPlayer.error = $.extend({}, error);
        if (warning) event.jPlayer.warning = $.extend({}, warning);
        this.element.trigger(event);
    },
    jPlayerFlashEvent: function (eventType, status) { // Called from Flash
        if (eventType === $.jPlayer.event.ready && !this.internal.ready) {
            this.internal.ready = true;
            this.version.flash = status.version;
            if (this.version.needFlash !== this.version.flash) {
                this._error({
                    type: $.jPlayer.error.VERSION,
                    context: this.version.flash,
                    message: $.jPlayer.errorMsg.VERSION + this.version.flash,
                    hint: $.jPlayer.errorHint.VERSION
                });
            }
            this._trigger(eventType);
        }
        if (this.flash.gate) {
            switch (eventType) {
                case $.jPlayer.event.progress:
                    this._getFlashStatus(status);
                    this._updateInterface();
                    this._trigger(eventType);
                    break;
                case $.jPlayer.event.timeupdate:
                    this._getFlashStatus(status);
                    this._updateInterface();
                    this._trigger(eventType);
                    break;
                case $.jPlayer.event.play:
                    this._seeked();
                    this._updateButtons(true);
                    this._trigger(eventType);
                    break;
                case $.jPlayer.event.pause:
                    this._updateButtons(false);
                    this._trigger(eventType);
                    break;
                case $.jPlayer.event.ended:
                    this._updateButtons(false);
                    this._trigger(eventType);
                    break;
                case $.jPlayer.event.error:
                    this.status.waitForLoad = true; // Allows the load operation to try again.
                    this.status.waitForPlay = true; // Reset since a play was captured.
                    if (this.status.video) {
                        this.internal.flash.jq.css({ 'width': '0px', 'height': '0px' });
                    }
                    if (this._validString(this.status.media.poster)) {
                        this.internal.poster.jq.show();
                    }
                    if (this.css.jq.videoPlay.length) {
                        this.css.jq.videoPlay.show();
                    }
                    if (this.status.video) { // Set up for another try. Execute before error event.
                        this._flash_setVideo(this.status.media);
                    } else {
                        this._flash_setAudio(this.status.media);
                    }
                    this._error({
                        type: $.jPlayer.error.URL,
                        context: status.src,
                        message: $.jPlayer.errorMsg.URL,
                        hint: $.jPlayer.errorHint.URL
                    });
                    break;
                case $.jPlayer.event.seeking:
                    this._seeking();
                    this._trigger(eventType);
                    break;
                case $.jPlayer.event.seeked:
                    this._seeked();
                    this._trigger(eventType);
                    break;
                default:
                    this._trigger(eventType);
            }
        }
        return false;
    },
    _getFlashStatus: function (status) {
        this.status.seekPercent = status.seekPercent;
        this.status.currentPercentRelative = status.currentPercentRelative;
        this.status.currentPercentAbsolute = status.currentPercentAbsolute;
        this.status.currentTime = status.currentTime;
        this.status.duration = status.duration;
    },
    _updateButtons: function (playing) {
        this.status.paused = !playing;
        if (this.css.jq.play.length && this.css.jq.pause.length) {
            if (playing) {
                this.css.jq.play.hide();
                this.css.jq.pause.show();
            } else {
                this.css.jq.play.show();
                this.css.jq.pause.hide();
            }
        }
    },
    _updateInterface: function () {
        if (this.css.jq.seekBar.length) {
            this.css.jq.seekBar.width(this.status.seekPercent + "%");
        }
        if (this.css.jq.playBar.length) {
            this.css.jq.playBar.width(this.status.currentPercentRelative + "%");
        }
        if (this.css.jq.currentTime.length) {
            this.css.jq.currentTime.text($.jPlayer.convertTime(this.status.currentTime));
        }
        if (this.css.jq.duration.length) {
            this.css.jq.duration.text($.jPlayer.convertTime(this.status.duration));
        }
    },
    _seeking: function () {
        if (this.css.jq.seekBar.length) {
            this.css.jq.seekBar.addClass("jp-seeking-bg");
        }
    },
    _seeked: function () {
        if (this.css.jq.seekBar.length) {
            this.css.jq.seekBar.removeClass("jp-seeking-bg");
        }
    },
    setMedia: function (media) {

        /*	media[format] = String: URL of format. Must contain all of the supplied option's video or audio formats.
        *	media.poster = String: Video poster URL.
        *	media.subtitles = String: * NOT IMPLEMENTED * URL of subtitles SRT file
        *	media.chapters = String: * NOT IMPLEMENTED * URL of chapters SRT file
        *	media.stream = Boolean: * NOT IMPLEMENTED * Designating actual media streams. ie., "false/undefined" for files. Plan to refresh the flash every so often.
        */

        var self = this;

        this._seeked();
        clearTimeout(this.internal.htmlDlyCmdId); // Clears any delayed commands used in the HTML solution.

        // Store the current html gates, since we need for clearMedia() conditions.
        var audioGate = this.html.audio.gate;
        var videoGate = this.html.video.gate;

        var supported = false;
        $.each(this.formats, function (formatPriority, format) {
            var isVideo = self.format[format].media === 'video';
            $.each(self.solutions, function (solutionPriority, solution) {
                if (self[solution].support[format] && self._validString(media[format])) { // Format supported in solution and url given for format.
                    var isHtml = solution === 'html';

                    if (isVideo) {
                        if (isHtml) {
                            self.html.audio.gate = false;
                            self.html.video.gate = true;
                            self.flash.gate = false;
                        } else {
                            self.html.audio.gate = false;
                            self.html.video.gate = false;
                            self.flash.gate = true;
                        }
                    } else {
                        if (isHtml) {
                            self.html.audio.gate = true;
                            self.html.video.gate = false;
                            self.flash.gate = false;
                        } else {
                            self.html.audio.gate = false;
                            self.html.video.gate = false;
                            self.flash.gate = true;
                        }
                    }

                    // Clear media of the previous solution if:
                    //  - it was Flash
                    //  - changing from HTML to Flash
                    //  - the HTML solution media type (audio or video) remained the same.
                    // Note that, we must be careful with clearMedia() on iPhone, otherwise clearing the video when changing to audio corrupts the built in video player.
                    if (self.flash.active || (self.html.active && self.flash.gate) || (audioGate === self.html.audio.gate && videoGate === self.html.video.gate)) {
                        self.clearMedia();
                    } else if (audioGate !== self.html.audio.gate && videoGate !== self.html.video.gate) { // If switching between html elements
                        self._html_pause();
                        // Hide the video if it was being used.
                        if (self.status.video) {
                            self.internal.video.jq.css({ 'width': '0px', 'height': '0px' });
                        }
                        self._resetStatus(); // Since clearMedia usually does this. Execute after status.video useage.
                    }

                    if (isVideo) {
                        if (isHtml) {
                            self._html_setVideo(media);
                            self.html.active = true;
                            self.flash.active = false;
                        } else {
                            self._flash_setVideo(media);
                            self.html.active = false;
                            self.flash.active = true;
                        }
                        if (self.css.jq.videoPlay.length) {
                            self.css.jq.videoPlay.show();
                        }
                        self.status.video = true;
                    } else {
                        if (isHtml) {
                            self._html_setAudio(media);
                            self.html.active = true;
                            self.flash.active = false;
                        } else {
                            self._flash_setAudio(media);
                            self.html.active = false;
                            self.flash.active = true;
                        }
                        if (self.css.jq.videoPlay.length) {
                            self.css.jq.videoPlay.hide();
                        }
                        self.status.video = false;
                    }

                    supported = true;
                    return false; // Exit $.each
                }
            });
            if (supported) {
                return false; // Exit $.each
            }
        });

        if (supported) {
            // Set poster after the possible clearMedia() command above. IE had issues since the IMG onload event occurred immediately when cached. ie., The clearMedia() hide the poster.
            if (this._validString(media.poster)) {
                if (this.htmlElement.poster.src !== media.poster) { // Since some browsers do not generate img onload event.
                    this.htmlElement.poster.src = media.poster;
                } else {
                    this.internal.poster.jq.show();
                }
            } else {
                this.internal.poster.jq.hide(); // Hide if not used, since clearMedia() does not always occur above. ie., HTML audio <-> video switching.
            }
            this.status.srcSet = true;
            this.status.media = $.extend({}, media);
            this._updateButtons(false);
            this._updateInterface();
        } else { // jPlayer cannot support any formats provided in this browser
            // Pause here if old media could be playing. Otherwise, playing media being changed to bad media would leave the old media playing.
            if (this.status.srcSet && !this.status.waitForPlay) {
                this.pause();
            }
            // Reset all the control flags
            this.html.audio.gate = false;
            this.html.video.gate = false;
            this.flash.gate = false;
            this.html.active = false;
            this.flash.active = false;
            // Reset status and interface.
            this._resetStatus();
            this._updateInterface();
            this._updateButtons(false);
            // Hide the any old media
            this.internal.poster.jq.hide();
            if (this.html.used && this.require.video) {
                this.internal.video.jq.css({ 'width': '0px', 'height': '0px' });
            }
            if (this.flash.used) {
                this.internal.flash.jq.css({ 'width': '0px', 'height': '0px' });
            }
            // Send an error event
            this._error({
                type: $.jPlayer.error.NO_SUPPORT,
                context: "{supplied:'" + this.options.supplied + "'}",
                message: $.jPlayer.errorMsg.NO_SUPPORT,
                hint: $.jPlayer.errorHint.NO_SUPPORT
            });
        }
    },
    clearMedia: function () {
        this._resetStatus();
        this._updateButtons(false);

        this.internal.poster.jq.hide();

        clearTimeout(this.internal.htmlDlyCmdId);

        if (this.html.active) {
            this._html_clearMedia();
        } else if (this.flash.active) {
            this._flash_clearMedia();
        }
    },
    load: function () {
        if (this.status.srcSet) {
            if (this.html.active) {
                this._html_load();
            } else if (this.flash.active) {
                this._flash_load();
            }
        } else {
            this._urlNotSetError("load");
        }
    },
    play: function (time) {
        time = (typeof time === "number") ? time : NaN; // Remove jQuery event from click handler
        if (this.status.srcSet) {
            if (this.html.active) {
                this._html_play(time);
            } else if (this.flash.active) {
                this._flash_play(time);
            }
        } else {
            this._urlNotSetError("play");
        }
    },
    videoPlay: function (e) { // Handles clicks on the play button over the video poster
        this.play();
    },
    pause: function (time) {
        time = (typeof time === "number") ? time : NaN; // Remove jQuery event from click handler
        if (this.status.srcSet) {
            if (this.html.active) {
                this._html_pause(time);
            } else if (this.flash.active) {
                this._flash_pause(time);
            }
        } else {
            this._urlNotSetError("pause");
        }
    },
    pauseOthers: function () {
        var self = this;
        $.each(this.instances, function (i, element) {
            if (self.element !== element) { // Do not this instance.
                if (element.data("jPlayer").status.srcSet) { // Check that media is set otherwise would cause error event.
                    element.jPlayer("pause");
                }
            }
        });
    },
    stop: function () {
        if (this.status.srcSet) {
            if (this.html.active) {
                this._html_pause(0);
            } else if (this.flash.active) {
                this._flash_pause(0);
            }
        } else {
            this._urlNotSetError("stop");
        }
    },
    playHead: function (p) {
        p = this._limitValue(p, 0, 100);
        if (this.status.srcSet) {
            if (this.html.active) {
                this._html_playHead(p);
            } else if (this.flash.active) {
                this._flash_playHead(p);
            }
        } else {
            this._urlNotSetError("playHead");
        }
    },
    mute: function () {
        this.status.muted = true;
        if (this.html.used) {
            this._html_mute(true);
        }
        if (this.flash.used) {
            this._flash_mute(true);
        }
        this._updateMute(true);
        this._updateVolume(0);
        this._trigger($.jPlayer.event.volumechange);
    },
    unmute: function () {
        this.status.muted = false;
        if (this.html.used) {
            this._html_mute(false);
        }
        if (this.flash.used) {
            this._flash_mute(false);
        }
        this._updateMute(false);
        this._updateVolume(this.status.volume);
        this._trigger($.jPlayer.event.volumechange);
    },
    _updateMute: function (mute) {
        if (this.css.jq.mute.length && this.css.jq.unmute.length) {
            if (mute) {
                this.css.jq.mute.hide();
                this.css.jq.unmute.show();
            } else {
                this.css.jq.mute.show();
                this.css.jq.unmute.hide();
            }
        }
    },
    volume: function (v) {
        v = this._limitValue(v, 0, 1);
        this.status.volume = v;

        if (this.html.used) {
            this._html_volume(v);
        }
        if (this.flash.used) {
            this._flash_volume(v);
        }
        if (!this.status.muted) {
            this._updateVolume(v);
        }
        this._trigger($.jPlayer.event.volumechange);
    },
    volumeBar: function (e) { // Handles clicks on the volumeBar
        if (!this.status.muted && this.css.jq.volumeBar) { // Ignore clicks when muted
            var offset = this.css.jq.volumeBar.offset();
            var x = e.pageX - offset.left;
            var w = this.css.jq.volumeBar.width();
            var v = x / w;
            this.volume(v);
        }
    },
    volumeBarValue: function (e) { // Handles clicks on the volumeBarValue
        this.volumeBar(e);
    },
    _updateVolume: function (v) {
        if (this.css.jq.volumeBarValue.length) {
            this.css.jq.volumeBarValue.width((v * 100) + "%");
        }
    },
    _volumeFix: function (v) { // Need to review if this is still necessary on latest Chrome
        var rnd = 0.001 * Math.random(); // Fix for Chrome 4: Fix volume being set multiple times before playing bug.
        var fix = (v < 0.5) ? rnd : -rnd; // Fix for Chrome 4: Solves volume change before play bug. (When new vol == old vol Chrome 4 does nothing!)
        return (v + fix); // Fix for Chrome 4: Event solves initial volume not being set correctly.
    },
    _cssSelectorAncestor: function (ancestor, refresh) {
        this.options.cssSelectorAncestor = ancestor;
        if (refresh) {
            $.each(this.options.cssSelector, function (fn, cssSel) {
                self._cssSelector(fn, cssSel);
            });
        }
    },
    _cssSelector: function (fn, cssSel) {
        var self = this;
        if (typeof cssSel === 'string') {
            if ($.jPlayer.prototype.options.cssSelector[fn]) {
                if (this.css.jq[fn] && this.css.jq[fn].length) {
                    this.css.jq[fn].unbind(".jPlayer");
                }
                this.options.cssSelector[fn] = cssSel;
                this.css.cs[fn] = this.options.cssSelectorAncestor + " " + cssSel;

                if (cssSel) { // Checks for empty string
                    this.css.jq[fn] = $(this.css.cs[fn]);
                } else {
                    this.css.jq[fn] = []; // To comply with the css.jq[fn].length check before its use. As of jQuery 1.4 could have used $() for an empty set. 
                }

                if (this.css.jq[fn].length) {
                    var handler = function (e) {
                        self[fn](e);
                        $(this).blur();
                        return false;
                    }
                    this.css.jq[fn].bind("click.jPlayer", handler); // Using jPlayer namespace
                }

                if (cssSel && this.css.jq[fn].length !== 1) { // So empty strings do not generate the warning. ie., they just remove the old one.
                    this._warning({
                        type: $.jPlayer.warning.CSS_SELECTOR_COUNT,
                        context: this.css.cs[fn],
                        message: $.jPlayer.warningMsg.CSS_SELECTOR_COUNT + this.css.jq[fn].length + " found for " + fn + " method.",
                        hint: $.jPlayer.warningHint.CSS_SELECTOR_COUNT
                    });
                }
            } else {
                this._warning({
                    type: $.jPlayer.warning.CSS_SELECTOR_METHOD,
                    context: fn,
                    message: $.jPlayer.warningMsg.CSS_SELECTOR_METHOD,
                    hint: $.jPlayer.warningHint.CSS_SELECTOR_METHOD
                });
            }
        } else {
            this._warning({
                type: $.jPlayer.warning.CSS_SELECTOR_STRING,
                context: cssSel,
                message: $.jPlayer.warningMsg.CSS_SELECTOR_STRING,
                hint: $.jPlayer.warningHint.CSS_SELECTOR_STRING
            });
        }
    },
    seekBar: function (e) { // Handles clicks on the seekBar
        if (this.css.jq.seekBar) {
            var offset = this.css.jq.seekBar.offset();
            var x = e.pageX - offset.left;
            var w = this.css.jq.seekBar.width();
            var p = 100 * x / w;
            this.playHead(p);
        }
    },
    playBar: function (e) { // Handles clicks on the playBar
        this.seekBar(e);
    },
    currentTime: function (e) { // Handles clicks on the text
        // Added to avoid errors using cssSelector system for the text
    },
    duration: function (e) { // Handles clicks on the text
        // Added to avoid errors using cssSelector system for the text
    },
    // Options code adapted from ui.widget.js (1.8.7).  Made changes so the key can use dot notation. To match previous getData solution in jPlayer 1.
    option: function (key, value) {
        var options = key;

        // Enables use: options().  Returns a copy of options object
        if (arguments.length === 0) {
            return $.extend(true, {}, this.options);
        }

        if (typeof key === "string") {
            var keys = key.split(".");

            // Enables use: options("someOption")  Returns a copy of the option. Supports dot notation.
            if (value === undefined) {

                var opt = $.extend(true, {}, this.options);
                for (var i = 0; i < keys.length; i++) {
                    if (opt[keys[i]] !== undefined) {
                        opt = opt[keys[i]];
                    } else {
                        this._warning({
                            type: $.jPlayer.warning.OPTION_KEY,
                            context: key,
                            message: $.jPlayer.warningMsg.OPTION_KEY,
                            hint: $.jPlayer.warningHint.OPTION_KEY
                        });
                        return undefined;
                    }
                }
                return opt;
            }

            // Enables use: options("someOptionObject", someObject}).  Creates: {someOptionObject:someObject}
            // Enables use: options("someOption", someValue).  Creates: {someOption:someValue}
            // Enables use: options("someOptionObject.someOption", someValue).  Creates: {someOptionObject:{someOption:someValue}}

            options = {};
            var opt = options;

            for (var i = 0; i < keys.length; i++) {
                if (i < keys.length - 1) {
                    opt[keys[i]] = {};
                    opt = opt[keys[i]];
                } else {
                    opt[keys[i]] = value;
                }
            }
        }

        // Otherwise enables use: options(optionObject).  Uses original object (the key)

        this._setOptions(options);

        return this;
    },
    _setOptions: function (options) {
        var self = this;
        $.each(options, function (key, value) { // This supports the 2 level depth that the options of jPlayer has. Would review if we ever need more depth.
            self._setOption(key, value);
        });

        return this;
    },
    _setOption: function (key, value) {
        var self = this;

        // The ability to set options is limited at this time.

        switch (key) {
            case "cssSelectorAncestor":
                this.options[key] = value;
                $.each(self.options.cssSelector, function (fn, cssSel) { // Refresh all associations for new ancestor.
                    self._cssSelector(fn, cssSel);
                });
                break;
            case "cssSelector":
                $.each(value, function (fn, cssSel) {
                    self._cssSelector(fn, cssSel);
                });
                break;
        }

        return this;
    },
    // End of: (Options code adapted from ui.widget.js)

    // The resize() set of functions are not implemented yet.
    // Basically are currently used to allow Flash debugging without too much hassle.
    resize: function (css) {
        // MJP: Want to run some checks on dim {} first.
        if (this.html.active) {
            this._resizeHtml(css);
        }
        if (this.flash.active) {
            this._resizeFlash(css);
        }
        this._trigger($.jPlayer.event.resize);
    },
    _resizePoster: function (css) {
        // Not implemented yet
    },
    _resizeHtml: function (css) {
        // Not implemented yet
    },
    _resizeFlash: function (css) {
        this.internal.flash.jq.css({ 'width': css.width, 'height': css.height });
    },

    _html_initMedia: function () {
        if (this.status.srcSet && !this.status.waitForPlay) {
            this.htmlElement.media.pause();
        }
        if (this.options.preload !== 'none') {
            this._html_load();
        }
        this._trigger($.jPlayer.event.timeupdate); // The flash generates this event for its solution.
    },
    _html_setAudio: function (media) {
        var self = this;
        // Always finds a format due to checks in setMedia()
        $.each(this.formats, function (priority, format) {
            if (self.html.support[format] && media[format]) {
                self.status.src = media[format];
                self.status.format[format] = true;
                self.status.formatType = format;
                return false;
            }
        });
        this.htmlElement.media = this.htmlElement.audio;
        this._html_initMedia();
    },
    _html_setVideo: function (media) {
        var self = this;
        // Always finds a format due to checks in setMedia()
        $.each(this.formats, function (priority, format) {
            if (self.html.support[format] && media[format]) {
                self.status.src = media[format];
                self.status.format[format] = true;
                self.status.formatType = format;
                return false;
            }
        });
        this.htmlElement.media = this.htmlElement.video;
        this._html_initMedia();
    },
    _html_clearMedia: function () {
        if (this.htmlElement.media) {
            if (this.htmlElement.media.id === this.internal.video.id) {
                this.internal.video.jq.css({ 'width': '0px', 'height': '0px' });
            }
            this.htmlElement.media.pause();
            this.htmlElement.media.src = "";

            if (!($.browser.msie && Number($.browser.version) >= 9)) { // IE9 Bug: media.load() on broken src causes an exception. In try/catch IE9 generates the error event too, but it is delayed and corrupts jPlayer's event masking.
                this.htmlElement.media.load(); // Stops an old, "in progress" download from continuing the download. Triggers the loadstart, error and emptied events, due to the empty src. Also an abort event if a download was in progress.
            }
        }
    },
    _html_load: function () {
        if (this.status.waitForLoad) {
            this.status.waitForLoad = false;
            this.htmlElement.media.src = this.status.src;
            try {
                this.htmlElement.media.load(); // IE9 Beta throws an exception here on broken links. Review again later as IE9 Beta matures
            } catch (err) { }
        }
        clearTimeout(this.internal.htmlDlyCmdId);
    },
    _html_play: function (time) {
        var self = this;
        this._html_load(); // Loads if required and clears any delayed commands.

        this.htmlElement.media.play(); // Before currentTime attempt otherwise Firefox 4 Beta never loads.

        if (!isNaN(time)) {
            try {
                this.htmlElement.media.currentTime = time;
            } catch (err) {
                this.internal.htmlDlyCmdId = setTimeout(function () {
                    self.play(time);
                }, 100);
                return; // Cancel execution and wait for the delayed command.
            }
        }
        this._html_checkWaitForPlay();
    },
    _html_pause: function (time) {
        var self = this;

        if (time > 0) { // We do not want the stop() command, which does pause(0), causing a load operation.
            this._html_load(); // Loads if required and clears any delayed commands.
        } else {
            clearTimeout(this.internal.htmlDlyCmdId);
        }

        // Order of these commands is important for Safari (Win) and IE9. Pause then change currentTime.
        this.htmlElement.media.pause();

        if (!isNaN(time)) {
            try {
                this.htmlElement.media.currentTime = time;
            } catch (err) {
                this.internal.htmlDlyCmdId = setTimeout(function () {
                    self.pause(time);
                }, 100);
                return; // Cancel execution and wait for the delayed command.
            }
        }
        if (time > 0) { // Avoids a setMedia() followed by stop() or pause(0) hiding the video play button.
            this._html_checkWaitForPlay();
        }
    },
    _html_playHead: function (percent) {
        var self = this;
        this._html_load(); // Loads if required and clears any delayed commands.
        try {
            if ((typeof this.htmlElement.media.seekable === "object") && (this.htmlElement.media.seekable.length > 0)) {
                this.htmlElement.media.currentTime = percent * this.htmlElement.media.seekable.end(this.htmlElement.media.seekable.length - 1) / 100;
            } else if (this.htmlElement.media.duration > 0 && !isNaN(this.htmlElement.media.duration)) {
                this.htmlElement.media.currentTime = percent * this.htmlElement.media.duration / 100;
            } else {
                throw "e";
            }
        } catch (err) {
            this.internal.htmlDlyCmdId = setTimeout(function () {
                self.playHead(percent);
            }, 100);
            return; // Cancel execution and wait for the delayed command.
        }
        if (!this.status.waitForLoad) {
            this._html_checkWaitForPlay();
        }
    },
    _html_checkWaitForPlay: function () {
        if (this.status.waitForPlay) {
            this.status.waitForPlay = false;
            if (this.css.jq.videoPlay.length) {
                this.css.jq.videoPlay.hide();
            }
            if (this.status.video) {
                this.internal.poster.jq.hide();
                this.internal.video.jq.css({ 'width': this.status.width, 'height': this.status.height });
            }
        }
    },
    _html_volume: function (v) {
        if (this.html.audio.available) {
            this.htmlElement.audio.volume = v;
        }
        if (this.html.video.available) {
            this.htmlElement.video.volume = v;
        }
    },
    _html_mute: function (m) {
        if (this.html.audio.available) {
            this.htmlElement.audio.muted = m;
        }
        if (this.html.video.available) {
            this.htmlElement.video.muted = m;
        }
    },
    _flash_setAudio: function (media) {
        var self = this;
        try {
            // Always finds a format due to checks in setMedia()
            $.each(this.formats, function (priority, format) {
                if (self.flash.support[format] && media[format]) {
                    switch (format) {
                        case "m4a":
                            self._getMovie().fl_setAudio_m4a(media[format]);
                            break;
                        case "mp3":
                            self._getMovie().fl_setAudio_mp3(media[format]);
                            break;
                    }
                    self.status.src = media[format];
                    self.status.format[format] = true;
                    self.status.formatType = format;
                    return false;
                }
            });

            if (this.options.preload === 'auto') {
                this._flash_load();
                this.status.waitForLoad = false;
            }
        } catch (err) { this._flashError(err); }
    },
    _flash_setVideo: function (media) {
        var self = this;
        try {
            // Always finds a format due to checks in setMedia()
            $.each(this.formats, function (priority, format) {
                if (self.flash.support[format] && media[format]) {
                    switch (format) {
                        case "m4v":
                            self._getMovie().fl_setVideo_m4v(media[format]);
                            break;
                    }
                    self.status.src = media[format];
                    self.status.format[format] = true;
                    self.status.formatType = format;
                    return false;
                }
            });

            if (this.options.preload === 'auto') {
                this._flash_load();
                this.status.waitForLoad = false;
            }
        } catch (err) { this._flashError(err); }
    },
    _flash_clearMedia: function () {
        this.internal.flash.jq.css({ 'width': '0px', 'height': '0px' }); // Must do via CSS as setting attr() to zero causes a jQuery error in IE.
        try {
            this._getMovie().fl_clearMedia();
        } catch (err) { this._flashError(err); }
    },
    _flash_load: function () {
        try {
            this._getMovie().fl_load();
        } catch (err) { this._flashError(err); }
        this.status.waitForLoad = false;
    },
    _flash_play: function (time) {
        try {
            this._getMovie().fl_play(time);
        } catch (err) { this._flashError(err); }
        this.status.waitForLoad = false;
        this._flash_checkWaitForPlay();
    },
    _flash_pause: function (time) {
        try {
            this._getMovie().fl_pause(time);
        } catch (err) { this._flashError(err); }
        if (time > 0) { // Avoids a setMedia() followed by stop() or pause(0) hiding the video play button.
            this.status.waitForLoad = false;
            this._flash_checkWaitForPlay();
        }
    },
    _flash_playHead: function (p) {
        try {
            this._getMovie().fl_play_head(p)
        } catch (err) { this._flashError(err); }
        if (!this.status.waitForLoad) {
            this._flash_checkWaitForPlay();
        }
    },
    _flash_checkWaitForPlay: function () {
        if (this.status.waitForPlay) {
            this.status.waitForPlay = false;
            if (this.css.jq.videoPlay.length) {
                this.css.jq.videoPlay.hide();
            }
            if (this.status.video) {
                this.internal.poster.jq.hide();
                this.internal.flash.jq.css({ 'width': this.status.width, 'height': this.status.height });
            }
        }
    },
    _flash_volume: function (v) {
        try {
            this._getMovie().fl_volume(v);
        } catch (err) { this._flashError(err); }
    },
    _flash_mute: function (m) {
        try {
            this._getMovie().fl_mute(m);
        } catch (err) { this._flashError(err); }
    },
    _getMovie: function () {
        return document[this.internal.flash.id];
    },
    _checkForFlash: function (version) {
        // Function checkForFlash adapted from FlashReplace by Robert Nyman
        // http://code.google.com/p/flashreplace/
        var flashIsInstalled = false;
        var flash;
        if (window.ActiveXObject) {
            try {
                flash = new ActiveXObject(("ShockwaveFlash.ShockwaveFlash." + version));
                flashIsInstalled = true;
            }
            catch (e) {
                // Throws an error if the version isn't available			
            }
        }
        else if (navigator.plugins && navigator.mimeTypes.length > 0) {
            flash = navigator.plugins["Shockwave Flash"];
            if (flash) {
                var flashVersion = navigator.plugins["Shockwave Flash"].description.replace(/.*\s(\d+\.\d+).*/, "$1");
                if (flashVersion >= version) {
                    flashIsInstalled = true;
                }
            }
        }
        if ($.browser.msie && Number($.browser.version) >= 9) { // IE9 does not work with external interface. With dynamic Flash insertion like jPlayer uses.
            return false;
        } else {
            return flashIsInstalled;
        }
    },
    _validString: function (url) {
        return (url && typeof url === "string"); // Empty strings return false
    },
    _limitValue: function (value, min, max) {
        return (value < min) ? min : ((value > max) ? max : value);
    },
    _urlNotSetError: function (context) {
        this._error({
            type: $.jPlayer.error.URL_NOT_SET,
            context: context,
            message: $.jPlayer.errorMsg.URL_NOT_SET,
            hint: $.jPlayer.errorHint.URL_NOT_SET
        });
    },
    _flashError: function (error) {
        this._error({
            type: $.jPlayer.error.FLASH,
            context: this.internal.flash.swf,
            message: $.jPlayer.errorMsg.FLASH + error.message,
            hint: $.jPlayer.errorHint.FLASH
        });
    },
    _error: function (error) {
        this._trigger($.jPlayer.event.error, error);
        if (this.options.errorAlerts) {
            this._alert("Error!" + (error.message ? "\n\n" + error.message : "") + (error.hint ? "\n\n" + error.hint : "") + "\n\nContext: " + error.context);
        }
    },
    _warning: function (warning) {
        this._trigger($.jPlayer.event.warning, undefined, warning);
        if (this.options.errorAlerts) {
            this._alert("Warning!" + (warning.message ? "\n\n" + warning.message : "") + (warning.hint ? "\n\n" + warning.hint : "") + "\n\nContext: " + warning.context);
        }
    },
    _alert: function (message) {
        alert("jPlayer " + this.version.script + " : id='" + this.internal.self.id + "' : " + message);
    }
};

$.jPlayer.error = {
    FLASH: "e_flash",
    NO_SOLUTION: "e_no_solution",
    NO_SUPPORT: "e_no_support",
    URL: "e_url",
    URL_NOT_SET: "e_url_not_set",
    VERSION: "e_version"
};

$.jPlayer.errorMsg = {
    FLASH: "jPlayer's Flash fallback is not configured correctly, or a command was issued before the jPlayer Ready event. Details: ", // Used in: _flashError()
    NO_SOLUTION: "No solution can be found by jPlayer in this browser. Neither HTML nor Flash can be used.", // Used in: _init()
    NO_SUPPORT: "It is not possible to play any media format provided in setMedia() on this browser using your current options.", // Used in: setMedia()
    URL: "Media URL could not be loaded.", // Used in: jPlayerFlashEvent() and _addHtmlEventListeners()
    URL_NOT_SET: "Attempt to issue media playback commands, while no media url is set.", // Used in: load(), play(), pause(), stop() and playHead()
    VERSION: "jPlayer " + $.jPlayer.prototype.version.script + " needs Jplayer.swf version " + $.jPlayer.prototype.version.needFlash + " but found " // Used in: jPlayerReady()
};

$.jPlayer.errorHint = {
    FLASH: "Check your swfPath option and that Jplayer.swf is there.",
    NO_SOLUTION: "Review the jPlayer options: support and supplied.",
    NO_SUPPORT: "Video or audio formats defined in the supplied option are missing.",
    URL: "Check media URL is valid.",
    URL_NOT_SET: "Use setMedia() to set the media URL.",
    VERSION: "Update jPlayer files."
};

$.jPlayer.warning = {
    CSS_SELECTOR_COUNT: "e_css_selector_count",
    CSS_SELECTOR_METHOD: "e_css_selector_method",
    CSS_SELECTOR_STRING: "e_css_selector_string",
    OPTION_KEY: "e_option_key"
};

$.jPlayer.warningMsg = {
    CSS_SELECTOR_COUNT: "The number of methodCssSelectors found did not equal one: ",
    CSS_SELECTOR_METHOD: "The methodName given in jPlayer('cssSelector') is not a valid jPlayer method.",
    CSS_SELECTOR_STRING: "The methodCssSelector given in jPlayer('cssSelector') is not a String or is empty.",
    OPTION_KEY: "The option requested in jPlayer('option') is undefined."
};

$.jPlayer.warningHint = {
    CSS_SELECTOR_COUNT: "Check your css selector and the ancestor.",
    CSS_SELECTOR_METHOD: "Check your method name.",
    CSS_SELECTOR_STRING: "Check your css selector is a string.",
    OPTION_KEY: "Check your option name."
};
})(jQuery);

/*
* jQuery Cycle Plugin (core engine only)
* Examples and documentation at: http://jquery.malsup.com/cycle/
* Copyright (c) 2007-2010 M. Alsup
* Version: 2.99 (12-MAR-2011)
* Dual licensed under the MIT and GPL licenses.
* http://jquery.malsup.com/license.html
* Requires: jQuery v1.3.2 or later
*/
(function ($) { var ver = "2.99"; if ($.support == undefined) { $.support = { opacity: !($.browser.msie) }; } function debug(s) { $.fn.cycle.debug && log(s); } function log() { window.console && console.log && console.log("[cycle] " + Array.prototype.join.call(arguments, " ")); } $.expr[":"].paused = function (el) { return el.cyclePause; }; $.fn.cycle = function (options, arg2) { var o = { s: this.selector, c: this.context }; if (this.length === 0 && options != "stop") { if (!$.isReady && o.s) { log("DOM not ready, queuing slideshow"); $(function () { $(o.s, o.c).cycle(options, arg2); }); return this; } log("terminating; zero elements found by selector" + ($.isReady ? "" : " (DOM not ready)")); return this; } return this.each(function () { var opts = handleArguments(this, options, arg2); if (opts === false) { return; } opts.updateActivePagerLink = opts.updateActivePagerLink || $.fn.cycle.updateActivePagerLink; if (this.cycleTimeout) { clearTimeout(this.cycleTimeout); } this.cycleTimeout = this.cyclePause = 0; var $cont = $(this); var $slides = opts.slideExpr ? $(opts.slideExpr, this) : $cont.children(); var els = $slides.get(); if (els.length < 2) { log("terminating; too few slides: " + els.length); return; } var opts2 = buildOptions($cont, $slides, els, opts, o); if (opts2 === false) { return; } var startTime = opts2.continuous ? 10 : getTimeout(els[opts2.currSlide], els[opts2.nextSlide], opts2, !opts2.backwards); if (startTime) { startTime += (opts2.delay || 0); if (startTime < 10) { startTime = 10; } debug("first timeout: " + startTime); this.cycleTimeout = setTimeout(function () { go(els, opts2, 0, !opts.backwards); }, startTime); } }); }; function handleArguments(cont, options, arg2) { if (cont.cycleStop == undefined) { cont.cycleStop = 0; } if (options === undefined || options === null) { options = {}; } if (options.constructor == String) { switch (options) { case "destroy": case "stop": var opts = $(cont).data("cycle.opts"); if (!opts) { return false; } cont.cycleStop++; if (cont.cycleTimeout) { clearTimeout(cont.cycleTimeout); } cont.cycleTimeout = 0; $(cont).removeData("cycle.opts"); if (options == "destroy") { destroy(opts); } return false; case "toggle": cont.cyclePause = (cont.cyclePause === 1) ? 0 : 1; checkInstantResume(cont.cyclePause, arg2, cont); return false; case "pause": cont.cyclePause = 1; return false; case "resume": cont.cyclePause = 0; checkInstantResume(false, arg2, cont); return false; case "prev": case "next": var opts = $(cont).data("cycle.opts"); if (!opts) { log('options not found, "prev/next" ignored'); return false; } $.fn.cycle[options](opts); return false; default: options = { fx: options }; } return options; } else { if (options.constructor == Number) { var num = options; options = $(cont).data("cycle.opts"); if (!options) { log("options not found, can not advance slide"); return false; } if (num < 0 || num >= options.elements.length) { log("invalid slide index: " + num); return false; } options.nextSlide = num; if (cont.cycleTimeout) { clearTimeout(cont.cycleTimeout); cont.cycleTimeout = 0; } if (typeof arg2 == "string") { options.oneTimeFx = arg2; } go(options.elements, options, 1, num >= options.currSlide); return false; } } return options; function checkInstantResume(isPaused, arg2, cont) { if (!isPaused && arg2 === true) { var options = $(cont).data("cycle.opts"); if (!options) { log("options not found, can not resume"); return false; } if (cont.cycleTimeout) { clearTimeout(cont.cycleTimeout); cont.cycleTimeout = 0; } go(options.elements, options, 1, !options.backwards); } } } function removeFilter(el, opts) { if (!$.support.opacity && opts.cleartype && el.style.filter) { try { el.style.removeAttribute("filter"); } catch (smother) { } } } function destroy(opts) { if (opts.next) { $(opts.next).unbind(opts.prevNextEvent); } if (opts.prev) { $(opts.prev).unbind(opts.prevNextEvent); } if (opts.pager || opts.pagerAnchorBuilder) { $.each(opts.pagerAnchors || [], function () { this.unbind().remove(); }); } opts.pagerAnchors = null; if (opts.destroy) { opts.destroy(opts); } } function buildOptions($cont, $slides, els, options, o) { var opts = $.extend({}, $.fn.cycle.defaults, options || {}, $.metadata ? $cont.metadata() : $.meta ? $cont.data() : {}); if (opts.autostop) { opts.countdown = opts.autostopCount || els.length; } var cont = $cont[0]; $cont.data("cycle.opts", opts); opts.$cont = $cont; opts.stopCount = cont.cycleStop; opts.elements = els; opts.before = opts.before ? [opts.before] : []; opts.after = opts.after ? [opts.after] : []; if (!$.support.opacity && opts.cleartype) { opts.after.push(function () { removeFilter(this, opts); }); } if (opts.continuous) { opts.after.push(function () { go(els, opts, 0, !opts.backwards); }); } saveOriginalOpts(opts); if (!$.support.opacity && opts.cleartype && !opts.cleartypeNoBg) { clearTypeFix($slides); } if ($cont.css("position") == "static") { $cont.css("position", "relative"); } if (opts.width) { $cont.width(opts.width); } if (opts.height && opts.height != "auto") { $cont.height(opts.height); } if (opts.startingSlide) { opts.startingSlide = parseInt(opts.startingSlide); } else { if (opts.backwards) { opts.startingSlide = els.length - 1; } } if (opts.random) { opts.randomMap = []; for (var i = 0; i < els.length; i++) { opts.randomMap.push(i); } opts.randomMap.sort(function (a, b) { return Math.random() - 0.5; }); opts.randomIndex = 1; opts.startingSlide = opts.randomMap[1]; } else { if (opts.startingSlide >= els.length) { opts.startingSlide = 0; } } opts.currSlide = opts.startingSlide || 0; var first = opts.startingSlide; $slides.css({ position: "absolute", top: 0, left: 0 }).hide().each(function (i) { var z; if (opts.backwards) { z = first ? i <= first ? els.length + (i - first) : first - i : els.length - i; } else { z = first ? i >= first ? els.length - (i - first) : first - i : els.length - i; } $(this).css("z-index", z); }); $(els[first]).css("opacity", 1).show(); removeFilter(els[first], opts); if (opts.fit && opts.width) { $slides.width(opts.width); } if (opts.fit && opts.height && opts.height != "auto") { $slides.height(opts.height); } var reshape = opts.containerResize && !$cont.innerHeight(); if (reshape) { var maxw = 0, maxh = 0; for (var j = 0; j < els.length; j++) { var $e = $(els[j]), e = $e[0], w = $e.outerWidth(), h = $e.outerHeight(); if (!w) { w = e.offsetWidth || e.width || $e.attr("width"); } if (!h) { h = e.offsetHeight || e.height || $e.attr("height"); } maxw = w > maxw ? w : maxw; maxh = h > maxh ? h : maxh; } if (maxw > 0 && maxh > 0) { $cont.css({ width: maxw + "px", height: maxh + "px" }); } } if (opts.pause) { $cont.hover(function () { this.cyclePause++; }, function () { this.cyclePause--; }); } if (supportMultiTransitions(opts) === false) { return false; } var requeue = false; options.requeueAttempts = options.requeueAttempts || 0; $slides.each(function () { var $el = $(this); this.cycleH = (opts.fit && opts.height) ? opts.height : ($el.height() || this.offsetHeight || this.height || $el.attr("height") || 0); this.cycleW = (opts.fit && opts.width) ? opts.width : ($el.width() || this.offsetWidth || this.width || $el.attr("width") || 0); if ($el.is("img")) { var loadingIE = ($.browser.msie && this.cycleW == 28 && this.cycleH == 30 && !this.complete); var loadingFF = ($.browser.mozilla && this.cycleW == 34 && this.cycleH == 19 && !this.complete); var loadingOp = ($.browser.opera && ((this.cycleW == 42 && this.cycleH == 19) || (this.cycleW == 37 && this.cycleH == 17)) && !this.complete); var loadingOther = (this.cycleH == 0 && this.cycleW == 0 && !this.complete); if (loadingIE || loadingFF || loadingOp || loadingOther) { if (o.s && opts.requeueOnImageNotLoaded && ++options.requeueAttempts < 100) { log(options.requeueAttempts, " - img slide not loaded, requeuing slideshow: ", this.src, this.cycleW, this.cycleH); setTimeout(function () { $(o.s, o.c).cycle(options); }, opts.requeueTimeout); requeue = true; return false; } else { log("could not determine size of image: " + this.src, this.cycleW, this.cycleH); } } } return true; }); if (requeue) { return false; } opts.cssBefore = opts.cssBefore || {}; opts.cssAfter = opts.cssAfter || {}; opts.cssFirst = opts.cssFirst || {}; opts.animIn = opts.animIn || {}; opts.animOut = opts.animOut || {}; $slides.not(":eq(" + first + ")").css(opts.cssBefore); $($slides[first]).css(opts.cssFirst); if (opts.timeout) { opts.timeout = parseInt(opts.timeout); if (opts.speed.constructor == String) { opts.speed = $.fx.speeds[opts.speed] || parseInt(opts.speed); } if (!opts.sync) { opts.speed = opts.speed / 2; } var buffer = opts.fx == "none" ? 0 : opts.fx == "shuffle" ? 500 : 250; while ((opts.timeout - opts.speed) < buffer) { opts.timeout += opts.speed; } } if (opts.easing) { opts.easeIn = opts.easeOut = opts.easing; } if (!opts.speedIn) { opts.speedIn = opts.speed; } if (!opts.speedOut) { opts.speedOut = opts.speed; } opts.slideCount = els.length; opts.currSlide = opts.lastSlide = first; if (opts.random) { if (++opts.randomIndex == els.length) { opts.randomIndex = 0; } opts.nextSlide = opts.randomMap[opts.randomIndex]; } else { if (opts.backwards) { opts.nextSlide = opts.startingSlide == 0 ? (els.length - 1) : opts.startingSlide - 1; } else { opts.nextSlide = opts.startingSlide >= (els.length - 1) ? 0 : opts.startingSlide + 1; } } if (!opts.multiFx) { var init = $.fn.cycle.transitions[opts.fx]; if ($.isFunction(init)) { init($cont, $slides, opts); } else { if (opts.fx != "custom" && !opts.multiFx) { log("unknown transition: " + opts.fx, "; slideshow terminating"); return false; } } } var e0 = $slides[first]; if (opts.before.length) { opts.before[0].apply(e0, [e0, e0, opts, true]); } if (opts.after.length) { opts.after[0].apply(e0, [e0, e0, opts, true]); } if (opts.next) { $(opts.next).bind(opts.prevNextEvent, function () { return advance(opts, 1); }); } if (opts.prev) { $(opts.prev).bind(opts.prevNextEvent, function () { return advance(opts, 0); }); } if (opts.pager || opts.pagerAnchorBuilder) { buildPager(els, opts); } exposeAddSlide(opts, els); return opts; } function saveOriginalOpts(opts) { opts.original = { before: [], after: [] }; opts.original.cssBefore = $.extend({}, opts.cssBefore); opts.original.cssAfter = $.extend({}, opts.cssAfter); opts.original.animIn = $.extend({}, opts.animIn); opts.original.animOut = $.extend({}, opts.animOut); $.each(opts.before, function () { opts.original.before.push(this); }); $.each(opts.after, function () { opts.original.after.push(this); }); } function supportMultiTransitions(opts) { var i, tx, txs = $.fn.cycle.transitions; if (opts.fx.indexOf(",") > 0) { opts.multiFx = true; opts.fxs = opts.fx.replace(/\s*/g, "").split(","); for (i = 0; i < opts.fxs.length; i++) { var fx = opts.fxs[i]; tx = txs[fx]; if (!tx || !txs.hasOwnProperty(fx) || !$.isFunction(tx)) { log("discarding unknown transition: ", fx); opts.fxs.splice(i, 1); i--; } } if (!opts.fxs.length) { log("No valid transitions named; slideshow terminating."); return false; } } else { if (opts.fx == "all") { opts.multiFx = true; opts.fxs = []; for (p in txs) { tx = txs[p]; if (txs.hasOwnProperty(p) && $.isFunction(tx)) { opts.fxs.push(p); } } } } if (opts.multiFx && opts.randomizeEffects) { var r1 = Math.floor(Math.random() * 20) + 30; for (i = 0; i < r1; i++) { var r2 = Math.floor(Math.random() * opts.fxs.length); opts.fxs.push(opts.fxs.splice(r2, 1)[0]); } debug("randomized fx sequence: ", opts.fxs); } return true; } function exposeAddSlide(opts, els) { opts.addSlide = function (newSlide, prepend) { var $s = $(newSlide), s = $s[0]; if (!opts.autostopCount) { opts.countdown++; } els[prepend ? "unshift" : "push"](s); if (opts.els) { opts.els[prepend ? "unshift" : "push"](s); } opts.slideCount = els.length; $s.css("position", "absolute"); $s[prepend ? "prependTo" : "appendTo"](opts.$cont); if (prepend) { opts.currSlide++; opts.nextSlide++; } if (!$.support.opacity && opts.cleartype && !opts.cleartypeNoBg) { clearTypeFix($s); } if (opts.fit && opts.width) { $s.width(opts.width); } if (opts.fit && opts.height && opts.height != "auto") { $s.height(opts.height); } s.cycleH = (opts.fit && opts.height) ? opts.height : $s.height(); s.cycleW = (opts.fit && opts.width) ? opts.width : $s.width(); $s.css(opts.cssBefore); if (opts.pager || opts.pagerAnchorBuilder) { $.fn.cycle.createPagerAnchor(els.length - 1, s, $(opts.pager), els, opts); } if ($.isFunction(opts.onAddSlide)) { opts.onAddSlide($s); } else { $s.hide(); } }; } $.fn.cycle.resetState = function (opts, fx) { fx = fx || opts.fx; opts.before = []; opts.after = []; opts.cssBefore = $.extend({}, opts.original.cssBefore); opts.cssAfter = $.extend({}, opts.original.cssAfter); opts.animIn = $.extend({}, opts.original.animIn); opts.animOut = $.extend({}, opts.original.animOut); opts.fxFn = null; $.each(opts.original.before, function () { opts.before.push(this); }); $.each(opts.original.after, function () { opts.after.push(this); }); var init = $.fn.cycle.transitions[fx]; if ($.isFunction(init)) { init(opts.$cont, $(opts.elements), opts); } }; function go(els, opts, manual, fwd) { if (manual && opts.busy && opts.manualTrump) { debug("manualTrump in go(), stopping active transition"); $(els).stop(true, true); opts.busy = 0; } if (opts.busy) { debug("transition active, ignoring new tx request"); return; } var p = opts.$cont[0], curr = els[opts.currSlide], next = els[opts.nextSlide]; if (p.cycleStop != opts.stopCount || p.cycleTimeout === 0 && !manual) { return; } if (!manual && !p.cyclePause && !opts.bounce && ((opts.autostop && (--opts.countdown <= 0)) || (opts.nowrap && !opts.random && opts.nextSlide < opts.currSlide))) { if (opts.end) { opts.end(opts); } return; } var changed = false; if ((manual || !p.cyclePause) && (opts.nextSlide != opts.currSlide)) { changed = true; var fx = opts.fx; curr.cycleH = curr.cycleH || $(curr).height(); curr.cycleW = curr.cycleW || $(curr).width(); next.cycleH = next.cycleH || $(next).height(); next.cycleW = next.cycleW || $(next).width(); if (opts.multiFx) { if (opts.lastFx == undefined || ++opts.lastFx >= opts.fxs.length) { opts.lastFx = 0; } fx = opts.fxs[opts.lastFx]; opts.currFx = fx; } if (opts.oneTimeFx) { fx = opts.oneTimeFx; opts.oneTimeFx = null; } $.fn.cycle.resetState(opts, fx); if (opts.before.length) { $.each(opts.before, function (i, o) { if (p.cycleStop != opts.stopCount) { return; } o.apply(next, [curr, next, opts, fwd]); }); } var after = function () { opts.busy = 0; $.each(opts.after, function (i, o) { if (p.cycleStop != opts.stopCount) { return; } o.apply(next, [curr, next, opts, fwd]); }); }; debug("tx firing(" + fx + "); currSlide: " + opts.currSlide + "; nextSlide: " + opts.nextSlide); opts.busy = 1; if (opts.fxFn) { opts.fxFn(curr, next, opts, after, fwd, manual && opts.fastOnEvent); } else { if ($.isFunction($.fn.cycle[opts.fx])) { $.fn.cycle[opts.fx](curr, next, opts, after, fwd, manual && opts.fastOnEvent); } else { $.fn.cycle.custom(curr, next, opts, after, fwd, manual && opts.fastOnEvent); } } } if (changed || opts.nextSlide == opts.currSlide) { opts.lastSlide = opts.currSlide; if (opts.random) { opts.currSlide = opts.nextSlide; if (++opts.randomIndex == els.length) { opts.randomIndex = 0; } opts.nextSlide = opts.randomMap[opts.randomIndex]; if (opts.nextSlide == opts.currSlide) { opts.nextSlide = (opts.currSlide == opts.slideCount - 1) ? 0 : opts.currSlide + 1; } } else { if (opts.backwards) { var roll = (opts.nextSlide - 1) < 0; if (roll && opts.bounce) { opts.backwards = !opts.backwards; opts.nextSlide = 1; opts.currSlide = 0; } else { opts.nextSlide = roll ? (els.length - 1) : opts.nextSlide - 1; opts.currSlide = roll ? 0 : opts.nextSlide + 1; } } else { var roll = (opts.nextSlide + 1) == els.length; if (roll && opts.bounce) { opts.backwards = !opts.backwards; opts.nextSlide = els.length - 2; opts.currSlide = els.length - 1; } else { opts.nextSlide = roll ? 0 : opts.nextSlide + 1; opts.currSlide = roll ? els.length - 1 : opts.nextSlide - 1; } } } } if (changed && opts.pager) { opts.updateActivePagerLink(opts.pager, opts.currSlide, opts.activePagerClass); } var ms = 0; if (opts.timeout && !opts.continuous) { ms = getTimeout(els[opts.currSlide], els[opts.nextSlide], opts, fwd); } else { if (opts.continuous && p.cyclePause) { ms = 10; } } if (ms > 0) { p.cycleTimeout = setTimeout(function () { go(els, opts, 0, !opts.backwards); }, ms); } } $.fn.cycle.updateActivePagerLink = function (pager, currSlide, clsName) { $(pager).each(function () { $(this).children().removeClass(clsName).eq(currSlide).addClass(clsName); }); }; function getTimeout(curr, next, opts, fwd) { if (opts.timeoutFn) { var t = opts.timeoutFn.call(curr, curr, next, opts, fwd); while (opts.fx != "none" && (t - opts.speed) < 250) { t += opts.speed; } debug("calculated timeout: " + t + "; speed: " + opts.speed); if (t !== false) { return t; } } return opts.timeout; } $.fn.cycle.next = function (opts) { advance(opts, 1); }; $.fn.cycle.prev = function (opts) { advance(opts, 0); }; function advance(opts, moveForward) { var val = moveForward ? 1 : -1; var els = opts.elements; var p = opts.$cont[0], timeout = p.cycleTimeout; if (timeout) { clearTimeout(timeout); p.cycleTimeout = 0; } if (opts.random && val < 0) { opts.randomIndex--; if (--opts.randomIndex == -2) { opts.randomIndex = els.length - 2; } else { if (opts.randomIndex == -1) { opts.randomIndex = els.length - 1; } } opts.nextSlide = opts.randomMap[opts.randomIndex]; } else { if (opts.random) { opts.nextSlide = opts.randomMap[opts.randomIndex]; } else { opts.nextSlide = opts.currSlide + val; if (opts.nextSlide < 0) { if (opts.nowrap) { return false; } opts.nextSlide = els.length - 1; } else { if (opts.nextSlide >= els.length) { if (opts.nowrap) { return false; } opts.nextSlide = 0; } } } } var cb = opts.onPrevNextEvent || opts.prevNextClick; if ($.isFunction(cb)) { cb(val > 0, opts.nextSlide, els[opts.nextSlide]); } go(els, opts, 1, moveForward); return false; } function buildPager(els, opts) { var $p = $(opts.pager); $.each(els, function (i, o) { $.fn.cycle.createPagerAnchor(i, o, $p, els, opts); }); opts.updateActivePagerLink(opts.pager, opts.startingSlide, opts.activePagerClass); } $.fn.cycle.createPagerAnchor = function (i, el, $p, els, opts) { var a; if ($.isFunction(opts.pagerAnchorBuilder)) { a = opts.pagerAnchorBuilder(i, el); debug("pagerAnchorBuilder(" + i + ", el) returned: " + a); } else { a = '<a href="#">' + (i + 1) + "</a>"; } if (!a) { return; } var $a = $(a); if ($a.parents("body").length === 0) { var arr = []; if ($p.length > 1) { $p.each(function () { var $clone = $a.clone(true); $(this).append($clone); arr.push($clone[0]); }); $a = $(arr); } else { $a.appendTo($p); } } opts.pagerAnchors = opts.pagerAnchors || []; opts.pagerAnchors.push($a); $a.bind(opts.pagerEvent, function (e) { e.preventDefault(); opts.nextSlide = i; var p = opts.$cont[0], timeout = p.cycleTimeout; if (timeout) { clearTimeout(timeout); p.cycleTimeout = 0; } var cb = opts.onPagerEvent || opts.pagerClick; if ($.isFunction(cb)) { cb(opts.nextSlide, els[opts.nextSlide]); } go(els, opts, 1, opts.currSlide < i); }); if (!/^click/.test(opts.pagerEvent) && !opts.allowPagerClickBubble) { $a.bind("click.cycle", function () { return false; }); } if (opts.pauseOnPagerHover) { $a.hover(function () { opts.$cont[0].cyclePause++; }, function () { opts.$cont[0].cyclePause--; }); } }; $.fn.cycle.hopsFromLast = function (opts, fwd) { var hops, l = opts.lastSlide, c = opts.currSlide; if (fwd) { hops = c > l ? c - l : opts.slideCount - l; } else { hops = c < l ? l - c : l + opts.slideCount - c; } return hops; }; function clearTypeFix($slides) { debug("applying clearType background-color hack"); function hex(s) { s = parseInt(s).toString(16); return s.length < 2 ? "0" + s : s; } function getBg(e) { for (; e && e.nodeName.toLowerCase() != "html"; e = e.parentNode) { var v = $.css(e, "background-color"); if (v && v.indexOf("rgb") >= 0) { var rgb = v.match(/\d+/g); return "#" + hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]); } if (v && v != "transparent") { return v; } } return "#ffffff"; } $slides.each(function () { $(this).css("background-color", getBg(this)); }); } $.fn.cycle.commonReset = function (curr, next, opts, w, h, rev) { $(opts.elements).not(curr).hide(); if (typeof opts.cssBefore.opacity == "undefined") { opts.cssBefore.opacity = 1; } opts.cssBefore.display = "block"; if (opts.slideResize && w !== false && next.cycleW > 0) { opts.cssBefore.width = next.cycleW; } if (opts.slideResize && h !== false && next.cycleH > 0) { opts.cssBefore.height = next.cycleH; } opts.cssAfter = opts.cssAfter || {}; opts.cssAfter.display = "none"; $(curr).css("zIndex", opts.slideCount + (rev === true ? 1 : 0)); $(next).css("zIndex", opts.slideCount + (rev === true ? 0 : 1)); }; $.fn.cycle.custom = function (curr, next, opts, cb, fwd, speedOverride) { var $l = $(curr), $n = $(next); var speedIn = opts.speedIn, speedOut = opts.speedOut, easeIn = opts.easeIn, easeOut = opts.easeOut; $n.css(opts.cssBefore); if (speedOverride) { if (typeof speedOverride == "number") { speedIn = speedOut = speedOverride; } else { speedIn = speedOut = 1; } easeIn = easeOut = null; } var fn = function () { $n.animate(opts.animIn, speedIn, easeIn, function () { cb(); }); }; $l.animate(opts.animOut, speedOut, easeOut, function () { $l.css(opts.cssAfter); if (!opts.sync) { fn(); } }); if (opts.sync) { fn(); } }; $.fn.cycle.transitions = { fade: function ($cont, $slides, opts) { $slides.not(":eq(" + opts.currSlide + ")").css("opacity", 0); opts.before.push(function (curr, next, opts) { $.fn.cycle.commonReset(curr, next, opts); opts.cssBefore.opacity = 0; }); opts.animIn = { opacity: 1 }; opts.animOut = { opacity: 0 }; opts.cssBefore = { top: 0, left: 0 }; } }; $.fn.cycle.ver = function () { return ver; }; $.fn.cycle.defaults = { activePagerClass: "activeSlide", after: null, allowPagerClickBubble: false, animIn: null, animOut: null, autostop: 0, autostopCount: 0, backwards: false, before: null, cleartype: !$.support.opacity, cleartypeNoBg: false, containerResize: 1, continuous: 0, cssAfter: null, cssBefore: null, delay: 0, easeIn: null, easeOut: null, easing: null, end: null, fastOnEvent: 0, fit: 0, fx: "fade", fxFn: null, height: "auto", manualTrump: true, next: null, nowrap: 0, onPagerEvent: null, onPrevNextEvent: null, pager: null, pagerAnchorBuilder: null, pagerEvent: "click.cycle", pause: 0, pauseOnPagerHover: 0, prev: null, prevNextEvent: "click.cycle", random: 0, randomizeEffects: 1, requeueOnImageNotLoaded: true, requeueTimeout: 250, rev: 0, shuffle: null, slideExpr: null, slideResize: 1, speed: 1000, speedIn: null, speedOut: null, startingSlide: 0, sync: 1, timeout: 4000, timeoutFn: null, updateActivePagerLink: null }; })(jQuery);
// addThis function for use with Flash
var addThis = function () {
    addthis_open(document.body, ('more'), '[URL]', '[TITLE]');
};

// add configuration option for GA tracker object
if (typeof (window.cms) != "undefined") {

    var addThisConfigure = function () {
        if (typeof (window.cms.lang) != "undefined") {
            window.addthis_config = {
                ui_language: window.cms.lang
            }
        };

        window.addthis_config = {
            services_expanded: 'twitter, facebook, googlebuzz, delicious, digg, more',
            //ui_language: window.cms.lang,
            ui_use_addressbook: true,
            ui_508_compliant: true,
            data_track_clickback: false,
            data_ga_tracker: typeof window.pageTracker != 'undefined' ? window.pageTracker : null
        };

        window.addthis_share = {
            email_template: window.cms.emailTemplate,
            templates: {
                twitter: '{{title}}: {{url}}'
            }
        };
    };

    // add configuration options for addThis on load
    var addthis_onload = addThisConfigure();
}
// create jQuery enclosure for compatiblity with other frameworks
; (function ($) {
    // set options for menus
    var menuOptions = {
        sensitivity: 3,
        interval: 25
    };

    // indicate that an overlay is being shown
    var showOverlay = function () {
        $('body').addClass('overlay');

        if (typeof $.overlays == 'undefined') {
            $.overlays = 1;
        }
        else {
            $.overlays++;
        }
    };

    // indicate that an overlay is not being shown
    var hideOverlay = function () {
        $.overlays--;

        if ($.overlays <= 0) {
            $('body').removeClass('overlay');

            $.overlays = 0;
        }
    };

    // set default colorBox options
    var colorBoxOptions = {
        initialHeight: 20,
        initialHeight: 60,
        overlayClose: false,
        escKey: false,
        scrolling: false,
        opacity: 0.7,
        rel: 'nofollow',
        onOpen: function () {
            // hide any qTips on opening of colorBox 
            $('.qtip').qtip('hide');
        }
    }

    // set default open/close functionality for modals
    $(document).bind('cbox_open', showOverlay)
	.bind('cbox_complete', function (e) {
	    $('#cboxLoadedContent').addWidgets();
	}).bind('cbox_closed', hideOverlay);

    // set default colorBox options
    $.colorBoxOptions = function (options) {
        return $.extend(true, {}, colorBoxOptions, options || {});
    };

    // apply widgets to grid-popdown content
    $('.grid-popdown article:visible.hover').livequery(function () {
        $(this).not('.widgeted').addClass('widgeted').addWidgets();
    });

    // adds widgets within given element
    $.fn.addWidgets = function () {
        if (this.length > 0) {
            // create carousels
            $('.carousel .carousel-filmstrip:visible', this).not('.widgeted').addClass('widgeted').carousel({
                easing: 'easeInOutExpo'
            }).find('li .frame').carouselFrame();

            // create tabs
            $('.ui-tabs:visible', this).structureTabs().not('.ui-tabs-static').each(function (i) {
                // set default tabs options
                var options = {
                    show: function (event, ui) {
                        $(ui.tab).addClass('ui-state-active').parents('li').siblings('li').find('a.ui-state-active').removeClass('ui-state-active');

                        $(ui.panel).toggleFormGroup(false).siblings('.ui-tabs-panel').toggleFormGroup(true);

                        $(ui.panel).not('.widgeted').addClass('widgeted').addWidgets(true);
                    }
                }

                // use cookie persistant in tabs contain forms
                if ($(this).hasClass('ui-tabs-form')) {
                    options.cookie = {
                        expires: 1
                    }
                }

                // create tabs
                $(this).tabs(options);
            });

            // open specific tab on anchor
            $('a.ui-tab-select', this).bind('click', function (e) {
                e.preventDefault();

                var tabPanelId = $(this).url().attr('hash');
                var tabPanel = $('[id=' + tabPanelId + ']');
                var tabs = tabPanel.parents('.ui-tabs');

                var tabIndex = $('.ui-tabs-panel', tabs).index(tabPanel);

                tabs.tabs('select', tabIndex);
            });

            // add custom scrollbars
            $('.scrollable:visible', this).jScrollPane({
                showArrows: true,
                verticalGutter: 0,
                horizontalGutter: 0
            });

            // add truncation to truncated results lists
            $('.truncated-results:visible', this).click(function (e) {
                var target = $(e.target);

                if (target.is('.reveal')) {
                    var hidden = target.parent('section').find('> ul').data('hidden') || {};

                    if (hidden.length) {
                        var textToggle = target.data('textToggle');

                        target.data('textToggle', target.text()).text(textToggle);

                        hidden.toggleClass('hide');
                    }

                    e.preventDefault();
                }
            }).find('section > ul').each(function (i) {
                var limit = 15;
                var lis = $('> li', this);

                if (lis.length > limit) {
                    var reveal = $('<a />', {
                        'href': '#',
                        'class': 'reveal',
                        'text': '(View All)'
                    }).data('textToggle', '(View Less)');

                    var hidden = lis.filter(':nth-child(n+' + (limit + 1) + ')').addClass('hide');

                    $(this).data('hidden', hidden).parent('section').append(reveal);
                }
            });

            // add rating widgets
            $('.stars:visible', this).starRating({
                onSelected: function (url, rating) {
                    // open modal if url is not empty
                    if (url != '') {
                        // create url object
                        var url = $.url(url);

                        // add value paramater to url object
                        url.param('rating', rating);

                        options = $.colorBoxOptions({
                            href: url.toString()
                        });

                        // open modal
                        $.colorbox(options);
                    }
                }
            });

            // add HTML5 audio player with Flash fallback
            $('.audio-player:visible', this).each(function (i) {
                var file = $(this).attr('data-file');

                var options = {
                    ready: function () {
                        $(this).jPlayer('setMedia', {
                            mp3: file
                        });
                    },
                    supplied: 'mp3',
                    swfPath: '/swf',
                    solution: 'html, flash',
                    backgroundColor: '#FFFFFF'
                };

                $(this).jPlayer(options);
            });

            // add button hover classes
            $('.button, .ui-tabs-nav li a:visible', this).hoverClass();

            // position articles within popdown grids
            $('.grid-popdown article:visible', this).positionAbsolute().hoverClass(menuOptions);

            // add social button to posts
            $('.social:visible', this).each(function (i) {
                // get title and URL
                var title = $(this).attr('data-title');
                var url = $(this).attr('data-url');

                var offsetTop = $.browser.safari ? 0 : -15;

                // configure addThis
                var addthisButtonConfig = window.addthis_config;

                // configure addThis sharing
                var addthisButtonShare = $.extend(true, {}, window.addthis_share, {
                    url: url,
                    title: title
                });

                // add addThis button
                if (typeof (addthis) != "undefined")
                    addthis.toolbox(this, addthisButtonConfig, addthisButtonShare);


            });
            
            // attach jQuery UI datepicker to date fields
            $('input.form-date', this).datepicker({
                firstDay: 0,
                dateFormat: 'mm/dd/yy',
                monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                dayNamesMin: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
                nextText: '&#x25B6;',
                prevText: '&#x25C0;',
                showOn: 'focus',
                showAnim: 'fadeIn',
                buttonText: '',
                showButtonPanel: false,
                beforeShowDay: function (date) {
                    var $this = $(this);
                    var dates = $(this).data('dates');
                    
                    var selectable = [
						true,
						''
					];

                    if (typeof dates == 'object') {
                        var date = $.datepicker.formatDate('yy-mm-dd', date);

                        if ($.inArray(date, dates) < 0) {
                            selectable[0] = false;
                        }
                    }
                    else if ($this.hasClass('form-date-future') && $.datepicker.formatDate('yymmdd', date) < $.datepicker.formatDate('yymmdd', new Date())) {
                        selectable[0] = false;
                    }

                    return selectable;
                }
            }).filter('[data-dates]').each(function (i) {
                var $this = $(this);
                var datesAttr = $this.attr('data-dates');
                var dates = jQuery.parseJSON(datesAttr);

                var datesArr = new Array();
                var numDates = dates.length;
                $.each(dates, function (i) {
                    var date = new Date(dates[i].date);
                    var dateStr = $.datepicker.formatDate('yy-mm-dd', date);
                    datesArr.push(dateStr);
                });

                $this.data('dates', datesArr);

                $(this).datepicker('refresh');

                //					$.ajax({
                //						url: url,
                //						type: 'GET',
                //						dataType: 'json',
                //						// data: $.param(monthYear),
                //						success: function(dates){
                //							var datesArr = new Array();
                //							var numDates = dates.length;

                //							$.each(dates, function(i){
                //								var date = new Date(dates[i].date);
                //								var dateStr = $.datepicker.formatDate('yy-mm-dd', date);

                //								datesArr.push(dateStr);
                //							});

                //							$this.data('dates', datesArr);

                //							$(this).datepicker('refresh');
                //						}
                //					});
            }).end().filter(function () {
                if ($(this).parents('.shopping-cart').length > 0) {
                    return true;
                }
            }).datepicker('option', 'dateFormat', 'mm/dd/yy').end().filter(function () {
                if (!$(this).is('.form-date-empty') && $(this).datepicker('getDate') == null) {
                    return true;
                }
            }).datepicker('setDate', '+0');

            // add modal box functionality
            $('a.widget-modal', this).colorbox(colorBoxOptions);

            // add tooltip functionality
            $('a.widget-tooltip:visible', this).not('.tooltip').addClass('tooltip').each(function (i) {
                // set the URL for the tooltip to load
                var url = $(this).attr('href');

                // do not add tooltips inside tooltips
                if ($(this).parents('.qtip').length == 0) {
                    // set options for tooltip
                    var qTipOptions = {
                        content: {
                            url: url
                        },
                        style: {
                            width: {
                                min: 260,
                                max: 260
                            },
                            color: false,
                            textAlign: 'left',
                            border: {
                                width: 3,
                                color: '#AADEEB'
                            },
                            tip: {
                                corner: 'leftMiddle'
                            }
                        },
                        position: {
                            adjust: {
                                screen: true
                            },
                            corner: {
                                target: 'rightMiddle',
                                tooltip: 'leftMiddle'
                            },
                            container: $('.content-container')
                        },
                        show: {
                            solo: true
                        },
                        hide: {
                            fixed: true,
                            effect: {
                                type: 'hide'
                            }
                        },
                        api: {
                            beforeShow: showOverlay,
                            beforeHide: hideOverlay,
                            onFocus: function () {
                                this.elements.contentWrapper.addWidgets();
                            }
                        }
                    };

                    // change to click event on buttons
                    if ($(this).hasClass('button')) {
                        qTipOptions.show.when.event = 'click';
                        qTipOptions.hide.when.event = 'unfocus';
                    }

                    // create tooltip
                    $(this).click(function (e) {
                        e.preventDefault();
                    }).qtip(qTipOptions);
                }
            });

            // create structure for stylization of tables
            $('table:visible', this).structureTable();

            // create dateCalendar
            $('.date-calendar:visible', this).each(function (i) {
                var url = $(this).attr('data-url');

                //alert(url);

                // create url object from URL
                var url = $.url(url);

                // add data paramaters to url object
                url.param({
                    languageCode: window.cms.lang
                });

                $(this).dateCalendar({
                    url: url.toString()
                });
            }).unbind('click').click(function (e) {
                //alert("hey");
                if ($(e.target).parents('tbody').length > 0 && $(e.target).is('a')) {
                    e.preventDefault();

                    $('tbody tr td a').removeClass('selected').filter(e.target).addClass('selected');

                    var href = $(e.target).attr('href');

                    if (typeof href == 'string') {
                        var rel = $(this).attr('id');

                        var datePickerInst = $(this).data('datepicker');

                        var date = {
                            languageCode: window.cms.lang,
                            year: $.fn.dateCalendar.zeroFill(datePickerInst.drawYear, 2),
                            month: $.fn.dateCalendar.zeroFill(datePickerInst.drawMonth + 1, 2),
                            day: $.fn.dateCalendar.zeroFill($(e.target).text(), 2)
                        };
                        //alert("hey");
                        $.ajax({
                            url: href,
                            type: 'GET',
                            dataType: 'html',
                            data: $.param(date),
                            success: function (html) {
                                $('.' + rel + '.park-hours-detail').html(html).addWidgets();
                            }
                        });
                    }
                }
            });

            // open package-calendar links in a modal
            $('#package-calendar:visible', this).unbind('click').click(function (e) {
                var target = $(e.target);

                if (target.parents('tbody').length > 0 && (target.is('a') || (target.parents('a').length && (target = $(e.target).parents('a'))))) {
                    e.preventDefault();

                    var href = target.attr('href');

                    if (typeof href == 'string') {
                        var datePickerInst = $(this).data('datepicker');

                        var date = {
                            languageCode: window.cms.lang,
                            year: $.fn.dateCalendar.zeroFill(datePickerInst.drawYear, 2),
                            month: $.fn.dateCalendar.zeroFill(datePickerInst.drawMonth + 1, 2),
                            day: $.fn.dateCalendar.zeroFill($(e.target).text(), 2)
                        };

                        $.colorbox({ href: href });
                    }
                }
            });

            // Associate date select elements with their related calendars
            $('.date-calendar-select select:visible', this).change(function () {
                var parent = $(this).parents('.date-calendar-select');
                var dateCalendar = $('[id=' + parent.attr('rel') + ']');

                var month = $('select.month', parent).val();
                var year = $('select.year', parent).val();
                var date = new Date(month + '1 , ' + year);

                dateCalendar.datepicker('setDate', date);
            });

            // fill status bar to proper amount
            $('.content-container .progress progress .complete:visible', this).statusFill();

            // fill status bar to proper amount
            $('.content-container .payment-progress:visible', this).each(function (i) {
                var max = parseInt($(this).attr('data-max')) - 1;
                var val = parseInt($(this).attr('data-value')) - 1;
                var fill = (val / max) * 100;

                $('.fill:visible', this).statusFill(fill);
                $('ol li:eq(' + val + '):visible', this).addClass('active');
                $('ol li:lt(' + val + '):visible', this).addClass('completed');
            });

            // structure form elements
            $('select, input:checkbox, input:radio, input:file:visible', this).not('.uniformed').addClass('uniformed').uniform().end().filter('select').each(function (i) {
                // create reference for uniform wrapper
                var selector = $(this).parent('.selector');

                // don't continue if element has not been structured with uniform
                if (selector.length) {
                    // wrap text within span with another
                    $('> span', selector).wrap('<div />');

                    // get dimensions for select element
                    var selectWidth = $(this).outerWidth();

                    // check if a width for the select element was returned
                    if (selectWidth > 0 && !$(this).hasClass('dimensioned')) {
                        // get dimensions for selector
                        var selectorWidth = selector.outerWidth();
                        var selectorPadding = selectorWidth - selector.width();

                        // set the width of both the wrapper and the select element
                        selectorWidth = selector.width(selectWidth + selectorPadding).outerWidth();
                        $(this).width(selectorWidth).addClass('dimensioned');
                    }
                }
            });

            // create example text for text fields
            $('input[type=text][title]:visible', this).example(function () {
                return $(this).attr('title');
            });

            // replace input submit buttons with formatted button elements
            $('input[type=submit]', this).each(function (i) {
                var attributes = $(this).get(0).attributes;
                var button = $('<button type="submit" />');

                $.each(attributes, function (i) {
                    var name = attributes[i].nodeName;
                    var val = attributes[i].nodeValue;

                    if (name == 'value') {
                        button.html(val)
                    }
                    else if (name != 'type') {
                        button.attr(name, val)
                    }
                });

                button.addClass('button action').wrapInner('<span><span><span></span></span></span>');

                $(this).replaceWith(button);
            });
        }

        return this;
    };

    // define ie-specific plugins if not loaded
    $.fn.bgiframe = !$.fn.bgiframe ? function () { return this } : $.fn.bgiframe;

    // remove white space from inline-block elements
    // $('nav ul, footer section.nav-internal ul').trimWhiteSpace();

    // fix nav drop-downs in IE6
    $('header nav > ul > li > .articles, header nav ul.nav-primary > li > ul, header nav#nav-portal ul > li > ul, .content-container .grid-popdown article').bgiframe();

    // structure primary navigation and handle hover
    $('header nav ul.nav-primary > li').bind('mouseover', function () {

        var menu = $('> ul', this),
			menuItems = menu.find('> li'),
			menuWidth = menu.width(),
			menuItemsWidth = 0;

        menuItems.equalHeights().each(function (i) {
            menuItemsWidth += $(this).outerWidth(true);
        }).not('.ctas').width(function () {
            return $(this).width() + Math.floor((menuWidth - menuItemsWidth) / menuItems.not('.ctas').length);
        });
    }).find('> a').structureMenuItem();

    //Send tracking info to Google Analytics if a top nav link is clicked.
    $('.nav-primary').delegate('a', 'click', function (e) {

        //Get text for the link that was clicked.
        var linkClickedTitle = $(this).text();

        //Get the current link's parent link.
        var parentLink = $(this).parents('li:last').find('> a').get(0);
        var parentLinkTitle = $(parentLink).text();
        
        try{
            //Send tracking info.
            if (parentLinkTitle == linkClickedTitle) {
                //Current link is top-level so only send info for this link.
                _trackLinkClick([this.href, 'Primary Nav Clicks', linkClickedTitle]);
            }
            else {
                //Current link is sub-level so send info for it and its parent link.
                _trackLinkClick([this.href, 'Primary Nav Clicks', parentLinkTitle, linkClickedTitle]);
            }
        }
        catch (err) {
            if (typeof(console) != "undefined")
                console.log(err);
        }
    });

    //Send tracking info to Google Analytics if a footer nav link is clicked.
    $('footer').delegate('a', 'click', function (e) {

        //Get text for the link that was clicked.
        var linkClickedTitle = $(this).text();

        //Send tracking info.
        _trackLinkClick([this.href, 'Footer Nav Clicks', linkClickedTitle]);
    });

    // structure breadcrumb
    $('.breadcrumb').structureBreadcrumb();

    // create equal-height footer sections
    $('footer section').equalHeights();

    // fix hover support for expanded nav actions
    $('header nav.nav-actions > ul li.expanded, header nav.nav-site > ul.nav-primary > li, header nav#nav-portal ul > li, .navbar nav > ul > li').hoverClass(menuOptions);

    // add widgets to all elements within container
    $('#aspnetForm').addWidgets();

    // structure blocks
    $('aside.sidebar-right .block:last-child').addClass('block-last');

    // show/hide search box filter
    $('.search-box').bind('mouseleave', function (e) {
        $('.search-filter', this).removeClass('search-filter-active');
    }).find('.search-filter > a').click(function () {
        $(this).parents('.search-filter').toggleClass('search-filter-active');
    }).end().find('input[type=text]').focus(function () {
        $(this).siblings('.search-filter').removeClass('search-filter-active');
    });

    // disable search submit on
    $(document).ready(function () {
        $('.search-box button.search').attr('disabled', 'disabled');
        $('.search-box input.form-text').keyup(function () {
            if ($(this).val() != '') {
                $('.search-box button.search').removeAttr('disabled');
            } else {
                $('.search-box button.search').attr('disabled', 'disabled');
            }
        });
    });

    // show/hide language switcher
    $('.language-switcher').bind('mouseleave', function (e) {
        $(this).removeClass('language-switcher-active');
    }).click(function (e) {
        e.preventDefault();

        $(e.target).parents('.language-switcher').toggleClass('language-switcher-active');
    });

    // highlight Web Forms modules on error
    $('.scfSingleLineTextBox, .scfEmailTextBox').change(function () {
        if ($(this).siblings('.scfValidator').css('display') == 'block') {
            $(this).addClass('error');
        } else {
            $(this).removeClass('error');
        }
    });

    // add reveal link for sub-menu items which contain children
    $('aside.sidebar_left ul.nav-sub').click(function (e) {
        var target = $(e.target);

        if (target.is('a.reveal') && target.siblings('ul').length) {
            target.siblings('ul').toggleClass('hide').parent('li').siblings('li').find('a.reveal').siblings('ul').addClass('hide');

            e.preventDefault();
        }
    }).find(' > li').each(function (i) {
        var $this = $(this);
        var ul = $('> ul', this);

        if (ul.length && !$('a.active', ul).length) {
            var reveal = $('<a />', {
                'href': '#',
                'class': 'reveal',
                'text': '(View All)'
            });

            var anchor = $('> a', $this);
            var anchorWidth = anchor.outerWidth(true);
            var anchorPadding = parseInt(anchor.css('paddingRight')) + parseInt(anchor.css('paddingLeft'));
            var revealWidth = parseInt(ul.addClass('hide').before(reveal).parent('li').addClass('expanded').find('a.reveal').outerWidth(true));

            anchor.width(anchorWidth - anchorPadding - revealWidth - 5);
        }
    });

    // toggle the state/province fields in shopping cart payment page
    // $.fn.toggleStateProvince = function(){
    // 	this.each(function(i){
    // 		var state = $(this).parents('.country').siblings('.state');
    // 		var stateSelect = state.find('.state');
    // 		var provinceInput = state.find('.province');
    // 
    // 		var zip = $(this).parents('.country').siblings('.zip');
    // 		var zipLabel = zip.find('.zip')
    // 		var postalLabel = zip.find('.postal-code');
    // 
    // 		var country = $(this).val();
    // 
    // 		if (country == 'USA')
    // 		{
    // 			stateSelect.toggleFormGroup(false);
    // 			provinceInput.toggleFormGroup(true);
    // 
    // 			zipLabel.toggleFormGroup(false);
    // 			postalLabel.toggleFormGroup(true);
    // 		}
    // 		else
    // 		{
    // 			stateSelect.toggleFormGroup(true);
    // 			provinceInput.toggleFormGroup(false);
    // 
    // 			zipLabel.toggleFormGroup(true);
    // 			postalLabel.toggleFormGroup(false);
    // 		}
    // 	});
    // 
    // 	return this;
    // };

    // toggle the shipping fields in shopping cart payment page
    // $.fn.toggleShipping = function(){
    // 	if (this.length > 0)
    // 	{
    // 		var shippingAddress = $('.content-container .payment #shipping-address');
    // 		var shippingOptions = $('.content-container .payment #shipping-options');
    // 
    // 		var shippingType = this.filter(':checked').val();	
    // 
    // 		if (shippingType == 'custom' || shippingType == 'billing')
    // 		{
    // 			shippingOptions.toggleFormGroup(false);
    // 		}
    // 		else
    // 		{
    // 			shippingOptions.toggleFormGroup(true);
    // 		}
    // 
    // 		if (shippingType == 'custom')
    // 		{
    // 			shippingAddress.toggleFormGroup(false);
    // 		}
    // 		else
    // 		{
    // 			shippingAddress.toggleFormGroup(true);
    // 		}
    // 	}
    // 
    // 	return this;
    // };

    // toggle the password/postal code fields on user sign in page
    $.fn.togglePasswordPostalCode = function (focus) {
        if (this.length > 0) {
            var passwordContainer = this.parents('.user').siblings('.password');
            var password = $('.password', passwordContainer);
            var postalCode = $('.postal-code', passwordContainer);

            if (this.val().match('@') || this.val() == '') {
                password.toggleFormGroup(false);
                postalCode.toggleFormGroup(true);
            }
            else {
                password.toggleFormGroup(true);
                postalCode.toggleFormGroup(false);
            }

            if (focus) {
                $('label:not(.disabled) input', passwordContainer).focus();
            }
        }

        return this;
    };

    // show/hide shipping address and shipping options on payment page
    // $('.content-container .payment')
    // .find('.shipping-type input:radio').toggleShipping().change(function(e){
    // 	$(this).toggleShipping();
    // }).end()
    // .find('.country select').toggleStateProvince().change(function(){
    // 	$(this).toggleStateProvince();
    // });

    // toggle the password/postal code fields on user sign in page
    $('#user-returning .user input[type=text]').togglePasswordPostalCode().blur(function () {
        $(this).togglePasswordPostalCode(true);
    });

    // handle Modal AJAX forms
    $('#aspnetForm').submit(function (e) {
        var contentModal = $('#content-modal[data-action]:visible');

        if (contentModal.length > 0) {
            // Confirm user.
            if ($(this).attr('disabled') == 'disabled') { return false; }
            // Declare action.
            var eleAction = $(this).attr('disabled', 'disabled').get(0);

            e.preventDefault();

            var eleLabel = null;
            var strLabel = '';
            var url = contentModal.attr('data-action');
            var data = $(':input', contentModal).bind('focus', function (evt) {
                eleLabel = $(this).parents('label');
                strLabel = $(eleLabel).data('label_text');
                if (strLabel) { $('strong', eleLabel).text(strLabel); }
            }).serialize();

            $.ajax({
                url: url,
                type: 'GET',
                dataType: 'json',
                data: data,
                success: function (data) {
                    var message = $('.message', contentModal);

                    if (data.GeneralMessage.length > 0) {
                        message.text(data.GeneralMessage).show();
                    }
                    else {
                        message.hide();
                    }

                    if (data.Success == true) {
                        message.show().addClass('success');

                        contentModal.html(message);
                    }
                    else {
                        var eleLabel = null;
                        var eleLabelInner = null;
                        $.each(data.Errors, function (i) {
                            eleLabel = $('[name=' + data.Errors[i].ElementName + ']').parents('label').addClass('error').get(0);
                            eleLabelInner = $('strong', eleLabel).get(0);
                            $(eleLabel).data('label_text', $(eleLabelInner).text());
                            $(eleLabelInner).text(data.Errors[i].Message);
                        });
                    }

                    $.colorbox.resize();
                    $(eleAction).removeAttr('disabled');
                }
            });
        }
    });

    // pause flash video when modal window opens
    $(document).ready(function () {
        $('a.widget-modal', this).bind('click', function (e) {
            e.preventDefault();
            try {
                window.document["video-player-object"].jsPause();
            } catch (err) {
                //alert("err : " + err);
            }
        });

        $('.aAddCartSubmitButton', this).bind('click', function (e) {
            // e.preventDefault();
            try {
                //Send click to GA
                var product = e.currentTarget;
                _trackLinkClick([product.href, 'Select Product Clicks', product.id, product.title]);
            } catch (err) {
                console.log("err : " + err);
            }
        });
    });

    // set behavior for external links using urlToolbox
    var externalLinkSelector = 'a:external, a[href$=".pdf"], a[href$=".mp3"]';
    if ($.browser.msie && $.browser.version < 9) {
        externalLinkSelector = 'a:external';
    }
    $(externalLinkSelector).externalLink();
})(jQuery);
$('input.compare').live('click', function () {
    var ids = '';

    $('input.compare:checked').each(function (index, element) {
        ids += $(element).val() + ",";
    });

    $('.widget-modal.compare').attr('href', '/ajax/TicketCompare.aspx?ids=' + ids.substr(0, ids.length - 1));
});

// add placeholder add-to-cart modal windows
//$('a.button-alt, a.button-small-alt', '.book-online .content-container').addClass('widget-modal').attr('href', '/_ajaxplaceholder/select-product.html').parents('.content-container').addWidgets();

//sorted content tabs
$('.sorted-content-nav').click(function (e) {
    if ($(e.target).is('a')) {
        e.preventDefault();

        var anchor = $(e.target);

        anchor.parents('li').addClass('active').siblings('li').removeClass('active');

        if ($(this).hasClass('tabs')) {
            $(anchor.attr('href')).show().siblings('.sorted-content-tab').hide();
            $('.sorted-content-tab').addWidgets();

            //Send click to GA
            var sortedContentNavTitle = anchor[0].rel;
            var sortedContentNavTab = anchor[0].innerText;
            _trackLinkClick([anchor.attr("href"), 'Tab Clicks', sortedContentNavTitle, sortedContentNavTab]);
        }
        else {
            var sortedContentId = anchor.parents('li').children('span.cmsItemId').first().text();
            var all = anchor.hasClass('all') ? '1' : '';
            var data = new Object();

            switch (anchor.attr('rel')) {
                case 'attractions':
                    url = '/ajax/EventSorterAjaxLayout.ashx';
                    data.m = 'all';
                    data.homeItemId = $('#homeItemId').text();

                    break;
                case 'events':
                    url = '/ajax/EventSorterAjaxLayout.ashx';
                    data.m = 'byMonth';
                    data.date = sortedContentId;
                    data.homeItemId = $('#homeItemId').text();

                    break;
                default:
                    url = '/ajax/SortedContentAjaxLayout.ashx';
                    data.cmsItemId = sortedContentId;
                    data.all = all;
            }

//            $.ajax({
//                url: url,
//                type: 'GET',
//                dataType: 'json',
//                data: $.param(data),
//                success: function (json) {
//                    WriteSortedContent(json);
//                }
//            });

        }

    }
});

function WriteSortedContent(content) {
    $('#attractions, #dining, #events').empty();

    for (var i = 0; i < content.length; i++) {
        $('#attractions').append(CreateAttraction(content[i]));
    }

    if ($('#dining').length > 0) {
        for (var i = 0; i < content.length; i++) {
            $('#dining').append(CreateDining(content[i]));
        }
    }

    if ($('#events').length > 0) {
        for (var i = 0; i < content.length; i++) {
            $('#events').append(CreateEvent(content[i]));
        }
    }

    $('.content-box-inner').addWidgets();
    window.cms.initFacebookLike('.btn_facebook_like');
}
function CreateAttraction(item) {
    if (item == null) { return ''; }

    var article = $('<article />').append('<a href="' + item.Link + '"><img src="' + item.Image + '" alt="' + item.Title + '" /></a><h1>' + item.Title + '</h1><div class="content-popdown">' + item.Body + '<p class="actions"><a class="button button-alt" href="' + item.Link + '"><span><span><span>Learn More</span></span></span></a></p><p class="social"><div class="rating"><div class="total"><span><span>0</span></span></div><div class="stars" data-value="' + item.AverageRating + '" data-max="5" data-url="/ajax/RatingAjaxLayout.ashx?cmsHomeId=' + window.cms.homeId + '&cmsItemId=' + item.Id + '&m=CreateRatingWithLink" ></div><div class="avg"></div></div><div class="btn_facebook_like " data-url="http://' + window.location.hostname + '/ajax/FacebookLike.aspx?id=' + item.Id + ';http://' + window.location.hostname + '/ajax/FavoriteAjaxLayout.ashx?m=CreateFavorite"></div></p></div>');

    var strRatingAndReviewUrl = getRatingAndReviewUrl(item);
    var article = $('<article />').append('<a href="' + item.Link + '"><img src="' + item.Image + '" alt="' + item.Title + '" /></a><h1>' + item.Title + '</h1><div class="content-popdown">' + item.Body + '<p class="actions"><a class="button button-alt" href="' + item.Link + '"><span><span><span>Learn More</span></span></span></a></p><p class="social"><div class="rating"><div class="total"><span><span>0</span></span></div><div class="stars" data-value="' + item.AverageRating + '" data-max="5" data-url="' + strRatingAndReviewUrl + '"></div><div class="avg"></div></div><div class="btn_facebook_like " data-url="http://' + window.location.hostname + '/ajax/FacebookLike.aspx?id=' + item.Id + ';http://' + window.location.hostname + '/ajax/FavoriteAjaxLayout.ashx?m=CreateFavorite"></div></p></div>');

    return article;
}
function CreateDining(item) {
    if (item == null) { return ''; }

    var strRatingAndReviewUrl = getRatingAndReviewUrl(item);
    var article = $('<article />').append('<img src="' + item.Image + '" alt="' + item.Title + '" /><div class="content"><h1>' + item.Title + '</h1><p>' + item.Body + '</p><div class="actions-info clearfix"><p class="actions"><a href="' + item.Link + '" class="button button"><span><span><span>Learn More</span></span></span></a></p><ul class="info-icons info-icons-dining"></ul></div><p class="social"><div class="rating"><div class="total"><span><span>0</span></span></div><div class="stars" role="rating" data-value="' + item.AvergeRating + '" data-max="5" data-url="' + strRatingAndReviewUrl + '"></div><div class="avg"></div></div></p><ul class="social" data-url="' + item.Link + '" data-title="' + item.Title + '"><li class="share first"><a href="#" class="addthis_button_expanded">Share</a></li></ul></div>');

    return article;
}
function CreateEvent(item) {
    if (item == null) { return ''; }

    var article = $('<article />').append('<img src="' + item.Image + '" alt="' + item.Title + '" /><h1>' + item.Title + '</h1><p class="date">' + item.StartDate + ' - ' + item.EndDate + '</p><div class="content-popdown">' + item.Body + '<p class="actions"><a class="button button-alt" href="' + item.Link + '"><span><span><span>Learn More</span></span></span></a></p><div class="social"><div class="total"><span><span>' + item.CommentCount + '</span></span></div><div class="stars" data-url="/ajax/SortedContentAjaxLayout.ashx?m=CreateRating&cmsItemId=' + item.Id + '" data-value="' + item.AverageRating + '" data-max="5"></div><div class="avg">' + item.AverageRating + '</div><ul class="social" data-url="' + item.Link + '" data-title="' + item.Title + '"><li class="share last"><a href="#" class="addthis_button_expanded">Share</a></li></ul></div>');

    return article;
}
function getRatingAndReviewUrl(item) {
    // Validate user has profile.
    if (typeof window.cms === 'object' && window.cms.userProfileId.length > 0) {
        return '/ajax/RatingsReviews.aspx?cmsHomeId=' + window.cms.homeId + '&amp;cmsItemId=' + item.Id + '&amp;rating=0';
    } else {
        return '/ajax/RatingAjaxLayout.ashx?cmsHomeId=' + window.cms.homeId + '&amp;cmsItemId=' + item.Id + '&amp;m=CreateRatingWithLink';
    }
}

//allergen filter
$('#main').delegate('#allergen-filter', 'change', function (e) {
    if ($('#negative-filter').val() != 'All') {
        var value = $(this).val();
        $('#negative-filter').val('All').change();
        $(this).val(value);
    }
    $('#negative-filter option').removeAttr('selected');
    $('#negative-filter option').first().attr('selected', 'selected');
    $('#allergen-table .filter').removeClass('filter');
    $('#allergen-table tbody tr').has('td.' + $(this).val()).addClass('filter');
});
$('#main').delegate('#negative-filter', 'change', function (e) {
    if ($('#allergen-filter').val() != 'All') {
        var value = $(this).val();
        $('#allergen-filter').val('All').change();
        $(this).val(value);
    }
    if ($(this).val() != 'All') {
        $('#allergen-table tbody tr').addClass('filter');
        $('#allergen-table tbody tr').has('td.' + $(this).val()).removeClass('filter');
    } else {
        $('#allergen-table tbody tr.filter').removeClass('filter');
    }
});
$('#main').delegate('#restaurant-filter', 'change', function () {
    $('#allergen-table tbody tr').show();
    if ($(this).val() != 'All') {
        $('#allergen-table tbody tr:not(.' + $(this).val() + ')').hide();
    }
});

$('.park-hours select.month, .park-hours select.year').change(function () {
    $('.park-hours-detail.park-hours-calendar').html('');
});

//ratings widget
$('#rate-1, #rate-2, #rate-3, #rate-4, #rate-5').click(function () {
    sendRequest($(this).attr('id').substr($(this).attr('id').length - 1, 1));
    return false;
});
function sendRequest(rating) {
    var eleTarget = $('#response');
    var objDataParameters = {
        input: '<%=Sitecore.Context.Item.ID.ToString() %>'
    };
    $.post('/ajax/RatingAjaxLayout.ashx?m=CreateRating&cmsItemId=' + objDataParameters.input + '&cmsItemParentId=' + objDataParameters.input + '&value=' + rating, objDataParameters, function (data, status) {
        if (status == 'success') {
            $(eleTarget).text(data);
            //$(eleButton).removeAttr('disabled');
        } else {
            throw (status);
        }
    });
}
$('.btn_review').bind('click', function (e) {
    if ($(this).attr('disabled') == 'disabled') { return false; }
    // Init.
    var eleButton = $(this).attr('disabled', 'disabled').get(0);
    var eleTarget = $('.reviews').get(0);
    //		// Set data parameters.
    //		var objDataParameters = {
    //			input:'{3A1FB0FC-07C4-4733-9E84-E94145065BBE}'
    //		};
    //		// Perform AJAX.
    //		$.post('ajax/RatingAjaxLayout.ashx?m=Debug', objDataParameters, function(data, status) {
    //			if(status == 'success') {
    //				$(eleTarget).text(data);
    //				$(eleButton).removeAttr('disabled');
    //			} else {
    //				throw(status);
    //			}
    //		});
    // Prevent default action.
    return false;
});

var sendButtons = $('.fb-send');
if (sendButtons != 'undefined') {
    (function (d) {
        var js, id = 'facebook-jssdk'; if (d.getElementById(id)) { return; }
        js = d.createElement('script'); js.id = id; js.async = true;
        js.src = "//connect.facebook.net/en_US/all.js#xfbml=1";
        d.getElementsByTagName('head')[0].appendChild(js);
    } (document));
    //$('body').prepend('<div id="fb-root"></div>');  //Page Editor Breaks;
}

function updateSend(share_url) {
    $('.fb-send').attr('data-href', share_url);
}

function moveSend(x, y) {
    $('.fb-send-wrapper').css({ 'top': y, 'left': x });
}

function moveSendHome(position) {
    var x = 0;
    var y = 0;

    if (position == 1) {
        x = 878;
        y = 413;
    }
    if (position == 2) {
        x = 861;
        y = 403;
    }

    moveSend(x, y);
}

function moveSendVideo(position) {
    var x = 0;
    var y = 0;

    if (position == 1) {
        x = 725;
        y = 408;
    }
    if (position == 2) {
        x = 725;
        y = 408;
    }

    moveSend(x, y);
}

function hideSend() {
    $('.fb-send-wrapper').hide();
}

function showSend() {
    $('.fb-send-wrapper').show();
}



/********** JavaScript functions for BookOnline **************************************************/
var maLinkData = new Array();

function tabLink(pipeData) {
    // Accepts a pipe-delimited string of control IDs that relate to a single 
    // tab and returns the actual controls as they exist on the page.
    var saIDs = pipeData.split("|");
    var tab = document.getElementById(saIDs[0]); // Div containing the Tab's Link and Label controls.
    var lnk = document.getElementById(saIDs[1]); // The Tab's Link control (displayed when not active).
    var lbl = document.getElementById(saIDs[2]); // The Tab's Label control (displayed when active).
    var pnl = document.getElementById(saIDs[3]); // The related Div containing the Pass Types.
    return { tab: tab, link: lnk, label: lbl, panel: pnl };
}

$(document).ready(function () {
    var sLoc = location.href.toLowerCase();
    if (sLoc.indexOf("/tickets") > 0) {
        initTicketsPage();
    } else if (sLoc.indexOf("/basic-info") > 0) {
        initBasicInfoPage();
    }
});

function initTicketsPage() {
    maLinkData = new Array();
    var lnkData = null;
    // maTabLinks[] is an Array of control IDs that are written to the page from the code behind.
    if ((typeof (maTabLinks) != "undefined") && (maTabLinks.length > 0)) {
        // Create an Array of tabLink objects that reference the related controls for each tab.
        for (var i = 0; i < maTabLinks.length; i++) {
            lnkData = new tabLink(maTabLinks[i]);
            // Bind each Link to the setActiveTab() function.
            //lnkData.link.onclick = function (index) { return setActiveTab(index) } (i);
            $("#" + lnkData.link.id).bind('click', function (event) {
                return tabClick(event, this);
            });
            maLinkData[i] = lnkData;
        }
        // If the users hits this page from the back button or a Page refresh, 
        // this will restore the Active Tab to its previous index.
        var sIdx = (window.location.hash + "").replace("#", "");
        var iIdx = (isNaN(parseInt(sIdx))) ? 0 : parseInt(sIdx);
        if (iIdx >= maTabLinks.length) iIdx = 0;
        setActiveTab(iIdx);
    }
}

function initBasicInfoPage() {
    $("#" + txtAdultCountID).bind('blur', saveBasicInfoData);
    $("#" + txtChildCountID).bind('blur', saveBasicInfoData);
    $("#" + txtInfantCountID).bind('blur', saveBasicInfoData);
    //	$("#" + optTravelDatesKnownID).bind('click', function (event) { optionChange(event, this); });
    //	$("#" + optTravelDatesUnknownID).bind('click', function (event) { optionChange(event, this); });
    //	$("#" + txtDateFromID).bind('change', validateDateChange);
    //	$("#" + txtDateToID).bind('change', validateDateChange);
    $("#" + optYesID).bind('click', function (event) { optionChange(event, this); });
    $("#" + optNoID).bind('click', function (event) { optionChange(event, this); });
    $("#" + txtZipCodeID).bind('blur', saveBasicInfoData);
    $("#" + selCountryID).bind('change', saveBasicInfoData);

}

function validateDateChange() {
    ele = $(".crevDateFieldsTo").get(0);
    ValidatorValidate(ele);
}

function validateFromDatesConfiguration(source, arguments) {
    arguments.IsValid = validateDateConfiguration();
    ele = $(".crevDateFieldsTo").get(0);

    if (this.eleState == null) {
        this.eleState = 'true';
    }

    //determine if other date field was already checked
    if (eleState != 'false') {
        this.eleState = 'false';
        ValidatorValidate(ele);
    }

    this.eleState = null;

    eleValidator = $(".crevDateFieldsTo");
    eleValidator1 = $(".crevDateFieldsFrom");
    if (arguments.IsValid) {
        $(eleValidator).hide();
        $(eleValidator1).hide();
    } else {
        $(eleValidator).show();
        $(eleValidator1).show();
    }
}

function validateToDatesConfiguration(source, arguments) {
    arguments.IsValid = validateDateConfiguration();
    el = $(".crevDateFieldsFrom").get(0);

    if (this.eleState == null) {
        this.eleState = 'true';
    }

    //determine if other date field was already checked
    if (eleState != 'false') {
        this.eleState = 'false';
        ValidatorValidate(ele);
    }

    this.eleState = null;

    eleValidator = $(".crevDateFieldsTo");
    eleValidator1 = $(".crevDateFieldsFrom");
    if (arguments.IsValid) {
        $(eleValidator).hide();
        $(eleValidator1).hide();
    } else {
        $(eleValidator).show();
        $(eleValidator1).show();
    }
}

function validateDateConfiguration() {
    var dateFrom = new Date($("#" + txtDateFromID).val());
    var dateTo = new Date($("#" + txtDateToID).val());

    if (dateFrom > dateTo) { //invalid: end date before start date
        return false;
    } else {
        return true;
    }
}

function saveBasicInfoData() {
    var sQueryStr = "AdultCount=" + escape($("#" + txtAdultCountID).val()) +
		"&ChildCount=" + escape($("#" + txtChildCountID).val()) +
		"&InfantCount=" + escape($("#" + txtInfantCountID).val()) +
    //		"&TravelDatesKnown=" + (($("#" + optTravelDatesKnownID).attr("checked")) ? "true" : "false") +
    //		"&DateFrom=" + escape($("#" + txtDateFromID).val()) +
    //		"&DateTo=" + escape($("#" + txtDateToID).val()) +
		"&IsUSResident=" + (($("#" + optYesID).attr("checked")) ? "true" : "false") +
        "&Country=" + escape($("#" + selCountryID).val()) +
		"&ZipCode=" + escape($("#" + txtZipCodeID).val());

    CallbackToServer(sQueryStr);
}

function optionChange(event, srcElem) {
    var sPnlID = null;
    var bDisabled = false;
    switch (srcElem.id) {
        //		case optTravelDatesKnownID:   
        //			sPnlID = pnlTravelDatesDatesID;   
        //			bDisabled = false;   
        //			break;   
        //		case optTravelDatesUnknownID:   
        //			sPnlID = pnlTravelDatesDatesID;   
        //			bDisabled = true;   
        //			break;   
        case optYesID:
            sPnlID = pnlEnterZipCodeID;
            bDisabled = false;
            break;
        case optNoID:
            sPnlID = pnlEnterZipCodeID;
            bDisabled = true;
            break;
    }

    //    if (srcElem.id == optTravelDatesKnownID || srcElem.id == optTravelDatesUnknownID){
    //	    if (bDisabled) {
    //		    $("#" + sPnlID + " :input").attr("disabled", "disabled");
    //		    $("#" + sPnlID).attr("disabled", "disabled");
    //	    } else {
    //		    $("#" + sPnlID + " :input").removeAttr("disabled");
    //		    $("#" + sPnlID).removeAttr("disabled");
    //	    }
    //     }

    if (srcElem.id == optYesID || srcElem.id == optNoID) {
        var sPnlID1 = pnlSelectCountryID;
        if (bDisabled) {
            $("#" + sPnlID + " :input").val("")
            $("#" + sPnlID).css("display", "none");
            $("#" + sPnlID1).css("display", "block");

        } else {

            $("#" + sPnlID).css("display", "block");
            $("#" + sPnlID1).css("display", "none");
        }

    }

    saveBasicInfoData();
}

function showAddToCartPopup(event, srcElem) {
    var sData = $(srcElem).next().text();
    var saData = sData.split("|");
    if (saData.length > 1) {
        var sCatalogGuid = saData[0];
        var sSellGroupGuid = saData[1];
        var sURL = "/ajax/BookOnlineCartInput.ashx?CatalogGuid="
			+ sCatalogGuid + "&SellingGroupGuid=" + sSellGroupGuid;
        $.post(sURL, function (data, status) {
            if ((status == "success") && (data.length > 0)) {
                var divPopup = $("#divAddToCartPopup");
                if (divPopup != null) {
                    divPopup.html(data);
                    displayPopupAtButton(srcElem);
                }
            }
        });
    }
}

function updateShoppingCart(event, srcElem) {
    var sData = $(srcElem).next().text();
    var saData = sData.split("|");
    if (saData.length > 1) {
        var sCatalogGuid = saData[0];
        var sSellGroupGuid = saData[1];
        var sURL = "/ajax/BookOnlineCartInput.ashx?CatalogGuid=" +
			sCatalogGuid + "&SellingGroupGuid=" + sSellGroupGuid +
			"&Values=" + getCartPopupValues();
        $.post(sURL, function (data, status) {
            if ((status == "success") && (data.length > 0)) {
                if (data.toLowerCase().indexOf("success:") == 0) {
                    hideAddToCartPopup();
                    saTotals = data.substr("success:".length).split("|");
                    if (saTotals.length > 1) showCartTotals(saTotals[0], saTotals[1]);
                    data = "";
                } else if (data.length > 0) {
                    divPopup = $("#divAddToCartPopup");
                    if (divPopup != null) {
                        divPopup.html(data);
                        displayPopupAtButton(srcElem);
                    }
                } else {
                    hideAddToCartPopup();
                }
            }
        });
    }
}

function displayPopupAtButton(button) {
    var divPopup = $("#divAddToCartPopup");
    var tblPopup = $("#divAddToCartPopup table:first");
    var rcBtn = getElemPageRect(button);
    if ((divPopup != null) && (tblPopup != null)) {
        divPopup.css("visibility", "visible");
        var iWidth = tblPopup.outerWidth();
        if (!rcBtn.isEmpty) {
            divPopup.css("left", (rcBtn.left - iWidth).toString() + "px");
            divPopup.css("top", rcBtn.top.toString() + "px");
        }
        if (iWidth > 0) {
            divPopup.css("width", iWidth.toString() + "px");
        }
    }
    var firstInput = $("#divAddToCartPopup input:first");
    if ((firstInput == null) || (firstInput.width() == null)) {
        firstInput = $("#divAddToCartPopup button:first");
    }
    if ((firstInput != null) && (firstInput.width() != null)) {
        firstInput.focus();
    }
}

function getCartPopupValues() {
    var sValues = "";
    var divPopup = $("#divAddToCartPopup");
    $("#divAddToCartPopup input[type=text]").each(function () {
        if (sValues.length > 0) sValues += "|";
        sValues += $(this).context.id + "~" + $(this).val();
    });
    return sValues;
}

function hideAddToCartPopup(values) {
    var divPopup = $("#divAddToCartPopup");
    if (divPopup != null) {
        divPopup.css("visibility", "hidden");
        divPopup.css("left", "0px");
        divPopup.css("top", "0px");
        divPopup.css("width", "10px");
    }
}

function showCartTotals(totalAmount, totalItems) {
    $(".clsShoppingCartTotalAmount").each(function (e) {
        e.text(totalAmount);
    });
    //$(".clsShoppingCartTotalItems").each(function (e) {
    //e.text(totalItems);
    //});
}

function fillAddToCartPopup(cartData) {
    if ((typeof (cartData) != "undefined") && (cartData != null)) {
        if ((typeof (cartData.SelectedPlus) != "undefined") && (cartData.SelectedPlus.length > 0)) {
            var divPopup = document.getElementById("divAddToCartPopup");
            if (divPopup != null) {
                var sTR = "\t<tr valign=\"middle\">\n";
                var sTD = "\t\t<td align=\"left\" style=\"white-space:nowrap;\">\n";
                var sLbl = "\t\t\t<label>[LABEL]</label>";
                var sInp = "<input type=\"text\" size=\"4\" value=\"\" />\n";
                var sHTML = "<table cellpadding=\"5\" cellspacing=\"0\" style=\"width:50px;\">\n";
                for (var i = 0; i < cartData.SelectedPlus.length; i++) {
                    sHTML += (sTR + sTD + sLbl.replace("[LABEL]", cartData.SelectedPlus[i].LabelText) + "\t\t</td>\n" + sTD);
                    switch (aryData[i].DataType.toLowerCase()) {
                        case "input":
                            sHTML += sInp;
                            break;
                        case "date":
                            sHTML += sInp;
                            break;
                    }
                    sHTML += "\t\t</td>\n\t</tr>\n";
                }
                var sText = (typeof (msAddToCartText) != "undefined") ? msAddToCartText : "";
                sTD = "\t\t<td align=\"center\" colspan=\"2\" style=\"white-space:nowrap;\">\n"
                var sBtn = "\t\t\t<button class=\"button\" onclick=\"alert('Add call to the cart " +
				"function here.'); hideAddToCartPopup(); return false;\"><span><span><span>" +
				sText + "</span></span></span></button>\n";
                sHTML += (sTR + sTD + sBtn + "\t\t</td>\n\t</tr>\n</table>\n");
                divPopup.innerHTML = sHTML;
                return true;
            }
        }
    }
    return false;
}

function getElemPageRect(elem) {
    var iLeft = 0, iTop = 0, iWidth = 0, iHeight = 0;
    try {
        iWidth = elem.offsetWidth;
        iHeight = elem.offsetHeight;
        if ((iWidth > 0) && (iHeight > 0)) {
            with ($("#" + elem.id).offset()) {
                iLeft = left; iTop = top;
            }
        }
    } catch (e) {
        iWidth = 0; // Triggers the IsEmpty switch below.
    }
    var bIsEmpty = ((iWidth == 0) || (iHeight == 0)) ? true : false;
    if (bIsEmpty) { iLeft = 0; iTop = 0; iWidth = 0; iHeight = 0; }
    return { left: iLeft, top: iTop, width: iWidth, height: iHeight, isEmpty: bIsEmpty };
}

function getElemRect(elem) {
    // Returns the coordinate rectangle (left, top, width, height, right, bottom) of any element.
    if ((elem == null) || (elem.offsetLeft == null)) return null;
    var iLeft = toInt(elem.offsetLeft), iTop = toInt(elem.offsetTop);
    var iWidth = toInt(elem.offsetWidth), iHeight = toInt(elem.offsetHeight);
    var nxtParent = elem.parentNode;
    var offParent = elem.offsetParent;
    while (nxtParent != null) {
        if (((nxtParent.tagName) && (nxtParent.tagName.toUpperCase() == "DIV")) || (nxtParent == offParent)) {
            iLeft += toInt(nxtParent.offsetLeft); iTop += toInt(nxtParent.offsetTop);
            if (nxtParent.scrollLeft) iLeft -= toInt(nxtParent.scrollLeft);
            if (nxtParent.scrollTop) iTop -= toInt(nxtParent.scrollTop);
            iBrdrWd = 0; iBrdrHt = 0;
            try {
                iBrdrWd = toInt(getElemCurrentStyle(nxtParent, "border-width"));
                iBrdrHt = toInt(getElemCurrentStyle(nxtParent, "border-Height"));
            } catch (e) { iBrdrWd = 0; iBrdrHt = 0; }
            iLeft += iBrdrWd; iTop += iBrdrHt;
        }
        if ((nxtParent.tagName) && (nxtParent.tagName.toUpperCase() == "BODY")) break;
        if (nxtParent == offParent) offParent = nxtParent.offsetParent;
        nxtParent = nxtParent.parentNode;
    }
    function toInt(x) {
        var sNbr = trim(x + ""), iNbr = 0;
        try { iNbr = (isNaN(parseInt(sNbr, 10))) ? 0 : parseInt(sNbr, 10); } catch (e) { iNbr = 0; }
        return iNbr;
    }
    function trim(s) {
        return s.replace(/^\s*/, "").replace(/\s*$/, "");
    }
    return { left: iLeft, top: iTop, width: iWidth, height: iHeight };
}

function getElemCurrentStyle(elem, cssRule) {
    var sReturn = "";
    if (isObject(elem)) {
        if (typeof (elem) == "string") elem = document.getElementById(elem);
    } else {
        return sReturn;
    }
    if (isObject(cssRule)) {
        var rule = getStyleRuleName(cssRule);
        if (document.defaultView && document.defaultView.getComputedStyle) {
            sReturn = document.defaultView.getComputedStyle(elem, null).getPropertyValue(rule.cssName);
        } else if (elem.currentStyle) {
            sReturn = elem.currentStyle[rule.propName];
        }
    }
    function isObject(obj) {
        return ((obj) && (obj != null) && (typeof (obj) != "undefined")) ? true : false;
    }
    return sReturn;
}

function getStyleRuleName(cssRule) {
    var sProp = cssRule, sCss = cssRule, sChar = "", bUpper = false, i = 0;
    if (cssRule.indexOf("-") >= 0) {
        sProp = "";
        for (i = 0; i < cssRule.length; i++) {
            sChar = cssRule.substr(i, 1);
            if (sChar == "-") {
                bUpper = true;
            } else {
                sProp += ((bUpper) ? sChar.toUpperCase() : sChar.toLowerCase());
                bUpper = false;
            }
        }
    } else if (cssRule.toLowerCase() != cssRule) {
        sCss = "";
        for (i = 0; i < cssRule.length; i++) {
            sChar = cssRule.substr(i, 1);
            if (sChar.toLowerCase() != sChar) sCss += "-";
            sCss += sChar.toLowerCase();
        }
    }
    return { propName: sProp, cssName: sCss };
}

function tabClick(event, srcElem) {
    // Show/Hide the controls pertaing to each Tab based on the Active Tab (passed by the index parameter).
    //	var bActive = false;
    //	var srcElement = (event.target) ? event.target : event.srcElement;
    for (var i = 0; i < maLinkData.length; i++) {
        if (maLinkData[i].link == srcElem) return setActiveTab(i);
    }
}

function setActiveTab(index) {
    // Show/Hide the controls pertaing to each Tab based on the Active Tab (passed by the index parameter).
    var bActive = false;
    for (var i = 0; i < maLinkData.length; i++) {
        bActive = (i == index) ? true : false;
        if (maLinkData[i].tab != null) maLinkData[i].tab.className = (bActive) ? "clsActiveTab" : "clsNormalTab";
        if (maLinkData[i].link != null) maLinkData[i].link.style.display = (bActive) ? "none" : "";
        if (maLinkData[i].label != null) maLinkData[i].label.style.display = (bActive) ? "" : "none";
        if (maLinkData[i].panel != null) maLinkData[i].panel.style.display = (bActive) ? "" : "none";
    }
    // Store the last Active Tab index for page refreshes and/or returns.
    window.location.hash = index.toString();
    return false; // Stop the hyperlink from submitting the page.
}

