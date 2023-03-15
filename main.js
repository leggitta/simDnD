function roll(n) {
    return Math.floor(Math.random() * n) + 1;
}
function mod(n) {
    return Math.floor((n - 10) / 2);
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

        // attacks
        this.melee_attack_bonus = 0;
        this.melee_damage_dice = [0];
        this.melee_damage_bonus = 0;

        this.ranged_attack_bonus = 0;
        this.ranged_damage_dice = [0];
        this.ranged_damage_bonues = 0;
        this.ranged_attack_range = 0;
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

        // by default, choose the next character from the opposite team
        // with at least one hit point
        for (let i=0; i<encounter.characters.length; i++) {
            if (
                encounter.characters[i].team != this.team
                & encounter.characters[i].hit_points > 0
            ) {
                this.target = encounter.characters[i];
                return `<br>${this.name} targets ${this.target.name}`;
            }
        }
        return "<br>No targets are available";
    }
    melee_attack(target) {
        var text = `<br>${this.name} attacks ${target.name}`;

        // roll to hit
        let val = roll(20) + this.melee_attack_bonus;
        text += `<br>${this.name} rolled ${val} against armor class ${target.armor_class}`;
        if (val >= target.armor_class) {
            text += `<br>Hit!`;
        } else {
            text += `<br>Miss!`;
            return text;
        }
        
        // roll damage
        var dmg = this.melee_damage_bonus;
        for (let i=0; i< this.melee_damage_dice.length; i++) {
            dmg += roll(this.melee_damage_dice[i]);
        }
        text += `<br>${this.name} rolled ${dmg} damage`;
        target.hit_points -= dmg;
        text += `<br>${target.name} has ${target.hit_points} hit points left`;
        return text 
    }
    turn(encounter) {
        var text = `<br>${this.name}'s turn`;

        // check that current player is conscious
        if (this.hit_points < 1) {
            text += `<br>${this.name} is unconscious`;
            return text;
        }
        // check for existing target
        if (this.target === null) {
            text += this.choose_target(encounter);
        } else {
            // check that existing target is conscious
            if (this.target.hit_points < 1) {
                text += this.choose_target(encounter);
            }
        }
        if (this.target != null) {
            text += this.melee_attack(this.target);
        }
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

        this.melee_attack_bonus = 2;
        this.melee_damage_dice = [4];
        this.melee_damage_bonus = 0;
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

        this.melee_attack_bonus = 3;
        this.melee_damage_dice = [6];
        this.melee_damage_bonus = 1;

        this.ranged_attack_bonus = 3;
        this.ranged_damage_dice = [8];
        this.ranged_damage_bonues = 1;
        this.ranged_attack_range = 80;
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

        this.melee_attack_bonus = 3;
        this.melee_damage_dice = [6];
        this.melee_damage_bonus = 1;
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
            let dr2 = dx * dx + dy * dy;
            if (dr2 > 0 & dr2 < 3) {
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
        for (let i=0; i<10; i++) {
            this.n_rounds += 1;
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
            <option value="commoner">Commoner</option>
            <option value="guard">Guard</option>
        </select></td>
        <td contenteditable="true">${x}</td>
        <td contenteditable="true">${y}</td>
    `;
}