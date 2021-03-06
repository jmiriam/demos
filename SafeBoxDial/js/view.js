SafeBoxDial.Dial = Em.ContainerView.extend({
  // Subclasses should override these as appropriate.
  tickCount: 20,
  currentTick: 0,
  radius: 200,

  classNames: ["Dial", "Radial Metal"],

  isActive: false,
  rotation: 0,
  cachedCenter: null,
  cachedDegreesPerTick: 0,

  container: null,

  updateRadius: function () {
    var dimension = this.get("radius") * 2 + "px";
    this.$().css({
      width: dimension,
      height: dimension,
    });
  }.observes("radius"),

  updateTicks: function () {
    var container = this.get("container");
    if (!container || !container.$)
      return;

    var jEl = container.$();
    if (!jEl)
      return;
    var ticks = jEl.children(".Tick");
    var currNumTicks = ticks.length;
    var targetNumTicks = this.get("tickCount");
    var rotationIncrement =  360 / targetNumTicks;

    if (currNumTicks > targetNumTicks) {
      // Remove extra ticks.
    } else if (currNumTicks < targetNumTicks) {
      // Add more ticks.
      for (var i = currNumTicks; i < targetNumTicks; i++) {
        var tick = SafeBoxDial.Tick.create({
          number: i.toString(),
          rotation: rotationIncrement * i,
        });

        if (currNumTicks + i == this.get("currentTick")) {
          tick.reopen({
            didInsertElement: function () {
              this.$().addClass("Selected");
            }
          })
        }

        container.get("childViews").pushObject(tick);
      }
    }

    this.set("cachedDegreesPerTick", 360 / targetNumTicks);
  }.observes("tickCount"),

  updateCurrentTick: function (tick) {
    this.set("currentTick", tick);
    var container = this.get("container");
    container.$().children(".Tick.Selected").removeClass("Selected");
    $(container.$().children(".Tick")[this.get("currentTick")]).addClass("Selected");
  },

  didInsertElement: function () {
    this._super();

    var parent = this;
    var container = Em.ContainerView.create({
      classNames: ["TickContainer"],
      didInsertElement: function () {
        this._super();
        parent.updateTicks();
      },
    });
    this.set("container", container);
    this.get("childViews").pushObject(container);

    this.updateRadius();
  },

  rotate: function (rotation) {
    var oldRotation = this.get("rotation");
    rotation = oldRotation + smallestDeltaInDegrees(oldRotation, rotation);

    this.set("rotation", rotation);
    var rotationCss = "rotate(" + rotation + "deg)";
    this.get("container").$().css({
      "-webkit-transform": rotationCss,
      "-moz-transform": rotationCss,
      "-o-transform": rotationCss,
      "-ms-transform": rotationCss,
    });
  },

  updateRotationForMove: function (x, y, offset) {
    var oldRotation = this.get("rotation");
    var rotation = Math.round(this.angleToPoint({x: x, y: y}) - offset);

    if (Math.abs(rotation - oldRotation) < 1)
      return;

    this.rotate(rotation);

    // Update currentTick.
    var normalizedRotation = normalizeDegrees(rotation);
    var count = this.get("tickCount");
    var tick = (count - Math.ceil(normalizedRotation / this.get("cachedDegreesPerTick") - 0.5)) % count;
    this.updateCurrentTick(tick);
  },

  touchStart: function (e) {
    if (this.get("isActive")) {
      this.touchCancel(e);
      return;
    }

    if (this.$().hasClass("Reset"))
      return;

    this.set("isActive", true);
    this.$().addClass("Active");

    var pointer = e.originalEvent.touches ? e.originalEvent.touches[0] : e;

    var data = {
      responder: this,
      rotationOffset: this.angleToPoint({x: pointer.pageX, y: pointer.pageY}) - this.get("rotation"),
    };

    $("body").on({
      touchmove: function (e) {
        var touch = e.originalEvent.touches[0];
        e.data.responder.updateRotationForMove(touch.pageX, touch.pageY, data.rotationOffset);

        e.preventDefault();
        e.stopPropagation();
      },

      touchcancel: function (e) {
        e.data.responder.touchCancel(e);
      },

      touchend: function (e) {
        e.data.responder.touchEnd(e);
      },

      mousemove: function (e) {
        if (!e.which) {
          e.data.responder.touchEnd(e);
          return;
        }
        e.data.responder.updateRotationForMove(e.pageX, e.pageY, data.rotationOffset);

        e.preventDefault();
        e.stopPropagation();
      },

      mouseup: function (e) {
        e.data.responder.touchEnd(e);
      }
    }, data);
  },

  touchCancel: function (e) {
    this.touchEnd(e);
  },

  touchEnd: function (e) {
    var tickView = this.get("container").$().children(".Tick.Selected");
    var tickEmberView = Em.View.views[tickView.attr("id")];
    var rotation = this.get("rotation");
    var delta = -tickEmberView.get("rotation") - rotation % 360;
    this.rotate(rotation + delta);

    this.cleanUpTouch();
  },

  cleanUpTouch: function () {
    $("body").off("touchmove touchcancel touchend mousemove mouseup");

    this.set("isActive", false);
    this.$().removeClass("Active");

    this.set("cachedCenter", null);
  },

  // For testing only, really
  mouseDown: function (e) {
    this.touchStart(e);
  },

  // Helper functions
  angleToPoint: function (point) {
    // Calculate the current finger rotation offset.
    var center = this.get("cachedCenter");
    if (!center) {
      var el = this.$();
      var offset = el.offset();
      var center = {x: offset.left + el.outerWidth() / 2, y: offset.top + el.outerHeight() / 2}
      this.set("cachedCenter", center);
    }

    // Returns 0 to 360, where 0 points up.
    return degreesFromUp(center.x, center.y, point.x, point.y);
  },
});

SafeBoxDial.Tick = Em.View.extend({
  templateName: "Tick",
  classNames: ["Tick"],

  number: "",
  rotation: 0,

  didInsertElement: function () {
    this._super();
    var rotateCss = "rotate(" + this.get("rotation") + "deg)";
    this.$().css({
      "-webkit-transform": rotateCss,
      "-o-transform": rotateCss,
      "-moz-transform": rotateCss,
      "-ms-transform": rotateCss
    });
  },
});