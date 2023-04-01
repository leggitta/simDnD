let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let X = canvas.width;       // canvas width
let Y = canvas.height;      // canvas height
let N = 10;                 // N horizontal squares
let M = 10;                 // M vertical squares
let W = Math.floor(X / N);  // grid square width
let H = Math.floor(Y / M);  // grid square height

class Grid {
    constructor() {
        this.squares = [];
        for (let i=0; i<N; i++) {
            for (let j=0; j<M; j++) {
                let square = new Square(i, j);
                this.squares.push(square);
            }
        }
        this.draw();
    }
    get_square(i, j) {
        for (let k=0; k<this.squares.length; k++) {
            let square = this.squares[k];
            if (square.i == i & square.j == j) {
                return square;
            }
        }
    }
    reset() {
        for (let k=0; k<this.squares.length; k++) {
            let square = this.squares[k];
            square.hover = false;
        }
    }
    draw() {
        ctx.clearRect(0, 0, X, Y);
        for (let k=0; k<this.squares.length; k++) {
            let square = this.squares[k];
            square.draw();
        }
    }
    get_coords(event) {
        let x = event.offsetX;
        let y = event.offsetY;
        let i = Math.floor(x / W);
        let j = Math.floor(y / H);
        return [i, j];
    }
    mousemove(event) {
        this.reset();
        let [i, j] = this.get_coords(event);
        let square = this.get_square(i, j);
        square.hover = true;
        this.draw();
    }
    mousedown(event) {
        let [i, j] = this.get_coords(event);
        let square = this.get_square(i, j);
        square.select();
        this.draw();
    }
}
class Square {
    constructor(i, j) {
        this.i = i;
        this.j = j;
        this.hover = false;
        this.selected = false;
        this.occupant = null;
    }
    draw() {
        ctx.beginPath();
        ctx.rect(this.i*W, this.j*H, W, H);
        ctx.stroke();

        if (this.selected) {
            ctx.beginPath();
            ctx.fillStyle = "#ff1111";
            ctx.fillRect(this.i*W, this.j*H, W, H);
            ctx.stroke();
        }
        if (this.hover) {
            ctx.beginPath();
            ctx.fillStyle = "#11ff11";
            ctx.fillRect((this.i+.1)*W, (this.j+.1)*H, .8*W, .8*H);
            ctx.stroke();
        }
        if (this.occupant != null) {
            let char = this.occupant;
            ctx.font = "15px serif";
            ctx.fillStyle = "#000000"
            ctx.fillText(char.name, this.i*W + 5, this.j*H + 15);
        }
    }
    select() {
        this.selected = !this.selected;
    }
}
class Character {
    constructor(name, i, j) {
        this.name = name;
        this.square = grid.get_square(i, j);
        this.square.occupant = this;
    }
}

let grid = new Grid();
let player = new Character('Alan', 0, 0);
let monster = new Character('Amy', 5, 5);
grid.draw();

// add callbacks
canvas.addEventListener('mousemove', mousemove);
canvas.addEventListener('mousedown', mousedown);
function mousemove(event) { grid.mousemove(event) }
function mousedown(event) { grid.mousedown(event) }