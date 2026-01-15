import { useState, useEffect } from 'react';
import init, { GameState, Player } from '../pkg/nard.js';
import './App.css';
import {
  initDatabase,
  createGame,
  saveMove,
  updateGame,
  getGameMoves,
  getGameStats
} from './database.js';

function App() {
  const [game, setGame] = useState(null);
  const [board, setBoard] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(Player.White);
  const [dice, setDice] = useState([0, 0]);
  const [diceUsed, setDiceUsed] = useState([false, false]);
  const [whiteBar, setWhiteBar] = useState(0);
  const [blackBar, setBlackBar] = useState(0);
  const [whiteBornOff, setWhiteBornOff] = useState(0);
  const [blackBornOff, setBlackBornOff] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [status, setStatus] = useState('');
  const [currentGameId, setCurrentGameId] = useState(null);
  const [moveNumber, setMoveNumber] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [gameMoves, setGameMoves] = useState([]);

  useEffect(() => {
    async function loadGame() {
      // Initialize database
      try {
        await initDatabase();
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }

      await init();
      const newGame = new GameState();
      setGame(newGame);
      updateGameState(newGame);
      
      // Create a new game in database
      const gameId = createGame();
      setCurrentGameId(gameId);
      setMoveNumber(0);
    }
    loadGame();
  }, []);

  function loadCurrentGameMoves() {
    if (currentGameId) {
      const moves = getGameMoves(currentGameId);
      setGameMoves(moves);
    } else {
      setGameMoves([]);
    }
  }

  function updateGameState(gameInstance) {
    if (!gameInstance) return;
    
    const newBoard = gameInstance.get_board();
    const newDice = gameInstance.dice;
    const newDiceUsed = gameInstance.dice_used;
    const newCurrentPlayer = gameInstance.current_player;
    const newWhiteBar = gameInstance.white_bar;
    const newBlackBar = gameInstance.black_bar;
    const newWhiteBornOff = gameInstance.white_born_off;
    const newBlackBornOff = gameInstance.black_born_off;
    const newGameOver = gameInstance.game_over;
    
    setBoard(newBoard);
    setDice(newDice);
    setDiceUsed(newDiceUsed);
    setCurrentPlayer(newCurrentPlayer);
    setWhiteBar(newWhiteBar);
    setBlackBar(newBlackBar);
    setWhiteBornOff(newWhiteBornOff);
    setBlackBornOff(newBlackBornOff);
    setGameOver(newGameOver);
    
    if (newGameOver) {
      setWinner(gameInstance.winner);
      const winnerName = gameInstance.winner === Player.White ? 'White' : 'Black';
      setStatus(`Game Over! ${winnerName} Player Wins!`);
      
      // Update game in database with winner
      if (currentGameId) {
        updateGame(currentGameId, winnerName, moveNumber);
      }
    } else {
      setWinner(null);
      const diceRolled = newDice[0] > 0 || newDice[1] > 0;
      if (!diceRolled) {
        setStatus('');
      } else {
        const canRoll = (newDice[0] === 0 && newDice[1] === 0) || (newDiceUsed[0] && newDiceUsed[1]);
        if (canRoll) {
          setStatus('Roll dice to start turn');
        } else {
          setStatus('Select a point to move');
        }
      }
    }
  }

  function handleRollDice() {
    if (!game || gameOver) return;
    
    // Prevent rolling if dice are already rolled and not all used
    const canRoll = (dice[0] === 0 && dice[1] === 0) || (diceUsed[0] && diceUsed[1]);
    if (!canRoll && dice[0] > 0) {
      // Dice already rolled and not all used, can't roll again
      return;
    }
    
    game.roll_dice();
    updateGameState(game);
  }

  function handleReset() {
    if (!game) return;
    
    // Create a new game in database
    const gameId = createGame();
    setCurrentGameId(gameId);
    setMoveNumber(0);
    
    game.reset();
    
    // Explicitly clear winner and status before updating game state
    setWinner(null);
    setStatus('');
    
    // Clear moves history for the new game
    setGameMoves([]);
    
    updateGameState(game);
  }

  function handlePointClick(pointIndex) {
    if (!game || gameOver) return;
    
    // Check if dice are rolled
    if (dice[0] === 0 && dice[1] === 0) return;
    
    // Use Rust method to find the best move for this point
    const moveResult = game.find_move_for_point(pointIndex);
    
    if (moveResult === null) {
      return; // No valid move available
    }
    
    const [die, targetPoint] = moveResult;
    
    // Check if player has checkers on bar (re-entering)
    const onBar = (currentPlayer === Player.White && whiteBar > 0) ||
                  (currentPlayer === Player.Black && blackBar > 0);
    
    const playerName = currentPlayer === Player.White ? 'White' : 'Black';
    const pointFrom = onBar ? null : pointIndex;
    
    if (onBar) {
      // Re-entering from bar - from_point is null
      const success = game.make_move(null, targetPoint, die);
      if (success) {
        const newMoveNumber = moveNumber + 1;
        setMoveNumber(newMoveNumber);
        if (currentGameId != null && currentGameId > 0) {
          saveMove(
            currentGameId,
            playerName,
            null,
            targetPoint,
            die,
            newMoveNumber
          );
          if (showHistory) {
            loadCurrentGameMoves();
          }
        }
        updateGameState(game);
      }
    } else {
      // Regular move - from_point is the clicked point
      const success = game.make_move(pointIndex, targetPoint, die);
      if (success) {
        const newMoveNumber = moveNumber + 1;
        setMoveNumber(newMoveNumber);
        if (currentGameId != null && currentGameId > 0) {
          saveMove(
            currentGameId,
            playerName,
            pointIndex,
            targetPoint,
            die,
            newMoveNumber
          );
          if (showHistory) {
            loadCurrentGameMoves();
          }
        }
        updateGameState(game);
      }
    }
  }

  function renderPoint(pointIndex, boardArray) {
    const pointValue = boardArray[pointIndex];
    const isWhitePoint = pointValue > 0;
    const isBlackPoint = pointValue < 0;
    const checkerCount = Math.abs(pointValue);
    
    // Check if this is a valid entry point when player has checkers on bar
    const onBar = (currentPlayer === Player.White && whiteBar > 0) ||
                  (currentPlayer === Player.Black && blackBar > 0);
    let isValidEntry = false;
    if (onBar && game) {
      // Only check if dice are actually rolled (not [0,0])
      const diceRolled = dice[0] > 0 || dice[1] > 0;
      if (diceRolled) {
        const expectedEntry0 = currentPlayer === Player.White 
          ? (24 - dice[0]) 
          : (dice[0] - 1);
        const expectedEntry1 = currentPlayer === Player.White 
          ? (24 - dice[1]) 
          : (dice[1] - 1);
        // Check if this point matches expected entry points for unused dice
        if ((!diceUsed[0] && dice[0] > 0 && expectedEntry0 === pointIndex) ||
            (!diceUsed[1] && dice[1] > 0 && expectedEntry1 === pointIndex)) {
          // Try to find a move to verify it's valid
          const moveResult = game.find_move_for_point(pointIndex);
          if (moveResult !== null) {
            isValidEntry = true;
          }
        }
      }
    }
    
    let pointClassName = 'point';
    if (isWhitePoint) {
      pointClassName += ' white-point';
    } else if (isBlackPoint) {
      pointClassName += ' black-point';
    }
    if (isValidEntry) {
      pointClassName += ' valid-entry';
    }
    
    return (
      <div
        key={pointIndex}
        className={pointClassName}
        onClick={() => handlePointClick(pointIndex)}
      >
        <div className="checkers-container">
          {isWhitePoint && Array.from({ length: checkerCount }, (_, i) => (
            <div key={i} className="checker white-checker" />
          ))}
          {isBlackPoint && Array.from({ length: checkerCount }, (_, i) => (
            <div key={i} className="checker black-checker" />
          ))}
        </div>
      </div>
    );
  }

  const playerName = currentPlayer === Player.White ? 'White' : 'Black';

  return (
    <div className="container">
      <header>
        <h1>Nard</h1>
      </header>
      
      <div className="game-info">
        <div className="player-info">
          <div className={`player-indicator ${currentPlayer === Player.Black ? 'dark' : ''}`}>
            <span>Current Player: </span>
            <span id="player-name" className={currentPlayer === Player.White ? 'white' : 'black'}>
              {playerName}
            </span>
          </div>
          <div className="dice-container">
            <span>Dice: </span>
            <div id="dice-values">
              <span className={`die ${diceUsed[0] ? 'used' : ''}`}>
                {dice[0] > 0 ? dice[0] : '-'}
              </span>
              <span className={`die ${diceUsed[1] ? 'used' : ''}`}>
                {dice[1] > 0 ? dice[1] : '-'}
              </span>
            </div>
          </div>
          {(whiteBar > 0 || blackBar > 0) && (
            <div className="bar-display">
              <span>White Bar: {whiteBar}</span>
              <span>Black Bar: {blackBar}</span>
            </div>
          )}
          {(whiteBornOff > 0 || blackBornOff > 0) && (
            <div className="born-off-display">
              <span>White Off: {whiteBornOff}</span>
              <span>Black Off: {blackBornOff}</span>
            </div>
          )}
        </div>
        <div className="controls">
          <button 
            id="roll-btn" 
            className="btn btn-primary"
            onClick={handleRollDice}
            disabled={gameOver || ((dice[0] > 0 || dice[1] > 0) && !(diceUsed[0] && diceUsed[1]))}
          >
            Roll Dice
          </button>
          <button 
            id="reset-btn" 
            className="btn btn-secondary"
            onClick={handleReset}
          >
            Reset
          </button>
          <button 
            className="btn btn-history"
            onClick={() => {
              if (!showHistory) {
                loadCurrentGameMoves();
              }
              setShowHistory(!showHistory);
            }}
          >
            History
          </button>
        </div>
      </div>
      
      <div className="board-container">
        <div id="game-board" className="board">
          {/* Top half of board (points 12-23, Black's side) */}
          <div className="board-half top-half">
            {/* Points 19-24 (top right, Black's home) */}
            <div className="points-row">
              {Array.from({ length: 6 }, (_, i) => renderPoint(23 - i, board))}
            </div>
            
            {/* Points 13-18 (top left, Black's outer) */}
            <div className="points-row">
              {Array.from({ length: 6 }, (_, i) => renderPoint(17 - i, board))}
            </div>
          </div>
          
          {/* Bottom half of board (points 0-11, White's side) */}
          <div className="board-half bottom-half">
            {/* Points 7-12 (bottom left, White's outer) */}
            <div className="points-row">
              {Array.from({ length: 6 }, (_, i) => renderPoint(11 - i, board))}
            </div>
            
            {/* Points 1-6 (bottom right, White's home) */}
            <div className="points-row">
              {Array.from({ length: 6 }, (_, i) => renderPoint(5 - i, board))}
            </div>
          </div>
        </div>
      </div>
      
      <div 
        id="status" 
        className="status"
        style={{ color: gameOver ? '#ff6347' : '#667eea' }}
      >
        {status}
      </div>

      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <h2>Record</h2>
            {currentGameId && (
              <div className="history-game-info">
                <span>Game #{currentGameId}</span>
              </div>
            )}
          </div>
          
          {gameMoves.length === 0 ? (
            <div className="history-empty">No moves.</div>
          ) : (
            <div className="history-content">
              <div className="history-moves">
                <h3>Moves</h3>
                <div className="moves-list">
                  {gameMoves.map((move) => (
                    <div key={move.id} className="move-item">
                      <span className="move-number">#{move.move_number}</span>
                      <span className={`move-player ${move.player.toLowerCase()}`}>
                        {move.player}
                      </span>
                      <span className="move-details">
                        {move.point_from !== null ? `Point ${move.point_from + 1}` : 'Bar'} 
                        {' → '} 
                        Point {move.point_to + 1}
                      </span>
                      <span className="move-dice">🎲 {move.die_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
