function roll(n) {
    return Math.floor(Math.random() * n) + 1;
}
function mod(n) {
    return Math.floor((n - 10) / 2);
}

class Weapon {
    constructor(
        name = 'none',
        hit_bonus = 0,
        damage_bonus = 0,
        damage_dice = [0],
        damage_type = 'none',
        normal_range = null,
        max_range = null
    ) {
        this.name = name;
        this.hit_bonus = hit_bonus;
        this.damage_bonus = damage_bonus;
        this.damage_dice = damage_dice;
        this.damage_type = damage_type;
        this.normal_range = normal_range;
        this.max_range = max_range;
    }
}

class Character {
    constructor(x=0, y=0) {
        this.name = "Blank";
        this.team = "Team A";
        this.target = null;

        // position
        this.x = x;
        this.y = y;

        // ability scores
        this.str = 0;
        this.dex = 0;
        this.con = 0;
        this.int = 0;
        this.wis = 0;
        this.cha = 0;

        this.armor_class = 0;
        this.hit_points = 0;
        this.speed = 30;
        this.movement = 30;
        this.grid_square = null;

        this.melee_weapon = null;
        this.ranged_weapon = null;
    }
    roll_initiative() {
        var text = '';
        let val = roll(20) + mod(this.dex);
        this.initiative = val;
        text += `<br>${this.name} rolled ${this.initiative} for initiative`
        return text
    }
    choose_target(encounter) {
        // clear any existing targets
        // (e.g. characters with less than 1 hit point)
        this.target = null;
        this.target_distance = 9e9;

        // by default, choose the nearest character
        for (let i=0; i<encounter.characters.length; i++) {
            let char = encounter.characters[i];

            // only consider targets on the opposite team with positive hit points
            if (char.team != this.team & char.hit_points > 0) {

                // compute euclidean distance
                let dx = this.x - char.x;
                let dy = this.y - char.y;
                let dr = Math.sqrt(dx * dx + dy * dy);
                if (dr < this.target_distance) {
                    this.target = char;
                    this.target_distance = dr;
                }
            }
        }
        if (this.target == null) {
            return "<br>No targets are available";
        }
        return `<br>${this.name} targets ${this.target.name}`;
    }
    attack(target, weapon) {
        var text = `<br>${this.name} attacks ${target.name} with ${weapon.name}`;

        // roll to hit
        let val = roll(20) + weapon.hit_bonus;
        text += `<br>${this.name} rolled ${val} 
            against armor class ${target.armor_class}`;
        if (val >= target.armor_class) {
            text += `<br>Hit!`;
        } else {
            text += `<br>Miss!`;
            return text;
        }
        
        // roll damage
        var dmg = weapon.damage_bonus;
        for (let i=0; i< weapon.damage_dice.length; i++) {
            dmg += roll(weapon.damage_dice[i]);
        }
        text += `<br>${this.name} rolled ${dmg} ${weapon.damage_type} damage`;
        target.hit_points -= dmg;
        text += `<br>${target.name} has ${target.hit_points} hit points left`;
        return text 
    }
    move_to_target(range=0) {
        var text = '';
        while (this.movement > 0) {
            // stop moving if target is within range
            if (this.target_distance <= range) {
                text += '<br>Target within range';
                break
            }
            // stop moving if target is adjacent
            if (this.grid_square.neighbors.includes(this.target.grid_square)) {
                text += `<br>${this.name} has reached ${this.target.name}`;
                break
            }
            // move into the neighboring square that is closest to the target
            var closest_dist = 9e9;
            var next_square = null;
            for (let i=0; i<this.grid_square.neighbors.length; i++) {
                let square = this.grid_square.neighbors[i];
                if (square.occupied) {
                    // skip occupied squares
                    continue
                }
                // compute euclidean distance
                let dx = square.i - this.target.x;
                let dy = square.j - this.target.y;
                let dr = Math.sqrt(dx * dx + dy * dy);
                if (dr < closest_dist) {
                    closest_dist = dr;
                    next_square = square;
                }
            }
            if (next_square == null) {
                text += '<br>No open grid squares available';
                return text;
            }
            // perform movement
            text += `<br>${this.name} moved from (${this.x}, ${this.y}) `;
            this.grid_square.occupied = false;
            this.grid_square = next_square;
            this.grid_square.occupied = true;
            this.x = this.grid_square.i;
            this.y = this.grid_square.j;
            this.movement -= 5;
            text += `to (${this.x}, ${this.y}) `;
        }
        return text;
    }
    
    turn(encounter) {
        var text = `<br>${this.name}'s turn`;

        // check that current player is conscious
        if (this.hit_points < 1) {
            text += `<br>${this.name} is unconscious`;
            return text;
        }
        // choose target
        text += this.choose_target(encounter);
        if (this.target == null) {
            return text
        }

        if (this.ranged_weapon == null) {
            text += '<br>No ranged weapon';

            // move to target
            text += this.move_to_target();

            // compute range to target
            this.choose_target(encounter);

            // atack or dash
            if (this.grid_square.neighbors.includes(this.target.grid_square)) {
                text += this.attack(this.target, this.melee_weapon);
            } else {
                text += '<br>Dash';
                this.movement = this.speed;
                text += this.move_to_target();
            }
        } else {
            this.move_to_target(this.ranged_weapon.normal_range);

            if (this.target_distance <= this.ranged_weapon.normal_range) {
                text += this.attack(this.target, this.ranged_weapon);
            } else {
                text += '<br>Dash';
                this.movement = this.speed;
                text += this.move_to_target(this.ranged_weapon.normal_range);
            }
        }

        // end turn
        this.movement = this.speed;
        return text;
    }
}
class Commoner extends Character {
    constructor(x, y) {
        super(x, y);
        this.name = "Commoner";
        this.team = "Commoners";
        this.str = 10;
        this.dex = 10;
        this.con = 10;
        this.int = 10;
        this.wis = 10;
        this.cha = 10;

        this.armor_class = 10;
        this.hit_points = 4;

        this.melee_weapon = new Weapon('club', 2, 0, [4], 'bludgeoning', 5, null);
    }
}
class Bandit extends Character {
    constructor(x, y) {
        super(x, y);
        this.name = "Bandit";
        this.team = "Bandits";
        this.str = 11;
        this.dex = 12;
        this.con = 12;
        this.int = 10;
        this.wis = 10;
        this.cha = 10;

        this.armor_class = 12;
        this.hit_points = 11;

        this.melee_weapon = new Weapon('scimitar', 3, 1, [6], 'slashing', 5, null);
        this.ranged_weapon = new Weapon('crossbow', 3, 1, [8], 'piercing', 80, 320);
    }
}
class Guard extends Character {
    constructor(x, y) {
        super(x, y);
        this.name = "Guard";
        this.team = "Guards";
        this.str = 13;
        this.dex = 12;
        this.con = 12;
        this.int = 10;
        this.wis = 11;
        this.cha = 10;

        this.armor_class = 16;
        this.hit_points = 11;

        this.melee_weapon = new Weapon('spear', 3, 1, [6], 'piercing', 5, null);
    }
}

class GridSquare {
    constructor(grid, i=0, j=0) {
        this.grid = grid;
        this.i = i;
        this.j = j;
        this.occupied = false;
    }
    get_neighbors() {
        this.neighbors = [];

        // loop through squares
        for (let k=0; k<this.grid.squares.length; k++) {
            let square = this.grid.squares[k];
            
            // compute euclidean distance
            let dx = this.i - square.i;
            let dy = this.j - square.j;
            let dr = Math.sqrt(dx * dx + dy * dy);
            if (dr > 0 & dr < 1.9) {
                this.neighbors.push(square);
            }
        }
    }
}

class Grid {
    constructor(W=10, H=10) {
        this.W = W;
        this.H = H;

        // create grid squares
        this.squares = [];
        for (let i=0; i<this.W; i++) {
            for (let j=0; j<this.H; j++) {
                let square = new GridSquare(this, i, j);
                this.squares.push(square);
            }
        }
        // compute neighbors for each grid square
        for (let k=0; k<this.squares.length; k++) {
            this.squares[k].get_neighbors();
        }
    }
    get_square(i, j) {
        return this.squares[this.W * i + j];
    }
}

class Encounter {
    constructor(characters) {
        this.characters = characters;
        this.winner = null;
        this.text = "";
        this.n_rounds = 0;

        // create grid
        this.grid = new Grid();

        // place characters on grid
        for (let i = 0; i < this.characters.length; i++) {
            let x = this.characters[i].x
            let y = this.characters[i].y
            let square = this.grid.get_square(x, y);

            // check for valid coordinates
            if (x < 0 | y < 0) {
                this.text = "All coordinates must be positive";
                return
            }
            if (x >= this.grid.W | y >= this.grid.H) {
                this.text = "Coordinates must fit inside of arena";
                return
            }
            // raise error if square is already occupied
            if (square.occupied) {
                this.text = "Two players cannot occupy the same space!<br>Please try again"
                return
            }
            this.characters[i].grid_square = this.grid.get_square(x, y);
            this.grid.get_square(x, y).occupied = true;
        }

        // roll initiative
        for (let i = 0; i < this.characters.length; i++) {
            this.text += this.characters[i].roll_initiative();
        }
        // place characters in initiative order
        this.characters.sort(function(a, b) {return b.initiative - a.initiative});
        this.text += "<br>Turn order ...";
        for (let i = 0; i < this.characters.length; i++) {
            this.text += `<br>... ${this.characters[i].name}: ${this.characters[i].initiative}`;
        }
        // iterate through rounds
        for (let i=0; i<1000; i++) {
            this.n_rounds += 1;
            this.text += `<br>Round ${this.n_rounds}`;
            this.round();

            // check for winner
            this.check_winner();

            if (this.winner != null) {
                break
            }
        }
    }
    round() {
        // loop through characters and take turns
        for (let i=0; i<this.characters.length; i++) {
            this.text += this.characters[i].turn(this);
        }
    }
    check_winner() {
        const teams = [];
        for (let i = 0; i < this.characters.length; i++) {
            let this_char = this.characters[i];
            if (this_char.hit_points > 0) {
                if (teams.includes(this_char.team)) {
                    continue 
                } else {
                    teams.push(this_char.team);
                }
            }
        }
        if (teams.length == 1) {
            this.winner = teams[0];
            this.text += `<br>${this.winner} wins!`
        }
        return this.winner;
    }
}

function simulate() {
    const characters = [];

    // assemble teams
    for (let team=1; team<3; team++) {
        // get team name
        let t_name = document.getElementById(`t${team}_name`).innerText;
        
        // get player table
        let tbl = document.getElementById(`t${team}`);

        // loop through players
        for (let i=1; i<tbl.rows.length; i++) {
            // get name, type, and position
            let row = tbl.rows[i];
            let name = row.cells.item(0).innerText;
            let x = parseInt(row.cells.item(2).innerText);
            let y = parseInt(row.cells.item(3).innerText);
            let id = `t${team}_p${i}_type`
            let type = document.getElementById(id);

            // create new character object
            var c = null
            if (type.value == "commoner") {
                c = new Commoner(x, y);
            } else if (type.value == "guard") {
                c = new Guard(x, y);
            } else if (type.value == 'bandit') {
                c = new Bandit(x, y);
            } else {
                console.log(type);
            }
            c.name = name;
            c.team = t_name;
            characters.push(c);
        }
    }

    // let encounter = new Encounter([c1, c2, c3, guard]);
    let encounter = new Encounter(characters);
    document.getElementById("text").innerHTML = encounter.text;
    console.log(encounter);
}

function addPlayer(id) {
    // grid width and height
    let W = parseInt(document.getElementById("grid_w").value);
    let H = parseInt(document.getElementById("grid_h").value);

    // random coordinates for new player
    let x = Math.floor(Math.random() * W);
    let y = Math.floor(Math.random() * H);

    // read player table
    var table = document.getElementById(id);
    let n_rows = table.rows.length;
    var row = table.insertRow(n_rows);
    row.innerHTML = `
        <td contenteditable="true"></td>
        <td><select id="${id}_p${n_rows}_type">
            <option value="Bandit">Bandit</option>
            <option value="commoner">Commoner</option>
            <option value="guard">Guard</option>
        </select></td>
        <td contenteditable="true">${x}</td>
        <td contenteditable="true">${y}</td>
    `;
}