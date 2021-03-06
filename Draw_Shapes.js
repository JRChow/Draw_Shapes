function rgbaRand() {
	//'rgba(20, 170 ,20, .6)'
  var color = 'rgba(';
  for (var i = 0; i < 3; i++) {
  	color += Math.floor(Math.random() * 256).toString() + ', ';
  }
  var opacity = "56789";
  color += '.' + opacity[Math.floor(Math.random() * 5).toString()] + ')';
  // console.log(color)
  return color;
}

// Constructor.
function Rect(x, y, width, height, fill) {
	this.x = x || 0;
	this.y = y || 0;
	this.width = width || 1;
	this.height = height || 1;
	this.fill = fill || 'ff0000'; // Red
}

// Draw rectangle onto context.
Rect.prototype.draw = function(ctx) {
	ctx.fillStyle = this.fill;
	ctx.fillRect(this.x, this.y, 
					 this.width, this.height);
}

// Determine if the mouse click is within the rectangle.
Rect.prototype.contains = function(mouse_x, mouse_y) {
	return (mouse_x >= Math.min(this.x, this.x + this.width)) 
		&& (mouse_x <= Math.max(this.x, this.x + this.width)) 
		&& (mouse_y >= Math.min(this.y, this.y + this.height))
		&& (mouse_y <= Math.max(this.y, this.y + this.height));
}

// Constructor.
function CanvasState(canvas) {
	this.canvas = canvas;
	this.width = canvas.width;
	this.height = canvas.height
	this.ctx = canvas.getContext('2d');

	// For getting precise mouse location.
	var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    if (document.defaultView && document.defaultView.getComputedStyle) {
    	this.stylePaddingLeft = 
    	parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10) || 0;
    	this.stylePaddingTop  = 
    	parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10) || 0;
    	this.styleBorderLeft  = 
    	parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
    	this.styleBorderTop   = 
    	parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10) || 0;
    }
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;

	this.valid = false; // Redraw everything if false.
	this.shapes = []; // Collection of shapes.
	this.dragging = false;
	this.creating = false;
	this.selection = null; // The current shape selected.
	this.creation = null;
	this.dragoffx = 0;
	this.dragoffy = 0;

	var myCanvasState = this;
	var mouse_start_x, mouse_start_y;

	// Disable text-selection via double click.
	canvas.addEventListener('selectstart', function(e) {
		e.preventDefault(); 
		return false; 
	}, false);

	canvas.addEventListener('mousedown', function(e) {
		var mouse = myCanvasState.getMouse(e);
		var mouse_x = mouse.x;
		var mouse_y = mouse.y;
		var shapes = myCanvasState.shapes;

		// Go backwards so that we can select the top shape.
		for (var i = shapes.length-1; i >= 0; i--) {
			if (shapes[i].contains(mouse_x, mouse_y)) {
				myCanvasState.dragoffx = mouse_x - shapes[i].x;
				myCanvasState.dragoffy = mouse_y - shapes[i].y;
				myCanvasState.dragging = true;
				myCanvasState.selection = shapes[i];
				myCanvasState.valid = false;
				return;
			}
		}
		// Create if selected nothing.
		myCanvasState.selection = null;
		myCanvasState.creating = true;
		mouse_start_x = mouse_x;
		mouse_start_y = mouse_y;
		myCanvasState.addShape(new Rect(mouse_start_x, 
										mouse_start_y, 
										0, 
										0, 
										rgbaRand()));
		myCanvasState.creation = shapes[shapes.length - 1];
		myCanvasState.valid = false;
	}, true);

	canvas.addEventListener('mousemove', function(e) {
		var mouse = myCanvasState.getMouse(e);
		if (myCanvasState.dragging) {
			myCanvasState.selection.x = mouse.x - myCanvasState.dragoffx;
			myCanvasState.selection.y = mouse.y - myCanvasState.dragoffy;
		} else if (myCanvasState.creating) {
			myCanvasState.creation.width = mouse.x - mouse_start_x;
			myCanvasState.creation.height = mouse.y - mouse_start_y;
		}
		myCanvasState.valid = false;
	}, true);

	canvas.addEventListener('mouseup', function(e) {
		myCanvasState.dragging = false;
		myCanvasState.creating = false;
		myCanvasState.valid = false;
	}, true);

	canvas.addEventListener('dblclick', function(e) {
		var mouse = myCanvasState.getMouse(e);
		var mouse_x = mouse.x;
		var mouse_y = mouse.y;
		var shapes = myCanvasState.shapes;
		for (var i = shapes.length-1; i >= 0; i--) {
			if (shapes[i].contains(mouse_x, mouse_y)) {
				myCanvasState.shapes.splice(i, 1);
				myCanvasState.selection = null;
				myCanvasState.valid = false;
				return;
			}
		}
	}, true);

	this.selectionColor = '#00ddff';
	this.selectionWidth = 1;
	this.interval = 10; // Refresh rate.
	setInterval(function() {myCanvasState.draw();}, myCanvasState.interval);
}

CanvasState.prototype.addShape = function(shape) {
  this.shapes.push(shape);
  this.valid = false;
}

CanvasState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

// Note: Although we can add background/foreground here, there are better ways
// such as multiple canvases or a CSS background-image.
CanvasState.prototype.draw = function() {
	if (!this.valid) {
		var ctx = this.ctx;
		var shapes = this.shapes;
		this.clear();

		// Can add background here. 

		for (var i = 0; i < shapes.length; i++) {
			var shape = shapes[i];
			if (shape.x > this.width || 
				shape.y > this.height || 
				shape.x + shape.width < 0 || 
				shape.y + shape.height < 0) 
				continue;
			shapes[i].draw(ctx);
		}

		if (this.selection != null) {
			ctx.strokeStyle = this.selectionColor;
			ctx.lineWidth = this.selectionWidth;
			var mySelection = this.selection;
			ctx.strokeRect(mySelection.x, mySelection.y, mySelection.width, mySelection.height);
		}

		// Can add foreground here.

		this.valid = true;
	}
}

// A very precise way of getting the correct mouse position.
// Reference: Simon Sarris on Github
CanvasState.prototype.getMouse = function(e) {
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
  
  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
  
  // We return a simple javascript object (a hash) with x and y defined
  return {x: mx, y: my};
}

// Initialisation
function init() {
	canvas = document.getElementById("mainCanvas");
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight; 
	var cs = new CanvasState(canvas);
	cs.addShape(new Rect(700, 230, 100, 50, rgbaRand()));
	cs.addShape(new Rect(600, 400, 200, 60, rgbaRand()));
}