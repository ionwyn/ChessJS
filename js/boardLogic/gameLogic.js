// Game initialization
game = new Chess(),
  statusEl = $('#status'),
  fenEl = $('#fen'),
  pgnEl = $('#pgn');

// Search configuration
const global = {
  tableSize: 100000,
  exact: 0,
  upper_bound: 1,
  lower_bound: 2,
  searchDepth: 3
};

// Because JavaScript built in modulo sucks!
Number.prototype.mod = function(n) {
  return ((this % n) + n) % n;
};

function mod(n, m) {
  return ((n % m) + m) % m;
}

// Transposition table initialization
const transTable = [];

for (let i = 0; i < global.tableSize; i++) {
  transTable.push({
    hashValue: Number,
    depth: Number,
    flag: Number,
    moveScore: Number,
    bestMove: String
  })
}

// Zobrist HashTable initialization
const ZobristTable = new Array();
for (let i = 0; i < 8; i++) {
  ZobristTable[i] = new Array();
  for (let j = 0; j < 12; j++) {
    ZobristTable[i][j] = new Array();
  }
}

// Generate a big random integer
function getRandomInt() {
  return Math.floor(Math.random() * Math.floor(Number.MAX_SAFE_INTEGER));
}

function initTable() {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      for (let k = 0; k < 12; k++) {
        ZobristTable[i][j][k] = getRandomInt();
      }
    }
  }
}

function computeHash(currentBoard) {
  let h = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (currentBoard[i][j] != null) {
        const piece = indexOf(currentBoard[i][j].type);
        h ^= ZobristTable[i][j][piece];
      }
    }
  }
  return h;
}

function minimaxRoot(depth, game, isMaximisingPlayer) {
  const newGameMoves = game.ugly_moves();
  let bestMove = -9999;
  let bestMoveFound;

  for (const newGameMove of newGameMoves) {
    game.ugly_move(newGameMove);
    const value = minimax(depth - 1, game, -10000, 10000, !isMaximisingPlayer, newGameMove);
    game.undo();
    if (value >= bestMove) {
      bestMove = value;
      bestMoveFound = newGameMove;
    }
  }

  return bestMoveFound;
};

function recordHash(sdepth, val, hashV, move, flag) {
  const hashIndex = mod(hashV, global.tableSize);

  transTable[hashIndex].depth = sdepth;
  transTable[hashIndex].moveScore = val;
  transTable[hashIndex].hashValue = hashV;
  transTable[hashIndex].bestMove = move;
  transTable[hashIndex].flag = flag;
}

function minimax(depth, game, alpha, beta, isMaximisingPlayer, newMove) {
  positionCount++;
  if (depth === 0) {
    var eval = -evaluateBoard(game.board());
    hashValue = computeHash(game.board());
    recordHash(depth, eval, hashValue, newMove, global.exact);
    return eval;
  }
  hashValue = computeHash(game.board());
  index = mod(hashValue, global.tableSize);
  if (transTable[index].hashValue === hashValue && transTable[index].depth >= depth) {
    if (transTable[index].flag === 0) {
      // console.log("Move was " + transTable[index].bestMove);
      return transTable[index].moveScore;
    } else if (transTable[index].flag === 2) {
      if (transTable[index].moveScore >= beta) {
        // console.log("Move was " + transTable[index].bestMove);
        return transTable[index].moveScore;
      } else {
        return;
      }
    } else if (transTable[index].flag === 1) {
      if (transTable[index].moveScore <= alpha) {
        // console.log("Move was " + transTable[index].bestMove);
        return transTable[index].moveScore;
      } else {
        return;
      }
    }
  }

  var newGameMoves = game.ugly_moves();

  if (isMaximisingPlayer) {
    var bestMove = -9999;
    for (var i = 0; i < newGameMoves.length; i++) {

      game.ugly_move(newGameMoves[i]);
      bestMove = Math.max(bestMove, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer, newGameMoves[i]));
      game.undo();

      alpha = Math.max(alpha, bestMove);
      if (beta <= alpha) {
        return bestMove;
      }
      hashValue = computeHash(game.board());
      recordHash(depth, alpha, hashValue, newGameMoves[i], global.lower_bound);
    }
    return bestMove;
  } else {
    var bestMove = 9999;
    for (var i = 0; i < newGameMoves.length; i++) {
      game.ugly_move(newGameMoves[i]);
      bestMove = Math.min(bestMove, minimax(depth - 1, game, alpha, beta, !isMaximisingPlayer, newGameMoves[i]));
      game.undo();
      beta = Math.min(beta, bestMove);
      if (beta <= alpha) {
        return bestMove;
      }
      hashValue = computeHash(game.board());
      recordHash(depth, beta, hashValue, newGameMoves[i], global.upper_bound);
    }
    return bestMove;
  }
};

function evaluateBoard(board) {
  let totalEvaluation = 0;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      totalEvaluation = totalEvaluation + getPieceValue(board[i][j], i, j);
    }
  }
  return totalEvaluation;
}

function getPieceValue(piece, x, y) {
  if (piece === null) {
    return 0;
  }
  const getAbsoluteValue = (piece, isWhite, x, y) => {
    if (piece.type === 'p') {
      return 10 + (isWhite ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x]);
    } else if (piece.type === 'r') {
      return 50 + (isWhite ? rookEvalWhite[y][x] : rookEvalBlack[y][x]);
    } else if (piece.type === 'n') {
      return 30 + knightEval[y][x];
    } else if (piece.type === 'b') {
      return 30 + (isWhite ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x]);
    } else if (piece.type === 'q') {
      return 90 + evalQueen[y][x];
    } else if (piece.type === 'k') {
      return 900 + (isWhite ? kingEvalWhite[y][x] : kingEvalBlack[y][x]);
    }
    throw `Unknown piece type: ${piece.type}`;
  };

  const absoluteValue = getAbsoluteValue(piece, piece.color === 'w', x, y);
  return piece.color === 'w' ? absoluteValue : -absoluteValue;
}

/* board visualization and games state handling */

function makeBestMove() {

  // if (
  // 	(game.fen() ===
  // "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1" ||
  // "rnbqkbnr/pppppppp/8/8/8/1P6/P1PPPPPP/RNBQKBNR b KQkq - 0 1" ||
  // "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1" ||
  // "rnbqkbnr/pppppppp/8/8/8/6P1/PPPPPP1P/RNBQKBNR b KQkq - 0 1" ||
  // "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1") && flag === 0) {
  // 	game.move("f5");
  // 	board.position(game.fen());
  // 	updateStatus();
  // 	flag = 1;
  //
  // 	return
  // }

  const bestMove = getBestMove(game);
  game.ugly_move(bestMove);
  board.position(game.fen());
  updateStatus();
  if (game.game_over()) {
    alert('Game over');
  }
}


let positionCount;

function getBestMove(game) {
  if (game.game_over()) {
    alert('Game over');
  }

  positionCount = 0;
  const depth = global.searchDepth;

  const d = new Date().getTime();
  const bestMove = minimaxRoot(depth, game, true);
  const d2 = new Date().getTime();
  const moveTime = (d2 - d);
  const positionsPerS = (positionCount * 1000 / moveTime);

  $('#position-count').text(positionCount);
  $('#time').text(`${moveTime / 1000}s`);
  $('#positions-per-s').text(positionsPerS);
  return bestMove;
}

initTable();
var hashValue = computeHash(game.board());
