var bg;
var pathList = [];
let botList = [];

function setup() {
    bg = loadImage("assets/browserquestworldmap_rotated.jpeg");
    createCanvas(271, 720);

    $.ajax({
        url: "setup"
    }).then(function(res) {
        for (let i=0; i < Number(res); i++) {
            botList[i] = new Jitter();
        }
    });
    frameRate(1);
}

function draw() {

    background(bg);

    for (let i=0; i < pathList.length; i++) {
        let move;
        if (pathList[i]) {
            move = pathList[i].shift();
        }
        if (move) {
            botList[i].setLocation((move.x / 114) * 271, (move.y / 300) * 720);
        }
        botList[i].display();
    }
}

// Jitter class
function Jitter() {
    this.x = 0;
    this.y = 0;
    this.diameter = 15;

    this.setLocation = function(x, y) {
        this.x = x;
        this.y = y;
    };

    this.display = function() {
        ellipse(this.x, this.y, this.diameter, this.diameter);
    };
}