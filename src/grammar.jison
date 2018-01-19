/** js sequence diagrams
 *  https://bramp.github.io/js-sequence-diagrams/
 *  (c) 2012-2017 Andrew Brampton (bramp.net)
 *  Simplified BSD license.
 */
%lex

%options case-insensitive

%{
	// Pre-lexer code can go here
%}

%%

[\r\n]+             return 'NL';
\s+                 /* skip whitespace */
\#[^\r\n]*          /* skip comments */
"participant"       return 'participant';
"left of"           return 'left_of';
"right of"          return 'right_of';
"over"              return 'over';
"signal"            return 'signal';
"note"              return 'note';
"parallel"          return 'parallel';
"serial"            return 'serial';
"group"             return 'group';
"title"             return 'title';
"space"             return 'space';
"minwidth"          return 'minwidth';
"grouptitle"        return 'grouptitle';
"groupbox"          return 'groupbox';
"style"             return 'style';
"font-family"       return 'font_family';
"font-weight"       return 'font_weight'; 
"font-size"         return 'font_size';
"font-color"        return 'font_color';
"stroke"            return 'stroke';
"stroke-width"      return 'stroke_width';
"fill"              return 'fill';
"color"             return 'color';
"css-class"         return 'css_class';
","                 return ',';
"{"                 return 'CURLY_LEFT_BRACKET';
"}"                 return 'CURLY_RIGHT_BRACKET';
[0-9]+			    return 'NUMBER';
[^\->:,\r\n"\{\}]+  return 'ACTOR';
\"[^"]+\"           return 'ACTOR';
"--"                return 'DOTLINE';
"-"                 return 'LINE';
">>"                return 'OPENARROW';
">"                 return 'ARROW';
:[^\r\n\{\}]+       return 'MESSAGE';
<<EOF>>             return 'EOF';
.                   return 'INVALID';

/lex

%start start

%% /* language grammar */

start
	: document 'EOF' { return yy.parser.yy; } /* returning parser.yy is a quirk of jison >0.4.10 */
	;

document
	: /* empty */
	| document line
	;

line
	: statement { }
	| 'NL'
	;

statement
	: 'participant' actor_alias { $2; }
	| 'title' message      { yy.parser.yy.setTitle($2);  }
	| element_statements_block_wo_brackets { yy.parser.yy.root_block = $1; $1.y_offset = 0; $1.order = 'serial'; }
	;

element_statement
	: signal_statement     { $$ = $1; yy.parser.yy.addElement($1); }
	| note_statement       { $$ = $1; yy.parser.yy.addElement($1); }
	| space_statement      { $$ = $1; yy.parser.yy.addElement($1); }
	| minwidth_statement   { $$ = $1; yy.parser.yy.addElement($1); }
	| parallel_block       { $$ = $1; }
	| serial_block         { $$ = $1; }
	| element_statements_block { $$ = $1; }
	| style_statement      { $$ = $1; }
	;

element_statement_line
	: element_statement { $$ = $1; }
	| 'NL'             { $$ = undefined; }
	;

element_statements
	: /* empty */ { $$ = []; }
	| element_statements element_statement_line { $$ = $1; if ($2 !== undefined) { $1.push($2); } }
	;

element_statements_block_wo_brackets
	: element_statements
		{
			$$ = new Diagram.Block();
			$$.children = [];
			for (var i = 0; i < $1.length; ++i) {
				if ($1[i].type == 'Style') {
					$$.addStyle($1[i]);
				} else {
					$1[i].parentBlock = $$;
					$$.children.push($1[i]);
				}
			}
		}
	;

element_statements_block
	: CURLY_LEFT_BRACKET element_statements_block_wo_brackets CURLY_RIGHT_BRACKET { $$ = $2; }
	| group_title CURLY_LEFT_BRACKET element_statements_block_wo_brackets CURLY_RIGHT_BRACKET
		{
			$$ = $3;
			$1.parentBlock = $$;
			$$.groupTitleElement = $1;
			$$.groupBoxingElement = new Diagram.GroupBox();
			$$.groupBoxingElement.parentBlock = $$;
			yy.parser.yy.addElement($$.groupBoxingElement);
		}
	;
	
group_title
	: 'group' message { $$ = new Diagram.GroupTitle($2); yy.parser.yy.addElement($$); }
	;

parallel_block
	: 'parallel' element_statements_block { $$ = $2; $$.order = 'parallel'; }
	;

serial_block
	: 'serial' element_statements_block { $$ = $2; $$.order = 'serial'; }
	;

note_statement
	: 'note' placement actor message   { $$ = new Diagram.Note($3, $2, $4); }
	| 'note' 'over' actor_pair message { $$ = new Diagram.Note($3, Diagram.PLACEMENT.OVER, $4); }
	;

space_statement
	: 'space' NUMBER { $$ = new Diagram.Space(parseInt($2)); }
	;

minwidth_statement
	: 'minwidth' actor LINE NUMBER { $$ = new Diagram.MinWidth($2, parseInt($4)); }
	;

actor_pair
	: actor             { $$ = $1; }
	| actor ',' actor   { $$ = [$1, $3]; }
	;

placement
	: 'left_of'   { $$ = Diagram.PLACEMENT.LEFTOF; }
	| 'right_of'  { $$ = Diagram.PLACEMENT.RIGHTOF; }
	;

signal_statement
	: actors signaltype actors message
	{ $$ = new Diagram.Signal($1, $2, $3, $4); }
	;

actors
	: actor				{ $$ = [$1] }
	| actors ',' actor	{ $$ = $1; $$.push($3); }
	;

actor
	: actor_name { $$ = yy.parser.yy.getActor(Diagram.unescape($1)); }
	;

actor_alias
	: actor_name { $$ = yy.parser.yy.getActorWithAlias(Diagram.unescape($1)); }
	;
	
actor_name
	: ACTOR { $$ = $1; }
	| NUMBER { $$ = $1; }
	;

signaltype
	: linetype arrowtype            { $$ = {'linetype': $1, 'headarrowtype': $2}; }
	| arrowtype linetype            { $$ = {'linetype': $2, 'tailarrowtype': Diagram.flipArrowType($1)}; }
	| arrowtype linetype arrowtype  { $$ = {'linetype': $2, 'tailarrowtype': Diagram.flipArrowType($1), 'headarrowtype': $3}; }
	| linetype                      { $$ = {'linetype': $1}; }
	;

linetype
	: LINE      { $$ = Diagram.LINETYPE.SOLID; }
	| DOTLINE   { $$ = Diagram.LINETYPE.DOTTED; }
	;

arrowtype
	: ARROW     { $$ = Diagram.ARROWTYPE.FILLED; }
	| OPENARROW { $$ = Diagram.ARROWTYPE.OPEN; }
	;

message
	: MESSAGE { $$ = Diagram.unescape($1.substring(1)); }
	;
	
style_statement
	: 'style' elementtype style_property message { $$ = new Diagram.Style($2, $3, $4); }
	| 'style' style_property message { $$ = new Diagram.Style(undefined, $2, $3); }
	;
	
elementtype
	: 'note' { $$ = 'Note'; }
	| 'signal' { $$ = 'Signal'; }
	| 'minwidth' { $$ = 'MinWidth'; }
	| 'space' { $$ = 'Space'; }
	| 'grouptitle' { $$ = 'GroupTitle'; }
	| 'groupbox' { $$ = 'GroupBox'; }
	| 'title' { $$ = 'Title'; }
	| 'participant' { $$ = 'Participant'; }
	;

style_property
	: 'font_family' { $$ = 'font-family'; }
	| 'font_weight' { $$ = 'font-weight'; }
	| 'font_size' { $$ = 'font-size'; }
	| 'stroke' { $$ = 'stroke'; }
	| 'stroke_width' { $$ = 'stroke-width'; }
	| 'fill' { $$ = 'fill'; }
	| 'font_color' { $$ = 'font-color'; }
	| 'color' { $$ = 'color'; }
	| 'css_class' { $$ = 'css-class'; }
	;

%%
