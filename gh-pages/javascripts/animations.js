$(function() {
    function Animation(frames) {
        this.frames = frames;
    }

    Animation.prototype.animate = function(selector) {
        if (animating) {
            return;
        }

        var selected = $(selector);
        animating = true;

        $.each(this.frames, function(i, frame) {
            frame.queue(selected);
        });

        $(selector).queue(function() {
            var $this = $(this);
            sprites.normal.apply($this);
            $this.dequeue();
            animating = false;
        });
    };

    function Frame(sprite, duration) {
        this.sprite = sprite;
        this.duration = duration;
    }

    Frame.prototype.queue = function(selected) {
        var self = this;

        selected.queue(function() {
            var $this = $(this);
            self.sprite.apply($this);
            $this.dequeue();
        }).delay(this.duration);
    };

    function Sprite(index) {
        this.index = index;
    }

    Sprite.prototype.apply = function(element) {
        var x = this.index * -131;
        var y = 0;
        element.css("background-position", x + "px " + y + "px");
    };

    var animating = false;

    var sprites = {
        normal: new Sprite(0),
        jumpUp: new Sprite(1),
        jumpDown: new Sprite(2),
        attention: new Sprite(3),
        salute: new Sprite(4),
        bathroom: new Sprite(5)
    };

    var animations = {
        jump: new Animation([new Frame(sprites.jumpUp, 1000), new Frame(sprites.jumpDown, 1000)]),
        attention: new Animation([new Frame(sprites.attention, 1000)]),
        salute: new Animation([new Frame(sprites.salute, 1000)]),
        bathroom: new Animation([new Frame(sprites.bathroom, 1000)])
    };

    var clickAnimations = [animations.attention, animations.salute, animations.bathroom];

    function pickAnimation(choices) {
        var index = Math.floor(Math.random() * choices.length);
        return choices[index];
    }

    $(".header-art").find(".bird, .shadow").click(function() {
        pickAnimation(clickAnimations).animate(".header-art .bird");
    });
});
