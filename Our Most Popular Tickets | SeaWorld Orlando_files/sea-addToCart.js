/*
* jQuery Animate From To plugin 1.0
*
* Copyright (c) 2011 Emil Stenstrom <http://friendlybit.com>
*
* Dual licensed under the MIT and GPL licenses:
* http://www.opensource.org/licenses/mit-license.php
* http://www.gnu.org/licenses/gpl.html
*/
(function ($) {
    $.fn.animateAddToCart = function (targetElm, options, callback) {
        return this.each(function () {
            animateAddToCart(this, targetElm, options, callback);
        });
    };

    $.extend({
        animateAddToCart: animateAddToCart
    });

    function animateAddToCart(sourceElm, targetElm, options, callback) {
        var source = $(sourceElm).eq(0),
            target = $(targetElm).eq(0);
        var defaults = {
            pixels_per_second: 1000,
            initial_css: {
                "background": "#dddddd",
                "opacity": 0.8,
                "position": "absolute",
                "top": source.offset().top,
                "left": source.offset().left,
                "height": source.height(),
                "width": source.width(),
                "z-index": 100000,
                "image": ""
            },
            end_css: {
            },
            square: '',
            "effect": "distort"
        }

        if (target.length === 0)
            return;

        if (options && options.initial_css) {
            options.initial_css = $.extend({}, defaults.initial_css, options.initial_css);
        }
        options = $.extend({}, defaults, options);

        var target_height = target.innerHeight(),
            target_width = target.innerWidth();

        if (options.square.toLowerCase() == 'height') {
            target_width = target_height;
        } else if (options.square.toLowerCase() == 'width') {
            target_height = target_width;
        }

        var shadowImage = "";
        if (options.initial_css.image != "") {
            shadowImage = "<img src='" + options.initial_css.image + "' style='width: 100%; height: 100%' />";
        }


        switch (options.effect) {
            case "bounce":
                break;
            case "zoom":
                target_height = options.end_css.height;
                target_width = options.end_css.width;
                break;
            case "none":
                target_height = options.initial_css.height;
                target_width = options.initial_css.width;
                break;
            default:
                break;
        }



        var dy = source.offset().top + source.width() / 2 - target.offset().top,
            dx = source.offset().left + source.height() / 2 - target.offset().left,
            pixel_distance = Math.floor(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2))),
            duration = (pixel_distance / options.pixels_per_second) * 1000;

        var targetAngle = 45;

        if (options.initial_css.top < target.offset().top)
            targetAngle = -45;

        var bezier_params = {
            start: {
                x: options.initial_css.left,
                y: options.initial_css.top,
                angle: 0
            },
            end: {
                x: target.offset().left + 30,
                y: target.offset().top + 20,
                angle: targetAngle,
                length: .5
            }
        };

        var shadow = $('<div>' + shadowImage + '</div>')
                .css(options.initial_css)
                .appendTo('body')
                .animate({
                    path: new $.path.bezier(bezier_params)
                }, {
                    duration: duration
                })
                .animate({
                    opacity: 0
                }, {
                    duration: 300,
                    complete: function () {
                        shadow.remove();
                        if (callback != null)
                            callback();
                    }
                });
    }
})(jQuery);
