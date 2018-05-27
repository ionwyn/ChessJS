// UI and Game State Handler

// On piece drop, do something.
var onDrop = function(source, target) {

  // When valid move
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  // If move is illegal, snapback to original square.
  removeGreySquares();
  if (move === null) {
    return 'snapback';
  }

};

// Triggered upon piece pickup
var onDragStart = function(source, piece, position, orientation) {
  if (game.in_checkmate() === true || game.in_draw() === true ||
    piece.search(/^b/) !== -1) {
    return false;
  }
};

// It's the computer's turn
var onSnapEnd = function() {
  window.setTimeout(makeBestMove, 250);
  updateStatus();
  board.position(game.fen());
};

// Update game board
function updateStatus() {
  var status = '';

  // change turn after each move
  var moveColor = 'White';
  if (game.turn() === 'b') {
    moveColor = 'Black';
  }

  // checkmate?
  if (game.in_checkmate() === true) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';
  }

  // draw?
  else if (game.in_draw() === true) {
    status = 'Game over, drawn position';
  }

  // game still on
  else {
    status = moveColor + ' to move';

    // check?
    if (game.in_check() === true) {
      status += ', ' + moveColor + ' is in check';
    }
  }

  // Update game status indicator
  statusEl.html(status);
  fenEl.html(game.fen());
  pgnEl.html(game.pgn());
};

// Animation handler for mouse hovers
var onMouseoverSquare = function(square, piece) {
  var moves = game.moves({
    square: square,
    verbose: true
  });

  if (moves.length === 0) return;

  greySquare(square);

  for (var i = 0; i < moves.length; i++) {
    greySquare(moves[i].to);
  }
};

var onMouseoutSquare = function(square, piece) {
  removeGreySquares();
};

var removeGreySquares = function() {
  $('#board .square-55d63').css('background', '');
};

var greySquare = function(square) {
  var squareEl = $('#board .square-' + square);

  var background = '#a9a9a9';
  if (squareEl.hasClass('black-3c85d') === true) {
    background = '#696969';
  }

  squareEl.css('background', background);
};

// Game board configuartion
var cfg = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onMouseoutSquare: onMouseoutSquare,
  onMouseoverSquare: onMouseoverSquare,
  onSnapEnd: onSnapEnd
};

// Game board presentation
board = ChessBoard('board', cfg);
