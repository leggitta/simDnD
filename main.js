function roll(n) {
    return Math.floor(Math.random() * n) + 1;
}
function mod(n) {
    return Math.floor((n - 10) / 2);
}

class Character {
    x = 0;
    y = 0;
    constructor(x, y) {
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
    constructor() {
        super();
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
    constructor() {
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
    constructor() {
        super();
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

class Encounter {
    constructor(characters) {
        this.characters = characters;
        this.winner = null;
        this.text = "";

        // place characters on grid

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
    let c1 = new Commoner();
    c1.name = 'James';
    
    let c2 = new Commoner();
    c2.name = 'Emily';
    
    let guard = new Guard();
    guard.name = 'Officer Carol';

    let encounter = new Encounter([c1, c2, guard]);
    document.getElementById("text").innerHTML = encounter.text;
}