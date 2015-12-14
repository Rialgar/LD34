/**
 * Created by Rialgar on 12.12.2015.
 */
requirejs.config({
    map: {
        '*':{
            'three': 'lib/three',
            'playground': 'lib/playground-three'
        }
    },
    shim:{
        'lib/three': {
            deps: [],
            exports: 'THREE'
        },
        'lib/three.min': {
            deps: [],
            exports: 'THREE'
        },
        'lib/playground-three': {
            deps: ['three'],
            exports: 'playground'
        }
    }
});

requirejs(['three', 'playground', 'states'], function(THREE, playground, states){
    window._app = playground({
        levelCount:10,
        create: function(){
            this.renderer.setClearColor(0x000000);
            this.loadData("shaders/simple.vert.glsl");
            this.loadData("shaders/map.frag.glsl");
            for(var i = 1; i <= this.levelCount; i++){
                this.loadData("maps/"+(i<10? "0" : "")+i+".blob");
            }

            this.loadTexture("noise");
            this.loadSound("background");

            this.messageContainer = document.getElementById("messageContainer");
            this.messageText = document.getElementById("messageText");
            this.messageConfirm = document.getElementById("messageConfirm");

            var self = this;
            this.messageConfirm.addEventListener("click", function(){
                self.confirmMessage();
            });

            this.statsContainer = document.getElementById("cellStats");
            this.emptyText = document.getElementById("emptyTargets");
            this.extraText = document.getElementById("extraCells");
            this.precisionText = document.getElementById("precision");

            this.messageShowing = false;
        },
        ready: function() {
            this.resize();
            this.setState(states.game);
            this.textures["noise"].wrapS = THREE.RepeatWrapping;
            this.textures["noise"].wrapT = THREE.RepeatWrapping;

            this.hasMusic = true;
            this.bgMusic = this.music.play("background", true);
            this.music.fadeIn(this.bgMusic);

        },
        showMessage: function(text, button, cb) {
            this.messageText.innerHTML = text;
            this.messageConfirm.textContent = button || "OK";

            this.messageContainer.style.display = "block";
            this.messageContainer.style.left = (this.width - this.messageContainer.clientWidth)/2 + "px";
            this.messageContainer.style.top = (this.height - this.messageContainer.clientHeight)/2 + "px";

            var self = this;
            this.el = function(){
                self.messageContainer.style.display = "none";
                this.messageShowing = false;

                if(typeof cb === "function") {
                    cb();
                }
            };

            this.messageShowing = true;
        },
        confirmMessage:function(){
            if(this.messageShowing && this.el){
                this.el();
            }
        },
        showCellStats: function(empty, extra, precision){
            this.statsContainer.style.display = "block";
            this.emptyText.textContent = empty;
            this.extraText.textContent = extra;
            this.precisionText.textContent = Math.round(precision * 100) + "%";
        },
        resize: function(){
            this.messageContainer.style.left = (this.width - this.messageContainer.clientWidth)/2 + "px";
            this.messageContainer.style.top = (this.height - this.messageContainer.clientHeight)/2 + "px";
        },
        keydown: function(data){
            console.log(data.key);
            if(data.key == "enter"){
                this.confirmMessage();
            } else if(data.key == "m"){
                if(this.hasMusic) {
                    this.hasMusic = false;
                    this.music.stop(this.bgMusic);
                } else {
                    this.hasMusic = true;
                    this.bgMusic = this.music.play("background", true);
                    this.music.fadeIn(this.bgMusic);
                }
            }
        }
    });
});