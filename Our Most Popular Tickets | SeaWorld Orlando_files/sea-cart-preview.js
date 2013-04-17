
(function ($) {

    var defaults = {
        css: {},
        url: "/Support/ParkSites/Services/Ecommerce.svc/GetCart",                           // url where the data is coming from
        doNotFloat: false,
        refreshData: false,
        previewtype: 0
    }

    $.fn.cartPreview = function (o) {
        return this.each(function () {
            $(this).data('cartPreview', new $cp(this, o));
        });
    }

    $.cartPreview = function (e, o) {

        this.options = $.extend({}, defaults, o || {});
        this.element = e;
        this.name = "seaCartPreview";
        this.cartData = null;

        this.cartWrap = null;
        this.header = null;

        this.token = this.getToken();

        this.init();

        this.updateHeader = null;

    }

    var $cp = $.cartPreview;
    $cp.fn = $cp.prototype = {
        rccartpreview: '1.0.0'
    };

    $cp.fn.extend = $cp.extend = $.extend;

    $cp.fn.extend({
        init: function () {
            var me = this;
            this.getData(this.options.refreshData, function () {

                if (!me.options.doNotFloat)
                    $(me.element).float();
            });

        },
        bindEvents: function () {
            var me = this;
            $("td.cartItems .deleteOrderItem", this.element).click(function (evt) {
                var orderItemId = $(this).attr("oid");
                var msg = "Are you sure you wish to remove this item?";
                if ($(this).attr("isres") == "true") {
                    msg = "Removing this item, removes the whole reservation.  Do you wish to continue?";
                }

                if (confirm(msg)) {
                    $.seaServices.ecommerce.removeCartItem(orderItemId, function (data) {
                        if (me.options.refreshPage)
                            location.replace(location.href);
                        else {
                            $("aside.sidebar-right").cartPreview({ doNotFloat: true, refreshPage: me.options.refresPage });
                            //me.build();
                        }
                    },
                    null,
                    { wait: true });
                }
            });
        }, // end bindEvents
        build: function () {
            var me = this;

            // debug
            //alert(me.cartData.Token);

            $($(this.element).find(".count")).html(me.cartData.TotalQuantities);

            // remove all cart items
            $(this.element).find("td.cartItems").html("");
            $(this.element).find("tr.savings").remove();

            var cartItemsArea = $(this.element).find("tr td.cartItems").get(0);

            if (me.cartData.SellingGroups.length > 0) {
                // start a new one
                for (var i = 0; i < me.cartData.SellingGroups.length; i++) {
                    var currentSellingGroup = me.cartData.SellingGroups[i];

                    // add the selling group
                    //                var lastCartItem = $(this.element).find("tr.cartItem:last");
                    //                if (lastCartItem.length == 0)
                    //                    lastCartItem = $(this.element).find("tr.cartHeader");

                    //var sellingGroupArea = $($("<tr class='cartItem'><td colspan='2'></td></tr>").insertAfter(lastCartItem)).find("td").get(0);
                    //$(sellingGroupArea).hide();

                    var sellingGroupArea = $("<div style='width:100%'><table><tbody><tr id='sellingGroupName'><td colspan='4'><strong>" + currentSellingGroup.AlternateName + "</strong></td></tr></tbody></table></div>").appendTo(cartItemsArea);

                    var sellingGroupName = $("#sellingGroupName", sellingGroupArea).get(0);

                    var orderItemLine = sellingGroupName;
                    for (var j = 0; j < currentSellingGroup.OrderItems.length; j++) {
                        var currentOrderItem = currentSellingGroup.OrderItems[j];
                        if (currentOrderItem.Quantity == 0)
                            continue;

                        var notes = "";
                        if (currentOrderItem.Notes !== null && currentOrderItem.Notes.length > 0) {
                            notes = "<span style=\"margin: 0 0 0 5px\" class=\"content-maincontent-tickets-exclaim\" title=\"" + currentOrderItem.Notes + "\" onclick=\"$('._oi" + currentOrderItem.CartOrderItemId + "Notes').modal({target: this, position:'target', positionOffset: {top: 0, left: -100},  noShadow: true, css: {width: 200}});\">!</span><div class=\"modal-overlay-data _oi" + currentOrderItem.CartOrderItemId + "Notes\">" + currentOrderItem.Notes + "</div>";
                        }

                        var oiName = currentOrderItem.ItemClassName.toLowerCase();
                        orderItemLine = $("<tr><td style='width:10px'><a href='javascript:' class='deleteOrderItem' oid='" + currentOrderItem.CartOrderItemId + "' style='text-decoration: none' isres='" + currentOrderItem.IsReservation + "'><img width='10' height='10' src='/_Assets/ParkSites/Images/btn/cart-remove.png'></a></td><td style='width: 10px; text-align:right; padding-right: 0px; padding-left: 0px;'>" + currentOrderItem.Quantity + "</td><td style=' padding-left: 4px; text-transform: capitalize'>" + oiName + notes + "</td><td style='text-align:right;'>" + currentOrderItem.SubTotalCurrency + "</td></tr>").insertAfter(orderItemLine);

                    }

                    //                // add the order items
                    //                var orderItemsContainer = $("<table border='0'></table>").appendTo(sellingGroupArea);
                    //                for (var j = 0; j < currentSellingGroup.OrderItems.length; j++) {
                    //                    var currentOrderItem = currentSellingGroup.OrderItems[j];
                    //                    $("<tr><td><a href='javascript:' class='deleteOrderItem' oid='" + currentOrderItem.CartOrderItemId + "' style='text-decoration: none' isres='" + currentOrderItem.IsReservation + "'>x</a> " + currentOrderItem.Quantity + " " + currentOrderItem.ItemClassName + "</td><td>" + currentOrderItem.SubTotalCurrency + " </td></tr>").appendTo(orderItemsContainer);

                    //var currentOrderItem = 

                    //                }
                }
            }
            else {
                var sellingGroupArea = $("<div style='width:100%'><table><tbody><tr id='sellingGroupName'><td colspan='4' style='text-align: center'><strong>Please add items to your cart.</strong></td></tr></tbody></table></div>").appendTo(cartItemsArea);
            }

            // cartSubTotal
            $(this.element).find("tr.cartSubTotal td:last").html(me.cartData.SubTotalCurrency);

            // cartTaxes
            $(this.element).find("tr.cartTaxes td:last").html(me.cartData.TaxTotalCurrency);

            // cartTotal
            $(this.element).find("tr.cartTotal td:last").html(me.cartData.TotalCurrency);

            if (me.cartData.TotalSavings.value > 0) {
                var totalLine = $(this.element).find("tr.cartTotal");
                var currentSavingsLine = totalLine;
                for (var j = 0; j < me.cartData.Savings.length; j++) {
                    currentSavingsLine = $("<tr class='savings'><td>" + me.cartData.Savings[j].Key + "</td><td>" + me.cartData.Savings[j].Value.key + "</td></tr>").insertAfter(currentSavingsLine);
                };

                if (me.cartData.Savings.length > 0)
                    $("<tr class='savings yousave'><td>You Save</td><td>" + me.cartData.TotalSavings.key + "</td></tr>").insertAfter(currentSavingsLine);
            }

            // bind events
            this.bindEvents();

            //$).css("border", " 1px solid red");
            //this.cartWrap = $("<table></table>").appendTo(this.element);
            //this.header = $('<tr><th>Cart Preview (<span class="cart-count">0</span>)</th><th><a href="#">Save Cart</a></th></tr>

        },  // end build
        buildheader: function () {
            var me = this;

            // remove the if statement regarding quantities as if user removes ALL
            // items, the control needs to be rebuilt

            $(".cartpreviewhover").find(".count").html(me.cartData.TotalQuantities);
            var subTotalArea = $(".cartpreviewhover .actions-cart");
            $(".cartpreviewhover .articles article").remove();
            var cartItemsArea = $(".cartpreviewhover .articles").get(0);
            if (me.cartData.TotalQuantities > 0) {
                subTotalArea.css("display", "block");
                for (var i = 0; i < me.cartData.SellingGroups.length; i++) {
                    var currentSellingGroup = me.cartData.SellingGroups[i];
                    var sellingGroupArea = $("<article><div class='img'><img src='" + currentSellingGroup.ImageUrl + "' alt='thumnbnail' width='42' height='35' /></div><div class='info'><h3>" + currentSellingGroup.AlternateName + "</h3></div></article> ").insertBefore(subTotalArea);


                    var sellingGroupName = $(".info", sellingGroupArea).get(0);
                    var orderItemLine = sellingGroupName;
                    var sellingGroupSubTotal = 0;
                    var infoOrderItems = "";
                    for (var j = 0; j < currentSellingGroup.OrderItems.length; j++) {
                        var currentOrderItem = currentSellingGroup.OrderItems[j];

                        if (currentOrderItem.Quantity == 0)
                            continue;

                        //orderItemLine = $("<p class='price'>" + currentOrderItem.Quantity + " " + currentOrderItem.ItemClassName + "   <strong>" + currentOrderItem.SubTotalCurrency + "</strong></p>").insertAfter(orderItemLine);
                        if (infoOrderItems == "")
                            infoOrderItems = currentOrderItem.Quantity + " " + currentOrderItem.ItemClassName;
                        else
                            infoOrderItems = infoOrderItems + ", " + currentOrderItem.Quantity + " " + currentOrderItem.ItemClassName;


                        var notes = "";
                        if (currentOrderItem.Notes !== null && currentOrderItem.Notes.length > 0) {
                            notes = "<span style=\"margin: 0 0 0 5px\" class=\"content-maincontent-tickets-exclaim\" title=\"" + currentOrderItem.Notes + "\">!</span>";
                        }

                        infoOrderItems += notes;

                        sellingGroupSubTotal = sellingGroupSubTotal + currentOrderItem.SubTotal;
                    }
                    sellingGroupSubTotal = sellingGroupSubTotal.toFixed(2);
                    var priceStr = sellingGroupSubTotal.split(".");
                    var dollars = priceStr[0];
                    var cents = priceStr[1];
                    var infoOrderItemsArea = $("h3", sellingGroupName).get(0);
                    $("<p>" + infoOrderItems + "</p>").insertAfter(infoOrderItemsArea);
                    orderItemLine = $("<p class='price'><strong><sup>$</sup>" + dollars + "<sup>." + cents + "</sup></strong></p>").insertAfter(orderItemLine);

                }

                var cartSubTotal = me.cartData.SubTotal.toFixed(2);
                var priceStr = cartSubTotal.split(".");
                var cartDataSubTotalDollars = priceStr[0];
                var cartDataSubTotalCents = priceStr[1];
                $(".cartpreviewhover .actions-cart .total strong").html("<sup>$</sup>" + cartDataSubTotalDollars + "<sup>." + cartDataSubTotalCents + "</sup>");
            }
            else {
                $("<article class='empty'><p>You have not added anything to your cart</p></article>").insertBefore(subTotalArea);
                subTotalArea.css("display", "none");

            }

        },  // end build header

        refresh: function () {
            this.getData(true);
        },  // end populate

        getData: function (refresh, callback) {
            var me = this;

            $.seaServices.ecommerce.getCart(refresh, function (data) {

                me.cartData = data;
                $(me.element).find("tr.loader").remove();

                if (me.options.previewtype == 1) {
                    me.buildheader();
                }
                else {

                    if (this.updateHeader == 2) {
                        me.buildheader();
                    }
                    this.updateHeader = 2;
                    me.build();

                }

                if (typeof (callback) == "function")
                    callback();

            }, function (xhr, status, error) {

                $(me.element).find("tr.loader").remove();

                if (typeof (console) != "undefined")
                    console.log(xhr);

                if (xhr.readyState == 4) {
                    var lastCartItem = $(me.element).find("tr.cartHeader");
                    $("<tr class='cartItem'><td colspan='2' class='error'>We failed to retrieve your cart.  Please try again later.</td></tr>").insertAfter(lastCartItem);
                }

                me.ajaxError(xhr, status, error);
            });

            //alert(me.cartData.Token);
        },   // end getData
        ajaxError: function (xhr, status, error) {
            // handle the ajax call error here
            // remove all cart items
            //alert(status);
        }, //   end ajaxError
        getToken: function () {
            return "ABCDEF123";            // should come from cookie
        },   // end getToken

        /**** PRIVATE ****/
        _stringFormat: function () {
            var s = arguments[0];
            for (var i = 0; i < arguments.length - 1; i++) {
                var reg = new RegExp("\\{" + i + "\\}", "gm");
                s = s.replace(reg, arguments[i + 1]);
            }

            return s;
        } // end _stringFormat
    }); //end extend
})(jQuery);




