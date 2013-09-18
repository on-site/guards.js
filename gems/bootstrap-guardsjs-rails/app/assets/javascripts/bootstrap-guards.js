//= require guards

;(function($) {
    var originalDefaultTarget = $.guards.defaults.target;

    // Ensure input-appended inputs have errors placed in the proper
    // location.
    $.guards.defaults.target = function(errorElement) {
        if (!$(this).parent().is(".input-append")) {
            return originalDefaultTarget.call(this, errorElement);
        }

        errorElement.insertAfter($(this).parent());
        return false;
    };

    // Make sure the error message class is the correct class.
    $.guards.defaults.messageClass = "help-inline";
})(jQuery);
