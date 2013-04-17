(function ($) {

    $.fn.AddFavorite = function (optCustoms) {

        var optDefaults = {
            appId: '',
            fnLoad: null
        };
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
            e.src = 'https://connect.facebook.net/en_US/all.js';
            document.getElementById('fb-root').appendChild(e);
        } ());

    };

    $.fn.DisplayFavorites = function (options) {

        GetFavorites(options.CmsSource, function (favorites) {
            var totalFavorites = favorites.length;
            $(".favoriteshover").find(".favorites_count").html(totalFavorites);
            var moreFavoritesArea = $(".favoriteshover .more");
            $(".favoriteshover .articles article").remove();
            if (totalFavorites > 0) {
                moreFavoritesArea.css("display", "block");
                for (var i = 0; i < favorites.length; i++) {
                    var favorite = favorites[i];
                    var favoriteItem = $("<article><div class='img'><a href='" + favorite.SourceUrl + "'><img src='" + favorite.ImageUrl + "' alt='thumnbnail' width='48' height='48' /></a></div><div class='info'><h3><a href='" + favorite.SourceUrl + "'>" + favorite.Title + "</a></h3></div></article> ").insertBefore(moreFavoritesArea);
                    var favoriteTitleElement = $(".info h3", favoriteItem).get(0);
                    var ratingElement = $("<div class='rating'><div class='total'><a><span><span>" + favorite.TotalRating + "</span></span></a></div></div>").insertAfter(favoriteTitleElement);
                    var totalRatingElement = $(".total", ratingElement).get(0);
                    $("<div class='stars' data-max='5'  date-value='" + favorite.RatingScore + "' data-readonly=''></div>").insertAfter(totalRatingElement);
                }
                $(".favoriteshover .stars").starRating();
            }
            else {
                $("<article class='empty'><p>You have not added any favorites</p></article>").insertBefore(moreFavoritesArea);
                moreFavoritesArea.css("display", "none");
            }
        },
         function (error, userContext, methodName) {
//             alert(error.get_message());
//             alert(userContext);
//             alert(methodName);

             var moreFavoritesArea = $(".favoriteshover .more");
             $("<article class='empty'><p>We were unable to retrieve your favorites</p></article>").insertBefore(moreFavoritesArea);
             moreFavoritesArea.css("display", "none");
         }

        );
    }

})(jQuery);


(function ($) {

    $(document).ready(function () {

        //Ratings
        $(".ratingactive").click(function () {
            var rating = $(this).find(":input").val();
            var cmsID = $(this).attr("cmsid");
            $.seaGuestServices.GuestContent.RateContent(cmsID, rating, HandleRatingSucess, HandlerRatingError);
        });

       //Add Favorites
        $(".savefavorite").AddFavorite({
            appId: "",
            fnLoad: function() {
                 FB.Event.subscribe('edge.create', function (strUrl, objEvent) {
                        var strAjaxUrl = $(objEvent.dom.parentNode).attr('data-url');
                        var cmsID = $(objEvent.dom.parentNode).attr('cmsid');
                        AddToFavorites(cmsID,strAjaxUrl);
                    });
                }
            });

             //Promo Code enter
         $("#txtPromoCodeMenu").keypress(function (e) {
                    if (e.keyCode == 13) {
                        ValidatePromo(this.id);
                    }
                });
        });

})(jQuery);


function HandleRatingSucess(data) {
    $(".modal-overlay-rating-sucess").modal({ css: { height: 100, width: 300} });
}

function HandlerRatingError(x, e, s) {
    $("<div><div>We're sorry.<br /> We were unable to process your rating.</div></div>").modal({ css: { height: 100, width: 200} });
}

function GetFavorites(cmsSource, fnResult, fnError) {
    PageMethods.set_path("/layouts/ParkSites/Default.aspx");
    PageMethods.GetFavorites(cmsSource,fnResult, fnError);
}

function AddToFavorites(cmsId, url) {
    PageMethods.set_path("/layouts/ParkSites/Default.aspx");
    PageMethods.SaveFavorite(cmsId, url, CompleteAddToFavorites);
}

function CompleteAddToFavorites(result) {
    $(".favoriteshover").DisplayFavorites({ CmsSource: CmsInfo.Target });
}

function ValidatePromo(txtBoxID) {
   var txtBox = $("#" + txtBoxID);
   var code = txtBox.val();
   $.seaServices.ecommerce.applyPromoCode(code,
                    function (data) {
                        var today = new Date();
                        var expire = new Date();
                        document.cookie = "__PromoCode=" + escape(code) + ";path=/";
                        location.href = data;
                    },
                    function (xhr, status, error) {
                        $(txtBox).addClass("error");
                        $($(txtBox).siblings('.error').get(0)).css("display", "block");

                    });
}