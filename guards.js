/*!
 * Guards JavaScript jQuery Plugin v0.2
 * http://github.com/on-site/Guards-Javascript-Validation
 *
 * Copyright 2010, On-Site.com, http://www.on-site.com/
 * Licensed under the MIT license.
 *
 * Includes code for email and phone number validation from the jQuery
 * Validation plugin.  http://docs.jquery.com/Plugins/Validation
 *
 * Date: Mon Oct 18 12:15:53 2010 -0700
 */

/**
 * This plugin is initially inspired by the standard Validation jQuery
 * plugin (http://docs.jquery.com/Plugins/Validation).
 *
 * To guard forms with this plugin, you must specify a set of guards
 * via $.guards.add(selector).using(guard) or
 * $.guard(selector).using(guard).  These guards are then invoked from
 * the first one specified to the last one specified.
 *
 * Example usage:
 *
 * $(function() {
 *   // Change the default error tag wrapper to a div.
 *   $.guards.defaults.tag = "div";
 *
 *   // Enable the submit guard hook for the form with the "myForm" id.
 *   $("#myForm").enableGuards();
 *
 *   // Guard that fields with "required" class have a value.
 *   $.guard(".required").using("required");
 *
 *   // Guard that the text fields don't have the value "invalid" or "bad".
 *   $.guard(":text").using(function(value, element) {
 *     return $.inArray(value, ["invalid", "bad"]) == -1;
 *   }).message("Don't use the keyword 'invalid' or 'bad'.");
 *
 *   // Guard that fields with "email" class specify at least one
 *   // value, but only show 1 error message if none is specified (but
 *   // still highlight all of the fields).
 *   $.guard(".email").using("oneRequired")
 *       .message("Please specify at least one email.").grouped();
 */
(function($) {
    $.guard = function(selector) {
        return $.guards.add(selector);
    };

    $.Guards = function() {
        this._guards = [];
        this.options = {
            stackErrors: false
        };
        this.constants = {
            notChecked: ""
        };
        this.defaults = {
            grouped: false,
            guard: "required",

            guards: {
                email: function() {
                    return function(value, element) {
                        return $.guards.isAllValid(value, $.guards.isValidEmail);
                    };
                },
                "int": function(options) {
                    return function(value, element) {
                        return $.guards.isAllValid(value, function(value) {
                            return $.guards.isValidInt(value, options);
                        });
                    };
                },
                oneRequired: function() {
                    return function(value, element) {
                        return $.guards.isAnyValid(value, $.guards.isPresent);
                    };
                },
                phoneUS: function() {
                    return function(value, element) {
                        return $.guards.isAllValid(value, $.guards.isValidPhoneUS);
                    };
                },
                required: function() {
                    return function(value, element) {
                        return $.guards.isAllValid(value, $.guards.isPresent);
                    };
                }
            },

            invalidClass: "invalid-field",
            messageClass: "error-message",

            messages: {
                email: "Please enter a valid E-mail address.",
                "int": function(options) {
                    var minDefined = !$.guards.isNullOrUndefined(options.min);
                    var maxDefined = !$.guards.isNullOrUndefined(options.max);

                    if (minDefined && maxDefined) {
                        return "Please enter a number from " + options.min + " to " + options.max + ".";
                    }

                    if (minDefined) {
                        return "Please enter a number no less than " + options.min + ".";
                    }

                    if (maxDefined) {
                        return "Please enter a number no greater than " + options.max + ".";
                    }

                    return $.guards.defaults.messages.undefined;
                },
                oneRequired: "Specify at least one.",
                phoneUS: "Please enter a valid phone number.",
                required: "This field is required.",
                undefined: "Please fix this field."
            },

            tag: "span"
        };
    };

    /**
     * If the given values is an array, this will return false if the
     * given fn returns false for any value in the array.  If the
     * given values is not an array, the result of calling the given
     * fn on that value is returned directly.
     *
     * Example: $.guards.isAllValid([true, false, true], function(x) { return x; }); // false
     * Example: $.guards.isAllValid(true, function(x) { return x; });                // true
     */
    $.Guards.prototype.isAllValid = function(values, fn) {
        if ($.isArray(values)) {
            var result = true;

            $.each(values, function(i, x) {
                if (!fn(x)) {
                    result = false;
                    return false;
                }
            });

            return result;
        }

        return fn(values);
    };

    /**
     * If the given values is an array, this will return true if the
     * given fn returns true for any value in the array.  If the given
     * values is not an array, the result of calling the given fn on
     * that value is returned directly.
     *
     * Example: $.guards.isAllValid([false, false, true], function(x) { return x; }); // true
     * Example: $.guards.isAllValid(false, function(x) { return x; });                // false
     */
    $.Guards.prototype.isAnyValid = function(values, fn) {
        if ($.isArray(values)) {
            var result = false;

            $.each(values, function(i, x) {
                if (fn(x)) {
                    result = true;
                    return false;
                }
            });

            return result;
        }

        return fn(values);
    };

    /**
     * Return true if the value is null, undefined, an empty string,
     * or a string of just spaces.
     */
    $.Guards.prototype.isBlank = function(value) {
        return $.guards.isNullOrUndefined(value) || $.trim(value) == "";
    };

    /**
     * Return true if the value is null or undefined.
     */
    $.Guards.prototype.isNullOrUndefined = function(value) {
        return value === null || value === undefined;
    };

    /**
     * Return the negation of calling isBlank(value).
     */
    $.Guards.prototype.isPresent = function(value) {
        return !$.guards.isBlank(value);
    };

    /**
     * Return whether or not the value is a valid integer.
     * Appropriate options are min or max (or both).  Blank is valid
     * as a number.
     */
    $.Guards.prototype.isValidInt = function(value, options) {
        value = $.trim(value);

        if (value == "") {
            return true;
        }

        if (!/^(-|\+)?\d+$/.test(value)) {
            return false;
        }

        value = parseInt(value, 10);
        var bigEnough = $.guards.isNullOrUndefined(options.min) || value >= options.min;
        var smallEnough = $.guards.isNullOrUndefined(options.max) || value <= options.max;
        return bigEnough && smallEnough;
    };

    /**
     * Validates the given value is a valid email.
     */
    $.Guards.prototype.isValidEmail = function(value) {
        return value == "" || /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(value);
    };

    /**
     * Validates the given value is a valid US phone number.
     */
    $.Guards.prototype.isValidPhoneUS = function(value) {
        value = value.replace(/\s+/g, "");
        return value == "" || value.length > 9 &&
              value.match(/^(1-?)?(\([2-9]\d{2}\)|[2-9]\d{2})-?[2-9]\d{2}-?\d{4}$/);
    };

    /**
     * Guard all elements with the specified jQuery selector.  Using
     * is implicitly called with $.guards.defaults.guard, which
     * defaults to "required".  Note that it is simpler to use
     * $.guard(selector) instead of $.guards.add(selector).
     *
     * Example: $.guards.add(".validPhone").using("phoneUS");
     * Example: $.guards.add(".custom").using(function(value, element) {
     *            return value != "invalid";
     *          }).message("Don't use the keyword 'invalid'.");
     * Example: $.guards.add(".custom").grouped().using(function(values, elements) {
     *            return $.inArray("invalid", values) == -1;
     *          }).target("#custom-error-location").tag("div")
     *              .message("Don't use the keyword 'invalid'.");
     */
    $.Guards.prototype.add = function(selector) {
        var guard = new $.Guard(selector, this);
        this._guards.push(guard);
        return guard;
    };

    /**
     * Clear all errors on the form's guard fields, then invoke each
     * guard on the fields in order and guard them, adding errors
     * along the way as needed.  Once done, focus the first visible
     * field with an error.
     */
    $.Guards.prototype.guard = function(form) {
        var result = true;
        var fields = form.guardableFields();
        fields.clearErrors();

        $.each(this._guards, function(index, guard) {
            if (!$.guards.test(guard, fields)) {
                result = false;
            }
        });

        fields.filter(":visible:has-error").eq(0).focus();
        return result;
    };

    /**
     * Use the given guard to test the given guarded fields.  Errors
     * will be applied if the field doesn't have an error yet.
     */
    $.Guards.prototype.test = function(guard, fields) {
        if (guard._grouped) {
            return guard.test(fields);
        }

        var result = true;

        fields.each(function() {
            if (!guard.test(this)) {
                result = false;
            }
        });

        return result;
    };

    $.Guard = function(selector, guards) {
        this._guards = guards || $.guards;
        this._selector = selector;
        this._grouped = this._guards.defaults.grouped;
        this._tag = this._guards.defaults.tag;
        this._messageClass = this._guards.defaults.messageClass;
        this._invalidClass = this._guards.defaults.invalidClass;
        this.using(this._guards.defaults.guard);
    };

    /**
     * Guard inputs using a specified guard.  The guard may be either
     * a string or a function.  When it is a string, it must match one
     * of the pre-defined guards defined in $.guards.defaults.guards.
     * The function is expected to have 2 arguments.  The first is the
     * value of the element being guarded, and the second is the
     * actual element.  If grouped is true, it will be an array of all
     * matched values and all matched elements (the order of values
     * will match the order of elements).  Radio buttons are passed as
     * separate values and elements, but the value of each will be the
     * same.  Specifically, the value of the checked radio button is
     * the value used, unless none are checked, in which case
     * $.guards.constants.notChecked will be used (which is predefined
     * as an empty string).
     *
     * Note that the message is implicitly set when this method is
     * called.  If the guard is a string, the message will be set to
     * $.guards.defaults.messages[guard].  If it is a function, it
     * will be set to $.guards.defaults.messages.undefined.
     *
     * Example: $.guard(".required").using("required");
     * Example: $.guard(".required").using(function(value, element) {
     *   return $.inArray("invalid", values) == -1;
     * });
     */
    $.Guard.prototype.using = function(guard) {
        if (typeof(guard) == "string") {
            var args = [];

            if (arguments.length > 1) {
                args = $.makeArray(arguments).slice(1);
            }

            var fn = this._guards.defaults.guards[guard];
            this._guard = fn.apply(this._guards.defaults.guards, args);
            var message = this._guards.defaults.messages[guard];

            if ($.isFunction(message)) {
                message = message.apply(this._guards.defaults.messages, args);
            }

            return this.message(message);
        }

        this._guard = guard;
        return this.message(this._guards.defaults.messages.undefined);
    };

    /**
     * Specify whether to group element guarding by passing all values
     * and elements at once instead of one at a time.  When grouped,
     * only 1 error message is added, and it is added after the last
     * element.  This defaults to $.guards.defaults.grouped.  If an
     * argument is passed, the value is used as the grouped value,
     * otherwise invoking this method will set grouped to true.
     *
     * Example: $.guard(".required").using("required").grouped();
     * Example: $.guard(".required").using("required").grouped(true);
     */
    $.Guard.prototype.grouped = function() {
        if (arguments.length == 0) {
            return this.grouped(true);
        }

        this._grouped = arguments[0];
        return this;
    };

    /**
     * Set the type of tag to surround the error message with
     * (defaults to $.guards.defaults.tag, which defaults to span).
     *
     * Example: $.guard(".required").using("required").tag("div");
     */
    $.Guard.prototype.tag = function(tag) {
        this._tag = tag;
        return this.resetMessageFn();
    };

    $.Guard.prototype.messageClass = function(messageClass) {
        this._messageClass = messageClass;
        return this.resetMessageFn();
    };

    /**
     * Set the error message to display on errors.  If using is called
     * with a string, this is implicitly invoked using
     * $.guards.defaults.messages[usingValue].  If using is called
     * with a function, this is implicitly invoked using
     * $.guards.defaults.messages.undefined.
     *
     * Example: $.guard(".required").using("required").message("Enter something!");
     */
    $.Guard.prototype.message = function(message) {
        this._message = message;
        return this.resetMessageFn();
    };

    $.Guard.prototype.invalidClass = function(invalidClass) {
        this._invalidClass = invalidClass;
        return this;
    };

    $.Guard.prototype.resetMessageFn = function() {
        var self = this;
        return this.messageFn(function() {
            return $('<' + self._tag + ' class="' + self._messageClass + '"/>').html(self._message);
        });
    };

    $.Guard.prototype.messageFn = function(messageFn) {
        this._messageFn = messageFn;
        return this;
    };

    $.Guard.prototype.errorElement = function() {
        return this._messageFn();
    };

    $.Guard.prototype.attachError = function(elements, errorElement) {
        if (this._target) {
            errorElement.appendTo($(this._target).eq(0));
        } else {
            var last = elements.filter(":last");

            if (last.is(":radio,:checkbox")) {
                last = $(last[0].nextSibling);
            }

            errorElement.insertAfter(last);
        }
    };

    /**
     * Set the target for where error messages should be appended to.
     * By default, the error is placed after the error element, but
     * when a target is specified, the error is appended within.  The
     * target may be either a selector, element or set of elements,
     * however, only the first element is used as the target location
     * for errors.
     *
     * Example: $.guard(".required").using("required").target("#my-errors");
     */
    $.Guard.prototype.target = function(target) {
        this._target = target;
        return this;
    };

    /**
     * Using this guard, test the given element.  If this guard is
     * grouped, the element is expected to actually be all field
     * elements.  Returns false but doesn't apply the guard if there
     * are already errors detected on the element(s).  Returns true if
     * the selector defined for this guard doesn't apply to this
     * element(s).  Otherwise, applies the guard and adds an error if
     * it fails.
     */
    $.Guard.prototype.test = function(element) {
        var $elements = $(element).filter(this._selector);

        if ($elements.size() == 0) {
            return true;
        }

        if (!$.guards.options.stackErrors && $elements.hasErrors()) {
            return false;
        }

        var result;

        // Grouped expects a group of elements, while non-grouped
        // expects a single element.
        if (this._grouped) {
            var values = [];
            var elements = [];

            $elements.each(function() {
                values.push($(this).inputValue(this._guards));
                elements.push(this);
            });

            result = this._guard(values, elements);
        } else {
            var value = $elements.inputValue(this._guards);
            result = this._guard(value, element);
        }

        if (!result && this._grouped) {
            $elements.addSingleError(this);
        } else if (!result) {
            $elements.addError(this);
        }

        return result;
    };

    $.GuardError = function(guard, element, errorElement, linked) {
        this._guard = guard;
        this._element = element;
        this._errorElement = errorElement;
        this._linked = linked;
        this._cleared = false;
    };

    /**
     * Clear this error and any errors linked with it (grouped guards
     * and radio buttons cause all elements involved to be linked).
     */
    $.GuardError.prototype.clear = function() {
        if (this._cleared) {
            return;
        }

        this._errorElement.remove();
        var index = $.inArray(this, this._element.errors);

        if (index >= 0) {
            this._element.errors.splice(index, 1);
        }

        if (!$(this._element).hasErrorsWithInvalidClass(this._guard._invalidClass)) {
            $(this._element).removeClass(this._guard._invalidClass);
        }

        this._cleared = true;

        while (this._linked.length > 0) {
            this._linked.shift().clear();
        }
    };

    /**
     * find any applicable fields for this selected item.  Applicable
     * fields are any inputs, textareas or selects.
     */
    $.fn.guardableFields = function() {
        return this.find("input,textarea,select");
    };

    /**
     * Return the result of guarding the selected form.
     */
    $.fn.guard = function() {
        return $.guards.guard(this);
    };

    /**
     * Add a single error message, but mark every selected element as
     * in error pointing to the single error message.  This differs
     * from addError because addError will add a new error message for
     * each selected element instead of just 1.
     */
    $.fn.addSingleError = function(guard) {
        if (this.size() == 0) {
            console.log("Attempted to add error to nothing.");
            return this;
        }

        var element = guard.errorElement();
        guard.attachError(this, element);
        this.addClass(guard._invalidClass);
        var linked = [];

        return this.each(function() {
            if (!this.errors) {
                this.errors = [];
            }

            var error = new $.GuardError(guard, this, element, linked);
            linked.push(error);
            this.errors.push(error);
        });
    };

    /**
     * Add an error message to each of the selected elements, with an
     * optional error target to place it.  The target can be a
     * selector, though it will use the first selected element as the
     * target.
     */
    $.fn.addError = function(guard) {
        var radiosAdded = {};

        return this.each(function() {
            var $this = $(this);

            if ($this.is(":radio")) {
                var name = $this.attr("name");

                if (radiosAdded[name]) {
                    return;
                }

                radiosAdded[name] = true;
                var radios = $("input[name='" + name + "']:radio", $this.parents("form"));
                radios.addSingleError(guard);
            } else {
                $this.addSingleError(guard);
            }
        });
    };

    /**
     * Obtain all errors attached to the selected elements.
     */
    $.fn.errors = function() {
        var result = [];

        this.each(function() {
            if (this.errors && this.errors.length > 0) {
                result.push.apply(result, this.errors);
            }
        });

        return result;
    };

    /**
     * Clear errors attached to the selected elements.
     */
    $.fn.clearErrors = function() {
        $.each(this.errors(), function(index, error) {
            error.clear();
        });

        return this;
    };

    /**
     * Determine if any errors exist in the selected elements.
     */
    $.fn.hasErrors = function() {
        return this.errors().length > 0;
    };

    $.fn.hasErrorsWithInvalidClass = function(invalidClass) {
        var result = false;

        $.each(this.errors(), function(i, error) {
            if (error._guard._invalidClass == invalidClass) {
                result = true;
                return false;
            }
        });

        return result;
    };

    /**
     * Obtain the value of the first selected input.  This differs
     * from val() in that it will properly get the value of a set of
     * radio buttons.
     */
    $.fn.inputValue = function(guards) {
        guards = guards || $.guards;

        if (this.is(":radio")) {
            var checked = $("input[name='" + this.attr("name") + "']:radio:checked", this.parents("form"));

            if (checked.size() == 0) {
                return guards.constants.notChecked;
            }

            return checked.val();
        }

        if (this.is(":checkbox")) {
            if (this.is(":checked")) {
                return this.val();
            }

            return guards.constants.notChecked;
        }

        return this.val();
    };

    /**
     * Enable guards of this form by attaching a submit button to it
     * that returns the result of calling guard().  This will block
     * any other submit event handlers and prevent the form from being
     * submitted if guarding fails.
     */
    $.fn.enableGuards = function() {
        return this.submit(function() {
            return $(this).guard();
        });
    };

    $.extend($.expr[":"], {
        "has-error": function(x) {
            return new Boolean(x.errors && x.errors.length > 0).valueOf();
        }
    });

    $.guards = new $.Guards();

    $(function() {
        // Clear errors when the user expresses intent to fix the
        // errors.
        var clearFn = function() { $(this).clearErrors(); };
        $(":has-error").live("keyup", clearFn);
        $(":has-error:radio,:has-error:checkbox").live("mouseup", clearFn);
        $("select:has-error").live("mousedown", clearFn);
    });
})(jQuery);
