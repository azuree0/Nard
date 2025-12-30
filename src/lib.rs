use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = Math)]
    fn random() -> f64;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum Player {
    White,
    Black,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PointState {
    Empty,
    White(u8),  // Number of white checkers
    Black(u8),  // Number of black checkers
}

impl Default for PointState {
    fn default() -> Self {
        PointState::Empty
    }
}

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct GameState {
    points: [PointState; 24],
    white_bar: u8,      // Checkers on the bar
    black_bar: u8,
    white_born_off: u8, // Checkers borne off
    black_born_off: u8,
    current_player: Player,
    dice: [u8; 2],      // Current dice roll [die1, die2]
    dice_used: [bool; 2], // Which dice have been used
    game_over: bool,
    winner: Option<Player>,
    can_bear_off: bool, // True if all checkers are in home board
}

#[wasm_bindgen]
impl GameState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GameState {
        let mut state = GameState {
            points: [PointState::Empty; 24],
            white_bar: 0,
            black_bar: 0,
            white_born_off: 0,
            black_born_off: 0,
            current_player: Player::White,
            dice: [0, 0],
            dice_used: [false, false],
            game_over: false,
            winner: None,
            can_bear_off: false,
        };
        
        // Initial position according to README.md lines 37-38
        // Top (points 13-24, 0-indexed 12-23):
        // Line 13 (index 12): 2 black
        state.points[12] = PointState::Black(2);
        // Line 24 (index 23): 3 black
        state.points[23] = PointState::Black(3);
        // Line 15 (index 14): 2 white
        state.points[14] = PointState::White(2);
        // Line 19 (index 18): 2 white
        state.points[18] = PointState::White(2);
        // Line 18 (index 17): 3 white
        state.points[17] = PointState::White(3);
        // Line 20 (index 19): 3 white
        state.points[19] = PointState::White(3);
        
        // Bottom (points 1-12, 0-indexed 0-11):
        // Line 1 (index 0): 2 black
        state.points[0] = PointState::Black(2);
        // Line 12 (index 11): 3 white
        state.points[11] = PointState::White(3);
        // Line 3 (index 2): 2 black
        state.points[2] = PointState::Black(2);
        // Line 7 (index 6): 2 black
        state.points[6] = PointState::Black(2);
        // Line 6 (index 5): 3 black
        state.points[5] = PointState::Black(3);
        // Line 8 (index 7): 3 black
        state.points[7] = PointState::Black(3);
        
        // Totals: Black = 2+3+2+2+2+3+3 = 17, White = 2+2+3+3+3 = 13
        // Note: README says 15 each, but listed positions total 17 black and 13 white
        // Implementing as written in README - may need correction
        
        state
    }
    
    #[wasm_bindgen(getter)]
    pub fn current_player(&self) -> Player {
        self.current_player
    }
    
    #[wasm_bindgen(getter)]
    pub fn game_over(&self) -> bool {
        self.game_over
    }
    
    #[wasm_bindgen(getter)]
    pub fn winner(&self) -> Option<Player> {
        self.winner
    }
    
    #[wasm_bindgen(getter)]
    pub fn dice(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.dice).unwrap()
    }
    
    #[wasm_bindgen(getter)]
    pub fn dice_used(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.dice_used).unwrap()
    }
    
    #[wasm_bindgen(getter)]
    pub fn white_bar(&self) -> u8 {
        self.white_bar
    }
    
    #[wasm_bindgen(getter)]
    pub fn black_bar(&self) -> u8 {
        self.black_bar
    }
    
    #[wasm_bindgen(getter)]
    pub fn white_born_off(&self) -> u8 {
        self.white_born_off
    }
    
    #[wasm_bindgen(getter)]
    pub fn black_born_off(&self) -> u8 {
        self.black_born_off
    }
    
    pub fn get_board(&self) -> JsValue {
        let board_array: Vec<i8> = self.points.iter().map(|pt| {
            match pt {
                PointState::Empty => 0,
                PointState::White(n) => *n as i8,
                PointState::Black(n) => -(*n as i8),
            }
        }).collect();
        serde_wasm_bindgen::to_value(&board_array).unwrap()
    }
    
    pub fn roll_dice(&mut self) {
        if self.game_over {
            return;
        }
        
        // Roll two dice (players can always roll, even if they have pieces on the bar)
        self.dice[0] = (random() * 6.0) as u8 % 6 + 1;
        self.dice[1] = (random() * 6.0) as u8 % 6 + 1;
        self.dice_used = [false, false];
        
        // Check if doubles
        if self.dice[0] == self.dice[1] {
            // Doubles: play the number four times
            // We'll handle this by allowing 4 uses of the same die
        }
        
        // Check if player can bear off
        self.update_can_bear_off();
        
        // Don't switch player here - let them try to use the dice
        // Player will switch when all dice are used (in check_turn_complete)
    }
    
    fn update_can_bear_off(&mut self) {
        match self.current_player {
            Player::White => {
                // White's home board is points 0-5
                let mut all_in_home = true;
                let mut has_checkers = false;
                for i in 6..24 {
                    if let PointState::White(_) = self.points[i] {
                        all_in_home = false;
                        break;
                    }
                }
                for i in 0..6 {
                    if let PointState::White(_) = self.points[i] {
                        has_checkers = true;
                    }
                }
                self.can_bear_off = all_in_home && has_checkers && self.white_bar == 0;
            }
            Player::Black => {
                // Black's home board is points 18-23
                let mut all_in_home = true;
                let mut has_checkers = false;
                for i in 0..18 {
                    if let PointState::Black(_) = self.points[i] {
                        all_in_home = false;
                        break;
                    }
                }
                for i in 18..24 {
                    if let PointState::Black(_) = self.points[i] {
                        has_checkers = true;
                    }
                }
                self.can_bear_off = all_in_home && has_checkers && self.black_bar == 0;
            }
        }
    }
    
    fn has_valid_moves(&self) -> bool {
        // Check if any dice are unused
        let has_unused_dice = !self.dice_used[0] || !self.dice_used[1];
        if !has_unused_dice {
            return false;
        }
        
        // Check if player has checkers on bar
        let on_bar = match self.current_player {
            Player::White => self.white_bar > 0,
            Player::Black => self.black_bar > 0,
        };
        
        if on_bar {
            // Check if can re-enter
            return self.can_re_enter();
        }
        
        if self.can_bear_off {
            // Check if can bear off
            return self.can_bear_off_any();
        }
        
        // Check if can move any checker
        for point_idx in 0..24 {
            if self.has_checker_at(point_idx) {
                let available_dice = self.get_available_dice();
                for &die in &available_dice {
                    if let Some(target) = self.get_target_point(point_idx, die) {
                        if self.is_valid_move_to(target) {
                            return true;
                        }
                    }
                }
            }
        }
        
        false
    }
    
    fn can_re_enter(&self) -> bool {
        let available_dice = self.get_available_dice();
        for &die in &available_dice {
            let entry_point = match self.current_player {
                Player::White => 24 - die as usize, // White enters from point (24 - die)
                Player::Black => (die - 1) as usize,  // Black enters from point (die - 1)
            };
            if entry_point < 24 && self.is_valid_entry_point(entry_point) {
                return true;
            }
        }
        false
    }
    
    fn can_bear_off_any(&self) -> bool {
        let available_dice = self.get_available_dice();
        for &die in &available_dice {
            let bear_off_point = match self.current_player {
                Player::White => (die - 1) as usize, // Point 0-5
                Player::Black => (24 - die) as usize, // Point 18-23
            };
            if bear_off_point < 24 && self.has_checker_at(bear_off_point) {
                return true;
            }
            // Check if can bear off from higher point
            if self.can_bear_off_from_higher(die) {
                return true;
            }
        }
        false
    }
    
    fn can_bear_off_from_higher(&self, die: u8) -> bool {
        match self.current_player {
            Player::White => {
                // Check points 0-5, see if any higher point has checker and lower points are empty
                for point in (die as usize)..6 {
                    if self.has_checker_at(point) {
                        // Check if all lower points are empty
                        let mut all_lower_empty = true;
                        for lower in 0..(point) {
                            if self.has_checker_at(lower) {
                                all_lower_empty = false;
                                break;
                            }
                        }
                        if all_lower_empty {
                            return true;
                        }
                    }
                }
            }
            Player::Black => {
                // Check points 18-23
                let start = 24 - die as usize;
                for point in (18..start).rev() {
                    if self.has_checker_at(point) {
                        // Check if all higher points are empty
                        let mut all_higher_empty = true;
                        for higher in (point + 1)..24 {
                            if self.has_checker_at(higher) {
                                all_higher_empty = false;
                                break;
                            }
                        }
                        if all_higher_empty {
                            return true;
                        }
                    }
                }
            }
        }
        false
    }
    
    fn get_available_dice(&self) -> Vec<u8> {
        let mut dice = Vec::new();
        if !self.dice_used[0] && self.dice[0] > 0 {
            dice.push(self.dice[0]);
        }
        if !self.dice_used[1] && self.dice[1] > 0 {
            dice.push(self.dice[1]);
        }
        // If doubles, we can use the same die multiple times
        if self.dice[0] == self.dice[1] && self.dice[0] > 0 && !self.dice_used[0] {
            dice.push(self.dice[0]);
            dice.push(self.dice[0]);
        }
        dice
    }
    
    fn get_target_point(&self, from: usize, die: u8) -> Option<usize> {
        match self.current_player {
            Player::White => {
                // White path: 15-24 (increasing), then 12-1 (decreasing)
                // Points 14-23 (15-24), then 11-0 (12-1)
                if from >= 14 && from <= 23 {
                    // In first half: 15-24 (14-23), move increasing
                    let target = from + die as usize;
                    if target > 23 {
                        // Wrap to second half: move to 12-1 (11-0)
                        let remaining = target - 24;
                        if remaining > 11 {
                            None // Can't move that far
                        } else {
                            Some(11 - remaining) // Decrease from 11 (point 12)
                        }
                    } else {
                        Some(target)
                    }
                } else if from <= 11 {
                    // In second half: 12-1 (11-0), move decreasing
                    if from < die as usize {
                        None // Can't move past point 0 (point 1)
                    } else {
                        Some(from - die as usize)
                    }
                } else {
                    None
                }
            }
            Player::Black => {
                // Black path: 1-12 (increasing), then 24-13 (decreasing)
                // Points 0-11 (1-12), then 23-12 (24-13)
                if from <= 11 {
                    // In first half: 1-12 (0-11), move increasing
                    let target = from + die as usize;
                    if target >= 12 {
                        // Wrap to second half: move to 24-13 (23-12)
                        // When target = 12, we're at point 12, wrap to point 24 (index 23)
                        let remaining = target - 12;
                        if remaining > 11 {
                            None // Can't move that far
                        } else {
                            Some(23 - remaining) // Decrease from 23 (point 24)
                        }
                    } else {
                        Some(target)
                    }
                } else if from >= 12 && from <= 23 {
                    // In second half: 24-13 (23-12), move decreasing
                    if from < die as usize + 12 {
                        None // Can't move past point 12 (point 13)
                    } else {
                        Some(from - die as usize)
                    }
                } else {
                    None
                }
            }
        }
    }
    
    fn is_valid_move_to(&self, point: usize) -> bool {
        if point >= 24 {
            return false;
        }
        
        match self.points[point] {
            PointState::Empty => true,
            PointState::White(n) => {
                match self.current_player {
                    Player::White => {
                        // Can stack on own checkers, max 6 per line
                        n < 6
                    }
                    Player::Black => {
                        // Opponent cannot land if 2+ checkers present
                        n < 2
                    }
                }
            }
            PointState::Black(n) => {
                match self.current_player {
                    Player::Black => {
                        // Can stack on own checkers, max 6 per line
                        n < 6
                    }
                    Player::White => {
                        // Opponent cannot land if 2+ checkers present
                        n < 2
                    }
                }
            }
        }
    }
    
    fn is_valid_entry_point(&self, point: usize) -> bool {
        // Valid entry point for re-entering from bar:
        if point >= 24 {
            return false;
        }
        
        match self.points[point] {
            PointState::Empty => true,
            PointState::White(n) => {
                match self.current_player {
                    Player::White => {
                        // Can enter on own checkers, max 6 per line
                        n < 6
                    }
                    Player::Black => {
                        // Can enter if unoccupied or has exactly 1 opponent checker (can hit)
                        n < 2
                    }
                }
            }
            PointState::Black(n) => {
                match self.current_player {
                    Player::Black => {
                        // Can enter on own checkers, max 6 per line
                        n < 6
                    }
                    Player::White => {
                        // Can enter if unoccupied or has exactly 1 opponent checker (can hit)
                        n < 2
                    }
                }
            }
        }
    }
    
    fn has_checker_at(&self, point: usize) -> bool {
        if point >= 24 {
            return false;
        }
        match self.points[point] {
            PointState::Empty => false,
            PointState::White(_) => self.current_player == Player::White,
            PointState::Black(_) => self.current_player == Player::Black,
        }
    }
    
    pub fn get_valid_moves(&self) -> JsValue {
        let mut moves = Vec::new();
        
        if self.game_over {
            return serde_wasm_bindgen::to_value(&moves).unwrap();
        }
        
        // Check if player has checkers on bar
        let on_bar = match self.current_player {
            Player::White => self.white_bar > 0,
            Player::Black => self.black_bar > 0,
        };
        
        if on_bar {
            // Can only re-enter from bar
            let available_dice = self.get_available_dice();
            for &die in &available_dice {
                let entry_point = match self.current_player {
                    Player::White => (24 - die) as usize,
                    Player::Black => (die - 1) as usize,
                };
                if entry_point < 24 && self.is_valid_entry_point(entry_point) {
                    moves.push(entry_point as u8);
                }
            }
            return serde_wasm_bindgen::to_value(&moves).unwrap();
        }
        
        if self.can_bear_off {
            // Can bear off
            let available_dice = self.get_available_dice();
            for &die in &available_dice {
                let bear_off_point = match self.current_player {
                    Player::White => (die - 1) as usize,
                    Player::Black => (24 - die) as usize,
                };
                if bear_off_point < 24 && self.has_checker_at(bear_off_point) {
                    moves.push(bear_off_point as u8);
                }
                // Check higher points
                match self.current_player {
                    Player::White => {
                        for point in (die as usize)..6 {
                            if self.has_checker_at(point) {
                                let mut all_lower_empty = true;
                                for lower in 0..(point) {
                                    if self.has_checker_at(lower) {
                                        all_lower_empty = false;
                                        break;
                                    }
                                }
                                if all_lower_empty {
                                    moves.push(point as u8);
                                }
                            }
                        }
                    }
                    Player::Black => {
                        let start = 24 - die as usize;
                        for point in (18..start).rev() {
                            if self.has_checker_at(point) {
                                let mut all_higher_empty = true;
                                for higher in (point + 1)..24 {
                                    if self.has_checker_at(higher) {
                                        all_higher_empty = false;
                                        break;
                                    }
                                }
                                if all_higher_empty {
                                    moves.push(point as u8);
                                }
                            }
                        }
                    }
                }
            }
            return serde_wasm_bindgen::to_value(&moves).unwrap();
        }
        
        // Regular moves
        for point_idx in 0..24 {
            if self.has_checker_at(point_idx) {
                let available_dice = self.get_available_dice();
                for &die in &available_dice {
                    if let Some(target) = self.get_target_point(point_idx, die) {
                        if self.is_valid_move_to(target) {
                            moves.push(target as u8);
                        }
                    }
                }
            }
        }
        
        serde_wasm_bindgen::to_value(&moves).unwrap()
    }
    
    pub fn make_move(&mut self, from_point: Option<usize>, to_point: usize, die: u8) -> bool {
        if self.game_over {
            return false;
        }
        
        // Check if die is valid and unused
        if die != self.dice[0] && die != self.dice[1] {
            return false;
        }
        let die_idx = if die == self.dice[0] && !self.dice_used[0] {
            0
        } else if die == self.dice[1] && !self.dice_used[1] {
            1
        } else {
            // Check if doubles and we can use the die again
            if self.dice[0] == self.dice[1] && die == self.dice[0] {
                // Find an unused die index
                if !self.dice_used[0] {
                    0
                } else if !self.dice_used[1] {
                    1
                } else {
                    return false;
                }
            } else {
                return false;
            }
        };
        
        // Check if player has checkers on bar
        let on_bar = match self.current_player {
            Player::White => self.white_bar > 0,
            Player::Black => self.black_bar > 0,
        };
        
        if on_bar {
            // Re-entering from bar - player must move checkers from bar first
            return self.re_enter_from_bar(to_point, die_idx);
        }
        
        if self.can_bear_off {
            // Bearing off
            if from_point.is_none() {
                return false;
            }
            return self.bear_off(from_point.unwrap(), to_point, die_idx);
        }
        
        // Regular move
        if from_point.is_none() {
            return false;
        }
        return self.move_checker(from_point.unwrap(), to_point, die_idx);
    }
    
    fn re_enter_from_bar(&mut self, entry_point: usize, die_idx: usize) -> bool {
        if entry_point >= 24 {
            return false;
        }
        
        // Verify entry point is correct for the die
        let expected_entry = match self.current_player {
            Player::White => (24 - self.dice[die_idx]) as usize,
            Player::Black => (self.dice[die_idx] - 1) as usize,
        };
        
        if entry_point != expected_entry {
            return false;
        }
        
        if !self.is_valid_entry_point(entry_point) {
            return false;
        }
        
        // Move checker from bar to entry point
        match self.current_player {
            Player::White => {
                if self.white_bar == 0 {
                    return false;
                }
                self.white_bar -= 1;
            }
            Player::Black => {
                if self.black_bar == 0 {
                    return false;
                }
                self.black_bar -= 1;
            }
        }
        
        // Place checker on entry point (may hit opponent)
        match self.points[entry_point] {
            PointState::Empty => {
                self.points[entry_point] = match self.current_player {
                    Player::White => PointState::White(1),
                    Player::Black => PointState::Black(1),
                };
            }
            PointState::White(n) => {
                match self.current_player {
                    Player::White => {
                        self.points[entry_point] = PointState::White(n + 1);
                    }
                    Player::Black => {
                        // Hit white checker
                        self.white_bar += 1;
                        self.points[entry_point] = PointState::Black(1);
                    }
                }
            }
            PointState::Black(n) => {
                match self.current_player {
                    Player::Black => {
                        self.points[entry_point] = PointState::Black(n + 1);
                    }
                    Player::White => {
                        // Hit black checker
                        self.black_bar += 1;
                        self.points[entry_point] = PointState::White(1);
                    }
                }
            }
        }
        
        self.dice_used[die_idx] = true;
        self.check_turn_complete();
        true
    }
    
    fn bear_off(&mut self, from_point: usize, _to_point: usize, die_idx: usize) -> bool {
        if from_point >= 24 {
            return false;
        }
        
        if !self.has_checker_at(from_point) {
            return false;
        }
        
        // Verify point is in home board
        let in_home = match self.current_player {
            Player::White => from_point < 6,
            Player::Black => from_point >= 18,
        };
        
        if !in_home {
            return false;
        }
        
        // Check if can bear off from this point
        let die = self.dice[die_idx];
        let can_bear_off = match self.current_player {
            Player::White => {
                if from_point == (die - 1) as usize {
                    true
                } else if from_point < (die - 1) as usize {
                    // Check if all lower points are empty
                    let mut all_lower_empty = true;
                    for lower in 0..from_point {
                        if self.has_checker_at(lower) {
                            all_lower_empty = false;
                            break;
                        }
                    }
                    all_lower_empty
                } else {
                    false
                }
            }
            Player::Black => {
                let expected = 24 - die as usize;
                if from_point == expected {
                    true
                } else if from_point > expected {
                    // Check if all higher points are empty
                    let mut all_higher_empty = true;
                    for higher in (from_point + 1)..24 {
                        if self.has_checker_at(higher) {
                            all_higher_empty = false;
                            break;
                        }
                    }
                    all_higher_empty
                } else {
                    false
                }
            }
        };
        
        if !can_bear_off {
            return false;
        }
        
        // Remove checker from point
        match self.points[from_point] {
            PointState::White(n) => {
                if n == 1 {
                    self.points[from_point] = PointState::Empty;
                } else {
                    self.points[from_point] = PointState::White(n - 1);
                }
            }
            PointState::Black(n) => {
                if n == 1 {
                    self.points[from_point] = PointState::Empty;
                } else {
                    self.points[from_point] = PointState::Black(n - 1);
                }
            }
            _ => return false,
        }
        
        // Increment borne off count
        match self.current_player {
            Player::White => {
                self.white_born_off += 1;
            }
            Player::Black => {
                self.black_born_off += 1;
            }
        }
        
        self.dice_used[die_idx] = true;
        self.check_win_condition();
        self.check_turn_complete();
        true
    }
    
    fn move_checker(&mut self, from_point: usize, to_point: usize, die_idx: usize) -> bool {
        if from_point >= 24 || to_point >= 24 {
            return false;
        }
        
        if !self.has_checker_at(from_point) {
            return false;
        }
        
        // Verify move distance matches die
        let distance = match self.current_player {
            Player::White => {
                // White path: 15-24 (increasing), then 12-1 (decreasing)
                if from_point >= 14 && from_point <= 23 {
                    // First half: increasing
                    if to_point < from_point {
                        // Wrapped to second half
                        let first_half_distance = 24 - from_point;
                        let second_half_distance = 11 - to_point;
                        first_half_distance + second_half_distance
                    } else {
                        to_point - from_point
                    }
                } else if from_point <= 11 {
                    // Second half: decreasing
                    if from_point < to_point {
                        return false; // Can't move backward in second half
                    }
                    from_point - to_point
                } else {
                    return false;
                }
            }
            Player::Black => {
                // Black path: 1-12 (increasing), then 24-13 (decreasing)
                if from_point <= 11 {
                    // First half: increasing
                    if to_point > 11 {
                        // Wrapped to second half
                        // Distance from from_point to point 12 (index 12), then to to_point
                        // But when wrapping, to_point is in second half (23-12), so:
                        // We go from from_point to 12 (distance = 12 - from_point)
                        // Then from 24 (index 23) down to to_point (distance = 23 - to_point)
                        // Total = (12 - from_point) + (23 - to_point)
                        let first_half_distance = 12 - from_point;
                        let second_half_distance = 23 - to_point;
                        first_half_distance + second_half_distance
                    } else {
                        to_point - from_point
                    }
                } else if from_point >= 12 && from_point <= 23 {
                    // Second half: decreasing
                    if to_point > from_point {
                        return false; // Can't move backward in second half
                    }
                    from_point - to_point
                } else {
                    return false;
                }
            }
        };
        
        if distance != self.dice[die_idx] as usize {
            return false;
        }
        
        if !self.is_valid_move_to(to_point) {
            return false;
        }
        
        // Remove checker from source
        match self.points[from_point] {
            PointState::White(n) => {
                if n == 1 {
                    self.points[from_point] = PointState::Empty;
                } else {
                    self.points[from_point] = PointState::White(n - 1);
                }
            }
            PointState::Black(n) => {
                if n == 1 {
                    self.points[from_point] = PointState::Empty;
                } else {
                    self.points[from_point] = PointState::Black(n - 1);
                }
            }
            _ => return false,
        }
        
        // Place checker on destination (may hit opponent)
        match self.points[to_point] {
            PointState::Empty => {
                self.points[to_point] = match self.current_player {
                    Player::White => PointState::White(1),
                    Player::Black => PointState::Black(1),
                };
            }
            PointState::White(n) => {
                match self.current_player {
                    Player::White => {
                        self.points[to_point] = PointState::White(n + 1);
                    }
                    Player::Black => {
                        // Hit white checker
                        if n != 1 {
                            return false; // Should have been caught by is_valid_move_to
                        }
                        self.white_bar += 1;
                        self.points[to_point] = PointState::Black(1);
                    }
                }
            }
            PointState::Black(n) => {
                match self.current_player {
                    Player::Black => {
                        self.points[to_point] = PointState::Black(n + 1);
                    }
                    Player::White => {
                        // Hit black checker
                        if n != 1 {
                            return false; // Should have been caught by is_valid_move_to
                        }
                        self.black_bar += 1;
                        self.points[to_point] = PointState::White(1);
                    }
                }
            }
        }
        
        self.dice_used[die_idx] = true;
        self.update_can_bear_off();
        self.check_win_condition();
        self.check_turn_complete();
        true
    }
    
    fn check_turn_complete(&mut self) {
        // Switch player when all dice are used
        if self.dice_used[0] && self.dice_used[1] {
            self.switch_player();
            return;
        }
        
        // If not all dice are used but there are no valid moves with remaining dice, end the turn
        // This allows the player to roll dice again on their next turn
        // Note: This matches the game rule that if you can't make a move, you skip your turn
        if !self.has_valid_moves() {
            self.switch_player();
        }
    }
    
    fn switch_player(&mut self) {
        self.current_player = match self.current_player {
            Player::White => Player::Black,
            Player::Black => Player::White,
        };
        self.dice = [0, 0];
        self.dice_used = [false, false];
        self.can_bear_off = false;
    }
    
    fn check_win_condition(&mut self) {
        // Victory: 1st player with 15 checkers arrived in home quadrant
        // White's home quadrant is points 0-5 (bottom right)
        // Black's home quadrant is points 18-23 (top right)
        
        // Check White: all 15 checkers in home quadrant (points 0-5) and none on bar
        let mut white_in_home = 0;
        for i in 0..6 {
            if let PointState::White(n) = self.points[i] {
                white_in_home += n;
            }
        }
        if white_in_home == 15 && self.white_bar == 0 {
            self.game_over = true;
            self.winner = Some(Player::White);
            return;
        }
        
        // Check Black: all 15 checkers in home quadrant (points 18-23) and none on bar
        let mut black_in_home = 0;
        for i in 18..24 {
            if let PointState::Black(n) = self.points[i] {
                black_in_home += n;
            }
        }
        if black_in_home == 15 && self.black_bar == 0 {
            self.game_over = true;
            self.winner = Some(Player::Black);
        }
    }
    
    pub fn reset(&mut self) {
        *self = GameState::new();
    }
}

#[wasm_bindgen]
pub fn init() {
    console_error_panic_hook::set_once();
}

