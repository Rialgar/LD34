/**
 * Created by Rialgar on 12.12.2015.
 */
define(['three'], function(THREE){
    var mapWidth = 50;
    var mapHeight = 50;

    return {
        create: function(){
            this.mapData = new Uint8Array(mapWidth * mapHeight * 4);

            this.mapDataTexture = new THREE.DataTexture(this.mapData, mapWidth, mapHeight, THREE.RGBAFormat);
            this.mapDataTexture.minFilter = THREE.NearestFilter;
            this.mapDataTexture.magFilter = THREE.NearestFilter;
            this.mapDataTexture.needsUpdate = true;

            this.playerPos = new THREE.Vector2(0,0);
            this.playerDirection = new THREE.Vector2(1,0);
            this.playerClockDirection = 1;
            this.playerSpeed = 5;

            this.level = 1;
            this.loadMapData(this.level);

            this.aggregateStats = {
                fulfilled: 0,
                extra: 0
            };

            var geometry = new THREE.PlaneGeometry(2, 2);
            this.mapMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    scale: {type: "f", value: 15.0},
                    offset: {type: "v2", value: new THREE.Vector2(100, 100)},
                    size: {type: "v2", value: new THREE.Vector2(mapWidth, mapHeight)},
                    mapData: {type: "t", value: this.mapDataTexture},
                    noise: {type: "t", value: this.app.textures["noise"]},
                    player: {type: "v2", value: this.playerPos},
                    cooldown: {type: "f", value: 0},
                    bomb: {type: "f", value: 0},
                    explosion: {type: "v3", value: new THREE.Vector3()},
                    t: {type: "f", value: 0}
                },
                vertexShader: this.app.data["shaders/simple.vert"],
                fragmentShader: this.app.data["shaders/map.frag"]
            });
            var plane = new THREE.Mesh( geometry, this.mapMaterial );
            this.scene.add( plane );

            this.camera = new THREE.OrthographicCamera(-1, 1, -1, 1, 1, 1000);
            this.camera.position.z = -100;
            this.camera.lookAt(new THREE.Vector3(0, 0, 0));
            this.camera.updateProjectionMatrix();

            this.resize();

            window.stats = new Stats();
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.top = '0px';
            document.body.appendChild( stats.domElement );
        },
        loadMapData: function(number){
            this.neededCount = 0;
            this.fulfilledCount = 0;
            this.extraCount = 0;
            this.pickups = [];
            this.timeToPlayerSpeedReset = 0;
            this.bombTimer = 0;
            this.playerSpeed = 5;
            var key = "maps/"+(number<10 ? "0" : "")+number;
            var data = this.app.data[key];
            if(!data){
                console.error("Could not find map", number, key);
                return;
            }
            for(var x = 0; x < mapWidth; x++){
                for(var y = 0; y < mapWidth; y++){
                    var index3 = ((y * mapWidth) + x) * 3;
                    var index4 = ((y * mapWidth) + x) * 4;
                    this.mapData[index4] = data.charCodeAt(index3);
                    this.mapData[index4+1] = data.charCodeAt(index3+1);
                    this.mapData[index4+2] = data.charCodeAt(index3+2);
                    this.mapData[index4+3] = 0;
                    if(this.mapData[index4+1]){
                        this.neededCount++;
                        if(this.mapData[index4]) {
                            this.fulfilledCount++;
                        }
                    } else if(this.mapData[index4]) {
                        this.extraCount++;
                    }
                    if(this.mapData[index4+2] === 255){
                        this.playerPos.set(x,y);
                    } else if(this.mapData[index4+2] > 100 && this.mapData[index4+2] <= 200){
                        this.pickups.push({
                            type: "speed",
                            x: x,
                            y: y,
                            collecting: 0,
                            min: 100,
                            max: 200,
                            value: 200
                        });
                    } else if(this.mapData[index4+2] > 0 && this.mapData[index4+2] <= 100){
                        this.pickups.push({
                            type: "bomb",
                            x: x,
                            y: y,
                            collecting: 0,
                            min: 0,
                            max: 100,
                            value: 100
                        });
                    }
                }
            }
            this.playerClockDirection = 1;
            if (this.getMapData(this.playerPos.x, this.playerPos.y-1) && !this.getMapData(this.playerPos.x+1, this.playerPos.y)){
                this.playerDirection.set(1,0)
            } else if(this.getMapData(this.playerPos.x+1, this.playerPos.y) && !this.getMapData(this.playerPos.x, this.playerPos.y+1)){
                this.playerDirection.set(0,1)
            } else if(this.getMapData(this.playerPos.x, this.playerPos.y+1) && !this.getMapData(this.playerPos.x-1, this.playerPos.y)){
                this.playerDirection.set(-1,0)
            } else {
                this.playerDirection.set(0,-1)
            }
            this.mapDataTexture.needsUpdate = true;
            this.updateCellStats();
            this.levelStartTime = 0;
        },
        updateCellStats: function(){
            var empty = this.neededCount - this.fulfilledCount;
            var extra = this.extraCount;
            var precision = this.fulfilledCount / (this.fulfilledCount + this.extraCount);
            this.app.showCellStats(empty, extra, precision);
        },
        getMapData: function(x, y, c){
            if(x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
                return this.mapData[(y * mapWidth + x) * 4 + (c||0)];
            } else {
                return 0;
            }
        },
        setMapData: function(x, y, c, v){
            if(x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
                this.mapDataTexture && (this.mapDataTexture.needsUpdate = true);
                return this.mapData[(y * mapWidth + x) * 4 + c] = v;
            } else {
                return 0;
            }
        },
        render: function(){
            this.app.renderer.render(this.scene, this.camera);
            stats.update();
        },
        resize: function(){
            var scale = Math.floor(Math.min(this.app.width/(mapWidth+2), this.app.height/(mapHeight+2)));
            this.mapMaterial.uniforms.scale.value = scale;
            this.mapMaterial.uniforms.offset.value.x = Math.round((this.app.width-(scale*mapWidth)) / 2);
            this.mapMaterial.uniforms.offset.value.y = Math.round((this.app.height-(scale*mapHeight)) / 2);
        },
        enter: function(){
            var self = this;
            window.setTimeout(function(){
                self.app.showMessage(
                    "Welcome!<br/><br/>" +
                    "Space to grow more fruit cells.<br/>" +
                    "R to reset level.<br/>" +
                    "Anything else to switch direction.",

                    "Got it!",
                    function(){self.isReady = true;});
            }, 200);
        },
        rotPlayerDirection: function(){
            return new THREE.Vector2(this.playerDirection.y * this.playerClockDirection, -this.playerDirection.x * this.playerClockDirection);
        },
        win: function(){
            this.paused = true;
            this.winCount = this.winCount ? this.winCount+1 : 1;
            var precision = this.aggregateStats.fulfilled / (this.aggregateStats.fulfilled+this.aggregateStats.extra);

            var text =
                'YOU WON!<br/><br/>' +
                'You filled a total of ' + this.aggregateStats.fulfilled + ' target cells. <br/>' +
                'You also placed a total of ' + this.aggregateStats.extra + ' additional cells.<br/>'+
                'That is a precision of ' + Math.floor(precision*10000)/100 + "%.<br/>"+
                'Thanks for playing, I hope you had some fun.';
            if(this.winCount > 5)
            {
                if(this.winCount < 10){
                    text += "<br/><br/> You really like clicking this button, don't you?"
                } else if(this.winCount < 20){
                    text += "<br/><br/> You DO realize that the game is over?"
                } else if(this.winCount < 30){
                    text += "<br/><br/> There is nothing left here!"
                } else if(this.winCount < 40){
                    text += "<br/><br/> Go rate more games!"
                } else if(this.winCount < 50){
                    text += "<br/><br/> If you really like this game so much, refresh to play again."
                } else if(this.winCount < 60){
                    text += "<br/><br/> This game's name does not contain 'Clicker'."
                } else if(this.winCount < 70){
                    text += "<br/><br/> That button is not a cookie."
                } else if(this.winCount < 80){
                    text += "<br/><br/> Fine, keep clicking!"
                } else if(this.winCount < 90){
                    text += "<br/><br/> You are clicking great!"
                } else if(this.winCount < 1000){
                    var messages = [
                        "Click again!",
                        "You are the superclicker!",
                        "You earned the mousebreaker achievement!",
                        "Level up!",
                        "Clickedy Click!",
                        "(Pst, they are still clicking!)(Why?)(Beat's me!)",
                        "For the End of the World spell, press Control-Alt-Delete."
                    ];
                    text += "<br/><br/>" + messages[Math.floor(Math.random()*messages.length)];
                    if(this.winCount > 200){
                        text +="<br/>" + this.winCount;
                    }
                } else {
                    text += "<br/><br/> Congratulations persistant clicker/auto clicker user/source code reader. You found the last text."
                }
            }

            var self = this;
            this.app.showMessage( text, 'YOU WON!', function() {
                    self.win();
            });
        },
        finishLevel: function(){
            this.aggregateStats.fulfilled += this.fulfilledCount;
            this.aggregateStats.extra += this.extraCount;

            this.paused = true;
            var date = new Date(Date.now() - this.levelStartTime);
            var m = date.getUTCMinutes();
            var s = date.getSeconds();
            var self = this;
            this.app.showMessage(
                'Success! <br/>' +
                'You filled all ' + this.neededCount + ' target cells. <br/>' +
                'You also placed ' + this.extraCount + ' additional cells.<br/>'+
                'You needed ' + (m>0 ? (m + " minutes and ") : "") + s + " seconds",

                self.level == self.app.levelCount ? 'YOU WON!' : 'Next Level',
                function() {
                    self.paused = false;
                    self.level++;
                    if(self.level === 7){
                        var isOK = confirm("There are four more levels, that reference internet/gaming culture. " +
                            "They are made to look like pixel characters that I do not own. " +
                            "If you think that is OK for COMPO, press OK. If not, press Cancel.");
                        if(!isOK){
                            self.level = self.app.levelCount+1;
                        }
                    }
                    if(self.level > self.app.levelCount){
                        self.win();
                    } else {
                        self.loadMapData(self.level);
                    }
                }
            );
        },
        seedGrowth: function(cell, turned){
            var self = this;
            if(this.getMapData(cell.x, cell.y, 0) === 0) {
                this.setMapData(cell.x, cell.y, 0, 1);
                this.mayTurn = !turned;
                if (this.getMapData(cell.x, cell.y, 1)) {
                    this.fulfilledCount++;
                    if (this.fulfilledCount == this.neededCount) {
                        this.finishLevel();
                    }
                } else {
                    this.extraCount++;
                }
                this.updateCellStats();
            }
        },
        step: function(seconds){
            if(!this.isReady || this.paused){
                return;
            }
            if(!this.levelStartTime){
                this.levelStartTime = Date.now();
            }
            this.mapMaterial.uniforms.t.value += seconds;

            if(this.timeToPlayerSpeedReset > 0){
                this.timeToPlayerSpeedReset = Math.max(0, this.timeToPlayerSpeedReset - seconds);
                if(this.timeToPlayerSpeedReset == 0){
                    this.playerSpeed = 5;
                }
                this.mapMaterial.uniforms.cooldown.value = this.timeToPlayerSpeedReset / 10.0;
            }

            if(this.bombTimer > 0){
                this.bombTimer = Math.max(0, this.bombTimer - seconds);
                if(this.bombTimer == 0){
                    this.explosion = 2.0;
                    this.beforeRemoval = true;
                    this.mapMaterial.uniforms.explosion.value.x = this.playerPos.x;
                    this.mapMaterial.uniforms.explosion.value.y = this.playerPos.y;
                }
                this.mapMaterial.uniforms.bomb.value = this.bombTimer / 10.0;
            }

            if(this.explosion > 0){
                this.explosion = Math.max(0.0, this.explosion - seconds);
                if(this.beforeRemoval && this.explosion < 1.0) {
                    this.beforeRemoval = false;
                    var x0 = this.mapMaterial.uniforms.explosion.value.x;
                    var y0 = this.mapMaterial.uniforms.explosion.value.y;
                    for(var xR = Math.ceil(x0-5); xR < x0+5; xR++){
                        for(var yR = Math.ceil(y0-5); yR < y0+5; yR++){
                            if((xR-x0)*(xR-x0)+(yR-y0)*(yR-y0) < 25 && this.getMapData(xR, yR)) {
                                this.setMapData(xR, yR, 0, 0);
                                if (this.getMapData(xR, yR, 1)) {
                                    this.fulfilledCount--;
                                } else {
                                    this.extraCount--;
                                }
                            }
                        }
                    }
                    this.updateCellStats();
                }
                this.mapMaterial.uniforms.explosion.value.z = this.explosion / 2.0;
            }

            var movement = seconds*this.playerSpeed;
            while(movement > 0) {

                var newPlayerPos = this.playerDirection.clone().multiplyScalar(Math.min(movement, .1)).add(this.playerPos);
                movement -= .1;

                var prevCell = this.playerPos.clone().floor();
                var newCell = newPlayerPos.clone().floor();
                var cell = newPlayerPos.clone().round();
                if (!prevCell.equals(newCell)) { //we crossed a center
                    var dot = newPlayerPos.dot(this.playerDirection);
                    var modulo = dot % 1;
                    if (modulo < 0) modulo++;
                    if (modulo == 0){ //weird situation, causes bugs
                        newPlayerPos.addScaledVector(this.playerDirection, 0.01);
                        modulo = 0.01;
                    }

                    var turned = false;
                    var newPlayerDirection = this.rotPlayerDirection();
                    if (this.getMapData(cell.x + newPlayerDirection.x, cell.y + newPlayerDirection.y, 0) == 0) { //outer corner
                        this.playerPos.copy(cell).addScaledVector(newPlayerDirection, modulo);
                        this.playerDirection.copy(newPlayerDirection);
                    } else if (this.getMapData(cell.x + this.playerDirection.x, cell.y + this.playerDirection.y, 0) == 0) { //go straight
                        this.playerPos.copy(newPlayerPos);
                    } else if (this.getMapData(cell.x - newPlayerDirection.x, cell.y - newPlayerDirection.y, 0) == 0) { //inner corner
                        this.playerPos.copy(cell).addScaledVector(newPlayerDirection, -modulo);
                        this.playerDirection.copy(newPlayerDirection).negate();
                    } else if (this.getMapData(cell.x - this.playerDirection.x, cell.y - this.playerDirection.y, 0) == 0 || this.mayTurn) { //turn around
                        this.playerPos.copy(cell).addScaledVector(this.playerDirection, -modulo);
                        this.playerDirection.negate();
                        this.mayTurn = false;
                        turned = true;
                    } else {// we are stuck, just go through
                        this.playerPos.copy(newPlayerPos);
                    }
                    if (this.laySeeds){
                        this.seedGrowth(cell, turned);
                    }
                } else {
                    this.playerPos.copy(newPlayerPos);
                }
                var self = this;
                this.pickups.forEach(function(ea){
                    if(!ea.collecting && ea.x == cell.x && ea.y == cell.y){
                        ea.collecting = 1;
                        if(ea.type == "speed"){
                            self.playerSpeed = 20;
                            self.timeToPlayerSpeedReset = 10;
                        } else if(ea.type == "bomb"){
                            if(self.bombTimer || self.explosion){
                                ea.collecting = 0;
                            } else {
                                self.bombTimer = 10;
                            }
                        }
                    }
                    if(ea.collecting == 1){
                        ea.value = Math.max(ea.value - (ea.max - ea.min) * seconds, ea.min);
                        if(ea.value == ea.min){
                            ea.collecting = 2;
                            ea.value = 0;
                        }
                        self.setMapData(ea.x, ea.y, 2, ea.value);
                    }
                })
            }
            for(var x = 0; x < mapWidth; x++){
                for(var y = 0; y < mapHeight; y++){
                    var data = this.getMapData(x, y, 0);
                    if(data > 0 && data < 255 && (cell.x != x || cell.y != y)){
                        this.setMapData(x, y, 0, Math.min(255, data + seconds*255));
                    }
                }
            }
        },
        keydown: function(data) {
            if(data.key === "space"){
                var cell = this.playerPos.clone().round();
                this.seedGrowth(cell);
                this.laySeeds = true;
            } else if (data.key === "r") {
                this.loadMapData(this.level);
            } else {
                this.playerDirection.negate();
                this.playerClockDirection *= -1;
            }
        },
        keyup: function(data) {
            if (data.key === "space") {
                var cell = this.playerPos.clone().round();
                this.seedGrowth(cell);
                this.laySeeds = false;
            }
        }
    };
});