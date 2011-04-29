/**
 * Game of Life
 * Author: Rusty Geldmacher
 */

// Override the console log so we can turn it on and off 
// Append ?dbg=1 to the URL to enable debugging.
var debug = window.location.href.indexOf('dbg=1') > 0;
var console_log;
if (window.console && window.console.log) {
	console_log = console.log;
	console.log = function() {
		if (debug) {
			console_log.apply(this, arguments);
		}
	};
} else {
	window.console = window.console || {};
	window.console.log = function() { };
};

/**
 * Handles maintaining the game state
 */
var Game = function(canvasId, w, h, cellSize) {
	var canvasId = canvasId;
	var width = w;
	var height = h;
	var cellSize = cellSize;
	var running = false;
	var grid;
	var surface;
	
	// Init!
	clear();
		
	// Resets the game state
	function clear() {		
		$('#generation').html('');
		grid = Grid(w, h, cellSize);
		surface = Surface(canvasId, grid);
		surface.reset(grid);
	}
	
	// Set the state of the game based on an array of living cells
	function setState(state) {
		clear();
		grid.setState(state);
		surface.showGrid(grid);
	}
	
	// Starts the game and keeps it running generations
	function run() {
		if (!running) {
			return;
		}
		$('#generation').html('Generation: ' + grid.generation);
		grid.runGeneration();
		surface.showGrid(grid);			
		setTimeout(function() { run(); }, 500);
	}
	
	// Stops the game
	function stop() {
		running = false;
	}
	
	// Game's public interface
	return {		
		setState: function(state) { setState(state); },
		isRunning: function() { return running; },
		run: function() { 
			running = true;
			run();
		},
		stop: function() { stop(); },
		clear: function() { clear(); }
	};
};

/**
 * Represents a cell on the game board
 */
var Cell = function(x, y) {
	var id = x + ':' + y;
	var x = x;
	var y = y;
	
	return {
		id: id,
		x: x,
		y: y,
		age: 0		
	};
};

/**
 * Represents the grid where the generations get run
 */
var Grid = function(w, h, cellSize) {
	var width = w;
	var height = h;
	var cellSize = cellSize;
	var generation = 0;
	var cells = {};	
	
	// Dumps the grid state to a string
	function dump() {
		var cellDump = [];
		for (var i in cells) {
			cellDump.push([cells[i].x, cells[i].y]);
		}
		return JSON.stringify(cells);
	}
	
	// Set the grid state from an array of cell locations
	function setState(state) {
		for (var i in state) {
			var c = state[i];
			var cell = Cell(c[0], c[1]);
			cells[cell.id] = cell;
		}
	}

	// Returns how many living neighbors a cell has
	function countLivingNeighbors(x, y) {
		var count = 0;		
		for (var x0 = x - 1; x0 <= x + 1; x0++) {
			for (var y0 = y - 1; y0 <= y + 1; y0++) {
				if ((x0 == x && y0 == y) || y0 < 0 || y0 >= height || x0 < 0 || x0 >= width) {
					continue;
				}
				var id = Cell(x0, y0).id;
				if (cells[id]) {
					count += 1;
				}
			}
		}
		return count;
	}

	// Runs the next generation
	function runGeneration() {
		var next = {};
		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				var id = Cell(x, y).id;
				var isAlive = cells[id] ? true : false;
				var livingNeighbors = countLivingNeighbors(x, y);			
				if (isAlive && (livingNeighbors == 2 || livingNeighbors == 3)) {
					var cell = cells[id];
					cell.age += 1;
					next[id] = cell;
				} else if (!isAlive && livingNeighbors == 3) {
					var cell = Cell(x, y);
					next[id] = cell;
				}
			}
		}
		
		cells = next;
		generation = generation + 1;	
	}

	// Grid's public interface
	return {
		width: width,
		height: height,
		cellSize: cellSize,
		cells: cells,
		generation: generation,
		setState: function(state) { setState(state); },
		runGeneration: function() { 
			runGeneration();
			this.generation = generation;
			this.cells = cells;
		},
		dump: function() { return dump(); }
	};
};

/**
 * The drawing surface for the game
 */
var Surface = function(canvasId) {
	var $canvas = $(canvasId);
	var canvasElem = $canvas[0];

	// Gets the low level canvas drawing context
	function getDrawingCtx(reset) {		
		if (reset) {
			canvasElem.width = canvasElem.width;		
		}
		return canvasElem.getContext('2d');
	}
	
	// Resets the drawing surface to a blank grid
	function reset(grid) {
		// Clear the canvas
		canvasElem.width = grid.width * grid.cellSize + 1;
		canvasElem.height = grid.height * grid.cellSize + 1;

		// Bind the click event to this grid
		$canvas.unbind('click').click(function(e) { cellClicked(e, grid); });
		
		// Draw the grid
		var ctx = getDrawingCtx(true);
		var w = (grid.width * grid.cellSize) + 1;
		var h = (grid.height * grid.cellSize) + 1;	
		// Vertical lines
		for (var x = 0.5; x < w; x += grid.cellSize) {
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
		}	
		// Horizontal lines
		for (var y = 0.5; y < h; y += grid.cellSize) {
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
		}	
		// Draw
		ctx.strokeStyle = "#888";
		ctx.stroke();
	}
	
	// Draws a grid
	function showGrid(grid) {		
		reset(grid);	
		for (id in grid.cells) {		
			enableCell(grid.cells[id], grid);
		}
	}
	
	// Handles enabling or disabling a cell based on user input
	function cellClicked(e, grid) {
		console.log('page coords clicked: ' + e.pageX + ', ' + e.pageY);
		// Get click coords relative to canvas
		var offset = $canvas.offset();
		var x = e.pageX - offset.left;
		var y = e.pageY - offset.top;
		console.log('canvas coords clicked: ' + x + ', ' + y);	
		
		// Get cell
		var cell = Cell(Math.floor(x / grid.cellSize), Math.floor(y / grid.cellSize));	
		console.log('cell clicked: ' + cell.x + ', ' + cell.y);
			
		// Determine what to do with the cell	
		if (grid.cells[cell.id]) {		
			disableCell(cell, grid);
		} else {		
			enableCell(cell, grid);
		}
	}

	// Fills in a cell
	function enableCell(cell, grid) {
		grid.cells[cell.id] = cell;
		var R = 255;
		var G = 0;
		var B = 0;
		R = Math.max(0, R - (cell.age * 25));
		var colorString = toRgbColorString(R, G, B);
		console.log('cell age: ', cell.age, ' color: ' + colorString);
		fillCell(cell, grid, colorString);
	}

	function toRgbColorString(r, g, b) {
		return '#' + toRgbComponent(r) + toRgbComponent(g) + toRgbComponent(b);
	}

	function toRgbComponent(d) {
		d = d.toString(16);
		return d = d.length == 1 ? '0' + d : d;
	}

	// Clears a cell
	function disableCell(cell, grid) {
		delete grid.cells[cell.id];
		fillCell(cell, grid, '#fff');
	}

	// Low-level cell drawing function
	function fillCell(cell, grid, fillColor) {
		// Get cell bounding coords
		var cellBox = {
			top: [cell.x * grid.cellSize, cell.y * grid.cellSize],		
		};
		cellBox.bottom = [cellBox.top[0] + grid.cellSize, cellBox.top[1] + grid.cellSize];	
		//console.log('bounding box for cell: ', cellBox.top, ' to ', cellBox.bottom);
		
		// Fill it in
		var ctx = getDrawingCtx();
		ctx.fillStyle = fillColor;
		// Fill the cell, making sure to keep the borders
		ctx.fillRect(cellBox.top[0] + 1, cellBox.top[1] + 1, grid.cellSize - 1, grid.cellSize - 1);	
	}

	/* Public Surface interface */
	return {
		reset: function(grid) { reset(grid); },
		showGrid: function(grid) { showGrid(grid); }		
	};
};

/**
 * Some example game states
 */
var examples = {
	stillLives: [[21,1],[22,1],[2,2],[3,2],[10,2],[11,2],[20,2],[23,2],[2,3],[3,3],[9,3],[12,3],
	             [20,3],[22,3],[23,3],[10,4],[11,4],[19,4],[20,4],[22,4],[19,5],[22,5],[15,6],[16,6],
				 [20,6],[21,6],[15,7],[17,7],[7,8],[8,8],[16,8],[6,9],[9,9],[7,10],[9,10],[2,11],
				 [3,11],[8,11],[1,12],[4,12],[15,12],[16,12],[21,12],[22,12],[2,13],[4,13],[14,13],
				 [17,13],[20,13],[23,13],[1,14],[2,14],[4,14],[5,14],[14,14],[17,14],[18,14],[19,14],
				 [20,14],[23,14],[15,15],[16,15],[21,15],[22,15],[17,16],[18,16],[19,16],[20,16],[17,17],
				 [20,17],[2,18],[3,18],[18,18],[19,18],[2,19],[5,19],[11,19],[4,20],[5,20],[10,20],[12,20],
				 [21,20],[10,21],[12,21],[20,21],[22,21],[9,22],[10,22],[12,22],[13,22],[21,22]],
	basicOscillators: [[1,1],[2,1],[9,1],[14,1],[15,1],[16,1],[1,2],[2,2],[9,2],[13,2],[14,2],[15,2],[3,3],
	                   [4,3],[9,3],[3,4],[4,4],[20,4],[18,5],[20,5],[8,6],[9,6],[14,6],[15,6],[19,6],[21,6],
					   [8,7],[10,7],[13,7],[15,7],[19,7],[10,8],[13,8],[3,9],[4,9],[10,9],[13,9],[3,10],[5,10],
					   [11,10],[12,10],[16,10],[17,10],[22,10],[23,10],[16,11],[18,11],[21,11],[23,11],[5,12],
					   [7,12],[18,12],[21,12],[6,13],[7,13],[16,13],[18,13],[21,13],[23,13],[16,14],[17,14],[22,14],
					   [23,14],[5,16],[6,16],[4,17],[7,17],[19,17],[4,18],[6,18],[7,18],[19,18],[21,18],[3,19],
					   [4,19],[6,19],[8,19],[9,19],[17,19],[7,20],[8,20],[10,20],[16,20],[18,20],[19,20],[20,20],
					   [21,20],[22,20],[10,21],[17,21],[7,22],[8,22],[9,22],[19,22],[21,22],[7,23],[19,23]],
	pulsar: [[9,5],[9,6],[9,7],[10,7],[14,7],[15,7],[15,6],[15,5],[7,9],[7,10],[6,9],[5,9],[17,9],[19,9],[18,9],
	         [17,10],[7,14],[7,15],[6,15],[5,15],[17,14],[17,15],[18,15],[19,15],[15,17],[9,17],[10,17],[9,18],[9,19],
			 [14,17],[15,18],[15,19],[10,9],[11,9],[11,10],[14,9],[13,9],[13,10],[14,15],[13,15],[13,14],[10,15],[11,15],
			 [11,14],[9,14],[9,13],[10,13],[14,13],[15,13],[15,14],[14,11],[15,10],[15,11],[10,11],[9,10],[9,11]],
	pulsarGen: [[11,11],[12,11],[12,13],[11,13],[12,10],[13,11],[13,12],[11,12],[12,14],[13,13]],
	rPent: [[20,16],[19,16],[19,17],[19,18],[18,17]],
	pd: [[7,12],[8,12],[9,12],[10,12],[11,12],[12,12],[13,12],[14,12],[15,12],[16,12]],
	lwss: [[2,1],[2,3],[5,1],[6,2],[6,3],[6,4],[3,4],[4,4],[5,4],[2,14],[2,16],[3,17],[4,17],[5,17],[6,17],[6,16],[6,15],[5,14]],
	queenBee: [[1,13],[2,13],[2,14],[1,14],[6,13],[7,12],[8,11],[7,14],[8,15],[9,12],[9,13],[9,14],[10,11],[10,10],
	           [10,15],[10,16],[21,13],[22,13],[22,14],[21,14]],
	flower: [[11,12],[12,12],[13,12],[12,11],[12,13],[13,10],[13,9],[13,8],[13,7],[14,7],[11,14],[11,15],[11,16],[11,17],
	         [10,17],[10,11],[9,11],[8,11],[7,11],[14,13],[15,13],[16,13],[17,13],[7,10],[17,14],[14,9],[15,9],[16,9],
			 [17,9],[9,10],[9,9],[9,8],[9,7],[10,15],[9,15],[8,15],[7,15],[15,14],[15,15],[15,16],[15,17],[15,8],[16,8],
			 [17,8],[8,9],[8,8],[8,7],[9,16],[8,16],[7,16],[16,15],[16,16],[16,17],[11,10],[10,13],[13,14],[14,11],[10,7],
			 [11,8],[10,9],[17,10],[16,11],[15,10],[14,17],[13,16],[14,15],[7,14],[8,13],[9,14]]
};

