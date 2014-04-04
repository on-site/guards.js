//= require guards

;(function($) {
    $.guards.defaults.invalidClass = "error";
    $.guards.defaults.messageClass = "error";
    $.guards.defaults.tag = "small";
    var originalDefaultTarget = $.guards.defaults.target;

    $.guards.defaults.target = function(errorElement) {
        var parentLabel = $(this).parents("label:first");

        if (parentLabel.size() > 0) {
            errorElement.insertAfter(parentLabel);
            return false;
        }

        return originalDefaultTarget.call(this, errorElement);
    };

    var getFoundationLabels = function(elements) {
        return $(elements).map(function() {
            var $this = $(this);
            var result = $this.parents("label:first");
            var id = $.trim($this.attr("id") || "")

            if (id !== "") {
                result = result.add("label[for='" + id + "']");
            }

            return result.toArray();
        });
    };

    $(document).on("afterGuardError", ":guardable", function(e) {
        getFoundationLabels(e.errorElements).addClass("error");
    });

    $(document).on("afterClearGuardError", ":guardable", function(e) {
        getFoundationLabels(e.errorElements).removeClass("error");
    });
})(jQuery);
