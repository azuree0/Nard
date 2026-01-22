import init, { GameState, Player } from './pkg/nard.js';

let game = null;
let board = [];
let currentPlayer = Player.White;
let dice = [0, 0];
let diceUsed = [false, false];
let whiteBar = 0;
let blackBar = 0;
let whiteBornOff = 0;
let blackBornOff = 0;
let gameOver = false;
let winner = null;

async function loadGame() {
    await init();
    game = new GameState();
    updateGameState();
}

function updateGameState() {
    if (!game) return;
    
    board = game.get_board();
    dice = game.dice;
    diceUsed = game.dice_used;
    currentPlayer = game.current_player;
    whiteBar = game.white_bar;
    blackBar = game.black_bar;
    whiteBornOff = game.white_born_off;
    blackBornOff = game.black_born_off;
    gameOver = game.game_over;
    winner = game.winner;
    
    renderBoard();
    updateUI();
}

function updateUI() {
    const playerNameEl = document.getElementById('player-name');
    if (playerNameEl) {
        const playerName = game.get_player_name();
        playerNameEl.textContent = playerName;
        playerNameEl.className = currentPlayer === Player.White ? 'white' : 'black';
    }
    
    const diceEl = document.getElementById('dice-values');
    if (diceEl) {
        diceEl.innerHTML = `
            <span class="die ${diceUsed[0] ? 'used' : ''}">${dice[0] > 0 ? dice[0] : '-'}</span>
            <span class="die ${diceUsed[1] ? 'used' : ''}">${dice[1] > 0 ? dice[1] : '-'}</span>
        `;
    }
    
    const barDisplay = document.getElementById('bar-display');
    if (barDisplay) {
        if (whiteBar > 0 || blackBar > 0) {
            barDisplay.style.display = 'flex';
            const whiteBarEl = document.getElementById('white-bar');
            const blackBarEl = document.getElementById('black-bar');
            if (whiteBarEl) whiteBarEl.textContent = whiteBar;
            if (blackBarEl) blackBarEl.textContent = blackBar;
        } else {
            barDisplay.style.display = 'none';
        }
    }
    
    const bornOffDisplay = document.getElementById('born-off-display');
    if (bornOffDisplay) {
        if (whiteBornOff > 0 || blackBornOff > 0) {
            bornOffDisplay.style.display = 'flex';
            const whiteBornOffEl = document.getElementById('white-born-off');
            const blackBornOffEl = document.getElementById('black-born-off');
            if (whiteBornOffEl) whiteBornOffEl.textContent = whiteBornOff;
            if (blackBornOffEl) blackBornOffEl.textContent = blackBornOff;
        } else {
            bornOffDisplay.style.display = 'none';
        }
    }
    
    const rollBtn = document.getElementById('roll-btn');
    if (rollBtn) {
        rollBtn.disabled = !game.can_roll_dice();
    }
}

function handleRollDice() {
    if (!game || !game.can_roll_dice()) return;
    game.roll_dice();
    updateGameState();
}

function handleReset() {
    if (!game) return;
    game.reset();
    updateGameState();
}

function handlePointClick(pointIndex) {
    if (!game || gameOver || (dice[0] === 0 && dice[1] === 0)) return;
    
    const moveResult = game.find_move_for_point(pointIndex);
    if (moveResult === null) return;
    
    const [die, targetPoint] = moveResult;
    const onBar = (currentPlayer === Player.White && whiteBar > 0) ||
                  (currentPlayer === Player.Black && blackBar > 0);
    const pointFrom = onBar ? null : pointIndex;
    
    if (game.make_move(pointFrom, targetPoint, die)) {
        updateGameState();
    }
}

function renderPoint(pointIndex, boardArray) {
    const pointValue = boardArray[pointIndex];
    const isWhitePoint = pointValue > 0;
    const isBlackPoint = pointValue < 0;
    const checkerCount = Math.abs(pointValue);
    
    let isValidEntry = false;
    if (game && (whiteBar > 0 || blackBar > 0)) {
        if (dice[0] > 0 && !diceUsed[0] && game.is_valid_entry_point_for_dice(pointIndex, dice[0])) {
            isValidEntry = true;
        } else if (dice[1] > 0 && !diceUsed[1] && game.is_valid_entry_point_for_dice(pointIndex, dice[1])) {
            isValidEntry = true;
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
    
    const checkers = [];
    if (isWhitePoint) {
        for (let i = 0; i < checkerCount; i++) {
            checkers.push('<div class="checker white-checker"></div>');
        }
    } else if (isBlackPoint) {
        for (let i = 0; i < checkerCount; i++) {
            checkers.push('<div class="checker black-checker"></div>');
        }
    }
    
    return `
        <div class="${pointClassName}" data-point="${pointIndex}">
            <div class="checkers-container">
                ${checkers.join('')}
            </div>
        </div>
    `;
}

function renderBoard() {
    const boardEl = document.getElementById('game-board');
    if (!boardEl) return;
    
    // Top half (points 12-23)
    const topHalf = `
        <div class="board-half top-half">
            <div class="points-row">
                ${Array.from({ length: 6 }, (_, i) => renderPoint(23 - i, board)).join('')}
            </div>
            <div class="points-row">
                ${Array.from({ length: 6 }, (_, i) => renderPoint(17 - i, board)).join('')}
            </div>
        </div>
    `;
    
    // Bottom half (points 0-11)
    const bottomHalf = `
        <div class="board-half bottom-half">
            <div class="points-row">
                ${Array.from({ length: 6 }, (_, i) => renderPoint(11 - i, board)).join('')}
            </div>
            <div class="points-row">
                ${Array.from({ length: 6 }, (_, i) => renderPoint(5 - i, board)).join('')}
            </div>
        </div>
    `;
    
    boardEl.innerHTML = topHalf + bottomHalf;
    
    // Attach click handlers
    boardEl.querySelectorAll('.point').forEach(pointEl => {
        const pointIndex = parseInt(pointEl.dataset.point);
        pointEl.addEventListener('click', () => handlePointClick(pointIndex));
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadGame();
        document.getElementById('roll-btn')?.addEventListener('click', handleRollDice);
        document.getElementById('reset-btn')?.addEventListener('click', handleReset);
    });
} else {
    loadGame();
    document.getElementById('roll-btn')?.addEventListener('click', handleRollDice);
    document.getElementById('reset-btn')?.addEventListener('click', handleReset);
}
