(function ($) {

    $.fn.float = function (topPad) {

        var element = this;
        var origPos = $(this).offset();
        var topPadding = 15;
        if (topPad > 0)
            topPadding = topPad;

        updatePos();
        $(window).bind("scroll", function () {
            updatePos();
        });

        function updatePos() {
            if ($(window).scrollTop() > origPos.top) {
                var newPos = $(window).scrollTop() - origPos.top + topPadding;
                var bottomLimit = $(element).parent().height();
                var bottomPos = newPos + $(element).height();

                if (bottomPos > bottomLimit) {
                    newPos = bottomLimit - $(element).height() - topPadding - 5;
                    if (newPos < 0)
                        newPos = 0;
                }

                $(element).stop().animate({
                    marginTop: newPos
                });
            } else {
                $(element).stop().animate({
                    marginTop: 0
                });
            }

        };

    };

})(jQuery);