/** js sequence diagrams
 *  https://bramp.github.io/js-sequence-diagrams/
 *  (c) 2012-2017 Andrew Brampton (bramp.net)
 *  Simplified BSD license.
 */
/*global grammar _ */

function Diagram() {
  this.title   = undefined;
  this.actors  = [];
  this.signals = []; // TODO: change name to something like: `elements`.
  this.root_block = null;
  
  // TODO: write code & commands to support styling.
  this.classes = {};
  this.default_styles = {};
}
/*
 * Return an existing actor with this alias, or creates a new one with alias and name.
 */
Diagram.prototype.getActor = function(alias, name) {
  alias = alias.trim();

  var i;
  var actors = this.actors;
  for (i in actors) {
    if (actors[i].alias == alias) {
      return actors[i];
    }
  }
  i = actors.push(new Diagram.Actor(alias, (name || alias), actors.length));
  return actors[ i - 1 ];
};

/*
 * Parses the input as either a alias, or a "name as alias", and returns the corresponding actor.
 */
Diagram.prototype.getActorWithAlias = function(input) {
  input = input.trim();

  // We are lazy and do some of the parsing in javascript :(. TODO move into the .jison file.
  var s = /([\s\S]+) as (\S+)$/im.exec(input);
  var alias;
  var name;
  if (s) {
    name  = s[1].trim();
    alias = s[2].trim();
  } else {
    name = alias = input;
  }
  return this.getActor(alias, name);
};

Diagram.prototype.setTitle = function(title) {
  this.title = title;
};

Diagram.prototype.addElement = function(elem) {
  this.signals.push(elem);
};

Diagram.Actor = function(alias, name, index) {
  this.alias = alias;
  this.name  = name;
  this.index = index;
  
  // not in use yet
  this.minWidth = 0; // TODO: use this attribute instead of using `MinWidth` objects.
};
Diagram.Actor.prototype.getCenterX = function() {
	return this.x + this.width / 2;
};

Diagram.Signal = function(sourceActors, signaltype, targetActors, message) {
  var actorsComparator = function(a, b) { return a.index - b.index; };
  this.type           = 'Signal';
  this.sourceActors   = _.uniq(sourceActors.sort(actorsComparator), true);  // list of actors that send the signal
  this.targetActors   = _.uniq(targetActors.sort(actorsComparator), true);  // list of actors that receive the signal
  this.linetype       = ('linetype' in signaltype) ? signaltype['linetype'] : undefined;
  this.headarrowtype  = ('headarrowtype' in signaltype) ? signaltype['headarrowtype'] : undefined;
  this.tailarrowtype  = ('tailarrowtype' in signaltype) ? signaltype['tailarrowtype'] : undefined;
  this.message        = message;
  this.parentBlock   = null;
};

Diagram.Signal.prototype.isOnlySelf = function() {
  return this.sourceActors.length == 1 && this.targetActors.length == 1 && this.sourceActors[0].index == this.targetActors[0].index;
};

Diagram.Signal.prototype.hasSelf = function() {
	return _.some(this.targetActors, function(a) { return a.index == this.sourceActors[0].index; }, this);
};

Diagram.Signal.prototype.targetActors_center_xs = function() {
	return _.map(this.targetActors, function(a) { return a.getCenterX(); });
};
Diagram.Signal.prototype.sourceActors_center_xs = function() {
	return _.map(this.sourceActors, function(a) { return a.getCenterX(); });
};
Diagram.Signal.prototype.targetActors_max_center_x = function() {
	return _.max(this.targetActors_center_xs());
};
Diagram.Signal.prototype.targetActors_min_center_x = function() {
	return _.min(this.targetActors_center_xs());
};
Diagram.Signal.prototype.sourceActors_max_center_x = function() {
	return _.max(this.sourceActors_center_xs());
};
Diagram.Signal.prototype.sourceActors_min_center_x = function() {
	return _.min(this.sourceActors_center_xs());
};
Diagram.Signal.prototype.max_center_x = function() {
	return Math.max(this.sourceActors_max_center_x(), this.targetActors_max_center_x());
};
Diagram.Signal.prototype.min_center_x = function() {
	return Math.min(this.sourceActors_min_center_x(), this.targetActors_min_center_x());
};
Diagram.Signal.prototype.mid_center_x = function() {
	return (this.max_center_x() - this.min_center_x())/2 + this.min_center_x();
};

Diagram.Signal.prototype.targetActorsIdxs = function() {
	return _.map(this.targetActors, function(a) { return a.index; });
};
Diagram.Signal.prototype.sourceActorsIdxs= function() {
	return _.map(this.sourceActors, function(a) { return a.index; });
};
Diagram.Signal.prototype.targetActorsMaxIdx = function() {
	return _.max(this.targetActorsIdxs());
};
Diagram.Signal.prototype.targetActorsMinIdx = function() {
	return _.min(this.targetActorsIdxs());
};
Diagram.Signal.prototype.sourceActorsMaxIdx = function() {
	return _.max(this.sourceActorsIdxs());
};
Diagram.Signal.prototype.sourceActorsMinIdx = function() {
	return _.min(this.sourceActorsIdxs());
};
Diagram.Signal.prototype.actorsMaxIdx = function() {
	return Math.max(this.sourceActorsMaxIdx(), this.targetActorsMaxIdx());
};
Diagram.Signal.prototype.actorsMinIdx = function() {
	return Math.min(this.sourceActorsMinIdx(), this.targetActorsMinIdx());
};

Diagram.Signal.prototype.getMinX = function() {
	if (this.isOnlySelf()) {
		return this.minX;
	}
	return Math.min(this.min_center_x(), this.mid_center_x() - 0.5*this.textWidth);
};
Diagram.Signal.prototype.getMaxX = function() {
	if (this.isOnlySelf()) {
		return this.maxX;
	}
	return Math.max(this.max_center_x(), this.mid_center_x() + 0.5*this.textWidth);
};
Diagram.Signal.prototype.isSingleSource = function() {
	return (this.sourceActors.length == 1);
};
Diagram.Signal.prototype.useFeedArrows = function() {
	return (!this.isSingleSource() || (this.sourceActors[0].index != this.actorsMinIdx() && this.sourceActors[0].index != this.actorsMaxIdx()));
}
Diagram.Space = function(spaceSize) {
	this.type = 'Space';
	this.spaceSize = parseInt(spaceSize);
	this.message = '';
	this.parentBlock = null;
};

// TODO: use `min-width` attribute of actor instead of generating this object.
Diagram.MinWidth = function(actor, minWidth) {
	this.type = 'MinWidth';
	this.actor = actor;
	this.minWidth = parseInt(minWidth);
	this.message = '';
	this.parentBlock = null;
};

Diagram.Block = function(order, children) {
	this.type = 'Block';
	this.parentBlock = null;
	this.order = order || undefined;
	this.y_offset = null;
	this.contentsHeight = 0;
	this.height = 0; // total height including groupBoxingElement
	this.children = children || [];
	this.groupTitleElement = undefined;
	this.groupBoxingElement = undefined;
	
	// TODO: write code & commands to support styling.
	// `style` member can has keys: 'default', 'title', 'actors', 'signal, 'note'.
	// Each item in this dict has a dict with multiple style settings, like 'font', 'background'..
	// example: style = { 'default': {'font': {'font-family': 'danielbd', 'font-weight': 700}}, 'title': {'font': { 'font-size': 16 }} }
	this.styles = {};
	this.useClasses = [];
};
Diagram.Block.prototype.getYOffsetForNextSon = function(son) {
	if (this.y_offset == null) this.y_offset = this.parentBlock.getYOffsetForNextSon();
	if (this.groupBoxingElement !== undefined && son === this.groupBoxingElement) return this.y_offset;
	return this.y_offset + (this.groupTitleElement !== undefined && this.groupTitleElement.height !== undefined ? this.groupTitleElement.height : 0) + ((this.getOrder() == 'serial') ? this.contentsHeight : 0);
};
Diagram.Block.prototype.getOrder = function() {
	if (this.order === undefined) {
		this.order = this.parentBlock.getOrder();
	}
	return this.order;
};
Diagram.Block.prototype.updateHeight = function() {
	this.contentsHeight = 0;
	_.each(this.children, function(child) {
		if (child.height === undefined) return;
		if (this.getOrder() == 'serial') {
			this.contentsHeight += child.height;
		} else {
			this.contentsHeight = Math.max(this.contentsHeight, child.height);
		}
	}, this);
	this.height = this.getTotalHeight();
	if (this.parentBlock != null) {
		this.parentBlock.updateHeight();
	}
};
Diagram.Block.prototype.getTotalHeight = function() {
	var height = this.contentsHeight;
	if (this.groupTitleElement !== undefined && this.groupTitleElement.height !== undefined) {
		height += this.groupTitleElement.height;
	}
	return Math.max(height, (this.groupBoxingElement !== undefined && this.groupBoxingElement.height !== undefined ? this.groupBoxingElement.height : 0));
};
Diagram.Block.prototype.getWidth = function() {
	return this.getMaxX() - this.getMinX();
};
Diagram.Block.prototype.getMinX = function() {
	var minX = Infinity;
	_.each(this.children, function(child) {
		if (child.getMinX !== undefined) {
			minX = Math.min(minX, child.getMinX());
		} else if (child.minX !== undefined) {
			minX = Math.min(minX, child.minX);
		}
	}, this);
	return minX;
};
Diagram.Block.prototype.getMaxX = function() {
	var maxX = -Infinity;
	_.each(this.children, function(child) {
		if (child.getMaxX !== undefined) {
			maxX = Math.max(maxX, child.getMaxX());
		} else if (child.maxX !== undefined) {
			maxX = Math.max(maxX, child.maxX);
		}
	}, this);
	return maxX;
};
Diagram.Block.prototype.addStyle = function(style) {
	if (style.elementType) { 
		this.styles[style.elementType + '__' + style.styleProperty] = style.value;
	} else {
		this.styles[style.styleProperty] = style.value;
	}
};
Diagram.Block.prototype.getStyle = function(elementType, styleProperty, default_styles) {
	var styleKey = elementType + '__' + styleProperty;
	for(var block = this; block != null; block = block.parentBlock) {
		if (block.styles[styleKey] !== undefined) return block.styles[styleKey];
		if (block.styles[styleProperty] !== undefined) return block.styles[styleProperty];
	}
	if (default_styles === undefined) return undefined;
	if (default_styles[styleKey] !== undefined) return default_styles[styleKey];
	return default_styles[styleProperty];
};
Diagram.Block.prototype.getFontStyle = function(elementType, default_styles) {
	var font = {'font-family': undefined, 'font-size': undefined, 'font-width': undefined, 'color': undefined};
	for (var property in font) {
		if (!font.hasOwnProperty(property)) continue;
		font[property] = this.getStyle(elementType, property, default_styles);
		if (font[property] === undefined) delete font[property];
	}
	if (font['color'] !== undefined) {
		font['fill'] = font['color'];
		delete font['color'];
	}
	
	return font;
}
Diagram.Block.prototype.getDrawingStyle = function(elementType, default_styles) {
	var style = {'fill': undefined, 'stroke': undefined, 'stroke-width': undefined };
	for (var property in style) {
		if (!style.hasOwnProperty(property)) continue;
		style[property] = this.getStyle(elementType, property, default_styles);
		if (style[property] === undefined) delete style[property];
	}
	return style;
}

Diagram.GroupTitle = function(title) {
	this.type        = 'GroupTitle';
	this.message     = title;
	this.parentBlock = null;
};

Diagram.GroupBox = function() {
	this.type        = 'GroupBox';
	this.message     = '';
	this.parentBlock = null;
};

Diagram.Style = function(elementType, styleProperty, value) {
	this.type        = 'Style';
	this.elementType = elementType;
	this.styleProperty = styleProperty;
	this.value = value;
};

Diagram.Note = function(actor, placement, message) {
  this.type      = 'Note';
  this.actor     = actor;
  this.placement = placement;
  this.message   = message;
  this.parentBlock = null;

  if (this.hasManyActors() && actor[0] == actor[1]) {
    throw new Error('Note should be over two different actors');
  }
};

Diagram.Note.prototype.hasManyActors = function() {
  return _.isArray(this.actor);
};

Diagram.unescape = function(s) {
  // Turn "\\n" into "\n"
  return s.trim().replace(/^"(.*)"$/m, '$1').replace(/\\n/gm, '\n');
};

Diagram.LINETYPE = {
  SOLID: 0,
  DOTTED: 1
};

Diagram.ARROWTYPE = {
  FILLED: 0,
  OPEN: 1,
  DOT: 2,
  FILLED_INVERTED: 3,
  OPEN_INVERTED: 4
};

Diagram.flipArrowType = function(arrowtype) {
	switch(arrowtype) {
		case Diagram.ARROWTYPE.FILLED_INVERTED:
		return Diagram.ARROWTYPE.FILLED;
		case Diagram.ARROWTYPE.FILLED:
		return Diagram.ARROWTYPE.FILLED_INVERTED;
		case Diagram.ARROWTYPE.OPEN:
		return Diagram.ARROWTYPE.OPEN_INVERTED;
		case Diagram.ARROWTYPE.OPEN_INVERTED:
		return Diagram.ARROWTYPE.OPEN;
	}
	return arrowtype;
};

Diagram.ElementTypes = {
	'Signal': true,
	'Note': true,
	'Space': true,
	'MinWidth': true,
	'GroupTitle': true,
	'GroupBox': true
};

Diagram.PLACEMENT = {
  LEFTOF: 0,
  RIGHTOF: 1,
  OVER: 2
};

// Some older browsers don't have getPrototypeOf, thus we polyfill it
// https://github.com/bramp/js-sequence-diagrams/issues/57
// https://github.com/zaach/jison/issues/194
// Taken from http://ejohn.org/blog/objectgetprototypeof/
if (typeof Object.getPrototypeOf !== 'function') {
  /* jshint -W103 */
  if (typeof 'test'.__proto__ === 'object') {
    Object.getPrototypeOf = function(object) {
      return object.__proto__;
    };
  } else {
    Object.getPrototypeOf = function(object) {
      // May break if the constructor has been tampered with
      return object.constructor.prototype;
    };
  }
  /* jshint +W103 */
}

/** The following is included by preprocessor */
// #include "build/grammar.js"

/**
 * jison doesn't have a good exception, so we make one.
 * This is brittle as it depends on jison internals
 */
function ParseError(message, hash) {
  _.extend(this, hash);

  this.name = 'ParseError';
  this.message = (message || '');
}
ParseError.prototype = new Error();
Diagram.ParseError = ParseError;

Diagram.parse = function(input) {
  // TODO jison v0.4.17 changed their API slightly, so parser is no longer defined:

  // Create the object to track state and deal with errors
  parser.yy = new Diagram();
  parser.yy.parseError = function(message, hash) {
    throw new ParseError(message, hash);
  };

  // Parse
  var diagram = parser.parse(input);

  // Then clean up the parseError key that a user won't care about
  delete diagram.parseError;
  return diagram;
};

