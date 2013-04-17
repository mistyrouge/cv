(function ($) {

    $(document).ready(function () {

        //Top Navigation Clicks
        $(".nav-site a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.indexOf("?") > -1) {
                $(this).attr("href", destination + "&from=Top_Nav");
            }
            else {
                $(this).attr("href", destination + "?from=Top_Nav");
            }
        });

        // Above Top Navigation Clicks (My Cart, My Favorites etc..)
        $(".nav-actions a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.indexOf("?") > -1) {
                $(this).attr("href", destination + "&from=Top_Nav");
            }
            else {
                $(this).attr("href", destination + "?from=Top_Nav");
            }
        });

        // Front Page Big Image Promos
        $(".content-home-feature-txt a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.indexOf("?") > -1) {
                $(this).attr("href", destination + "&from=Front_Page_Main_Promo");
            }
            else {
                $(this).attr("href", destination + "?from=Front_Page_Main_Promo");
            }
        });

        // Front Page Bottom Promos - Featured Tab
        $("div#tab-C1AE385A59994C27898A9A9897C5E224 a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.indexOf("?") > -1) {
                $(this).attr("href", destination + "&from=Front_Page_Bottom_Promo");
            }
            else {
                $(this).attr("href", destination + "?from=Front_Page_Bottom_Promo");
            }
        });

        // Front Page Bottom Promos - Special Offers Tab
        $("div#tab-5E0420C24D494B92BB9410EC6B3F33A2 a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.indexOf("?") > -1) {
                $(this).attr("href", destination + "&from=Front_Page_Bottom_Promo");
            }
            else {
                $(this).attr("href", destination + "?from=Front_Page_Bottom_Promo");
            }
        });

        // Front Page Bottom Promos - Stay Connected
        $("div#tab-E61AAF5697F84BDD8A68C5BCF7AF6E9D a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.indexOf("?") > -1) {
                $(this).attr("href", destination + "&from=Front_Page_Bottom_Promo");
            }
            else {
                $(this).attr("href", destination + "?from=Front_Page_Bottom_Promo");
            }
        });


        //Booking Widget Navigation Clicks
        $("#tickets-packages div a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.toLowerCase().indexOf("javascript") == -1) {
                if (destination.indexOf("?") > -1) {
                    $(this).attr("href", destination + "&from=Booking_Widget");
                }
                else {
                    $(this).attr("href", destination + "?from=Booking_Widget");
                }
            }
        });

        // Additional Options Links at top of Tickets Pages.
        $("a.additionalOptions").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.toLowerCase().indexOf("javascript") == -1) {
                if (destination.indexOf("?") > -1) {
                    $(this).attr("href", destination + "&from=Additional_Options");
                }
                else {
                    $(this).attr("href", destination + "?from=Additional_Options");
                }
            }
        });

        // Additional Options Links at top of Tickets Pages.
        $("div.content-home-sidebarinfo a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.toLowerCase().indexOf("javascript") == -1) {
                if (destination.indexOf("?") > -1) {
                    $(this).attr("href", destination + "&from=Time_Temp_Widget");
                }
                else {
                    $(this).attr("href", destination + "?from=Time_Temp_Widget");
                }
            }
        });

        //Ecommerce Header Callout Clicks
        $(".header-bookonline a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.indexOf("?") > -1) {
                $(this).attr("href", destination + "&from=Top_Callout");
            }
            else {
                $(this).attr("href", destination + "?from=Top_Callout");
            }

        });

        //Ecommerce Cart Preview Clicks
        $("#cartPreview a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.indexOf("?") > -1) {
                $(this).attr("href", destination + "&from=Cart_Preview");
            }
            else {
                $(this).attr("href", destination + "?from=Cart_Preview");
            }

        });

        //Footer Navigation Clicks
        $(".footer-top a").each(function () {
            var destination = $(this).attr("href");
            if (destination && destination.indexOf("?") > -1) {
                $(this).attr("href", destination + "&from=Footer_Nav");
            }
            else {
                $(this).attr("href", destination + "?from=Footer_Nav");
            }

        });


        // Get Recommendations Checkboxes
        $("div.content-maincontent-getrecboxes input[type='checkbox']").click(function () {
            var state = $(this).parent().attr('class');
            var action = '';
            if (state == 'checked') {
                action = 'Check';
            } else {
                action = 'UnCheck';
            }

            var rec = $(this).parent().parent().parent().next('td').html();
            rec = $.trim(rec);
            var TrackingInfo = MakeTrackingInfo("GetRecommendations", action, null, rec, "", null)
            TrackP2PClick(TrackingInfo);
        });


        // Promo Code (Booking Widget)
        $("#tbPromo").blur(function () {
            var promoCode = $(this).val();
            promoCode = $.trim(promoCode);
            var TrackingInfo = MakeTrackingInfo("BookingWidget", "PromoCode", null, promoCode, "", null)
            TrackP2PClick(TrackingInfo);
        });

        // Promo Code (Top Callout Menu)
        $("#txtPromoCodeMenu").blur(function () {
            var promoCode = $(this).val();
            promoCode = $.trim(promoCode);
            var TrackingInfo = MakeTrackingInfo("Top_Callout", "PromoCode", null, promoCode, "", null)
            TrackP2PClick(TrackingInfo);
        });

        // Promo Code (Modal - No Promo Code Value)
        $(".promoLink").click(function () {
            var promoCode = $(this).val();
            promoCode = $.trim(promoCode);
            var TrackingInfo = MakeTrackingInfo("Additional_Options", "PromoCode", null, promoCode, "", null)
            TrackP2PClick(TrackingInfo);
        });

        // Save Cart Link - Cart Preview Widget
        $("tr.cartHeader").click(function () {
            var promoCode = $(this).val();
            promoCode = $.trim(promoCode);
            var TrackingInfo = MakeTrackingInfo("Cart_Preview", "SaveCart", null, promoCode, "", null)
            TrackP2PClick(TrackingInfo);
        });

        // Front Page Bottom Promos
        $("div#section-callouts>ul a").click(function () {
            tabTitle = $(this).children("span").children("span").children("span").text();
            tabTitle = $.trim(tabTitle);
            var TrackingInfo = MakeTrackingInfo("BotomPromos", "Tabs", null, tabTitle, "", null)
            TrackP2PClick(TrackingInfo);
        });



        //Booking Widget Tabs Clicks
        $("#tickets-packages ul li a").click(function (evt) {
            tabTitle = $(this).children("span").children("span").children("span").text();
            tabTitle = $.trim(tabTitle);
            var TrackingInfo = MakeTrackingInfo("BookingWidget", "Tabs", null, tabTitle, "", null)
            TrackP2PClick(TrackingInfo);

        });

        // Attractions Page Sorting
        $("ul.sorted-content-nav a").click(function (evt) {
            tabTitle = $(this).text();
            tabTitle = $.trim(tabTitle);
            var TrackingInfo = MakeTrackingInfo("SortBy", tabTitle, null, null, "", null)
            TrackP2PClick(TrackingInfo);

        });


        //Vacation Package External Link Clicks
        var posCount = 0;
        $(".content-maincontent a.external").each(function () {
            var destination = $(this).attr("href");
            posCount++;
            if (destination && destination.indexOf("?") > -1) {
                $(this).attr("href", destination + "&pos=" + posCount);
            }
            else {
                $(this).attr("href", destination + "?pos=" + posCount);
            }

        });

        /*
        //Layout Tracking for Tickets
        $(".ticketsBox").each(function () {
        var Products = new Array();
        $(".content-maincontent-ticketbox div[name='addToCart']", this).each(function () {
        sellingGroupId = $(this).attr("sellinggroupid");
        sellingGroupName = $(this).attr("sellinggroupname");
        sellingGroupItemName = $(this).attr("sellinggroupitemname");
        device = $(this).attr("device");

        var LayoutProduct = new Object();
        LayoutProduct.ProductName = sellingGroupName;
        LayoutProduct.SellingGroupID = sellingGroupId;
        LayoutProduct.Device = device;
        LayoutProduct.ItemName = sellingGroupItemName;
        Products.push(LayoutProduct);

        });
        var pageTitle = $("h1", this).text();
        pageTitle = $.trim(pageTitle);
        var TrackingInfo = MakeTrackingInfo(pageTitle, "Tickets", null, null, null, Products);
        TrackP2PLayout(TrackingInfo);

        });
        */

        //Layout Tracking for Tickets
        $(".ticketsBox").each(function () {
            var Products = new Array();
            $(".content-maincontent-ticketbox div[name='addToCart']", this).each(function () {
                sellingGroupId = $(this).attr("sellinggroupid");
                sellingGroupName = $(this).attr("sellinggroupname");
                sellingGroupItemName = $(this).attr("sellinggroupitemname");
                device = $(this).attr("device");

                var LayoutProduct = new Object();
                LayoutProduct.ProductName = sellingGroupName;
                LayoutProduct.SellingGroupID = sellingGroupId;
                LayoutProduct.Device = device;
                LayoutProduct.ItemName = sellingGroupItemName;
                Products.push(LayoutProduct);

            });
            var pageTitle = $("h1", this).text();
            pageTitle = $.trim(pageTitle);
            var TrackingInfo = MakeTrackingInfo(pageTitle, "Tickets", null, null, null, Products);
            TrackP2PLayout(TrackingInfo);

        });

        //Layout Tracking for Tickets-Upsells
        $(".content-maincontent-upsells").each(function () {
            var Products = new Array();
            $("div[name='addToCart']", this).each(function () {
                sellingGroupId = $(this).attr("sellinggroupid");
                sellingGroupName = $(this).attr("sellinggroupname");
                sellingGroupItemName = $(this).attr("sellinggroupitemname");
                device = $(this).attr("device");

                var LayoutProduct = new Object();
                LayoutProduct.ProductName = sellingGroupName;
                LayoutProduct.SellingGroupID = sellingGroupId;
                LayoutProduct.Device = device;
                LayoutProduct.ItemName = sellingGroupItemName;
                Products.push(LayoutProduct);

            });
            var pageTitle = $("h1", this).text();
            pageTitle = $.trim(pageTitle);
            var TrackingInfo = MakeTrackingInfo(pageTitle, "Upsells", null, null, null, Products);
            TrackP2PLayout(TrackingInfo);

        });

        //Layout Tracking for Extras
        $(".extras").each(function () {
            var Products = new Array();
            $(".content-maincontent-extras div[name='addToCart']", this).each(function () {
                sellingGroupId = $(this).attr("sellinggroupid");
                sellingGroupName = $(this).attr("sellinggroupname");
                sellingGroupItemName = $(this).attr("sellinggroupitemname");
                device = $(this).attr("device");

                var LayoutProduct = new Object();
                LayoutProduct.ProductName = sellingGroupName;
                LayoutProduct.SellingGroupID = sellingGroupId;
                LayoutProduct.Device = device;
                LayoutProduct.ItemName = sellingGroupItemName;
                Products.push(LayoutProduct);
            });
            var pageTitle = $("h1", this).text();
            pageTitle = $.trim(pageTitle);
            var TrackingInfo = MakeTrackingInfo(pageTitle, "Extras", null, null, null, Products);
            TrackP2PLayout(TrackingInfo);

        });

        //Layout Tracking for Amenties
        $(".amenities").each(function () {
            var Products = new Array();
            $(".content-maincontent-extras div[name='addToCart']", this).each(function () {
                sellingGroupId = $(this).attr("sellinggroupid");
                sellingGroupName = $(this).attr("sellinggroupname");
                sellingGroupItemName = $(this).attr("sellinggroupitemname");
                device = $(this).attr("device");

                var LayoutProduct = new Object();
                LayoutProduct.ProductName = sellingGroupName;
                LayoutProduct.SellingGroupID = sellingGroupId;
                LayoutProduct.Device = device;
                LayoutProduct.ItemName = sellingGroupItemName;
                Products.push(LayoutProduct);
            });
            var pageTitle = $("h1", this).text();
            pageTitle = $.trim(pageTitle);
            var TrackingInfo = MakeTrackingInfo(pageTitle, "Amenities", null, null, null, Products);
            TrackP2PLayout(TrackingInfo);
        });

    });

})(jQuery);


function MakeTrackingInfo(trackingType, subtype, itemName, title, device, products) {
    var TrackingInfo = new Object();
    TrackingInfo.TrackingType = trackingType;
    TrackingInfo.TrackingSubType = subtype;
    TrackingInfo.ItemName = itemName;
    TrackingInfo.TrackingTitle = title;
    TrackingInfo.Device = device;
    TrackingInfo.Products = products;

    /*
    var alertStr = 'TrackingType: ' +  trackingType + "\n" +
    'TrackingSubType: ' + subtype + "\n"  +
    'ItemName: ' + itemName + "\n" +
    'TrackingTitle: ' + title + "\n" +
    'Device: ' + device + "\n" +
    'Products: ' + products + "\n";
		
    alert(alertStr);
    */

    return TrackingInfo
}

var RecommendationsTrackingInfoList = new Array();

function MakeRecommendationsTrackingInfo(inputFieldName, inputFieldValue) {

    var TrackingInfo = new Object();
    if (inputFieldName != "undefined" && inputFieldName != null) {
        TrackingInfo.InputFieldName = inputFieldName;
        TrackingInfo.InputFieldValue = inputFieldValue;
        RecommendationsTrackingInfoList.push(TrackingInfo);
        TrackRecommendationsOptions(TrackingInfo);
    }
    return TrackingInfo;
}

function initializeAddToCartTracking(root) {
    $("div[name='addToCart']", root).click(function (evt) {

        sellingGroupId = $(this).attr("sellinggroupid");
        sellingGroupName = $(this).attr("sellinggroupname");
        sellingGroupItemName = $(this).attr("sellinggroupitemname");
        device = $(this).attr("device");


        //alert("Add to Cart: " + sellingGroupId + " : " + sellingGroupName + " : " + sellingGroupItemName);

        var products = new Array();
        var AddToCartProduct = new Object();
        AddToCartProduct.ProductName = sellingGroupName;
        AddToCartProduct.SellingGroupID = sellingGroupId;
        products.push(AddToCartProduct);

        var hasSwap = $(this).attr("isswap");
        var subType = null;
        if (hasSwap != "undefined" && hasSwap != null && hasSwap != "") {
            subType = "Intercept";
        }

        var TrackingInfo = MakeTrackingInfo("AddToCart", subType, sellingGroupItemName, sellingGroupName, device, products);

        TrackP2PClick(TrackingInfo);

        evt.stopPropagation();
        evt.preventDefault();

        return false;
    });
}



function TrackRecommendationsOptions(TrackingInfo) {
    // alert('TrackP2PRecommendationsOptions');
    // console.log('TrackP2PRecommendationsOptions');
    // console.log(TrackingInfo);
}
