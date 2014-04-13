//= require guards

;(function($) {
    var originalDefaultTarget = $.guards.defaults.target;

    // Ensure input-appended and input-prepended inputs have errors
    // placed in the proper location.
    $.guards.defaults.target = function(errorElement) {
        if (!$(this).parent().is(".input-append") && !$(this).parent().is(".input-prepend")) {
            return originalDefaultTarget.call(this, errorElement);
        }

        errorElement.insertAfter($(this).parent());
        return false;
    };

    // Make sure the error message class is the correct class.
    $.guards.defaults.messageClass = "help-inline";

    // Add the error to the proper control group parent.
    $(document).on("afterGuardError", ":guardable", function(e) {
        $(e.errorElements).each(function() {
            $(this).parents(".control-group:first").addClass("error");
        });
    });

    // Remove the error from the control on clear.
    $(document).on("afterClearGuardError", ":guardable", function(e) {
        $(e.errorElements).each(function() {
            $(this).parents(".control-group:first").removeClass("error");
        });
    });
})(jQuery);
