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
    /*jshint devel:true, jquery:true */
    "use strict";

    $.guard = function(selector) {
        return $.guards.add(selector);
    };

    $.guard.version = "{{VERSION}}";

    $.Guards = function() {
        var self = this;
        this._guards = [];
        this.named = {};

        this.options = {
            stackErrors: false
        };

        this.constants = {
            notChecked: ""
        };

        this.defaults = {
            grouped: false,
            guard: "required",
            invalidClass: "invalid-field",

            liveCallback: function(e) {
                var $element = $(e.target);

                if (!$element.is(":guardable")) {
                    return;
                }

                $element.clearErrors();

                self.applyGuards(function(guard) {
                    if (guard.isGrouped()) {
                        if (guard.appliesTo($element)) {
                            return $element.parents("form:first").find(":guardable");
                        } else {
                            return false;
                        }
                    } else {
                        return $element;
                    }
                });
            },

            messageClass: "error-message",

            messages: {
                "undefined": "Please fix this field."
            },

            style: {
                field: {
                    "background-color": "#ffff66"
                },

                message: {
                    color: "#ff0000",
                    "margin-left": "10px"
                }
            },

            submitCallback: function() { return self.guard($(this)); },
            tag: "span",

            target: function(errorElement) {
                var last = $(this).filter(":last");

                if (last.is(":radio,:checkbox") && last[0].nextSibling) {
                    last = $(last[0].nextSibling);
                }

                var next = last.next();

                while (next.size() > 0 && next[0].isGuardError) {
                    last = next;
                    next = last.next();
                }

                errorElement.insertAfter(last);
                return false;
            }
        };

        this.name("allow").using(this.aggregate(this.isAllValid, this.isAllowed)).message(this.arrayMessage("Please enter one of: #{0}."));
        this.name("always").using(this.aggregate(this.isAllValid, this.always)).message("There was an error.");
        this.name("different").grouped().using(this.aggregate(this.passThrough, this.isDifferent)).message("These values must all be different.");
        this.name("disallow").using(this.aggregate(this.isAllValid, this.isDisallowed)).message(this.arrayMessage("Please don't enter: #{0}."));
        this.name("email").using(this.aggregate(this.isAllValid, this.isValidEmail)).message("Please enter a valid E-mail address.");
        this.name("float").using(this.aggregate(this.isAllValid, this.isValidFloat)).message(this.minMaxMessage({
            minAndMax: "Please enter a number from #{0} to #{1}.",
            min: "Please enter a number no less than #{0}.",
            max: "Please enter a number no greater than #{0}.",
            invalid: "Please enter a number."
        }));
        this.name("int").using(this.aggregate(this.isAllValid, this.isValidInt)).message(this.minMaxMessage({
            minAndMax: "Please enter a number from #{0} to #{1}.",
            min: "Please enter a number no less than #{0}.",
            max: "Please enter a number no greater than #{0}.",
            invalid: "Please enter a number."
        }));
        this.name("moneyUS").using(this.aggregate(this.isAllValid, this.isValidMoneyUS)).message(this.minMaxMessage({
            minAndMax: "Please enter a dollar amount from #{0} to #{1}.",
            min: "Please enter a dollar amount no less than #{0}.",
            max: "Please enter a dollar amount no greater than #{0}.",
            invalid: "Please enter a dollar amount."
        }, function(x) { return x.toFixed(2); }));
        this.name("never").using(this.aggregate(this.isAllValid, this.never)).message("There was an error.");
        this.name("oneRequired").grouped().using(this.aggregate(this.isAnyValid, this.isPresent)).message("Specify at least one.");
        this.name("phoneUS").using(this.aggregate(this.isAllValid, this.isValidPhoneUS)).message("Please enter a valid phone number.");
        this.name("required").using(this.aggregate(this.isAllValid, this.isPresent)).message("This field is required.");
        this.name("same").grouped().using(this.aggregate(this.passThrough, this.isSame)).message("These values must all match.");
        this.name("string").using(this.aggregate(this.isAllValid, this.isValidString)).message(this.minMaxMessage({
            minAndMax: "Please enter a string with length #{0} to #{1}.",
            min: "Please enter a string with length at least #{0}.",
            max: "Please enter a string with length no greater than #{0}."
        }));
    };

    $.Guards.prototype.version = "{{VERSION}}";

    $.Guards.prototype.name = function(name) {
        var guard = new $.Guard(null, this, true);
        this.named[name] = guard;
        return guard;
    };

    $.Guards.prototype.aggregate = function(aggregator, validator) {
        var self = this;

        var result = function() {
            var args = $.makeArray(arguments);

            return function(value) {
                return aggregator.call(self, value, function(v) {
                    return validator.apply(self, $.merge([v], args));
                });
            };
        };

        result.acceptsArguments = true;
        return result;
    };

    $.Guards.prototype.arrayMessage = function(formatting) {
        var self = this;

        return function(array) {
            return self.format(formatting, $.map(array, function(x) { return $.trim("" + x); }).join(", "));
        };
    };

    $.Guards.prototype.minMaxMessage = function(formatting, minMaxFormat) {
        var self = this;

        return function(options) {
            if (self.isNullOrUndefined(options)) {
                options = {};
            }

            if (!$.isFunction(minMaxFormat)) {
                minMaxFormat = function(x) { return x; };
            }

            var minDefined = !self.isNullOrUndefined(options.min);
            var maxDefined = !self.isNullOrUndefined(options.max);

            if (minDefined && maxDefined) {
                return self.format(formatting.minAndMax, minMaxFormat(options.min), minMaxFormat(options.max));
            }

            if (minDefined) {
                return self.format(formatting.min, minMaxFormat(options.min));
            }

            if (maxDefined) {
                return self.format(formatting.max, minMaxFormat(options.max));
            }

            if (formatting.invalid) {
                return formatting.invalid;
            }

            return self.defaults.messages["undefined"];
        };
    };

    // Alias for console.log, but check that such a thing exists.
    $.Guards.prototype.log = function(message) {
        if (console && console.log) {
            console.log(message);
        }
    };

    // Utility method to trigger live events, but works against any
    // jQuery version that supports live events.
    $.Guards.prototype.on = function(selector, event, callback) {
        if ($.fn.on) {
            $(document).on(event, selector, callback);
        } else if ($.fn.delegate) {
            $(document).delegate(selector, event, callback);
        } else if ($.fn.live) {
            $(selector).live(event, callback);
        } else {
            this.log("Could not bind live handlers, probably because jQuery is too old.");
        }
    };

    // Utility method to remove live events, but works against any
    // jQuery version that supports live events.
    $.Guards.prototype.off = function(selector, event, callback) {
        if ($.fn.off) {
            $(document).off(event, selector, callback);
        } else if ($.fn.undelegate) {
            $(document).undelegate(selector, event, callback);
        } else if ($.fn.die) {
            $(selector).die(event, callback);
        } else {
            this.log("Could not unbind live handlers, probably because jQuery is too old.");
        }
    };

    // Implementation of $.enableGuards(selector);
    $.Guards.prototype.enableGuards = function(selector) {
        this.on(selector, "submit", this.defaults.submitCallback);
    };

    // Implementation of $.disableGuards(selector);
    $.Guards.prototype.disableGuards = function(selector) {
        this.off(selector, "submit", this.defaults.submitCallback);
    };

    // Implementation of $.liveGuard(selector);
    $.Guards.prototype.liveGuard = function(selector) {
        this.enableGuards(selector);
        this.on(selector, "change blur", this.defaults.liveCallback);
    };

    // Implementation of $.disableLiveGuard(selector);
    $.Guards.prototype.disableLiveGuard = function(selector) {
        this.disableGuards(selector);
        this.off(selector, "change blur", this.defaults.liveCallback);
    };

    /**
     * Format all arguments into the first argument.  This is a
     * convenience function similar to the C sprintf function, though
     * only with simple replacements.  Replacements are formatted like
     * #{i} where i is a zero based index into the additional
     * arguments passed in to format beyond the first.
     *
     * Additional parameters not used will be ignored.
     *
     * Including formatting requests for parameters that don't exist
     * will throw an exception.
     *
     * The first argument must be the string that needs to be
     * formatted.  Additional arguments are formatted into that
     * string.
     *
     * If any of the arguments to the format string include a string
     * that matches the #{i} format, the result could be erroneous.
     *
     * Example: $.guards.format("#{2} #{0} #{1}", "hello", "world", 3); // "3 hello world"
     * Example: $.guards.format("#{0} #{1}", "hello", "world", 3);      // "hello world".
     * Example: $.guards.format("#{2} #{0} #{1}", "hello", "world");    // throws exception
     */
    $.Guards.prototype.format = function() {
        var str = arguments[0];

        if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
                var regex = "\\#\\{" + (i - 1) + "\\}";
                str = str.replace(new RegExp(regex, "g"), arguments[i]);
            }
        }

        if (/\#\{\d+\}/.test(str)) {
            throw new Error("Unmatched formatting found!");
        }

        return str;
    };

    /**
     * Add a style element to the document head which will style
     * elements with errors and their error messages.  This will use
     * $.guards.defaults.style.field and
     * $.guards.defaults.style.message to determine what styling to
     * use.  These defaults are initialized to a yellow background for
     * the invalid fields, and red color with a small left margin for
     * error messages.  The selectors used to style these are
     * determined by $.guards.defaults.invalidClass and
     * $.guards.defaults.messageClass.
     *
     * There are 2 optional arguments allowed.  The first is a
     * selector scope to use, and the second is overrides for styling.
     * Either, both or neither arguments are allowed.
     *
     * With a changed selector scope, the selector for the styles is
     * scoped to the given value.  This can be useful for different
     * styling on different forms.  Note that the keys to the object
     * in the "field" and "message" keys are used as css styles, and
     * the values to those keys are the values for those styles.
     *
     * The custom style overrides can be used to change the field,
     * message or both styles.
     *
     * Example: $.guards.style();
     * Example: $.guards.style("#myForm");
     * Example: $.guards.style({ field: { "color": "#ff0000" } });
     * Example: $.guards.style({ message: { "color": "#ff6666" } });
     * Example: $.guards.style("#myForm", { field: { "color": "#ff0000" }, message: { "color": "#ff6666" } });
     */
    $.Guards.prototype.style = function() {
        $("head").append(this.styleHtml.apply(this, arguments));
    };

    /**
     * Retrieve the style html as a string to use for the
     * $.guards.style() function.  The documentation for that function
     * applies to this as well.
     */
    $.Guards.prototype.styleHtml = function() {
        var fieldStyle = {};
        var messageStyle = {};
        var fieldSelector = "." + this.defaults.invalidClass;
        var messageSelector = "." + this.defaults.messageClass;
        var selectorScope, styles;

        if (this.defaults.style && this.defaults.style.field) {
            fieldStyle = this.defaults.style.field;
        }

        if (this.defaults.style && this.defaults.style.message) {
            messageStyle = this.defaults.style.message;
        }

        if (arguments.length === 1) {
            if (typeof(arguments[0]) === "string") {
                selectorScope = arguments[0];
            } else {
                styles = arguments[0];
            }
        } else if (arguments.length === 2) {
            selectorScope = arguments[0];
            styles = arguments[1];
        }

        if (styles && styles.field) {
            fieldStyle = styles.field;
        }

        if (styles && styles.message) {
            messageStyle = styles.message;
        }

        var result = "<style>\n";

        var addStyles = function(selector, styles) {
            result += "  " + selector + " {";

            if (styles) {
                $.each(styles, function(key, value) {
                    result += " " + key + ": " + value +  ";";
                });
            }

            result += " }\n";
        };

        if (selectorScope) {
            fieldSelector = selectorScope + " " + fieldSelector;
            messageSelector = selectorScope + " " + messageSelector;
        }

        addStyles(fieldSelector, fieldStyle);
        addStyles(messageSelector, messageStyle);
        result += "</style>";
        return result;
    };

    /**
     * This guard test method is intended to always fail, thus it
     * returns false no matter what.
     */
    $.Guards.prototype.always = function() {
        return false;
    };

    /**
     * Return whether or not the value exists in the given allowed
     * list.  The allowed parameter must be an array of valid values.
     * Blank is considered invalid unless it exists in the list.
     * Whitespace is ignored.
     */
    $.Guards.prototype.isAllowed = function(value, allowed) {
        value = $.trim(value);
        return $.inArray(value, $.map(allowed, function(x) { return $.trim("" + x); })) !== -1;
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
     * Example: $.guards.isAnyValid([false, false, true], function(x) { return x; }); // true
     * Example: $.guards.isAnyValid(false, function(x) { return x; });                // false
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
        return this.isNullOrUndefined(value) || $.trim(value) === "";
    };

    /**
     * Return whether all the values in the given array are different.
     */
    $.Guards.prototype.isDifferent = function(values) {
        if (values.length < 2) {
            return true;
        }

        var found = {};
        var result = true;

        $.each(values, function(i, x) {
            if (found[x] === true) {
                result = false;
                return false;
            }

            found[x] = true;
        });

        return result;
    };

    /**
     * Return whether or not the value doesn't exist in the given
     * disallowed list.  The disallowed parameter must be an array of
     * invalid values.  Blank is considered valid unless it exists in
     * the list.  Whitespace is ignored.
     */
    $.Guards.prototype.isDisallowed = function(value, disallowed) {
        return !this.isAllowed(value, disallowed);
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
        return !this.isBlank(value);
    };

    /**
     * Return whether all the values in the given array are the same.
     */
    $.Guards.prototype.isSame = function(values) {
        if (values.length < 2) {
            return true;
        }

        var value = values[0];
        var result = true;

        $.each(values, function(i, x) {
            if (x !== value) {
                result = false;
                return false;
            }
        });

        return result;
    };

    /**
     * Return true if the given value is greater than or equal to
     * options.min (if options.min is defined) and less than or equal
     * to options.max (if options.max is defined).
     */
    $.Guards.prototype.isInRange = function(value, options) {
        if (this.isNullOrUndefined(options)) {
            options = {};
        }

        var bigEnough = this.isNullOrUndefined(options.min) || value >= options.min;
        var smallEnough = this.isNullOrUndefined(options.max) || value <= options.max;
        return bigEnough && smallEnough;
    };

    /**
     * Return whether or not the value is a valid integer.
     * Appropriate options are min, max, both or neither.  Blank is
     * valid as a number.
     */
    $.Guards.prototype.isValidInt = function(value, options) {
        value = $.trim(value);

        if (value === "") {
            return true;
        }

        if (!/^(-|\+)?\d+$/.test(value)) {
            return false;
        }

        value = parseInt(value, 10);
        return this.isInRange(value, options);
    };

    /**
     * Return whether or not the value is a valid float.  Appropriate
     * options are min, max, both or neither.  Blank is valid as a
     * number.
     */
    $.Guards.prototype.isValidFloat = function(value, options) {
        value = $.trim(value);

        if (value === "") {
            return true;
        }

        if (!/^(-|\+)?(\d+)?\.?\d+$/.test(value)) {
            return false;
        }

        value = parseFloat(value);
        return this.isInRange(value, options);
    };

    /**
     * Validates the given value is a valid US money value.  It
     * optionally accepts min and max to specify the minimum or
     * maximum values.  Blank is a valid money.
     */
    $.Guards.prototype.isValidMoneyUS = function(value, options) {
        value = $.trim(value);

        if (value === "") {
            return true;
        }

        if (!/^\$?(-|\+)?\$?([\d,]+)?\.?\d+$/.test(value)) {
            return false;
        }

        // Only allow 1 $.
        var $i = value.indexOf("$");
        if ($i >= 0 && value.indexOf("$", $i + 1) >= 0) {
            return false;
        }

        // Ensure if there are commas they are every 3 digits
        if (value.indexOf(",") >= 0 && !/^\$?(-|\+)?\$?[1-9]\d{0,2}(,\d{3,3})+(\.\d+)?$/.test(value)) {
            return false;
        }

        // Ensure no more than 2 digits after decimal
        if (value.indexOf(".") >= 0 && /\.\d{3,}$/.test(value)) {
            return false;
        }

        value = parseFloat(value.replace(/[\$,]/g, ""));
        return this.isInRange(value, options);
    };

    /**
     * Validates the given value is a valid email.  If options is
     * passed with allowDisplay as true, display emails will be
     * considered valid.  A display email differs from a regular email
     * in that it can be contained with < and > with some text ahead
     * of that.  Thus "John Doe <jdoe@example.com>" would be valid.
     */
    $.Guards.prototype.isValidEmail = function(value, options) {
        if (options && options.allowDisplay) {
            var result = /.*<([^>]+)>\s*$/.exec(value);

            if (result) {
                value = result[1];
            }
        }

        return value === "" || /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(value);
    };

    /**
     * Validates the given value is a valid US phone number.
     */
    $.Guards.prototype.isValidPhoneUS = function(value) {
        value = value.replace(/\s+/g, "");
        return value === "" || value.length > 9 &&
              value.match(/^(1-?)?(\([2-9]\d{2}\)|[2-9]\d{2})-?[2-9]\d{2}-?\d{4}$/);
    };

    /**
     * Return whether or not the value is a valid string.  Appropriate
     * options are min or max (or both).  Whitespace is not
     * considered.
     */
    $.Guards.prototype.isValidString = function(value, options) {
        value = $.trim(value);
        return this.isValidInt("" + value.length, options);
    };

    /**
     * This guard test method is intended to never fail, thus it
     * returns true no matter what.  It is intended to be used to set
     * up a guard that is triggered manually via triggerError().
     */
    $.Guards.prototype.never = function() {
        return true;
    };

    /**
     * This is a utility function to act like isAnyValid or
     * isAllValid, except instead of aggregating the function results,
     * it passes the arguments on to the function and returns the
     * results.  It makes the argument an array always.
     *
     * Example: $.guards.passThrough([true, false, true], function(x) { return x[1]; }); // false
     * Example: $.guards.passThrough(true, function(x) { return x[0]; });                // true
     */
    $.Guards.prototype.passThrough = function(values, fn) {
        if (!$.isArray(values)) {
            values = [values];
        }

        return fn(values);
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
        var fields = form.guardableFields().clearErrors();
        var result = this.applyGuards(function() { return fields; });
        fields.filter(":visible:has-error").eq(0).focus();
        return result;
    };

    /**
     * Apply all the guards to the fields returned from the given
     * callback.  The callback will receive the guard, and is expected
     * to return the fields to guard against.  If it returns false,
     * that guard is skipped and does not affect the return value.
     */
    $.Guards.prototype.applyGuards = function(callback) {
        var result = true;
        var self = this;

        $.each(this._guards, function(index, guard) {
            var fields = callback(guard);

            if (fields !== false && !self.test(guard, fields)) {
                result = false;
            }
        });

        return result;
    };

    /**
     * Use the given guard to test the given guarded fields.  Errors
     * will be applied if the field doesn't have an error yet.
     */
    $.Guards.prototype.test = function(guard, fields) {
        if (guard.isGrouped()) {
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

    $.Guard = function(selector, guards, named) {
        this._named = named;
        this._guards = guards || $.guards;
        this._selector = selector;
        this._guard = null;

        if (!named) {
            this.using(this._guards.defaults.guard);
        }
    };

    $.Guard.prototype.cloneGuard = function(guard, args) {
        var self = this;
        var namedGuard = this._guards.named[guard];

        if (this._guards.isNullOrUndefined(namedGuard)) {
            throw new Error("There is no named guard '" + guard + "'");
        }

        var copyAttribute = function(attribute) {
            if (self[attribute] !== undefined || namedGuard[attribute] === undefined) {
                return;
            }

            self[attribute] = namedGuard[attribute];
        };

        copyAttribute("_grouped");
        copyAttribute("_tag");
        copyAttribute("_messageClass");
        copyAttribute("_invalidClass");
        copyAttribute("_target");
        copyAttribute("_precondition");
        this._guard = namedGuard._guard;
        this.name = guard;

        if (this._guard.acceptsArguments) {
            this._guard = this._guard.apply(this._guards, args);
        }

        if ($.isFunction(namedGuard._message)) {
            return this.message(namedGuard._message.apply(this._guards, args));
        } else {
            return this.message(namedGuard._message);
        }
    };

    /**
     * Guard inputs using a specified guard.  The guard may be either
     * a string or a function.  When it is a string, it must match a
     * named guard defined via $.guards.name(), or already defined in
     * the $.guards.named hash.  The function is expected to have 2
     * arguments.  The first is the value of the element being
     * guarded, and the second is the actual element.  If grouped is
     * true, it will be an array of all matched values and all matched
     * elements (the order of values will match the order of
     * elements).  Radio buttons are passed as separate values and
     * elements, but the value of each will be the same.
     * Specifically, the value of the checked radio button is the
     * value used, unless none are checked, in which case
     * $.guards.constants.notChecked will be used (which is predefined
     * as an empty string).
     *
     * Note that the message is implicitly set when this method is
     * called.  If the guard is a string, the message will be set to
     * $.guards.defaults.messages[guard].  If it is a function, it
     * will be set to $.guards.defaults.messages["undefined"].
     *
     * Example: $.guard(".required").using("required");
     * Example: $.guard(".required").using(function(value, element) {
     *   return $.inArray("invalid", values) == -1;
     * });
     */
    $.Guard.prototype.using = function(guard) {
        if (typeof(guard) === "string") {
            var args = [];

            if (arguments.length > 1) {
                args = $.makeArray(arguments).slice(1);
            }

            return this.cloneGuard(guard, args);
        }

        this._guard = guard;
        return this.message(this._guards.defaults.messages["undefined"]);
    };

    $.Guard.prototype.getPrecondition = function() {
        if (this._precondition === undefined) {
            return this._guards.defaults.precondition;
        }

        return this._precondition;
    };

    /**
     * Specify a precondition for this guard.  The precondition should
     * be a function that accepts the element and element value as the
     * parameters, like a custom guard function.  The precondition is
     * executed before the guard when any given input is about to be
     * guarded.  If the precondition returns false explicitly, the
     * guard will not be executed and the field will be considered
     * valid.  Any other return value means the precondition passed
     * (even no return).  If the guard is grouped, the parameters will
     * be the array of values and elements (like for a custom guard
     * function).
     *
     * // Only require this if #other_element is checked.
     * Example: $.guard(".required").using("required").precondition(function(value, element) {
     *   return $("#other_element").is(":checked");
     * });
     *
     * @since 0.4
     */
    $.Guard.prototype.precondition = function(fn) {
        this._precondition = fn;
        return this;
    };

    /**
     * Return whether or not this guard is grouped.
     */
    $.Guard.prototype.isGrouped = function() {
        if (this._grouped === undefined) {
            return this._guards.defaults.grouped;
        }

        return this._grouped;
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
        if (arguments.length === 0) {
            return this.grouped(true);
        }

        this._grouped = arguments[0];
        return this;
    };

    $.Guard.prototype.getTag = function() {
        if (this._tag === undefined) {
            return this._guards.defaults.tag;
        }

        return this._tag;
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

    $.Guard.prototype.getMessageClass = function() {
        if (this._messageClass === undefined) {
            return this._guards.defaults.messageClass;
        }

        return this._messageClass;
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
     * $.guards.defaults.messages["undefined"].
     *
     * Example: $.guard(".required").using("required").message("Enter something!");
     */
    $.Guard.prototype.message = function(message) {
        this._message = message;
        return this.resetMessageFn();
    };

    $.Guard.prototype.getInvalidClass = function() {
        if (this._invalidClass === undefined) {
            return this._guards.defaults.invalidClass;
        }

        return this._invalidClass;
    };

    $.Guard.prototype.invalidClass = function(invalidClass) {
        this._invalidClass = invalidClass;
        return this;
    };

    $.Guard.prototype.resetMessageFn = function() {
        var self = this;
        return this.messageFn(function() {
            return $('<' + self.getTag() + ' class="' + self.getMessageClass() + '"/>').html(self._message);
        });
    };

    $.Guard.prototype.messageFn = function(messageFn) {
        this._messageFn = messageFn;
        return this;
    };

    $.Guard.prototype.errorElement = function() {
        var element = this._messageFn();
        element[0].isGuardError = true;
        return element;
    };

    $.Guard.prototype.attachError = function(elements, errorElement) {
        var target = this.getTarget();

        if (target && $.isFunction(target)) {
            var result = target.call(elements, errorElement);

            if (result !== false) {
                errorElement.appendTo($(result).eq(0));
            }
        } else if (target) {
            errorElement.appendTo($(target).eq(0));
        } else {
            throw new Error("The target must be a function or selector!");
        }
    };

    $.Guard.prototype.getTarget = function() {
        if (this._target === undefined) {
            return this._guards.defaults.target;
        }

        return this._target;
    };

    /**
     * Set the target for where error messages should be appended to.
     * By default, the error is placed after the error element, but
     * when a target is specified, the error is appended within.  The
     * target may be either a selector, function, element or set of
     * elements, however, only the first element is used as the target
     * location for errors.  If a function is specified, it will be
     * called when there is a new error with the invalid element (or
     * set of elements if it is a grouped guard) as the "this"
     * reference.  The returned value should be a single element,
     * though if an array of elements is returned (or a jQuery
     * selected set of elements), only the first element will be used
     * as the target.  Alternatively the function can take a single
     * argument that specifies the error element to add to the DOM,
     * and the function is expected to add the element and return
     * false (indicating that it has taken care of adding the error
     * element).
     *
     * The default target is a function that appends the error after
     * the last element and returns false.  The default can be changed
     * via $.guards.defaults.target.
     *
     * Example: $.guard(".required").using("required").target("#my-errors");
     * Example: $.guard(".required").using("required").target(function() { return $(this).nextAll(".error:eq(0)"); });
     * Example: $.guard(".required").using("required").target(function(errorElement) {
     *            errorElement.appendTo($("#myErrors"));
     *            return false;
     *          });
     */
    $.Guard.prototype.target = function(target) {
        this._target = target;
        return this;
    };

    /**
     * Determine if this guard applies to the given element (or
     * elements).
     */
    $.Guard.prototype.appliesTo = function(element) {
        return $(element).filter(this._selector).size() > 0;
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

        if ($elements.size() === 0) {
            return true;
        }

        if (!this._guards.options.stackErrors && $elements.hasErrors()) {
            return false;
        }

        var result, elements, values;

        // Grouped expects a group of elements, while non-grouped
        // expects a single element.
        if (this.isGrouped()) {
            values = [];
            elements = [];

            $elements.each(function() {
                values.push($(this).inputValue(this._guards));
                elements.push(this);
            });
        } else {
            values = $elements.inputValue(this._guards);
            elements = element;
        }

        if (!this.testPrecondition(values, elements)) {
            result = true;
        } else {
            try {
                result = this._guard(values, elements);
            } catch(e) {
                this._guards.log("A guard threw an error: " + e);
                result = false;
            }
        }

        if (!result) {
            this.triggerError($elements);
        }

        return result;
    };

    /**
     * Test this precondition, if there is one.  Returns true if there
     * is no precondition, or if the precondition doesn't return
     * false.  Returns false if the precondition throws an exception
     * or if the precondition returned false.  No return of the
     * precondition (or return value of undefined, null or 0) is
     * considered passing.
     */
    $.Guard.prototype.testPrecondition = function(values, elements) {
        var precondition = this.getPrecondition();

        if (!precondition) {
            return true;
        }

        try {
            return precondition(values, elements) !== false;
        } catch(e) {
            this._guards.log("A precondition threw an error: " + e);
            return false;
        }
    };

    /**
     * Explicitly trigger the error for this guard on all the elements
     * provided to this function.  The elements are wrapped with a
     * jQuery object, so they may be a single element, a list of
     * elements, a jQuery selected set of elements, or even a valid
     * jQuery selector.  Note that the elements don't have to be valid
     * for this guard to be applied.
     */
    $.Guard.prototype.triggerError = function() {
        var elements;

        if (arguments.length === 0) {
            elements = this._selector;
        } else if (arguments.length === 1) {
            elements = arguments[0];
        } else {
            throw new Error("Expected 0 or 1 argument to triggerError, got " + arguments.length);
        }

        if (this.isGrouped()) {
            $(elements).addSingleError(this);
        } else {
            $(elements).addError(this);
        }

        return this;
    };

    $.Guard.prototype.sendEvent = function(name, selectedElements, forForm, errorMessageElement) {
        var event = $.Event(name);
        event.guard = this;
        event.errorElements = selectedElements.toArray();
        var target = selectedElements;

        if (forForm) {
            target = target.parents("form");
        }

        if (errorMessageElement) {
            event.errorMessage = $(errorMessageElement)[0];
        }

        target.trigger(event);
        return event;
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

        if (!$(this._element).hasErrorsWithInvalidClass(this._guard.getInvalidClass())) {
            $(this._element).removeClass(this._guard.getInvalidClass());
        }

        this._cleared = true;

        while (this._linked.length > 0) {
            this._linked.shift().clear();
        }
    };

    /**
     * Find any applicable fields for this selected item.  Applicable
     * fields are any inputs, textareas or selects.
     */
    $.fn.guardableFields = function() {
        return this.find(":guardable");
    };

    /**
     * Return the result of guarding the selected form.
     */
    $.fn.guard = function() {
        return $.guards.guard(this);
    };

    /**
     * Explicitly trigger the given guard's error all the selected
     * elements.  Note that the selected elements don't have to be
     * valid for this guard to be applied.  This is equivalent to
     * calling guard.triggerError($this);
     */
    $.fn.triggerError = function(guard) {
        guard.triggerError(this);
    };

    /**
     * Add a single error message, but mark every selected element as
     * in error pointing to the single error message.  This differs
     * from addError because addError will add a new error message for
     * each selected element instead of just 1.
     */
    $.fn.addSingleError = function(guard) {
        if (this.size() === 0) {
            $.guards.log("Attempted to add error to nothing.");
            return this;
        }

        // Don't add the error if it is already there.
        if (this.hasError(guard)) {
            return this;
        }

        var guardErrorPrevented = guard.sendEvent("guardError", this).isDefaultPrevented();
        var guardFormErrorPrevented = guard.sendEvent("guardFormError", this, true).isDefaultPrevented();

        if (guardErrorPrevented || guardFormErrorPrevented) {
            return this;
        }

        var element = guard.errorElement();
        guard.attachError(this, element);
        this.addClass(guard.getInvalidClass());
        var linked = [];

        this.each(function() {
            if (!this.errors) {
                this.errors = [];
            }

            var error = new $.GuardError(guard, this, element, linked);
            linked.push(error);
            this.errors.push(error);
        });

        guard.sendEvent("afterGuardError", this, false, element);
        guard.sendEvent("afterGuardFormError", this, true, element);
        return this;
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
     * Determine if the given guard already has an error in the
     * selected elements.
     */
    $.fn.hasError = function(guard) {
        var result = false;

        $.each(this.errors(), function(i, error) {
            if (error._guard === guard) {
                result = true;
                return false;
            }
        });

        return result;
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
            if (error._guard.getInvalidClass() === invalidClass) {
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

            if (checked.size() === 0) {
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
        return this.bind("submit", $.guards.defaults.submitCallback);
    };

    /**
     * Disable form submit callbacks set up via the enableGuards
     * function.
     */
    $.fn.disableGuards = function() {
        return this.unbind("submit", $.guards.defaults.submitCallback);
    };

    /**
     * Enable guards for any form that matches the given selector.
     * This uses live events to catch submit on forms matching the
     * selector.
     */
    $.enableGuards = function(selector) {
        $.guards.enableGuards(selector);
    };

    /**
     * Disable the live events set up via $.enableGuards.
     */
    $.disableGuards = function(selector) {
        $.guards.disableGuards(selector);
    };

    /**
     * Live guard the form(s) in the given selector.  This will bind
     * live on change and blur events that will guard the elements
     * when they change.  It will also guard the form when it is
     * submitted.
     */
    $.liveGuard = function(selector) {
        $.guards.liveGuard(selector);
    };

    /**
     * Disable live guard events that were enabled via $.liveGuard.
     */
    $.disableLiveGuard = function(selector) {
        $.guards.disableLiveGuard(selector);
    };

    $.extend($.expr[":"], {
        "has-error": function(x) {
            return !!(x.errors && x.errors.length > 0);
        },
        "guardable": function(x) {
            return x.tagName.toLowerCase() === "input" || x.tagName.toLowerCase() === "textarea" || x.tagName.toLowerCase() === "select";
        }
    });

    $.guards = new $.Guards();

    // Clear errors when the user expresses intent to fix the errors.
    var clearFn = function() { $(this).clearErrors(); };
    $.guards.on(":has-error", "change", clearFn);
    $.guards.on(":has-error:radio,:has-error:checkbox", "mouseup", clearFn);
    $.guards.on("select:has-error", "mousedown", clearFn);

    // Make sure we don't clear it if there was no error when the
    // keydown happened, otherwise a submit on enter will have the
    // error flash and then go away on the keyup.
    $.guards.on(":has-error", "keydown", function() { this.clearable = true; });
    $.guards.on(":has-error", "keyup", function() {
        if (this.clearable) {
            this.clearable = false;
            $(this).clearErrors();
        }
    });
})(jQuery);
