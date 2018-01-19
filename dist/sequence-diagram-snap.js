/** js sequence diagrams 2.0.1
 *  https://bramp.github.io/js-sequence-diagrams/
 *  (c) 2012-2017 Andrew Brampton (bramp.net)
 *  @license Simplified BSD license.
 */
(function() {
'use strict';
/*global Diagram */

// The following are included by preprocessor */
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
/* parser generated by jison 0.4.15 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var parser = function() {
    function Parser() {
        this.yy = {};
    }
    var o = function(k, v, o, l) {
        for (o = o || {}, l = k.length; l--; o[k[l]] = v) ;
        return o;
    }, $V0 = [ 5, 8, 9, 11, 25, 28, 29, 30, 31, 36, 37, 38, 46, 53 ], $V1 = [ 2, 19 ], $V2 = [ 1, 14 ], $V3 = [ 1, 13 ], $V4 = [ 1, 16 ], $V5 = [ 1, 34 ], $V6 = [ 1, 38 ], $V7 = [ 5, 8, 9, 11, 25, 28, 29, 30, 31, 36, 37, 38, 39, 40, 46, 49, 50, 51, 52, 53 ], $V8 = [ 5, 8, 9, 11, 25, 26, 28, 29, 30, 31, 36, 37, 38, 46, 53 ], $V9 = [ 1, 44 ], $Va = [ 1, 41 ], $Vb = [ 1, 45 ], $Vc = [ 1, 46 ], $Vd = [ 1, 47 ], $Ve = [ 8, 25, 26, 28, 29, 30, 31, 36, 37, 38, 46, 53 ], $Vf = [ 1, 68 ], $Vg = [ 1, 69 ], $Vh = [ 1, 70 ], $Vi = [ 1, 71 ], $Vj = [ 1, 72 ], $Vk = [ 1, 73 ], $Vl = [ 1, 74 ], $Vm = [ 1, 75 ], $Vn = [ 1, 76 ], $Vo = [ 39, 40, 49, 50, 51, 52 ], $Vp = [ 37, 46 ], $Vq = [ 37, 46, 50, 51 ], $Vr = [ 37, 39, 46, 49 ], $Vs = [ 59, 60, 61, 62, 63, 64, 65, 66, 67 ], parser = {
        trace: function() {},
        yy: {},
        symbols_: {
            error: 2,
            start: 3,
            document: 4,
            EOF: 5,
            line: 6,
            statement: 7,
            NL: 8,
            participant: 9,
            actor_alias: 10,
            title: 11,
            message: 12,
            element_statements_block_wo_brackets: 13,
            element_statement: 14,
            signal_statement: 15,
            note_statement: 16,
            space_statement: 17,
            minwidth_statement: 18,
            parallel_block: 19,
            serial_block: 20,
            element_statements_block: 21,
            style_statement: 22,
            element_statement_line: 23,
            element_statements: 24,
            CURLY_LEFT_BRACKET: 25,
            CURLY_RIGHT_BRACKET: 26,
            group_title: 27,
            group: 28,
            parallel: 29,
            serial: 30,
            note: 31,
            placement: 32,
            actor: 33,
            over: 34,
            actor_pair: 35,
            space: 36,
            NUMBER: 37,
            minwidth: 38,
            LINE: 39,
            ",": 40,
            left_of: 41,
            right_of: 42,
            actors: 43,
            signaltype: 44,
            actor_name: 45,
            ACTOR: 46,
            linetype: 47,
            arrowtype: 48,
            DOTLINE: 49,
            ARROW: 50,
            OPENARROW: 51,
            MESSAGE: 52,
            style: 53,
            elementtype: 54,
            style_property: 55,
            signal: 56,
            grouptitle: 57,
            groupbox: 58,
            font_family: 59,
            font_weight: 60,
            font_size: 61,
            stroke: 62,
            stroke_width: 63,
            fill: 64,
            font_color: 65,
            color: 66,
            css_class: 67,
            $accept: 0,
            $end: 1
        },
        terminals_: {
            2: "error",
            5: "EOF",
            8: "NL",
            9: "participant",
            11: "title",
            25: "CURLY_LEFT_BRACKET",
            26: "CURLY_RIGHT_BRACKET",
            28: "group",
            29: "parallel",
            30: "serial",
            31: "note",
            34: "over",
            36: "space",
            37: "NUMBER",
            38: "minwidth",
            39: "LINE",
            40: ",",
            41: "left_of",
            42: "right_of",
            46: "ACTOR",
            49: "DOTLINE",
            50: "ARROW",
            51: "OPENARROW",
            52: "MESSAGE",
            53: "style",
            56: "signal",
            57: "grouptitle",
            58: "groupbox",
            59: "font_family",
            60: "font_weight",
            61: "font_size",
            62: "stroke",
            63: "stroke_width",
            64: "fill",
            65: "font_color",
            66: "color",
            67: "css_class"
        },
        productions_: [ 0, [ 3, 2 ], [ 4, 0 ], [ 4, 2 ], [ 6, 1 ], [ 6, 1 ], [ 7, 2 ], [ 7, 2 ], [ 7, 1 ], [ 14, 1 ], [ 14, 1 ], [ 14, 1 ], [ 14, 1 ], [ 14, 1 ], [ 14, 1 ], [ 14, 1 ], [ 14, 1 ], [ 23, 1 ], [ 23, 1 ], [ 24, 0 ], [ 24, 2 ], [ 13, 1 ], [ 21, 3 ], [ 21, 4 ], [ 27, 2 ], [ 19, 2 ], [ 20, 2 ], [ 16, 4 ], [ 16, 4 ], [ 17, 2 ], [ 18, 4 ], [ 35, 1 ], [ 35, 3 ], [ 32, 1 ], [ 32, 1 ], [ 15, 4 ], [ 43, 1 ], [ 43, 3 ], [ 33, 1 ], [ 10, 1 ], [ 45, 1 ], [ 45, 1 ], [ 44, 2 ], [ 44, 2 ], [ 44, 3 ], [ 44, 1 ], [ 47, 1 ], [ 47, 1 ], [ 48, 1 ], [ 48, 1 ], [ 12, 1 ], [ 22, 4 ], [ 22, 3 ], [ 54, 1 ], [ 54, 1 ], [ 54, 1 ], [ 54, 1 ], [ 54, 1 ], [ 54, 1 ], [ 54, 1 ], [ 54, 1 ], [ 55, 1 ], [ 55, 1 ], [ 55, 1 ], [ 55, 1 ], [ 55, 1 ], [ 55, 1 ], [ 55, 1 ], [ 55, 1 ], [ 55, 1 ] ],
        performAction: function(yytext, yyleng, yylineno, yy, yystate, $$, _$) {
            /* this == yyval */
            var $0 = $$.length - 1;
            switch (yystate) {
              case 1:
                return yy.parser.yy;

              case 4:
                break;

              case 6:
                $$[$0];
                break;

              case 7:
                yy.parser.yy.setTitle($$[$0]);
                break;

              case 8:
                yy.parser.yy.root_block = $$[$0], $$[$0].y_offset = 0, $$[$0].order = "serial";
                break;

              case 9:
              case 10:
              case 11:
              case 12:
                this.$ = $$[$0], yy.parser.yy.addElement($$[$0]);
                break;

              case 13:
              case 14:
              case 15:
              case 16:
              case 17:
              case 31:
              case 40:
              case 41:
                this.$ = $$[$0];
                break;

              case 18:
                this.$ = void 0;
                break;

              case 19:
                this.$ = [];
                break;

              case 20:
                this.$ = $$[$0 - 1], void 0 !== $$[$0] && $$[$0 - 1].push($$[$0]);
                break;

              case 21:
                this.$ = new Diagram.Block(), this.$.children = [];
                for (var i = 0; i < $$[$0].length; ++i) "Style" == $$[$0][i].type ? this.$.addStyle($$[$0][i]) : ($$[$0][i].parentBlock = this.$, 
                this.$.children.push($$[$0][i]));
                break;

              case 22:
                this.$ = $$[$0 - 1];
                break;

              case 23:
                this.$ = $$[$0 - 1], $$[$0 - 3].parentBlock = this.$, this.$.groupTitleElement = $$[$0 - 3], 
                this.$.groupBoxingElement = new Diagram.GroupBox(), this.$.groupBoxingElement.parentBlock = this.$, 
                yy.parser.yy.addElement(this.$.groupBoxingElement);
                break;

              case 24:
                this.$ = new Diagram.GroupTitle($$[$0]), yy.parser.yy.addElement(this.$);
                break;

              case 25:
                this.$ = $$[$0], this.$.order = "parallel";
                break;

              case 26:
                this.$ = $$[$0], this.$.order = "serial";
                break;

              case 27:
                this.$ = new Diagram.Note($$[$0 - 1], $$[$0 - 2], $$[$0]);
                break;

              case 28:
                this.$ = new Diagram.Note($$[$0 - 1], Diagram.PLACEMENT.OVER, $$[$0]);
                break;

              case 29:
                this.$ = new Diagram.Space(parseInt($$[$0]));
                break;

              case 30:
                this.$ = new Diagram.MinWidth($$[$0 - 2], parseInt($$[$0]));
                break;

              case 32:
                this.$ = [ $$[$0 - 2], $$[$0] ];
                break;

              case 33:
                this.$ = Diagram.PLACEMENT.LEFTOF;
                break;

              case 34:
                this.$ = Diagram.PLACEMENT.RIGHTOF;
                break;

              case 35:
                this.$ = new Diagram.Signal($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0]);
                break;

              case 36:
                this.$ = [ $$[$0] ];
                break;

              case 37:
                this.$ = $$[$0 - 2], this.$.push($$[$0]);
                break;

              case 38:
                this.$ = yy.parser.yy.getActor(Diagram.unescape($$[$0]));
                break;

              case 39:
                this.$ = yy.parser.yy.getActorWithAlias(Diagram.unescape($$[$0]));
                break;

              case 42:
                this.$ = {
                    linetype: $$[$0 - 1],
                    headarrowtype: $$[$0]
                };
                break;

              case 43:
                this.$ = {
                    linetype: $$[$0],
                    tailarrowtype: Diagram.flipArrowType($$[$0 - 1])
                };
                break;

              case 44:
                this.$ = {
                    linetype: $$[$0 - 1],
                    tailarrowtype: Diagram.flipArrowType($$[$0 - 2]),
                    headarrowtype: $$[$0]
                };
                break;

              case 45:
                this.$ = {
                    linetype: $$[$0]
                };
                break;

              case 46:
                this.$ = Diagram.LINETYPE.SOLID;
                break;

              case 47:
                this.$ = Diagram.LINETYPE.DOTTED;
                break;

              case 48:
                this.$ = Diagram.ARROWTYPE.FILLED;
                break;

              case 49:
                this.$ = Diagram.ARROWTYPE.OPEN;
                break;

              case 50:
                this.$ = Diagram.unescape($$[$0].substring(1));
                break;

              case 51:
                this.$ = new Diagram.Style($$[$0 - 2], $$[$0 - 1], $$[$0]);
                break;

              case 52:
                this.$ = new Diagram.Style(void 0, $$[$0 - 1], $$[$0]);
                break;

              case 53:
                this.$ = "Note";
                break;

              case 54:
                this.$ = "Signal";
                break;

              case 55:
                this.$ = "MinWidth";
                break;

              case 56:
                this.$ = "Space";
                break;

              case 57:
                this.$ = "GroupTitle";
                break;

              case 58:
                this.$ = "GroupBox";
                break;

              case 59:
                this.$ = "Title";
                break;

              case 60:
                this.$ = "Participant";
                break;

              case 61:
                this.$ = "font-family";
                break;

              case 62:
                this.$ = "font-weight";
                break;

              case 63:
                this.$ = "font-size";
                break;

              case 64:
                this.$ = "stroke";
                break;

              case 65:
                this.$ = "stroke-width";
                break;

              case 66:
                this.$ = "fill";
                break;

              case 67:
                this.$ = "font-color";
                break;

              case 68:
                this.$ = "color";
                break;

              case 69:
                this.$ = "css-class";
            }
        },
        table: [ o($V0, [ 2, 2 ], {
            3: 1,
            4: 2
        }), {
            1: [ 3 ]
        }, o([ 25, 28, 29, 30, 31, 36, 37, 38, 46, 53 ], $V1, {
            6: 4,
            7: 5,
            13: 9,
            24: 10,
            5: [ 1, 3 ],
            8: [ 1, 6 ],
            9: [ 1, 7 ],
            11: [ 1, 8 ]
        }), {
            1: [ 2, 1 ]
        }, o($V0, [ 2, 3 ]), o($V0, [ 2, 4 ]), o($V0, [ 2, 5 ]), {
            10: 11,
            37: $V2,
            45: 12,
            46: $V3
        }, {
            12: 15,
            52: $V4
        }, o($V0, [ 2, 8 ]), o([ 5, 9, 11, 26 ], [ 2, 21 ], {
            23: 17,
            14: 18,
            15: 20,
            16: 21,
            17: 22,
            18: 23,
            19: 24,
            20: 25,
            21: 26,
            22: 27,
            43: 28,
            27: 35,
            33: 37,
            45: 39,
            8: [ 1, 19 ],
            25: $V5,
            28: $V6,
            29: [ 1, 32 ],
            30: [ 1, 33 ],
            31: [ 1, 29 ],
            36: [ 1, 30 ],
            37: $V2,
            38: [ 1, 31 ],
            46: $V3,
            53: [ 1, 36 ]
        }), o($V0, [ 2, 6 ]), o($V0, [ 2, 39 ]), o($V7, [ 2, 40 ]), o($V7, [ 2, 41 ]), o($V0, [ 2, 7 ]), o($V8, [ 2, 50 ]), o($V8, [ 2, 20 ]), o($V8, [ 2, 17 ]), o($V8, [ 2, 18 ]), o($V8, [ 2, 9 ]), o($V8, [ 2, 10 ]), o($V8, [ 2, 11 ]), o($V8, [ 2, 12 ]), o($V8, [ 2, 13 ]), o($V8, [ 2, 14 ]), o($V8, [ 2, 15 ]), o($V8, [ 2, 16 ]), {
            39: $V9,
            40: $Va,
            44: 40,
            47: 42,
            48: 43,
            49: $Vb,
            50: $Vc,
            51: $Vd
        }, {
            32: 48,
            34: [ 1, 49 ],
            41: [ 1, 50 ],
            42: [ 1, 51 ]
        }, {
            37: [ 1, 52 ]
        }, {
            33: 53,
            37: $V2,
            45: 39,
            46: $V3
        }, {
            21: 54,
            25: $V5,
            27: 35,
            28: $V6
        }, {
            21: 55,
            25: $V5,
            27: 35,
            28: $V6
        }, o($Ve, $V1, {
            24: 10,
            13: 56
        }), {
            25: [ 1, 57 ]
        }, {
            9: [ 1, 67 ],
            11: [ 1, 66 ],
            31: [ 1, 60 ],
            36: [ 1, 63 ],
            38: [ 1, 62 ],
            54: 58,
            55: 59,
            56: [ 1, 61 ],
            57: [ 1, 64 ],
            58: [ 1, 65 ],
            59: $Vf,
            60: $Vg,
            61: $Vh,
            62: $Vi,
            63: $Vj,
            64: $Vk,
            65: $Vl,
            66: $Vm,
            67: $Vn
        }, o($Vo, [ 2, 36 ]), {
            12: 77,
            52: $V4
        }, o($Vo, [ 2, 38 ]), {
            33: 37,
            37: $V2,
            43: 78,
            45: 39,
            46: $V3
        }, {
            33: 79,
            37: $V2,
            45: 39,
            46: $V3
        }, o($Vp, [ 2, 45 ], {
            48: 80,
            50: $Vc,
            51: $Vd
        }), {
            39: $V9,
            47: 81,
            49: $Vb
        }, o($Vq, [ 2, 46 ]), o($Vq, [ 2, 47 ]), o($Vr, [ 2, 48 ]), o($Vr, [ 2, 49 ]), {
            33: 82,
            37: $V2,
            45: 39,
            46: $V3
        }, {
            33: 84,
            35: 83,
            37: $V2,
            45: 39,
            46: $V3
        }, o($Vp, [ 2, 33 ]), o($Vp, [ 2, 34 ]), o($V8, [ 2, 29 ]), {
            39: [ 1, 85 ]
        }, o($V8, [ 2, 25 ]), o($V8, [ 2, 26 ]), {
            26: [ 1, 86 ]
        }, o($Ve, $V1, {
            24: 10,
            13: 87
        }), {
            55: 88,
            59: $Vf,
            60: $Vg,
            61: $Vh,
            62: $Vi,
            63: $Vj,
            64: $Vk,
            65: $Vl,
            66: $Vm,
            67: $Vn
        }, {
            12: 89,
            52: $V4
        }, o($Vs, [ 2, 53 ]), o($Vs, [ 2, 54 ]), o($Vs, [ 2, 55 ]), o($Vs, [ 2, 56 ]), o($Vs, [ 2, 57 ]), o($Vs, [ 2, 58 ]), o($Vs, [ 2, 59 ]), o($Vs, [ 2, 60 ]), {
            52: [ 2, 61 ]
        }, {
            52: [ 2, 62 ]
        }, {
            52: [ 2, 63 ]
        }, {
            52: [ 2, 64 ]
        }, {
            52: [ 2, 65 ]
        }, {
            52: [ 2, 66 ]
        }, {
            52: [ 2, 67 ]
        }, {
            52: [ 2, 68 ]
        }, {
            52: [ 2, 69 ]
        }, {
            25: [ 2, 24 ]
        }, {
            12: 90,
            40: $Va,
            52: $V4
        }, o($Vo, [ 2, 37 ]), o($Vp, [ 2, 42 ]), o($Vp, [ 2, 43 ], {
            48: 91,
            50: $Vc,
            51: $Vd
        }), {
            12: 92,
            52: $V4
        }, {
            12: 93,
            52: $V4
        }, {
            40: [ 1, 94 ],
            52: [ 2, 31 ]
        }, {
            37: [ 1, 95 ]
        }, o($V8, [ 2, 22 ]), {
            26: [ 1, 96 ]
        }, {
            12: 97,
            52: $V4
        }, o($V8, [ 2, 52 ]), o($V8, [ 2, 35 ]), o($Vp, [ 2, 44 ]), o($V8, [ 2, 27 ]), o($V8, [ 2, 28 ]), {
            33: 98,
            37: $V2,
            45: 39,
            46: $V3
        }, o($V8, [ 2, 30 ]), o($V8, [ 2, 23 ]), o($V8, [ 2, 51 ]), {
            52: [ 2, 32 ]
        } ],
        defaultActions: {
            3: [ 2, 1 ],
            68: [ 2, 61 ],
            69: [ 2, 62 ],
            70: [ 2, 63 ],
            71: [ 2, 64 ],
            72: [ 2, 65 ],
            73: [ 2, 66 ],
            74: [ 2, 67 ],
            75: [ 2, 68 ],
            76: [ 2, 69 ],
            77: [ 2, 24 ],
            98: [ 2, 32 ]
        },
        parseError: function(str, hash) {
            if (!hash.recoverable) throw new Error(str);
            this.trace(str);
        },
        parse: function(input) {
            function lex() {
                var token;
                return token = lexer.lex() || EOF, "number" != typeof token && (token = self.symbols_[token] || token), 
                token;
            }
            var self = this, stack = [ 0 ], vstack = [ null ], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, EOF = 1, args = lstack.slice.call(arguments, 1), lexer = Object.create(this.lexer), sharedState = {
                yy: {}
            };
            for (var k in this.yy) Object.prototype.hasOwnProperty.call(this.yy, k) && (sharedState.yy[k] = this.yy[k]);
            lexer.setInput(input, sharedState.yy), sharedState.yy.lexer = lexer, sharedState.yy.parser = this, 
            void 0 === lexer.yylloc && (lexer.yylloc = {});
            var yyloc = lexer.yylloc;
            lstack.push(yyloc);
            var ranges = lexer.options && lexer.options.ranges;
            "function" == typeof sharedState.yy.parseError ? this.parseError = sharedState.yy.parseError : this.parseError = Object.getPrototypeOf(this).parseError;
            for (var symbol, preErrorSymbol, state, action, r, p, len, newState, expected, yyval = {}; ;) {
                if (state = stack[stack.length - 1], this.defaultActions[state] ? action = this.defaultActions[state] : (null !== symbol && void 0 !== symbol || (symbol = lex()), 
                action = table[state] && table[state][symbol]), void 0 === action || !action.length || !action[0]) {
                    var errStr = "";
                    expected = [];
                    for (p in table[state]) this.terminals_[p] && p > 2 && expected.push("'" + this.terminals_[p] + "'");
                    errStr = lexer.showPosition ? "Parse error on line " + (yylineno + 1) + ":\n" + lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'" : "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == EOF ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'"), 
                    this.parseError(errStr, {
                        text: lexer.match,
                        token: this.terminals_[symbol] || symbol,
                        line: lexer.yylineno,
                        loc: yyloc,
                        expected: expected
                    });
                }
                if (action[0] instanceof Array && action.length > 1) throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                switch (action[0]) {
                  case 1:
                    stack.push(symbol), vstack.push(lexer.yytext), lstack.push(lexer.yylloc), stack.push(action[1]), 
                    symbol = null, preErrorSymbol ? (symbol = preErrorSymbol, preErrorSymbol = null) : (yyleng = lexer.yyleng, 
                    yytext = lexer.yytext, yylineno = lexer.yylineno, yyloc = lexer.yylloc, recovering > 0 && recovering--);
                    break;

                  case 2:
                    if (len = this.productions_[action[1]][1], yyval.$ = vstack[vstack.length - len], 
                    yyval._$ = {
                        first_line: lstack[lstack.length - (len || 1)].first_line,
                        last_line: lstack[lstack.length - 1].last_line,
                        first_column: lstack[lstack.length - (len || 1)].first_column,
                        last_column: lstack[lstack.length - 1].last_column
                    }, ranges && (yyval._$.range = [ lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1] ]), 
                    void 0 !== (r = this.performAction.apply(yyval, [ yytext, yyleng, yylineno, sharedState.yy, action[1], vstack, lstack ].concat(args)))) return r;
                    len && (stack = stack.slice(0, -1 * len * 2), vstack = vstack.slice(0, -1 * len), 
                    lstack = lstack.slice(0, -1 * len)), stack.push(this.productions_[action[1]][0]), 
                    vstack.push(yyval.$), lstack.push(yyval._$), newState = table[stack[stack.length - 2]][stack[stack.length - 1]], 
                    stack.push(newState);
                    break;

                  case 3:
                    return !0;
                }
            }
            return !0;
        }
    }, lexer = function() {
        return {
            EOF: 1,
            parseError: function(str, hash) {
                if (!this.yy.parser) throw new Error(str);
                this.yy.parser.parseError(str, hash);
            },
            // resets the lexer, sets new input
            setInput: function(input, yy) {
                return this.yy = yy || this.yy || {}, this._input = input, this._more = this._backtrack = this.done = !1, 
                this.yylineno = this.yyleng = 0, this.yytext = this.matched = this.match = "", this.conditionStack = [ "INITIAL" ], 
                this.yylloc = {
                    first_line: 1,
                    first_column: 0,
                    last_line: 1,
                    last_column: 0
                }, this.options.ranges && (this.yylloc.range = [ 0, 0 ]), this.offset = 0, this;
            },
            // consumes and returns one char from the input
            input: function() {
                var ch = this._input[0];
                return this.yytext += ch, this.yyleng++, this.offset++, this.match += ch, this.matched += ch, 
                ch.match(/(?:\r\n?|\n).*/g) ? (this.yylineno++, this.yylloc.last_line++) : this.yylloc.last_column++, 
                this.options.ranges && this.yylloc.range[1]++, this._input = this._input.slice(1), 
                ch;
            },
            // unshifts one char (or a string) into the input
            unput: function(ch) {
                var len = ch.length, lines = ch.split(/(?:\r\n?|\n)/g);
                this._input = ch + this._input, this.yytext = this.yytext.substr(0, this.yytext.length - len), 
                //this.yyleng -= len;
                this.offset -= len;
                var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                this.match = this.match.substr(0, this.match.length - 1), this.matched = this.matched.substr(0, this.matched.length - 1), 
                lines.length - 1 && (this.yylineno -= lines.length - 1);
                var r = this.yylloc.range;
                return this.yylloc = {
                    first_line: this.yylloc.first_line,
                    last_line: this.yylineno + 1,
                    first_column: this.yylloc.first_column,
                    last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
                }, this.options.ranges && (this.yylloc.range = [ r[0], r[0] + this.yyleng - len ]), 
                this.yyleng = this.yytext.length, this;
            },
            // When called from action, caches matched text and appends it on next action
            more: function() {
                return this._more = !0, this;
            },
            // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
            reject: function() {
                return this.options.backtrack_lexer ? (this._backtrack = !0, this) : this.parseError("Lexical error on line " + (this.yylineno + 1) + ". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n" + this.showPosition(), {
                    text: "",
                    token: null,
                    line: this.yylineno
                });
            },
            // retain first n characters of the match
            less: function(n) {
                this.unput(this.match.slice(n));
            },
            // displays already matched input, i.e. for error messages
            pastInput: function() {
                var past = this.matched.substr(0, this.matched.length - this.match.length);
                return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
            },
            // displays upcoming input, i.e. for error messages
            upcomingInput: function() {
                var next = this.match;
                return next.length < 20 && (next += this._input.substr(0, 20 - next.length)), (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
            },
            // displays the character position where the lexing error occurred, i.e. for error messages
            showPosition: function() {
                var pre = this.pastInput(), c = new Array(pre.length + 1).join("-");
                return pre + this.upcomingInput() + "\n" + c + "^";
            },
            // test the lexed token: return FALSE when not a match, otherwise return token
            test_match: function(match, indexed_rule) {
                var token, lines, backup;
                if (this.options.backtrack_lexer && (// save context
                backup = {
                    yylineno: this.yylineno,
                    yylloc: {
                        first_line: this.yylloc.first_line,
                        last_line: this.last_line,
                        first_column: this.yylloc.first_column,
                        last_column: this.yylloc.last_column
                    },
                    yytext: this.yytext,
                    match: this.match,
                    matches: this.matches,
                    matched: this.matched,
                    yyleng: this.yyleng,
                    offset: this.offset,
                    _more: this._more,
                    _input: this._input,
                    yy: this.yy,
                    conditionStack: this.conditionStack.slice(0),
                    done: this.done
                }, this.options.ranges && (backup.yylloc.range = this.yylloc.range.slice(0))), lines = match[0].match(/(?:\r\n?|\n).*/g), 
                lines && (this.yylineno += lines.length), this.yylloc = {
                    first_line: this.yylloc.last_line,
                    last_line: this.yylineno + 1,
                    first_column: this.yylloc.last_column,
                    last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length
                }, this.yytext += match[0], this.match += match[0], this.matches = match, this.yyleng = this.yytext.length, 
                this.options.ranges && (this.yylloc.range = [ this.offset, this.offset += this.yyleng ]), 
                this._more = !1, this._backtrack = !1, this._input = this._input.slice(match[0].length), 
                this.matched += match[0], token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]), 
                this.done && this._input && (this.done = !1), token) return token;
                if (this._backtrack) {
                    // recover context
                    for (var k in backup) this[k] = backup[k];
                    return !1;
                }
                return !1;
            },
            // return next match in input
            next: function() {
                if (this.done) return this.EOF;
                this._input || (this.done = !0);
                var token, match, tempMatch, index;
                this._more || (this.yytext = "", this.match = "");
                for (var rules = this._currentRules(), i = 0; i < rules.length; i++) if ((tempMatch = this._input.match(this.rules[rules[i]])) && (!match || tempMatch[0].length > match[0].length)) {
                    if (match = tempMatch, index = i, this.options.backtrack_lexer) {
                        if (!1 !== (token = this.test_match(tempMatch, rules[i]))) return token;
                        if (this._backtrack) {
                            match = !1;
                            continue;
                        }
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return !1;
                    }
                    if (!this.options.flex) break;
                }
                return match ? !1 !== (token = this.test_match(match, rules[index])) && token : "" === this._input ? this.EOF : this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), {
                    text: "",
                    token: null,
                    line: this.yylineno
                });
            },
            // return next match that has a token
            lex: function() {
                var r = this.next();
                return r || this.lex();
            },
            // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
            begin: function(condition) {
                this.conditionStack.push(condition);
            },
            // pop the previously active lexer condition state off the condition stack
            popState: function() {
                return this.conditionStack.length - 1 > 0 ? this.conditionStack.pop() : this.conditionStack[0];
            },
            // produce the lexer rule set which is active for the currently active lexer condition state
            _currentRules: function() {
                return this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1] ? this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules : this.conditions.INITIAL.rules;
            },
            // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
            topState: function(n) {
                return n = this.conditionStack.length - 1 - Math.abs(n || 0), n >= 0 ? this.conditionStack[n] : "INITIAL";
            },
            // alias for begin(condition)
            pushState: function(condition) {
                this.begin(condition);
            },
            // return the number of states currently on the stack
            stateStackSize: function() {
                return this.conditionStack.length;
            },
            options: {
                "case-insensitive": !0
            },
            performAction: function(yy, yy_, $avoiding_name_collisions, YY_START) {
                switch ($avoiding_name_collisions) {
                  case 0:
                    return 8;

                  case 1:
                  case 2:
                    /* skip comments */
                    break;

                  case 3:
                    return 9;

                  case 4:
                    return 41;

                  case 5:
                    return 42;

                  case 6:
                    return 34;

                  case 7:
                    return 56;

                  case 8:
                    return 31;

                  case 9:
                    return 29;

                  case 10:
                    return 30;

                  case 11:
                    return 28;

                  case 12:
                    return 11;

                  case 13:
                    return 36;

                  case 14:
                    return 38;

                  case 15:
                    return 57;

                  case 16:
                    return 58;

                  case 17:
                    return 53;

                  case 18:
                    return 59;

                  case 19:
                    return 60;

                  case 20:
                    return 61;

                  case 21:
                    return 65;

                  case 22:
                    return 62;

                  case 23:
                    return 63;

                  case 24:
                    return 64;

                  case 25:
                    return 66;

                  case 26:
                    return 67;

                  case 27:
                    return 40;

                  case 28:
                    return 25;

                  case 29:
                    return 26;

                  case 30:
                    return 37;

                  case 31:
                  case 32:
                    return 46;

                  case 33:
                    return 49;

                  case 34:
                    return 39;

                  case 35:
                    return 51;

                  case 36:
                    return 50;

                  case 37:
                    return 52;

                  case 38:
                    return 5;

                  case 39:
                    return "INVALID";
                }
            },
            rules: [ /^(?:[\r\n]+)/i, /^(?:\s+)/i, /^(?:#[^\r\n]*)/i, /^(?:participant\b)/i, /^(?:left of\b)/i, /^(?:right of\b)/i, /^(?:over\b)/i, /^(?:signal\b)/i, /^(?:note\b)/i, /^(?:parallel\b)/i, /^(?:serial\b)/i, /^(?:group\b)/i, /^(?:title\b)/i, /^(?:space\b)/i, /^(?:minwidth\b)/i, /^(?:grouptitle\b)/i, /^(?:groupbox\b)/i, /^(?:style\b)/i, /^(?:font-family\b)/i, /^(?:font-weight\b)/i, /^(?:font-size\b)/i, /^(?:font-color\b)/i, /^(?:stroke\b)/i, /^(?:stroke-width\b)/i, /^(?:fill\b)/i, /^(?:color\b)/i, /^(?:css-class\b)/i, /^(?:,)/i, /^(?:\{)/i, /^(?:\})/i, /^(?:[0-9]+)/i, /^(?:[^\->:,\r\n"\{\}]+)/i, /^(?:"[^"]+")/i, /^(?:--)/i, /^(?:-)/i, /^(?:>>)/i, /^(?:>)/i, /^(?:[^\r\n\{\}]+)/i, /^(?:$)/i, /^(?:.)/i ],
            conditions: {
                INITIAL: {
                    rules: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39 ],
                    inclusive: !0
                }
            }
        };
    }();
    return parser.lexer = lexer, Parser.prototype = parser, parser.Parser = Parser, 
    new Parser();
}();

"undefined" != typeof require && "undefined" != typeof exports && (exports.parser = parser, 
exports.Parser = parser.Parser, exports.parse = function() {
    return parser.parse.apply(parser, arguments);
}, exports.main = function(args) {
    args[1] || (console.log("Usage: " + args[0] + " FILE"), process.exit(1));
    var source = require("fs").readFileSync(require("path").normalize(args[1]), "utf8");
    return exports.parser.parse(source);
}, "undefined" != typeof module && require.main === module && exports.main(process.argv.slice(1)));
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

    drawLine: function(x1, y1, x2, y2, linetype, arrowhead, arrowtail) {
      var line = this.paper_.line(x1, y1, x2, y2).attr(LINE);
      if (linetype !== undefined) {
        line.attr('strokeDasharray', this.lineTypes_[linetype]);
      }
      if (arrowhead !== undefined) {
        line.attr('markerEnd', this.arrowMarkers_[arrowhead]);
      }
      if (arrowtail !== undefined) {
        line.attr('markerStart', this.arrowMarkers_[arrowtail]);
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
    drawLine: function(x1, y1, x2, y2, linetype, arrowhead, arrowtail) {
      var line = this.paper_.path(handLine(x1, y1, x2, y2)).attr(LINE);
      if (linetype !== undefined) {
        line.attr('strokeDasharray', this.lineTypes_[linetype]);
      }
      if (arrowhead !== undefined) {
        line.attr('markerEnd', this.arrowMarkers_[arrowhead]);
      }
	  if (arrowtail !== undefined) {
        line.attr('markerStart', this.arrowMarkers_[arrowtail]);
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


/** js sequence diagrams
 *  https://bramp.github.io/js-sequence-diagrams/
 *  (c) 2012-2017 Andrew Brampton (bramp.net)
 *  Simplified BSD license.
 */
/*global Diagram, _ */

if (typeof Raphael == 'undefined' && typeof Snap == 'undefined') {
  throw new Error('Raphael or Snap.svg is required to be included.');
}

if (_.isEmpty(Diagram.themes)) {
  // If you are using stock js-sequence-diagrams you should never see this. This only
  // happens if you have removed the built in themes.
  throw new Error('No themes were registered. Please call registerTheme(...).');
}

// Set the default hand/simple based on which theme is available.
Diagram.themes.hand = Diagram.themes.snapHand || Diagram.themes.raphaelHand;
Diagram.themes.simple = Diagram.themes.snapSimple || Diagram.themes.raphaelSimple;

/* Draws the diagram. Creates a SVG inside the container
* container (HTMLElement|string) DOM element or its ID to draw on
* options (Object)
*/
Diagram.prototype.drawSVG = function(container, options) {
  var defaultOptions = {
    theme: 'hand'
  };

  options = _.defaults(options || {}, defaultOptions);

  if (!(options.theme in Diagram.themes)) {
    throw new Error('Unsupported theme: ' + options.theme);
  }

  // TODO Write tests for this check
  var div = _.isString(container) ? document.getElementById(container) : container;
  if (div === null || !div.tagName) {
    throw new Error('Invalid container: ' + container);
  }

  var Theme = Diagram.themes[options.theme];
  new Theme(this, options, function(drawing) {
      drawing.draw(div);
    });
}; // end of drawSVG
/** js sequence diagrams
 *  https://bramp.github.io/js-sequence-diagrams/
 *  (c) 2012-2017 Andrew Brampton (bramp.net)
 *  Simplified BSD license.
 */
/*global jQuery */
if (typeof jQuery != 'undefined') {
  (function($) {
    $.fn.sequenceDiagram = function(options) {
      return this.each(function() {
        var $this = $(this);
        var diagram = Diagram.parse($this.text());
        $this.html('');
        diagram.drawSVG(this, options);
      });
    };
  })(jQuery);
}

// Taken from underscore.js:
// Establish the root object, `window` (`self`) in the browser, or `global` on the server.
// We use `self` instead of `window` for `WebWorker` support.
var root = (typeof self == 'object' && self.self == self && self) ||
 (typeof global == 'object' && global.global == global && global);

// Export the Diagram object for **Node.js**, with
// backwards-compatibility for their old module API. If we're in
// the browser, add `Diagram` as a global object.
if (typeof exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = Diagram;
  }
  exports.Diagram = Diagram;
} else {
  root.Diagram = Diagram;
}
}());

