/**
 * Created by Rialgar on 12.12.2015.
 */
define(['three'], function(THREE){
    var mapWidth = 50;
    var mapHeight = 50;

    return {
        create: function(){
            this.mapData = new Uint8Array(mapWidth * mapHeight * 4);

            for(var x = 0; x < mapWidth; x++){
                for(var y = 0; y < mapHeight; y++){
                    this.setMapData(x, y, 0, 0);
                    this.setMapData(x, y, 1, (((x-25)*(x-25) + (y-25)*(y-25)) < 91) ? 255 : 0);
                    this.setMapData(x, y, 2, 0);
                    this.setMapData(x, y, 3, 0);
                }
            }
            this.setMapData(25,25,0,255);

            this.mapDataTexture = new THREE.DataTexture(this.mapData, mapWidth, mapHeight, THREE.RGBAFormat);
            this.mapDataTexture.minFilter = THREE.NearestFilter;
            this.mapDataTexture.magFilter = THREE.NearestFilter;
            this.mapDataTexture.needsUpdate = true;

            this.playerPos = new THREE.Vector2(25,26);
            this.playerDirection = new THREE.Vector2(1,0);
            this.playerClockDirection = 1;

            var geometry = new THREE.PlaneGeometry(2, 2);
            this.mapMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    scale: {type: "f", value: 15.0},
                    offset: {type: "v2", value: new THREE.Vector2(100, 100)},
                    size: {type: "v2", value: new THREE.Vector2(mapWidth, mapHeight)},
                    mapData: {type: "t", value: this.mapDataTexture},
                    noise: {type: "t", value: this.app.textures["noise"]},
                    player: {type: "v2", value: this.playerPos}
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
        getMapData: function(x, y, c){
            if(x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
                return this.mapData[(y * mapWidth + x) * 4 + c];
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
            console.log(this);
            this.mapMaterial.uniforms.scale.value = scale;
            this.mapMaterial.uniforms.offset.value.x = Math.round((this.app.width-(scale*mapWidth)) / 2);
            this.mapMaterial.uniforms.offset.value.y = Math.round((this.app.height-(scale*mapHeight)) / 2);
        },
        enter: function(){
            var self = this;
            window.setTimeout(function(){self.isReady = true;}, 200);
        },
        rotPlayerDirection: function(dir){
            return new THREE.Vector2(this.playerDirection.y * this.playerClockDirection, -this.playerDirection.x * this.playerClockDirection);
        },
        step: function(seconds){
            if(!this.isReady){
                return;
            }
            var movement = seconds*5;
            while(movement > 0) {

                var newPlayerPos = this.playerDirection.clone().multiplyScalar(Math.min(movement, .1)).add(this.playerPos);
                movement -= .1;

                var prevCell = this.playerPos.clone().floor();
                var newCell = newPlayerPos.clone().floor();
                var cell = newPlayerPos.clone().round();
                if (!prevCell.equals(newCell)) { //we crossed a center
                    if (this.laySeeds && this.getMapData(cell.x, cell.y, 0) === 0) {
                        this.setMapData(cell.x, cell.y, 0, 1);
                    }
                    var dot = newPlayerPos.dot(this.playerDirection);
                    var modulo = dot % 1;
                    if (modulo < 0) modulo++;

                    var newPlayerDirection = this.rotPlayerDirection();
                    if (this.getMapData(cell.x + newPlayerDirection.x, cell.y + newPlayerDirection.y, 0) < 50) { //outer corner
                        this.playerPos.copy(cell).addScaledVector(newPlayerDirection, modulo);
                        this.playerDirection.copy(newPlayerDirection);
                    } else if (this.getMapData(cell.x + this.playerDirection.x, cell.y + this.playerDirection.y, 0) < 50) { //go straight
                        this.playerPos.copy(newPlayerPos);
                    } else if (this.getMapData(cell.x - newPlayerDirection.x, cell.y - newPlayerDirection.y, 0) < 50) { //inner corner
                        this.playerPos.copy(cell).addScaledVector(newPlayerDirection, -modulo);
                        this.playerDirection.copy(newPlayerDirection).negate();
                    } else if (this.getMapData(cell.x - this.playerDirection.x, cell.y - this.playerDirection.y, 0) < 50) { //turn around
                        this.playerPos.copy(cell).addScaledVector(this.playerDirection, -modulo);
                        this.playerDirection.negate();
                    } else {// we are stuck, just go through
                        this.playerPos.copy(newPlayerPos);
                    }
                } else {
                    this.playerPos.copy(newPlayerPos);
                }
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
                if (this.getMapData(cell.x, cell.y, 0) === 0) {
                    this.setMapData(cell.x, cell.y, 0, 1);
                }
                this.laySeeds = true;
            } else {
                this.playerDirection.negate();
                this.playerClockDirection *= -1;
            }
        },
        keyup: function(data) {
            if (data.key === "space") {
                var cell = this.playerPos.clone().round();
                if (this.getMapData(cell.x, cell.y, 0) === 0) {
                    this.setMapData(cell.x, cell.y, 0, 1);
                }
                this.laySeeds = false;
            }
        }
    };
});