/** js sequence diagrams
 *  https://bramp.github.io/js-sequence-diagrams/
 *  (c) 2012-2017 Andrew Brampton (bramp.net)
 *  Simplified BSD license.
 */
/*global Diagram, Snap, WebFont _ */
// TODO Move defintion of font onto the <svg>, so it can easily be override at each level
if (typeof Snap != 'undefined') {

  var xmlns = 'http://www.w3.org/2000/svg';

  var LINE = {
    'stroke': '#000000',
    'stroke-width': 2, // BUG TODO This gets set as a style, not as a attribute. Look at  eve.on("snap.util.attr"...
    'fill': 'none'
  };

  var RECT = {
        'stroke': '#000000',
        'stroke-width': 2,
        'fill': '#fff'
      };

  var LOADED_FONTS = {};

  /******************
   * SnapTheme
   ******************/

  var SnapTheme = function(diagram, options, resume) {
        _.defaults(options, {
            'css-class': 'simple',
            'font-size': 20,
            'font-family': 'Andale Mono, monospace',
			'font-weight': 450,
			'color': '#000000'
          });

        this.init(diagram, options, resume);
      };

  _.extend(SnapTheme.prototype, BaseTheme.prototype, {

    init: function(diagram, options, resume) {
            BaseTheme.prototype.init.call(this, diagram);

            this.paper_  = undefined;
            this.cssClass_ = options['css-class'] || undefined;
            this.font_ = {
                'font-size': options['font-size'],
                'font-family': options['font-family'],
				'font-weight': options['font-weight'],
				'color': options['color']
              };

            var a = this.arrowTypes_ = {};
            a[ARROWTYPE.FILLED] = 'Block';
            a[ARROWTYPE.OPEN]   = 'Open';

            var l = this.lineTypes_ = {};
            l[LINETYPE.SOLID]  = '';
            l[LINETYPE.DOTTED] = '6,2';

            var that = this;
            this.waitForFont(function() {
              resume(that);
            });
          },

    // Wait for loading of the font
    waitForFont: function(callback) {
      var fontFamily = this.font_['font-family'];

      if (typeof WebFont == 'undefined') {
        throw new Error('WebFont is required (https://github.com/typekit/webfontloader).');
      }

      if (LOADED_FONTS[fontFamily]) {
        // If already loaded, just return instantly.
        callback();
        return;
      }

      WebFont.load({
          custom: {
              families: [fontFamily] // TODO replace this with something that reads the css
            },
          classes: false, // No need to place classes on the DOM, just use JS Events
          active: function() {
              LOADED_FONTS[fontFamily] = true;
              callback();
            },
          inactive: function() {
              // If we fail to fetch the font, still continue.
              LOADED_FONTS[fontFamily] = true;
              callback();
            }
        });
    },

    addDescription: function(svg, description) {
          var desc = document.createElementNS(xmlns, 'desc');
          desc.appendChild(document.createTextNode(description));
          svg.appendChild(desc);
        },

    setupPaper: function(container) {
      // Container must be a SVG element. We assume it's a div, so lets create a SVG and insert
      var svg = document.createElementNS(xmlns, 'svg');
      container.appendChild(svg);

      this.addDescription(svg, this.diagram.title || '');

      this.paper_ = Snap(svg);
      this.paper_.addClass('sequence');

      if (this.cssClass_) {
        this.paper_.addClass(this.cssClass_);
      }

      this.beginGroup();

      // TODO Perhaps only include the markers if we actually use them.
      var a = this.arrowMarkers_ = {};
      var arrow = this.paper_.path('M 0 0 L 5 2.5 L 0 5 z');
      a[ARROWTYPE.FILLED] = arrow.marker(0, 0, 5, 5, 5, 2.5)
       .attr({id: 'markerArrowBlock'});
	   
	  arrow = this.paper_.path('M 5 0 L 0 2.5 L 5 5 z');
      a[ARROWTYPE.FILLED_INVERTED] = arrow.marker(0, 0, 5, 5, 5, 2.5)
       .attr({id: 'markerArrowBlockInverted'});

      arrow = this.paper_.path('M 9.6,8 1.92,16 0,13.7 5.76,8 0,2.286 1.92,0 9.6,8 z');
      a[ARROWTYPE.OPEN] = arrow.marker(0, 0, 9.6, 16, 9.6, 8)
       .attr({markerWidth: '4', id: 'markerArrowOpen'});
	   
	  arrow = this.paper_.path('M 0,8 7.68,16 9.6,13.7 3.84,8 9.6,2.286 7.68,0 0,8 z');
      a[ARROWTYPE.OPEN_INVERTED] = arrow.marker(0, 0, 9.6, 16, 9.6, 8)
       .attr({markerWidth: '4', id: 'markerArrowOpenInverted'});
	   
      //arrow = this.paper_.path("M 10 0 20 10 10 20 0 10 z");
	  arrow = this.paper_.circle(5, 5, 4.5);
      a[ARROWTYPE.DOT] = arrow.marker(0, 0, 10, 10, 5, 5)
       .attr({markerWidth: '4', id: 'markerDot'});
    },

    layout: function() {
      BaseTheme.prototype.layout.call(this);
      this.paper_.attr({
        width:  this.diagram.width + 'px',
        height: this.diagram.height + 'px'
      });
    },

    textBBox: function(text, font) {
      // TODO getBBox will return the bounds with any whitespace/kerning. This makes some of our aligments screwed up
      var t = this.createText(text, font);
      var bb = t.getBBox();
      t.remove();
      return bb;
    },

    // For each drawn element, push onto the stack, so it can be wrapped in a single outer element
    pushToStack: function(element) {
      this._stack.push(element);
      return element;
    },

    // Begin a group of elements
    beginGroup: function() {
      this._stack = [];
    },

    // Finishes the group, and returns the <group> element
    finishGroup: function() {
      var g = this.paper_.group.apply(this.paper_, this._stack);
      this.beginGroup(); // Reset the group
      return g;
    },

    createText: function(text, font) {
      text = text.split('\n').map(function(x) {
          return x.trim();
      });
      var t = this.paper_.text(0, 0, text);
      t.attr(font || {});
      if (text.length > 1) {
        // Every row after the first, set tspan to be 1.2em below the previous line
        t.selectAll('tspan:nth-child(n+2)').attr({
          dy: '1.2em',
          x: 0
        });
      }

      return t;
    },
	
	getArrowMarkerByArrowTypeAndColor: function(arrowtype, color) {
		if (color === undefined) return this.arrowMarkers_[arrowtype];
		var color_name = color.replace(/[^a-zA-Z0-9-]/g, '_');
		var arrowMarkerKey = arrowtype + '__' + color_name; 
		if (this.arrowMarkers_[arrowMarkerKey] === undefined) {
			var originalArrowMarker = this.arrowMarkers_[arrowtype];
			if (originalArrowMarker === undefined) return undefined;
			var originalArrowMarkerId = originalArrowMarker.attr("id");
			var newMarker = originalArrowMarker.clone();
			newMarker.attr({"id": originalArrowMarkerId + '__' + color_name, "stroke": color, "fill": color}); /* TODO: sometimes we have to set fill instead of stroke? */
			this.arrowMarkers_[arrowMarkerKey] = newMarker;
		}
		return this.arrowMarkers_[arrowMarkerKey];
    },

    drawLine: function(x1, y1, x2, y2, attr, linetype, arrowhead, arrowtail) {
      var line = this.paper_.line(x1, y1, x2, y2).attr(LINE);
	  var color = undefined;
	  
	  if (attr !== undefined) {
		  line.attr(attr);
		  if (attr["stroke"] !== undefined) color = attr["stroke"];
	  }
	  
      if (linetype !== undefined) {
        line.attr('strokeDasharray', this.lineTypes_[linetype]);
      }
      if (arrowhead !== undefined) {
        line.attr('markerEnd', this.getArrowMarkerByArrowTypeAndColor(arrowhead, color));
      }
      if (arrowtail !== undefined) {
        line.attr('markerStart', this.getArrowMarkerByArrowTypeAndColor(arrowtail, color));
      }
	  
      return this.pushToStack(line);
    },

    drawRect: function(x, y, w, h) {
      var rect = this.paper_.rect(x, y, w, h).attr(RECT);
      return this.pushToStack(rect);
    },

    /**
     * Draws text with a optional white background
     * x,y (int) x,y top left point of the text, or the center of the text (depending on align param)
     * text (string) text to print
     * font (Object)
     * align (string) ALIGN_LEFT or ALIGN_CENTER
     */
    drawText: function(x, y, text, font, align) {
      var t = this.createText(text, font);
      var bb = t.getBBox();

      if (align == ALIGN_CENTER) {
        x = x - bb.width / 2;
        y = y - bb.height / 2;
      }

      // Now move the text into place
      // `y - bb.y` because text(..) is positioned from the baseline, so this moves it down.
      t.attr({x: x - bb.x, y: y - bb.y});
      t.selectAll('tspan').attr({x: x});

      this.pushToStack(t);
      return t;
    },

    drawTitle: function() {
      this.beginGroup();
      BaseTheme.prototype.drawTitle.call(this);
      return this.finishGroup().addClass('title');
    },

    drawActor: function(actor, offsetY, height) {
      this.beginGroup();
      BaseTheme.prototype.drawActor.call(this, actor, offsetY, height);
      return this.finishGroup().addClass('actor');
    },

    drawSignal: function(signal, offsetY) {
      this.beginGroup();
      BaseTheme.prototype.drawSignal.call(this, signal, offsetY);
      return this.finishGroup().addClass('signal');
    },

    drawSelfSignal: function(signal, offsetY) {
      this.beginGroup();
      BaseTheme.prototype.drawSelfSignal.call(this, signal, offsetY);
      return this.finishGroup().addClass('signal');
    },

    drawNote: function(note, offsetY) {
      this.beginGroup();
      BaseTheme.prototype.drawNote.call(this, note, offsetY);
      return this.finishGroup().addClass('note');
    },
  });

  /******************
   * SnapHandTheme
   ******************/

  var SnapHandTheme = function(diagram, options, resume) {
        _.defaults(options, {
            'css-class': 'hand',
            'font-size': 20,
            'font-family': 'Raleway Medium', /*danielbd*/
			'font-weight': 450,
			'color': '#000000'
          });

        this.init(diagram, options, resume);
      };

  // Take the standard SnapTheme and make all the lines wobbly
  _.extend(SnapHandTheme.prototype, SnapTheme.prototype, {
    drawLine: function(x1, y1, x2, y2, attr, linetype, arrowhead, arrowtail) {
      var line = this.paper_.path(handLine(x1, y1, x2, y2)).attr(LINE);
	  var color = undefined;
	  
	  if (attr !== undefined) {
		  line.attr(attr);
		  if (attr["stroke"] !== undefined) color = attr["stroke"];
	  }
	  
      if (linetype !== undefined) {
        line.attr('strokeDasharray', this.lineTypes_[linetype]);
      }
      if (arrowhead !== undefined) {
        line.attr('markerEnd', this.getArrowMarkerByArrowTypeAndColor(arrowhead, color));
      }
      if (arrowtail !== undefined) {
        line.attr('markerStart', this.getArrowMarkerByArrowTypeAndColor(arrowtail, color));
      }
      return this.pushToStack(line);
    },

    drawRect: function(x, y, w, h) {
      var rect = this.paper_.path(handRect(x, y, w, h)).attr(RECT);
      return this.pushToStack(rect);
    }
  });

  registerTheme('snapSimple', SnapTheme);
  registerTheme('snapHand',   SnapHandTheme);
}
