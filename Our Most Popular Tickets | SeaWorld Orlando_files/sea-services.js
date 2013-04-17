EcommerceServiceProxy = function (options) //constructor for the proxy
{
    this._baseURL = "/Support/ParkSites/Services/Ecommerce.svc/";
    this._callType = "POST";
    this.cartData = null;

    if (typeof (options) != "undefined") {
        if (typeof (options.baseUrl) != "undefined")
            this._baseURL = options.baseUrl;

        if (typeof (options.callType) != "undefined")
            this._callType = options.callType;
    }
};

EcommerceServiceProxy.prototype =
{
    emptyCart: function (success, error, options) {
        var me = this;
        var headersObj = new Object()
        headersObj.currentitem = __scCurrentItem;       // needed when current item is required
        this._doAjax("EmptyCart", {}, function (data) {
            me.cartData = data;
            if (typeof (success) != "undefined")
                success(data);
        }, error, headersObj, options);
    }, // end emptyCart

    saveCart: function (success, error, options) {
        this._doAjax("SaveCart", {}, success, error, {}, options);
    }, // end saveCart

    getCart: function (refresh, success, error, options) {
        var me = this;
        if (refresh || (this.cartData == null)) {
            var headersObj = new Object()
            headersObj.currentitem = __scCurrentItem;       // needed when current item is required

            this._doAjax("GetCart", {}, function (data) {
                me.cartData = data;
                if (success !== null)
                    success(data);
            }, error, headersObj, options);
        }
        else {
            if (typeof (success) != "undefined")
                success(me.cartData);
        }
    }, // end getCart

    removeCartItem: function (orderItemId, success, error, options) {
        var me = this;
        var headersObj = new Object()
        headersObj.currentitem = __scCurrentItem;       // needed when current item is required
        var params = new Object();
        params.orderItemId = orderItemId;
        var data = JSON.stringify(params);
        this._doAjax("RemoveCartItem", data, function (data) {
            me.cartData = data;

            if (typeof (success) != "undefined")
                success(data);
        }, error, headersObj, options);
    },  // end removeCartItem

    addToCart: function (sellingGroup, success, error, options) {
        var me = this;
        var headersObj = new Object()
        headersObj.currentitem = __scCurrentItem;       // needed when current item is required
        var params = new Object();
        params.sellingGroup = sellingGroup;
        var data = JSON.stringify(params);

        this._doAjax("AddToCart", data, function (data) {
            me.cartData = data;

            if (typeof (success) != "undefined")
                success(data);
        }, error, headersObj, options);
    }, // end addToCart

    swapProduct: function (sellingGroup, sellingGroupIdToReplace, success, error, options) {
        var me = this;
        var headersObj = new Object()
        headersObj.currentitem = __scCurrentItem;       // needed when current item is required
        var params = new Object();
        params.sellingGroupToAdd = sellingGroup;
        params.sellingGroupIdToReplace = sellingGroupIdToReplace;
        var data = JSON.stringify(params);

        this._doAjax("SwapProductToCart", data, function (data) {
            me.cartData = data;

            if (typeof (success) != "undefined")
                success(data);
        }, error, headersObj, options);
    }, // end addToCart

    getProductIntercept: function (success, error, options) {
        var headersObj = new Object()
        headersObj.currentitem = __scCurrentItem;       // needed when current item is required
        this._doAjax("GetProductIntercept", {}, success, error, headersObj);
    },  // end getProductIntercept

    getAvailableDates: function (sellingGroup, success, error, options) {
        var me = this;
        var headersObj = new Object()
        headersObj.currentitem = __scCurrentItem;       // needed when current item is required
        var params = new Object();
        params.sellingGroup = sellingGroup;
        var data = JSON.stringify(params);

        this._doAjax("GetAvailableDates", data, success, error, headersObj, options);
    },  // end getAvailableDates

    getAvailableTimes: function (sellingGroup, date, success, error, options) {
        var me = this;
        var params = new Object();
        params.sellingGroup = sellingGroup;
        params.date = date;
        var data = JSON.stringify(params);

        this._doAjax("GetAvailableTimes", data, success, error, {}, options);
    },  // end getAvailableDates

    getAvailableDatesByRange: function (sellingGroup, startDate, endDate, success, error, options) {
        var me = this;
        var headersObj = new Object()
        headersObj.currentitem = __scCurrentItem;       // needed when current item is required
        var params = new Object();
        params.sellingGroup = sellingGroup;
        params.startDate = startDate;
        params.endDate = endDate;
        var data = JSON.stringify(params);

        this._doAjax("GetAvailableDatesByRange", data, success, error, headersObj, options);
    },  // end getAvailableDatesByRange

    applyPromoCode: function (code, success, error, options) {
        var params = new Object();
        params.promoCode = code;
        var data = JSON.stringify(params);
        var headersObj = new Object()
        headersObj.currentitem = __scCurrentItem;       // needed when current item is required
        this._doAjax("ApplyPromoCode", data, success, error, headersObj, options);
    },  // end applyPromoCode

    /**** UTILITIES ***/
    convertToObject: function (data) {
        // data must be a serialized Dictionary object with key/value pairs
        var newObj = new Object();
        for (var i = 0; i < data.length; i++) {
            var obj = data[i];
            obj.Value = (obj.Value + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, ' ');
            var strExp = this._stringFormat("newObj.{0}='{1}';", obj.Key, $("<div/>").html(obj.Value).html().trim());
            eval(strExp);
        }

        return newObj;
    },  // end convertToObject

    /**** PRIVATE ****/
    _stringFormat: function () {
        var s = arguments[0];
        for (var i = 0; i < arguments.length - 1; i++) {
            var reg = new RegExp("\\{" + i + "\\}", "gm");
            s = s.replace(reg, arguments[i + 1]);
        }

        return s;
    }, // end _stringFormat

    _getToken: function () {
        // this should come from the cookie
        return "ABDCDEFG12345";

    },  // end _getToken

    _defaultErrorHandler: function (xhr, status, error) {
        if (typeof(console) != "undefined")
            console.log(xhr.statusText);
    },  // end _defaultErrorHandler

    _doAjax: function (method, data, fnSuccess, fnError, headers, options) {
        if (!data) data = {};
        if (!headers) headers = {};

        if (!fnError) fnError = this._defaultErrorHandler;

        // to support cross-site scripting
        $.support.cors = true;

        if (typeof (options) != "undefined" && options.wait) {
            $("body").css("cursor", "wait");
        }

        // make the call
        $.ajax({
            type: this._callType,
            url: this._baseURL + method,
            headers: headers,
            data: data,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data) {
                if (typeof (options) != "undefined" && options.wait) {
                    $("body").css("cursor", "");
                }

                if (typeof (fnSuccess) != "undefined")
                    fnSuccess(data);
            },
            error: function (x, e, s) {
                if (typeof (options) != "undefined" && options.wait)
                    $("body").css("cursor", "");

                if (typeof (fnError) != "undefined")
                    fnError(x, e, s);
            }
        });
    } // end _doAjax
};

// Expose the proxies as jQuery objects

(function ($) {
    $.seaServices = function () {
    }

    var $ss = $.seaServices;
    $ss.ecommerce = new EcommerceServiceProxy();

})(jQuery);


// list of objects used for transmitting to the services
Sitecore_ItemInfo = function (id, db, version, lang, site) {
    return [id, db, version, lang, site];
};


Ecommerce_OrderItem = function (id, qty) {
    this.Id = (typeof (id) == "undefined") ? "" : id;
    this.Quantity = (typeof (qty) == "undefined") ? 0 : qty;
};

Ecommerce_SellingGroup = function (id) {
    this.Id = (typeof(id)=="undefined")?"":id;
    this.OrderItems = new Array();
    this.ReservationTimeKey = "";
};


