function stripWhitespaceColumn(text) {
    var column = "";

    for (var i = 0; i < text.length; i++) {
        if (text.charAt(i) == "\n") {
            column = "";
        } else if (text.charAt(i) == " ") {
            column += " ";
        } else {
            break;
        }
    }

    return $.trim(text.replace(new RegExp("^" + column, "gm"), ""));
}

$(function() {
    $(".example .display").each(function() {
        var $this = $(this);
        var text = stripWhitespaceColumn($this.html());
        var $content = $("<code />").text(text);
        $this.parent().prepend($content);
        $content.wrap('<pre class="prettyprint" />').wrap('<div class="source" />');
    });

    prettyPrint();
});
