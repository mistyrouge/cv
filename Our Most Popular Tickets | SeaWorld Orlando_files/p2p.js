(function ($) {

    // ===========================================================================    // 
    // EXTENSION: WAIT 
    //
    $.wait = function (ms) {
        ms += new Date().getTime();
        while (new Date() < ms) { }
    }

    // ===========================================================================    // 
    // EXTENSION: IMAGE PRELOADER
    //
    $.fn.preload = function () {
        this.each(function () {
            $('<img/>')[0].src = this;
        });
    }

    // ===========================================================================    // 
    // EXTENSION: ENABLE/DISBALE Controls
    //
    $.fn.disable = function () {
        return $(this).each(function () {
            $(this).attr("disabled", "disabled");
        });
    }

    $.fn.enable = function () {
        return $(this).each(function () {
            $(this).removeAttr("disabled");
        });
    };

    // ===========================================================================
    // EXTENSION: Uppercase every first letter of a word 
    $.fn.ucWords = function () {
        return this.each(function () {
            var val = $(this).text(), newVal = '';
            val = val.split(' ');

            for (var c = 0; c < val.length; c++) {
                newVal += val[c].substring(0, 1).toUpperCase() + val[c].substring(1, val[c].length) + (c + 1 == val.length ? '' : ' ');
            }
            $(this).text(newVal);
        });
    }


    // ===========================================================================
    // ExTENSION: toggleDefaultValue
    // Used mainly for text boxes with default value such as a search box

    $.fn.toggleDefaultValue = function (defaultValue, focusFxn, blurFxn) {
        return this.each(function () {
            $(this).data('toggleDefaultValue', new $tdv(this, defaultValue, focusFxn, blurFxn));
        });
    }

    $.toggleDefaultValue = function (e, d, f, b) {

        this.element = e;
        this.defaultValue = d;
        this.focusFxn = f;
        this.blurFxn = b;
        this.element.defaultValue = d;

        this.element.value = this.defaultValue;

        var me = this;

        $(this.element).bind("focus", function () {
            $(me.element).select();

            if (me.element.value == me.defaultValue)
                me.element.value = "";

            if (typeof (me.focusFxn) != "undefined")
                me.focusFxn(me.element);
        });

        $(this.element).bind("blur", function () {
            if (me.element.value == "")
                me.element.value = me.defaultValue;

            if (typeof (me.blurFxn) != "undefined")
                me.blurFxn(me.element);
        });
    }



    var $tdv = $.toggleDefaultValue;
    $tdv.fn = $tdv.prototype = {
        rctoggledefaultvalue: '1.0.0'
    };

    // END toggleDefaultValue
    // ===========================================================================


    // ===========================================================================
    // Cart Methods

    getReservationInfo = function (root) {
        var dateTime = { date: '', time: '' };
        //var container = $(root).closest(".content-maincontent-ticketbox-tixchoose");
        var timeObj = $(root).find("select[name='reservation_time']").get(0);
        //alert(timeObj);

        return $(timeObj).val();
    };

    getOrderItems = function (root, forceQty) {
        var orderItems = new Array();
        //alert($(root).get(0).tagName);
        $(root).find("#selOrderItemCount").each(function () {
            var orderItem = new Ecommerce_OrderItem();
            orderItem.Quantity = this.value;
            if (typeof (forceQty) != "undefined")
                orderItem.Quantity = forceQty;
            //alert(this.value);
            if (orderItem.Quantity.toString() != "0") {
                var td = $(this).closest("td");
                var classes = $(td).attr("class").split(" ");
                var orderItemID = "";
                for (var i = 0; i < classes.length; i++) {
                    if (classes[i].indexOf("_oi") > -1) {
                        orderItemID = classes[i].substr(3);     // remove the _oi prefix to get actual ID
                        break;
                    }
                }

                orderItem.Id = orderItemID;
                orderItem.SitecoreId = $(td).attr("scid");
                orderItems.push(orderItem);
            }
        });

        return orderItems;
    }

    updateTimes = function (root, showError) {
        var tixWrapper = $(root).closest(".content-maincontent-ticketbox-tixchoose").get(0);

        var addButton = $(tixWrapper).find("button[name='addToCart']").get(0);

        var orderItems = getOrderItems(tixWrapper, 1);

        var sellingGroup = new Ecommerce_SellingGroup();
        sellingGroup.Id = $(addButton).attr("sellinggroupid");
        sellingGroup.OrderItems = orderItems;

        // disable add button for this product
        $(addButton).attr("disabled", "disabled");

        $.seaServices.ecommerce.getAvailableTimes(sellingGroup, root.value, function (data) {
            var selObj = $(tixWrapper).find("select[name='reservation_time']").get(0);
            $("option", selObj).remove();
            for (var i = 0; i < data.length; i++) {
                var opObj = $("<option value='" + data[i].Key + "'>" + data[i].Name + "</option>").appendTo(selObj);
            }
            $(selObj).attr("selectedIndex", 0);
            $(selObj).change();
            $(addButton).removeAttr("disabled");


            //$(root).dpClose();

        }, function (xhr, err, status) {
            if (showError) {
                var selObj = $(tixWrapper).find("select[name='reservation_time']").get(0);
                $("option", selObj).remove();
                $(selObj).change();
                alert("No available times available.");
            }
        }, { wait: true });
    };


    updateControlsBasedOnDate = function (obj) {
        // update the prices and times

        var selectedDate = new Date(obj.value);
        var reservationDate = findReservationDate(obj.reservationInfo.ReservationDates, selectedDate, true);

        if (reservationDate != null && reservationDate.OrderItemPrices != null) {
            // let's make sure that the found reservation inventory is the same date as the selected
            // if not, then we found the next date, so populate the datepicker with the new date
            var resDate = parseJsonDate(reservationDate.Date);
            if (resDate.asString("mm/dd/yyyy") != selectedDate.asString("mm/dd/yyyy")) {
                $(obj).val(resDate.asString("mm/dd/yyyy"));
            }

            // update the times drop-down
            updateTimes(obj);

            for (var b = 0; b < reservationDate.OrderItemPrices.length; b++) {
                var oip = reservationDate.OrderItemPrices[b];
                var root = $(obj).closest(".content-maincontent-ticketbox-tixchoose").get(0);
                var oi = $(root).find("._oi" + oip.Plu + ".dynPrice").get(0);
                $(oi).html(oip.PriceCurrency);
                $(root).find(".startingFrom").css("display", "none");
            }
        }

    };

    initializeDatesTimes = function (root, center, initialStartDate) {

        // ===========================================================================
        //
        // attach jQuery UI datepicker to date fields
        Date.firstDayOfWeek = 0;
        Date.format = 'mm/dd/yyyy';

        // initialize dates/times for reservation products
        $(".content-maincontent-ticketbox-tixchoose input[name='reservation_date']", root).each(function (idx) {

            var me = this;
            var reservationInfo;
            var noMoreDates = false;

            // make the necessary updates for labels and controls depending on a date selection
            $(this).change(function () {
                updateControlsBasedOnDate(me);
            });

            if ($(this).attr("isres") == "true") {
                var source = $(this).closest(".content-maincontent-ticketbox-tixchoose").get(0);
                var orderItems = getOrderItems(source, 1);

                var sellingGroup = new Object();
                sellingGroup.Id = $(this).attr("sellinggroupid");
                sellingGroup.SitecoreId = $(this).attr("scid");
                sellingGroup.OrderItems = orderItems;

                $.seaServices.ecommerce.getAvailableDates(sellingGroup,
                                function (data) {
                                    me.reservationInfo = data;
                                   
                                    $(me).disable();

                                    // update any controls if a date is already set for this
                                    var initFromDate = initialStartDate;
                                    if (initFromDate)
                                        $("#tbFrom").val("mm/dd/yyyy");
                                    else {
                                        // since the date was set, let's get the tiems available for that day
                                        updateControlsBasedOnDate(me);
                                    }

                                    // we got data, we can enable it now
                                    $(me).enable();

                                    $.dpText.TEXT_CLOSE = "";

                                    // initialize the calendar
                                    $(me).datePicker({
                                        clickInput: true,
                                        displayClose: true,
                                        createButton: false,
                                        renderCallback: function ($td, thisDate, month, year) {

                                            var resDate = findReservationDate(me.reservationInfo.ReservationDates, thisDate);

                                            var dayCellContent = "<a class='reservation-day'>" + ("0" + thisDate.getDate()).slice(-2) + "</a>";
                                            // found the reservation data
                                            if (resDate !== null) {
                                                var dayCellContent = "<a class='reservation-day'>" + ("0" + thisDate.getDate()).slice(-2) + "</a>";
                                                if (resDate.OrderItemPrices != null) {
                                                    for (var i = 0; i < resDate.OrderItemPrices.length; i++) {
                                                        var oip = resDate.OrderItemPrices[i];
                                                        dayCellContent += "<p>" + oip.Name + ": <strong>" + oip.PriceCurrency + "</strong></p>";
                                                    }

                                                    //<p>Adult: <strong>$29.99</strong></p><p>Child: <strong>$19.99</strong></p>");
                                                }
                                            }
                                            else {
                                                dayCellContent += "<p>&nbsp;</p>";
                                                $td.unbind("click").addClass("disabled");
                                            }

                                            $td.html(dayCellContent);
                                        }
                                    })
                                    .bind('dpDisplayed', function (e, $datePickerDiv) {

                                        // we may need to center if the whole calendar is not visible
                                        var right = ($($datePickerDiv).offset().left - $(window).scrollLeft()) + $($datePickerDiv).width() + 50;
                                        var bottom = ($($datePickerDiv).offset().top - $(window).scrollTop()) + $($datePickerDiv).height() + 50;
                                        var tempCenter = false;

                                        if ((right >= $(window).width()) || (bottom >= $(window).height())) {
                                            tempCenter = true;
                                        }

                                        // position the datePicker if specified
                                        if ((typeof (center) != "undefined" && center) || tempCenter) {
                                            var centerTop = Math.max(0, (($(window).height() - $($datePickerDiv).height()) / 2) + $(window).scrollTop()) + "px";
                                            var centerLeft = Math.max(0, (($(window).width() - $($datePickerDiv).width()) / 2) + $(window).scrollLeft()) + "px";


                                            if ($.browser.msie && parseFloat($.browser.version) < 9) {
                                                $($datePickerDiv).css({
                                                    position: "absolute",
                                                    top: centerTop,
                                                    left: centerLeft
                                                });
                                            }
                                            else {
                                                $($datePickerDiv).animate({
                                                    position: "absolute",
                                                    top: centerTop,
                                                    left: centerLeft
                                                });
                                            }
                                        }

                                        //.css({position: "absolute", left: -2000; top: -2000});
                                        //$($datePickerDiv).css({position: "absolute", left: -2000; top: -2000});
                                    })
                                    .bind('focus', function () {

                                        // remove any errors if any

                                        $(".content-maincontent-ticketfilter-datetime", source).removeClass("error");
                                        $(".datetime.error", source).each(function () {
                                            $(this).css("display", "none");
                                        });

                                        //$(me).dpDisplay();
                                        $(me).blur();

                                        // if there are no more date's available, we don't need to query anymore
                                        if (me.noMoreDates)
                                            return;

                                        // get more dates if there's less than 1 year's worth of data
                                        if (me.reservationInfo.ReservationDates.length < 365) {
                                            var lastAvailDate = me.reservationInfo.ReservationDates[me.reservationInfo.ReservationDates.length - 1];

                                            if (typeof (lastAvailDate) == "undefined")
                                                return false;

                                            var startDate = parseJsonDate(lastAvailDate.Date);
                                            var endDate = parseJsonDate(lastAvailDate.Date);
                                            startDate.addDays(1);
                                            endDate.addMonths(3);

                                            var startDateJSON = "\/Date(" + startDate.getTime() + ")\/";
                                            var endDateJSON = "\/Date(" + endDate.getTime() + ")\/";

                                            $.seaServices.ecommerce.getAvailableDatesByRange(sellingGroup, startDateJSON, endDateJSON, function (data) {
                                                if (data.ReservationDates != null && data.ReservationDates.length > 0) {
                                                    $.merge(me.reservationInfo.ReservationDates, data.ReservationDates);
                                                }
                                                else {
                                                    me.noMoreDates = true;
                                                }
                                            }, function () {
                                            });
                                        }


                                        return false;
                                    });
                                },
                                function (xhr, status, error) {
                                    $(me).datepicker();
                                });

            }


        });
    }

    findReservationDate = function (reservationDates, dateToFind, getNextDate) {
        for (var i = 0; i < reservationDates.length; i++) {
            var resDate = parseJsonDate(reservationDates[i].Date);

            if (resDate.asString("mm/dd/yyyy") == dateToFind.asString("mm/dd/yyyy"))
                return reservationDates[i];
        }

        return null;
    }

    parseJsonDate = function (jsonDate) {
        var offset = new Date().getTimezoneOffset() * 60000;
        var parts = /\/Date\((-?\d+)([+-]\d{2})?(\d{2})?.*/.exec(jsonDate);
        if (parts[2] == undefined) parts[2] = 0;
        if (parts[3] == undefined) parts[3] = 0;
        return new Date(+parts[1] + offset + parts[2] * 3600000 + parts[3] * 60000);
    };

    addToCart = function (sender, closeAfterAnim, redirectUrlAfterAnim) {


        if ($("a", sender).length > 0) {
            var anchor = $("a", sender);
            window.open(anchor.attr("href"), anchor.attr("target"));
            //location.href = $("a", this).attr("href");
            return false;
        }

        var source = $(sender).closest(".content-maincontent-ticketbox-tixchoose");

        if (source.length == 0)
            source = $(sender).closest(".content-maincontent-ticketbox");

        var top = $(sender).offset().top + 10;
        var left = $(sender).offset().left + 50;

        var orderItems = getOrderItems(source);
        var reservationTimeKey = getReservationInfo(source);

        var sellingGroup = new Ecommerce_SellingGroup();
        sellingGroup.Id = $(sender).attr("sellinggroupid");
        sellingGroup.OrderItems = orderItems;
        sellingGroup.ReservationTimeKey = reservationTimeKey;

        if (typeof (orderItems) == "undefined" || orderItems.length == 0) {
            alert("Please select a quantity in the drop-down and try adding to the cart again.");
            return false;
        }

        if ($(sender).attr("isres") == "true") {
            if (reservationTimeKey === null) {
                $(".content-maincontent-ticketfilter-datetime", source).addClass("error");
                $(".datetime.error", source).each(function () {
                    $(this).css("display", "block");
                });
                //alert("Please indicate when you wish to have your reservation.");
                return false;
            }
        }

        $(sender).disable();

        $.seaServices.ecommerce.addToCart(sellingGroup, function (data) {
            if (data.CartError == "")
                animateAdd2cart(source, top, left, closeAfterAnim, redirectUrlAfterAnim);
            else
                alert(data.CartError);
            $(sender).enable();
        }, function (xhr, error, status) {
            if (xhr.statusText == "error")
                alert("An error occurred adding the item to the cart.  Please try again.");
            else
                alert(xhr.statusText);
            $(sender).enable();
        }, { wait: true });

    };

    initializeAddToCart = function (root) {
        $("div[name='addToCart']", root).click(function (evt) {

            evt.stopPropagation();
            evt.preventDefault();

            addToCart(this);

            return false;
        });
    };



    // END Cart Methods
    // ===========================================================================


})(jQuery);
