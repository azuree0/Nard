import init, { GameState, Player } from './pkg/nard.js';

let game = null;

async function run() {
    await init();
    game = new GameState();
    renderBoard();
    updateUI();
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('roll-btn').addEventListener('click', () => {
        if (!game || game.game_over) {
            return;
        }
        // Prevent rolling if dice are already rolled and not all used
        const dice = game.dice;
        const diceUsed = game.dice_used;
        // Allow rolling if dice are reset (both 0) or if all dice are used
        const canRoll = (dice[0] === 0 && dice[1] === 0) || (diceUsed[0] && diceUsed[1]);
        if (!canRoll && dice[0] > 0) {
            // Dice already rolled and not all used, can't roll again
            return;
        }
        game.roll_dice();
        renderBoard();
        updateUI();
    });
    
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (!game) {
            return;
        }
        game.reset();
        renderBoard();
        updateUI();
    });
}

function renderBoard() {
    const boardContainer = document.getElementById('board-container');
    boardContainer.innerHTML = '';
    
    const boardArray = game.get_board();
    
    // Create the backgammon board
    const board = document.createElement('div');
    board.id = 'game-board';
    board.className = 'board';
    
    // Top half of board (points 12-23, Black's side)
    const topHalf = document.createElement('div');
    topHalf.className = 'board-half top-half';
    
    // Points 19-24 (top right, Black's home)
    const topRight = document.createElement('div');
    topRight.className = 'points-row';
    for (let i = 23; i >= 18; i--) {
        const point = createPoint(i, boardArray);
        topRight.appendChild(point);
    }
    topHalf.appendChild(topRight);
    
    // Bar area
    const barArea = document.createElement('div');
    barArea.className = 'bar-area';
    const whiteBar = document.createElement('div');
    whiteBar.className = 'bar white-bar';
    whiteBar.id = 'white-bar-visual';
    const blackBar = document.createElement('div');
    blackBar.className = 'bar black-bar';
    blackBar.id = 'black-bar-visual';
    barArea.appendChild(whiteBar);
    barArea.appendChild(blackBar);
    topHalf.appendChild(barArea);
    
    // Points 13-18 (top left, Black's outer)
    const topLeft = document.createElement('div');
    topLeft.className = 'points-row';
    for (let i = 17; i >= 12; i--) {
        const point = createPoint(i, boardArray);
        topLeft.appendChild(point);
    }
    topHalf.appendChild(topLeft);
    
    board.appendChild(topHalf);
    
    // Bottom half of board (points 0-11, White's side)
    const bottomHalf = document.createElement('div');
    bottomHalf.className = 'board-half bottom-half';
    
    // Points 7-12 (bottom left, White's outer)
    const bottomLeft = document.createElement('div');
    bottomLeft.className = 'points-row';
    for (let i = 11; i >= 6; i--) {
        const point = createPoint(i, boardArray);
        bottomLeft.appendChild(point);
    }
    bottomHalf.appendChild(bottomLeft);
    
    // Points 1-6 (bottom right, White's home)
    const bottomRight = document.createElement('div');
    bottomRight.className = 'points-row';
    for (let i = 5; i >= 0; i--) {
        const point = createPoint(i, boardArray);
        bottomRight.appendChild(point);
    }
    bottomHalf.appendChild(bottomRight);
    
    board.appendChild(bottomHalf);
    
    boardContainer.appendChild(board);
    
    // Update bar visualization
    updateBarVisualization();
}

function createPoint(pointIndex, boardArray) {
    const point = document.createElement('div');
    point.className = 'point';
    point.dataset.pointIndex = pointIndex;
    
    const pointValue = boardArray[pointIndex];
    const pointNumber = document.createElement('div');
    pointNumber.className = 'point-number';
    pointNumber.textContent = pointIndex + 1;
    point.appendChild(pointNumber);
    
    const checkersContainer = document.createElement('div');
    checkersContainer.className = 'checkers-container';
    
    if (pointValue > 0) {
        // White checkers
        for (let i = 0; i < pointValue; i++) {
            const checker = document.createElement('div');
            checker.className = 'checker white-checker';
            checkersContainer.appendChild(checker);
        }
        point.className += ' white-point';
    } else if (pointValue < 0) {
        // Black checkers
        for (let i = 0; i < Math.abs(pointValue); i++) {
            const checker = document.createElement('div');
            checker.className = 'checker black-checker';
            checkersContainer.appendChild(checker);
        }
        point.className += ' black-point';
    }
    
    point.appendChild(checkersContainer);
    
    // Highlight valid entry points when player has checkers on bar
    const onBar = (game.current_player === Player.White && game.white_bar > 0) ||
                  (game.current_player === Player.Black && game.black_bar > 0);
    if (onBar) {
        const dice = game.dice;
        const diceUsed = game.dice_used;
        // Check if this point is a valid entry point for either die
        if ((!diceUsed[0] && dice[0] > 0) || (!diceUsed[1] && dice[1] > 0)) {
            const expectedEntry0 = game.current_player === Player.White 
                ? (24 - dice[0]) 
                : (dice[0] - 1);
            const expectedEntry1 = game.current_player === Player.White 
                ? (24 - dice[1]) 
                : (dice[1] - 1);
            if ((!diceUsed[0] && dice[0] > 0 && expectedEntry0 === pointIndex && isValidEntryPoint(pointIndex)) ||
                (!diceUsed[1] && dice[1] > 0 && expectedEntry1 === pointIndex && isValidEntryPoint(pointIndex))) {
                point.className += ' valid-entry';
            }
        }
    }
    
    point.addEventListener('click', () => handlePointClick(pointIndex));
    
    return point;
}

function updateBarVisualization() {
    const whiteBarEl = document.getElementById('white-bar-visual');
    const blackBarEl = document.getElementById('black-bar-visual');
    
    if (whiteBarEl) {
        whiteBarEl.innerHTML = '';
        for (let i = 0; i < game.white_bar; i++) {
            const checker = document.createElement('div');
            checker.className = 'checker white-checker';
            whiteBarEl.appendChild(checker);
        }
    }
    
    if (blackBarEl) {
        blackBarEl.innerHTML = '';
        for (let i = 0; i < game.black_bar; i++) {
            const checker = document.createElement('div');
            checker.className = 'checker black-checker';
            blackBarEl.appendChild(checker);
        }
    }
}

function updateUI() {
    const playerNameEl = document.getElementById('player-name');
    
    const dice = game.dice;
    const diceUsed = game.dice_used;
    
    const die1El = document.getElementById('die1');
    const die2El = document.getElementById('die2');
    
    if (dice[0] > 0) {
        die1El.textContent = dice[0].toString();
        die1El.className = diceUsed[0] ? 'die used' : 'die';
    } else {
        die1El.textContent = '-';
        die1El.className = 'die';
    }
    
    if (dice[1] > 0) {
        die2El.textContent = dice[1].toString();
        die2El.className = diceUsed[1] ? 'die used' : 'die';
    } else {
        die2El.textContent = '-';
        die2El.className = 'die';
    }
    
    // Display victory message or current player
    if (game.game_over) {
        const winner = game.winner;
        if (winner !== undefined) {
            const winnerName = winner === Player.White ? 'White' : 'Black';
            playerNameEl.textContent = `${winnerName} Win`;
            playerNameEl.className = winner === Player.White ? 'white' : 'black';
        }
    } else {
        // Normal game state - show current player
        const currentPlayer = game.current_player;
        const playerName = currentPlayer === Player.White ? 'White' : 'Black';
        playerNameEl.textContent = playerName;
        playerNameEl.className = currentPlayer === Player.White ? 'white' : 'black';
    }
}

function handlePointClick(pointIndex) {
    if (!game || game.game_over) {
        return;
    }
    
    const dice = game.dice;
    const diceUsed = game.dice_used;
    
    // Check if player has checkers on bar
    const onBar = (game.current_player === Player.White && game.white_bar > 0) ||
                  (game.current_player === Player.Black && game.black_bar > 0);
    
    if (onBar) {
        // Check if dice are rolled - if not, can't re-enter
        if (dice[0] === 0 && dice[1] === 0) {
            return; // No dice rolled yet - need to roll dice first
        }
        
        // Re-entering from bar - player must move checkers from bar first
        // Cannot move any other pieces until all checkers on bar are reentered
        // Find which die to use
        let dieToUse = null;
        
        // Re-entry: Checker lands on line equal to die value
        // White enters from point (24 - die), Black enters from point (die - 1)
        if (!diceUsed[0] && dice[0] > 0) {
            const expectedEntry = game.current_player === Player.White 
                ? (24 - dice[0])  // White enters from point (24 - die)
                : (dice[0] - 1);   // Black enters from point (die - 1)
            if (expectedEntry === pointIndex) {
                // Validate entry point: unoccupied or has exactly 1 opponent checker
                if (isValidEntryPoint(pointIndex)) {
                    dieToUse = dice[0];
                }
            }
        }
        
        if (!dieToUse && !diceUsed[1] && dice[1] > 0) {
            const expectedEntry = game.current_player === Player.White 
                ? (24 - dice[1])  // White enters from point (24 - die)
                : (dice[1] - 1);   // Black enters from point (die - 1)
            if (expectedEntry === pointIndex) {
                // Validate entry point: unoccupied or has exactly 1 opponent checker
                if (isValidEntryPoint(pointIndex)) {
                    dieToUse = dice[1];
                }
            }
        }
        
        if (dieToUse) {
            const success = game.make_move(null, pointIndex, dieToUse);
            if (success) {
                renderBoard();
                updateUI();
            }
        }
        return;
    }
    
    // Check if dice are rolled - if not, can't move
    if (dice[0] === 0 && dice[1] === 0) {
        return; // No dice rolled yet
    }
    
    // Check if this is a piece of the current player
    const boardArray = game.get_board();
    const pointValue = boardArray[pointIndex];
    const hasChecker = (game.current_player === Player.White && pointValue > 0) ||
                      (game.current_player === Player.Black && pointValue < 0);
    
    if (!hasChecker) {
        // Not a valid piece to move
        return;
    }
    
    // Auto-move: find the best move using available dice (left die first, then right die)
    let dieToUse = null;
    let targetPoint = null;
    
    // Try left die first (dice[0])
    if (!diceUsed[0] && dice[0] > 0) {
        targetPoint = getTargetPointForDie(pointIndex, dice[0]);
        if (targetPoint !== null && isValidMoveTo(targetPoint)) {
            dieToUse = dice[0];
        }
    }
    
    // If left die not available, try right die (dice[1])
    if (dieToUse === null && !diceUsed[1] && dice[1] > 0) {
        targetPoint = getTargetPointForDie(pointIndex, dice[1]);
        if (targetPoint !== null && isValidMoveTo(targetPoint)) {
            dieToUse = dice[1];
        }
    }
    
    if (dieToUse !== null && targetPoint !== null) {
        const success = game.make_move(pointIndex, targetPoint, dieToUse);
        if (success) {
            renderBoard();
            updateUI();
        }
    }
}

function getTargetPointForDie(fromPoint, die) {
    if (game.current_player === Player.White) {
        // White path: 15-24 (increasing), then 12-1 (decreasing)
        // Points 14-23 (15-24), then 11-0 (12-1)
        if (fromPoint >= 14 && fromPoint <= 23) {
            // First half: increasing
            const target = fromPoint + die;
            if (target > 23) {
                // Wrap to second half
                const remaining = target - 24;
                if (remaining > 11) {
                    return null;
                }
                return 11 - remaining; // Decrease from 11 (point 12)
            }
            return target;
        } else if (fromPoint >= 0 && fromPoint <= 11) {
            // Second half: decreasing
            if (fromPoint < die) {
                return null;
            }
            return fromPoint - die;
        }
        return null;
    } else {
        // Black path: 1-12 (increasing), then 24-13 (decreasing)
        // Points 0-11 (1-12), then 23-12 (24-13)
        if (fromPoint >= 0 && fromPoint <= 11) {
            // First half: increasing
            const target = fromPoint + die;
            if (target >= 12) {
                // Wrap to second half: when target = 12 (point 12), wrap to point 24 (index 23)
                const remaining = target - 12;
                if (remaining > 11) {
                    return null;
                }
                return 23 - remaining; // Decrease from 23 (point 24)
            }
            return target;
        } else if (fromPoint >= 12 && fromPoint <= 23) {
            // Second half: decreasing
            if (fromPoint < die + 12) {
                return null;
            }
            return fromPoint - die;
        }
        return null;
    }
}

function isValidEntryPoint(point) {
    // Valid entry point for re-entering from bar:
    // - Unoccupied, OR
    // - Has exactly 1 opponent checker (which can be hit)
    if (point === null || point >= 24) {
        return false;
    }
    const boardArray = game.get_board();
    const pointValue = boardArray[point];
    
    // Empty point is valid
    if (pointValue === 0) {
        return true;
    }
    
    // Check if it's the current player's checker (can stack, max 6)
    if (game.current_player === Player.White && pointValue > 0) {
        return pointValue < 6; // Max 6 checkers
    }
    if (game.current_player === Player.Black && pointValue < 0) {
        return Math.abs(pointValue) < 6; // Max 6 checkers
    }
    
    // Check if opponent has exactly 1 checker (can hit)
    if (game.current_player === Player.White && pointValue < 0) {
        return Math.abs(pointValue) === 1; // Can hit if exactly 1 checker
    }
    if (game.current_player === Player.Black && pointValue > 0) {
        return pointValue === 1; // Can hit if exactly 1 checker
    }
    
    return false;
}

function isValidMoveTo(point) {
    if (point === null || point >= 24) {
        return false;
    }
    const boardArray = game.get_board();
    const pointValue = boardArray[point];
    
    // Empty point is valid
    if (pointValue === 0) {
        return true;
    }
    
    // Check if it's the current player's checker (can stack, max 6)
    if (game.current_player === Player.White && pointValue > 0) {
        return pointValue < 6; // Max 6 checkers
    }
    if (game.current_player === Player.Black && pointValue < 0) {
        return Math.abs(pointValue) < 6; // Max 6 checkers
    }
    
    // Check if opponent has 2+ checkers (can't land)
    if (game.current_player === Player.White && pointValue < 0) {
        return Math.abs(pointValue) < 2; // Can hit if only 1 checker
    }
    if (game.current_player === Player.Black && pointValue > 0) {
        return pointValue < 2; // Can hit if only 1 checker
    }
    
    return false;
}

run().catch(console.error);

