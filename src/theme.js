/** js sequence diagrams
 *  https://bramp.github.io/js-sequence-diagrams/
 *  (c) 2012-2017 Andrew Brampton (bramp.net)
 *  Simplified BSD license.
 */
/*global Diagram, _ */

// Following the CSS convention
// Margin is the gap outside the box
// Padding is the gap inside the box
// Each object has x/y/width/height properties
// The x/y should be top left corner
// width/height is with both margin and padding

// TODO
// Image width is wrong, when there is a note in the right hand col
// Title box could look better
// Note box could look better

var DIAGRAM_MARGIN = 10;

var ACTOR_MARGIN   = 10; // Margin around a actor
var ACTOR_PADDING  = 10; // Padding inside a actor

var SIGNAL_MARGIN  = 5; // Margin around a signal
var SIGNAL_PADDING = 5; // Padding inside a signal
var SIGNAL_SPACE_BELOW_TEXT = -8; // Space between text and signal line
var SIGNAL_FORK_FROM_MAIN_LINE_VERTICAL_GAP = 17;

var NOTE_MARGIN   = 10; // Margin around a note
var NOTE_PADDING  = 5; // Padding inside a note
var NOTE_OVERLAP  = 15; // Overlap when using a "note over A,B"

var TITLE_MARGIN   = 0;
var TITLE_PADDING  = 5;

var SELF_SIGNAL_WIDTH = 20; // How far out a self signal goes

var GROUP_TITLE_PADDING = 3;
var GROUP_TITLE_BOTTOM_MARGIN = 6;
var GROUP_BOX_HPADDING = 22;
//var GROUP_BOX_VPADDING = 0;
var GROUP_BOX_VMARGIN = 6;

var PLACEMENT = Diagram.PLACEMENT;
var LINETYPE  = Diagram.LINETYPE;
var ARROWTYPE = Diagram.ARROWTYPE;

var ALIGN_LEFT   = 0;
var ALIGN_CENTER = 1;

function AssertException(message) { this.message = message; }
AssertException.prototype.toString = function() {
  return 'AssertException: ' + this.message;
};

function assert(exp, message) {
  if (!exp) {
    throw new AssertException(message);
  }
}

if (!String.prototype.trim) {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

Diagram.themes = {};
function registerTheme(name, theme) {
  Diagram.themes[name] = theme;
}

/******************
 * Drawing extras
 ******************/

function getCenterX(box) {
  return box.x + box.width / 2;
}

function getCenterY(box) {
  return box.y + box.height / 2;
}

function MostLeftSignal(signals) {
	var extrimum_val = Infinity;
	var extrimum_signal = undefined;
	_.each(signals, _.bind(function(s) {
		if (s.x < extrimum_val) { extrimum_val = s.x; extrimum_signal = s; }
	}));
	return extrimum_signal;
}

function MostRightSignal(signals) {
	var extrimum_val = -Infinity;
	var extrimum_signal = undefined;
	_.each(signals, _.bind(function(s) {
		if (s.x > extrimum_val) { extrimum_val = s.x; extrimum_signal = s; }
	}));
	return extrimum_signal;
}

function merge2SortedArraysWithIndicators(array1, array2, comparator, itemKey, array1IndicatorKey, array2IndicatorKey) {
	var itemKey = itemKey || 'item';
	var array1IndicatorKey = array1IndicatorKey || 'ind1';
	var array2IndicatorKey = array2IndicatorKey || 'ind2';
	var comparator = comparator || (function(a,b) { return (a-b); });
	var mergedArray = [];
	for (var i = 0, j = 0;;) {
		var item = {};
		if (i < array1.length && j < array2.length) {
			var diff = comparator(array1[i], array2[j]);
			if (diff == 0) {
				item[itemKey] = array1[i]; item[array1IndicatorKey] = true; item[array2IndicatorKey] = true;
				i++; j++;
			} else if (diff < 0) {
				item[itemKey] = array1[i]; item[array1IndicatorKey] = true; item[array2IndicatorKey] = false;
				i++;
			} else {
				item[itemKey] = array2[j]; item[array1IndicatorKey] = false; item[array2IndicatorKey] = true;
				j++;
			}
		} else if (i < array1.length) {
			item[itemKey] = array1[i]; item[array1IndicatorKey] = true; item[array2IndicatorKey] = false;
			i++;
		} else if (j < array2.length) {
			item[itemKey] = array2[j]; item[array1IndicatorKey] = false; item[array2IndicatorKey] = true;
			j++;
		} else {
			break;
		}
		mergedArray.push(item);
	}
	return mergedArray;
}
	

/******************
 * SVG Path extras
 ******************/

function clamp(x, min, max) {
  if (x < min) {
    return min;
  }
  if (x > max) {
    return max;
  }
  return x;
}

function wobble(x1, y1, x2, y2) {
  assert(_.every([x1,x2,y1,y2], _.isFinite), 'x1,x2,y1,y2 must be numeric');

  // Wobble no more than 1/40 of the line length
  var factor = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) / 40;
  factor = Math.min(factor, 5);

  // Distance along line where the control points are
  // Clamp between 20% and 80% so any arrow heads aren't angled too much
  var r1 = clamp(Math.random(), 0.2, 0.8);
  var r2 = clamp(Math.random(), 0.2, 0.8);

  var xfactor = Math.random() > 0.5 ? factor : -factor;
  var yfactor = Math.random() > 0.5 ? factor : -factor;

  var p1 = {
    x: (x2 - x1) * r1 + x1 + xfactor,
    y: (y2 - y1) * r1 + y1 + yfactor
  };

  var p2 = {
    x: (x2 - x1) * r2 + x1 - xfactor,
    y: (y2 - y1) * r2 + y1 - yfactor
  };

  return 'C' + p1.x.toFixed(1) + ',' + p1.y.toFixed(1) + // start control point
         ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1) + // end control point
         ' ' + x2.toFixed(1) + ',' + y2.toFixed(1);      // end point
}

/**
 * Draws a wobbly (hand drawn) rect
 */
function handRect(x, y, w, h) {
  assert(_.every([x, y, w, h], _.isFinite), 'x, y, w, h must be numeric');
  return 'M' + x + ',' + y +
   wobble(x, y, x + w, y) +
   wobble(x + w, y, x + w, y + h) +
   wobble(x + w, y + h, x, y + h) +
   wobble(x, y + h, x, y);
}

/**
 * Draws a wobbly (hand drawn) line
 */
function handLine(x1, y1, x2, y2) {
  assert(_.every([x1,x2,y1,y2], _.isFinite), 'x1,x2,y1,y2 must be numeric');
  return 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) + wobble(x1, y1, x2, y2);
}

/******************
 * BaseTheme
 ******************/

var BaseTheme = function(diagram, options) {
  this.init(diagram, options);
};

_.extend(BaseTheme.prototype, {

  // Init called while creating the Theme
  init: function(diagram, options) {
    this.diagram = diagram;

    this.actorsHeight_  = 0;
    this.signalsHeight_ = 0;
    this.title_ = undefined; // hack - This should be somewhere better
  },

  setupPaper: function(container) {},

  draw: function(container) {
    this.setupPaper(container);

    this.layout();

    var titleHeight = this.title_ ? this.title_.height : 0;
    var y = DIAGRAM_MARGIN + titleHeight;

    this.drawTitle();
    this.drawActors(y);
    this.drawSignals(y + this.actorsHeight_);
  },

  layout: function() {
    // Local copies
    var diagram = this.diagram;
    var font    = this.font_;
    var actors  = diagram.actors;
    var signals = diagram.signals;

    diagram.width  = 0; // min width
    diagram.height = 0; // min height
	
	this.diagram.default_styles = { 
		'font-family': this.font_['font-family'],
		'font-size': this.font_['font-size'],
		'font-width': this.font_['font-width'],
		'color': this.font_['color'],
		
		'stroke': '#000000',
		'stroke-width': 2,
		'fill': 'none',
		
		'Note__fill': '#fff',
		'GroupTitle__fill': '#fff',
	};

    // Setup some layout stuff
    if (diagram.title) {
      var title = this.title_ = {};
      var font = this.diagram.root_block.getFontStyle('Title', this.diagram.default_styles);
	  var bb = this.textBBox(diagram.title, font);
      title.textBB = bb;
      title.message = diagram.title;

      title.width  = bb.width  + (TITLE_PADDING + TITLE_MARGIN) * 2;
      title.height = bb.height + (TITLE_PADDING + TITLE_MARGIN) * 2;
      title.x = DIAGRAM_MARGIN;
      title.y = DIAGRAM_MARGIN;

      diagram.width  += title.width;
      diagram.height += title.height;
    }

    _.each(actors, _.bind(function(a) {
      var font = this.diagram.root_block.getFontStyle('Actor', this.diagram.default_styles);
      var bb = this.textBBox(a.name, font);
      a.textBB = bb;

      a.x = 0; a.y = 0;
      a.width  = bb.width  + (ACTOR_PADDING + ACTOR_MARGIN) * 2;
      a.height = bb.height + (ACTOR_PADDING + ACTOR_MARGIN) * 2;

      a.distances = [];
      a.paddingRight = 0;
      this.actorsHeight_ = Math.max(a.height, this.actorsHeight_);
    }, this));

    function actorEnsureDistance(a, b, d) {
      assert(a < b, 'a must be less than or equal to b');

      if (a < 0) {
        // Ensure b has left margin
        b = actors[b];
        b.x = Math.max(d - b.width / 2, b.x);
      } else if (b >= actors.length) {
        // Ensure a has right margin
        a = actors[a];
        a.paddingRight = Math.max(d, a.paddingRight);
      } else {
        a = actors[a];
        a.distances[b] = Math.max(d, a.distances[b] ? a.distances[b] : 0);
      }
    }
	
    _.each(signals, _.bind(function(s) {
      // Indexes of the left and right actors involved
      var a;
      var b;

      var font = s.parentBlock.getFontStyle(s.type, this.diagram.default_styles);
	  var bb = this.textBBox(s.message, font);

      s.textBB = bb;
      s.width   = bb.width;
      s.height  = bb.height;
	  s.textHeight = bb.height;
	  s.textWidth = bb.width;

      var extraWidth = 0;

      if (s.type == 'Signal') {

        s.width  += (SIGNAL_MARGIN + SIGNAL_PADDING) * 2;
        s.height += (SIGNAL_MARGIN + SIGNAL_PADDING) * 2 + SIGNAL_SPACE_BELOW_TEXT;
		
		if (s.useFeedArrows()) s.height += SIGNAL_FORK_FROM_MAIN_LINE_VERTICAL_GAP;
		if (s.targetActors.length > 1) s.height += SIGNAL_FORK_FROM_MAIN_LINE_VERTICAL_GAP;
		
		if (s.targetActors) {
		}

        if (s.isOnlySelf()) {
          // TODO Self signals need a min height
          a = s.sourceActors[0].index;
          b = a + 1;
          s.width += SELF_SIGNAL_WIDTH;
        } else {
          a = s.actorsMinIdx();
          b = s.actorsMaxIdx();
        }

      } else if (s.type == 'Note') {
        s.width  += (NOTE_MARGIN + NOTE_PADDING) * 2;
        s.height += (NOTE_MARGIN + NOTE_PADDING) * 2;

        // HACK lets include the actor's padding
        extraWidth = 2 * ACTOR_MARGIN;

        if (s.placement == PLACEMENT.LEFTOF) {
          b = s.actor.index;
          a = b - 1;
        } else if (s.placement == PLACEMENT.RIGHTOF) {
          a = s.actor.index;
          b = a + 1;
        } else if (s.placement == PLACEMENT.OVER && s.hasManyActors()) {
          // Over multiple actors
          a = Math.min(s.actor[0].index, s.actor[1].index);
          b = Math.max(s.actor[0].index, s.actor[1].index);

          // We don't need our padding, and we want to overlap
          extraWidth = -(NOTE_PADDING * 2 + NOTE_OVERLAP * 2);

        } else if (s.placement == PLACEMENT.OVER) {
          // Over single actor
          a = s.actor.index;
          actorEnsureDistance(a - 1, a, s.width / 2);
          actorEnsureDistance(a, a + 1, s.width / 2);
          
		  s.y_offset = s.parentBlock.getYOffsetForNextSon(s);
		  s.parentBlock.updateHeight();

          return; // Bail out early
        }
      } else if (s.type == 'Space') {
	    s.height = s.spaceSize;
	  } else if (s.type == 'MinWidth') {
	    s.height = 0;
		a = s.actor.index;
		actorEnsureDistance(a - 1, a, s.minWidth / 2);
		actorEnsureDistance(a, a + 1, s.minWidth / 2);
	  } else if (s.type == 'GroupTitle') {
	    s.width  += (GROUP_TITLE_PADDING) * 2;
        s.height += (GROUP_TITLE_PADDING) * 2 + GROUP_TITLE_BOTTOM_MARGIN;
	  } else if (s.type == 'GroupBox') {
	    s.width = 0; // will be determined in the drawing
		// TODO: get min+max actors of parentBlock and ensure left+right paddings for them.
        s.height = s.parentBlock.height + 2*GROUP_BOX_VMARGIN; // TODO: maybe bottom padding?
	  } else {
        throw new Error('Unhandled signal type:' + s.type);
      }

	  if (s.type == 'Signal' || s.type == 'Note') {
		actorEnsureDistance(a, b, s.width + extraWidth);
	  }
	  
	  s.y_offset = s.parentBlock.getYOffsetForNextSon(s);
	  s.parentBlock.updateHeight();
      
    }, this));
	
	this.signalsHeight_ += diagram.root_block.height;

    // Re-jig the positions
    var actorsX = 0;
    _.each(actors, function(a) {
      a.x = Math.max(actorsX, a.x);

      // TODO This only works if we loop in sequence, 0, 1, 2, etc
      _.each(a.distances, function(distance, b) {
        // lodash (and possibly others) do not like sparse arrays
        // so sometimes they return undefined
        if (typeof distance == 'undefined') {
          return;
        }

        b = actors[b];
        distance = Math.max(distance, a.width / 2, b.width / 2);
        b.x = Math.max(b.x, a.x + a.width / 2 + distance - b.width / 2);
      });

      actorsX = a.x + a.width + a.paddingRight;
    });

    diagram.width = Math.max(actorsX, diagram.width);

    // TODO Refactor a little
    diagram.width  += 2 * DIAGRAM_MARGIN;
    diagram.height += 2 * DIAGRAM_MARGIN + 2 * this.actorsHeight_ + this.signalsHeight_;

    return this;
  },

  // TODO Instead of one textBBox function, create a function for each element type, e.g
  //      layout_title, layout_actor, etc that returns it's bounding box
  textBBox: function(text, font) {},

  drawTitle: function() {
    var title = this.title_;
    if (title) {
      this.drawTextBox(title, title.message, TITLE_MARGIN, TITLE_PADDING, this.font_, ALIGN_LEFT);
    }
  },

  drawActors: function(offsetY) {
    var y = offsetY;
	var style = this.diagram.root_block.getDrawingStyle('Participant', this.diagram.default_styles);
    _.each(this.diagram.actors, _.bind(function(a) {
      // Top box
      this.drawActor(a, y, this.actorsHeight_);

      // Bottom box
      this.drawActor(a, y + this.actorsHeight_ + this.signalsHeight_, this.actorsHeight_);

      // Veritical line
      var aX = getCenterX(a);
      this.drawLine(
       aX, y + this.actorsHeight_ - ACTOR_MARGIN,
       aX, y + this.actorsHeight_ + ACTOR_MARGIN + this.signalsHeight_).attr(style);
    }, this));
  },

  drawActor: function(actor, offsetY, height) {
    actor.y      = offsetY;
    actor.height = height;
	var font = this.diagram.root_block.getFontStyle('Participant', this.diagram.default_styles);
	var rectStyle = this.diagram.root_block.getDrawingStyle('Participant', this.diagram.default_styles);
    this.drawTextBox(actor, actor.name, ACTOR_MARGIN, ACTOR_PADDING, font, ALIGN_CENTER, rectStyle);
  },

  drawSignals: function(offsetY) {
    _.each(this.diagram.signals, _.bind(function(s) {
	  var y = s.y_offset + offsetY;
	  
      // TODO Add debug mode, that draws padding/margin box
      if (s.type == 'Signal') {
        if (s.isOnlySelf()) {
          this.drawSelfSignal(s, y);
        } else {
          this.drawSignal(s, y);
        }
      } else if (s.type == 'Note') {
        this.drawNote(s, y);
      } else if (s.type == 'Space') {
        /* Do nothing.. */
      } else if (s.type == 'GroupBox') {
		this.drawGroupBox(s, y);
	  }
	  
    }, this));
  },

  drawGroupBox: function(groupBox, top_y) {
	  var block = groupBox.parentBlock;
	  var groupTitle = block.groupTitleElement;
	  var minX = block.getMinX() - GROUP_BOX_HPADDING;
	  if (!isFinite(minX) || minX < 0) minX = 0;
	  var maxX = block.getMaxX();
	  if (!isFinite(maxX)) maxX = this.diagram.width;
	  top_y += GROUP_BOX_VMARGIN;
	  var bottom_y = top_y + block.height - 2*GROUP_BOX_VMARGIN;
	  var titleWidth = groupTitle.width;
	  var titleHeight = groupTitle.textHeight + 2*GROUP_TITLE_PADDING;
	  maxX = Math.max(maxX, minX+titleWidth);
	  maxX += GROUP_BOX_HPADDING;
	  var linetype = Diagram.LINETYPE.SOLID; // TODO: specified in block?
	  
	  // TODO: add margins to box?
	  
	  var style = block.getDrawingStyle('GroupTitle', this.diagram.default_styles);
	  this.drawRect(minX, top_y, titleWidth, titleHeight).attr(style);
	  
	  var style = block.getDrawingStyle('GroupBox', this.diagram.default_styles);
	  this.drawLine(minX+titleWidth, top_y,             maxX,            top_y,              linetype).attr(style);
	  this.drawLine(minX,            top_y+titleHeight, minX,            bottom_y,           linetype).attr(style);
	  this.drawLine(maxX,            top_y,             maxX,            bottom_y,           linetype).attr(style);
	  this.drawLine(minX,            bottom_y,          maxX,            bottom_y,           linetype).attr(style);
	  
	  var font = block.getFontStyle('GroupTitle', this.diagram.default_styles);
	  this.drawText(minX+GROUP_TITLE_PADDING, top_y+GROUP_TITLE_PADDING, groupTitle.message, font, ALIGN_LEFT);
  },
	  
  drawSelfSignal: function(signal, offsetY) {
      assert(signal.isOnlySelf(), 'signal must be a self signal');

      var block = signal.parentBlock;
	  var textBB = signal.textBB;
      var aX = getCenterX(signal.sourceActors[0]);

      var x = aX + SELF_SIGNAL_WIDTH + SIGNAL_PADDING;
      var y = offsetY + SIGNAL_PADDING + signal.height / 2 + textBB.y;

	  var font = block.getFontStyle('Signal', this.diagram.default_styles);
      this.drawText(x, y, signal.message, font, ALIGN_LEFT);

      var y1 = offsetY + SIGNAL_MARGIN + SIGNAL_PADDING;
      var y2 = y1 + signal.height - 2 * SIGNAL_MARGIN - SIGNAL_PADDING;

      // Draw three lines, the last one with a arrow
	  var style = block.getDrawingStyle('Signal', this.diagram.default_styles);
      this.drawLine(aX, y1, aX + SELF_SIGNAL_WIDTH, y1, signal.linetype).attr(style);
      this.drawLine(aX + SELF_SIGNAL_WIDTH, y1, aX + SELF_SIGNAL_WIDTH, y2, signal.linetype).attr(style);
      this.drawLine(aX + SELF_SIGNAL_WIDTH, y2, aX, y2, signal.linetype, signal.headarrowtype).attr(style);
	  
	  signal.minX = aX;
	  signal.maxX = x + signal.textWidth;
    },

  drawSignal: function(signal, offsetY) {
	var block = signal.parentBlock;
	
	// TODO: fix these ys values and give them meaningful names.
	var text_y = offsetY + SIGNAL_MARGIN + SIGNAL_PADDING;
	var upper_y = text_y + signal.textHeight + SIGNAL_SPACE_BELOW_TEXT; // y of signal line
	var line_y = upper_y + ((signal.useFeedArrows()) ? SIGNAL_FORK_FROM_MAIN_LINE_VERTICAL_GAP : 0);
	var bottom_y = line_y + SIGNAL_FORK_FROM_MAIN_LINE_VERTICAL_GAP; // y of fork to a target actor in the way (below signal-line).
	
	// Draw the text in the middle of the signal
	var mid_x = signal.mid_center_x();
	//console.log(signal.message + "  :  y=" + text_y); // TODO: inspect why it's not really drawing the text on text_y.
	var font = block.getFontStyle('Signal', this.diagram.default_styles);
	this.drawText(mid_x, text_y, signal.message, font, ALIGN_CENTER);
	
	// Draw forked-signal-line to multiple target actors.
	// The main signal-line reaches farthest target actor.
	// If there is any other target actor on the way, draw a fork to it below the main signal-line.
	
	var style = block.getDrawingStyle('Signal', this.diagram.default_styles);
	
	var actorsComparator = function(a, b) { return a.index - b.index; };
	var sortedSourceActors = _.uniq(signal.sourceActors.sort(actorsComparator), true);
	var sortedTargetActors = _.uniq(signal.targetActors.sort(actorsComparator), true);
	var mostRightSourceActor = sortedSourceActors[sortedSourceActors.length-1];
	var mostRightTargetActor = sortedTargetActors[sortedTargetActors.length-1];
	var actors = merge2SortedArraysWithIndicators(sortedSourceActors, sortedTargetActors, actorsComparator, 'actor', 'isSource', 'isTarget');
	
	var isSingleSource = signal.isSingleSource();
	var useFeedArrows = signal.useFeedArrows();
	
	var mostLeftActorIsSource = actors[0].isSource;
	var mostRightActorIsSource = actors[actors.length-1].isSource;
	
	var curSignalDirection = 'RTL';
	var mainSignalDirection = ((!mostLeftActorIsSource && mostRightActorIsSource) ? 'RTL' : 'LTR');
	for (var i = 0; i < actors.length; ++i) {
		var curItem = actors[i];
		var isMostLeft = (i == 0);
		var isMostRight = (i == actors.length-1);
		var isExtrimum = (isMostLeft || isMostRight);
		
		// Once a source actor is seen for the first time, the main signal direction is used.
		if (curItem.isSource) curSignalDirection = mainSignalDirection;
		// From now on all actors are targets, hence signal is directed from left to right.
		if (curItem.actor.index > mostRightSourceActor.index) curSignalDirection = 'LTR'; //TODO: really want this?
		// From now on all actors are sources, hence signal is directed from right to left.
		if (curItem.actor.index > mostRightTargetActor.index) curSignalDirection = 'RTL'; //TODO: really want this?
		
		var curX = curItem.actor.getCenterX();
		var justAfterCurX = curX + SELF_SIGNAL_WIDTH;
		var justBeforeCurX = curX - SELF_SIGNAL_WIDTH;
		
		// If there is an actor to the right of me - draw a segmented line to it.
		if (i < actors.length - 1) {
			var nextItem = actors[i+1];
			var nextX = nextItem.actor.getCenterX();
			var justBeforeNextX = nextX - SELF_SIGNAL_WIDTH;
			
			this.drawLine(justAfterCurX, line_y, justBeforeNextX, line_y, signal.linetype).attr(style);
		}
		
		// Draw little segments on the main signal near the current actor.
		if (!isMostLeft) {
			var headarrowtype = undefined;
			if (isMostRight && curItem.isTarget && (curSignalDirection == 'LTR')) headarrowtype = signal.headarrowtype;
			//if (isMostRight && !curItem.isTarget && curItem.isSource && !isSingleSource) headarrowtype = Diagram.ARROWTYPE.DOT;
			var tailarrowtype = undefined;
			if (isExtrimum && !curItem.isTarget && curItem.isSource) tailarrowtype = signal.tailarrowtype;
			
			this.drawLine(justBeforeCurX, line_y, curX, line_y, signal.linetype, headarrowtype, tailarrowtype).attr(style);
		}
		if (!isMostRight) {
			var headarrowtype = undefined;
			if (isMostLeft && curItem.isTarget && (curSignalDirection == 'RTL')) headarrowtype = signal.headarrowtype;
			//if (isMostLeft && !curItem.isTarget && curItem.isSource && !isSingleSource) headarrowtype = Diagram.ARROWTYPE.DOT;
			//if (!isMostLeft && isSingleSource && curItem.isSource) headarrowtype = Diagram.ARROWTYPE.DOT;
			var tailarrowtype = undefined;
			if (isExtrimum && !curItem.isTarget && curItem.isSource) tailarrowtype = signal.tailarrowtype;
			
			this.drawLine(justAfterCurX, line_y, curX, line_y, signal.linetype, headarrowtype, tailarrowtype).attr(style);
		}
		
		// TODO: maybe consider some different preferences.
		var drawFeedFromLeft = curItem.isSource && !isMostLeft && useFeedArrows && curSignalDirection == 'RTL';
		var drawFeedFromRight = curItem.isSource && !isMostRight && useFeedArrows && curSignalDirection == 'LTR';
		var drawReceiveFromLeft = curItem.isTarget && !isMostLeft && ((curSignalDirection == 'LTR' && !isMostRight) || (curSignalDirection == 'RTL' && isMostRight));
		var drawReceiveFromRight = curItem.isTarget && !isMostRight && ((curSignalDirection == 'RTL' && !isMostLeft) || (curSignalDirection == 'LTR' && isMostLeft));
		
		// Draw arrows to&from current actor when needed.
		if (drawReceiveFromLeft) {
			// Draw receive from left --------
			//                           |
			//                           \-->
			this.drawLine(justBeforeCurX, line_y, justBeforeCurX, bottom_y, signal.linetype).attr(style);
			this.drawLine(justBeforeCurX, bottom_y, curX, bottom_y, signal.linetype, signal.headarrowtype).attr(style);
		}
		if (drawFeedFromRight) {
			// Draw feed from right   ---
			//                          \/
			//                       --------
			this.drawLine(curX, upper_y, justAfterCurX, upper_y, signal.linetype).attr(style);
			this.drawLine(justAfterCurX, upper_y, justAfterCurX, line_y, signal.linetype, signal.headarrowtype).attr(style);
		}
		if (drawReceiveFromRight) {
			// Draw receive from right --------
			//                             |
			//                          <--/
			this.drawLine(justAfterCurX, line_y, justAfterCurX, bottom_y, signal.linetype).attr(style);
			this.drawLine(justAfterCurX, bottom_y, curX, bottom_y, signal.linetype, signal.headarrowtype).attr(style);
		}
		if (drawFeedFromLeft) {
			// Draw feed from left    ---
			//                       \/
			//                    --------
			this.drawLine(curX, upper_y, justBeforeCurX, upper_y, signal.linetype).attr(style);
			this.drawLine(justBeforeCurX, upper_y, justBeforeCurX, line_y, signal.linetype, signal.headarrowtype).attr(style);
		}
	}
  },

  drawNote: function(note, offsetY) {
	var block = note.parentBlock;
	var font = block.getFontStyle('Note', this.diagram.default_styles);
	var rectStyle = block.getDrawingStyle('Note', this.diagram.default_styles);
    note.y = offsetY;
    var sourceActor = note.hasManyActors() ? note.actor[0] : note.actor;
    var aX = getCenterX(sourceActor);
    switch (note.placement) {
    case PLACEMENT.RIGHTOF:
      note.x = aX + ACTOR_MARGIN;
    break;
    case PLACEMENT.LEFTOF:
      note.x = aX - ACTOR_MARGIN - note.width;
    break;
    case PLACEMENT.OVER:
      if (note.hasManyActors()) {
        var bX = getCenterX(note.actor[1]);
        var overlap = NOTE_OVERLAP + NOTE_PADDING;
        note.x = Math.min(aX, bX) - overlap;
        note.width = (Math.max(aX, bX) + overlap) - note.x;
      } else {
        note.x = aX - note.width / 2;
      }
    break;
    default:
      throw new Error('Unhandled note placement: ' + note.placement);
	}
	note.minX = note.x;
	note.maxX = note.x + note.width;
    return this.drawTextBox(note, note.message, NOTE_MARGIN, NOTE_PADDING, font, ALIGN_LEFT, rectStyle);
  },

  /**
   * Draw text surrounded by a box
   */
  drawTextBox: function(box, text, margin, padding, font, align, rectAttr) {
    var x = box.x + margin;
    var y = box.y + margin;
    var w = box.width  - 2 * margin;
    var h = box.height - 2 * margin;

    // Draw inner box
    var rect = this.drawRect(x, y, w, h);
	if (rectAttr !== undefined) rect.attr(rectAttr);

    // Draw text (in the center)
    if (align == ALIGN_CENTER) {
      x = getCenterX(box);
      y = getCenterY(box);
    } else {
      x += padding;
      y += padding;
    }

    return this.drawText(x, y, text, font, align);
  }
});
