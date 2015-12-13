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
        create: function(){
            this.renderer.setClearColor(0x000000);
            this.loadData("shaders/simple.vert.glsl");
            this.loadData("shaders/map.frag.glsl");
            this.loadData("maps/01.blob");
            this.loadTexture("noise");

            this.messageContainer = document.getElementById("messageContainer");
            this.messageText = document.getElementById("messageText");
            this.messageConfirm = document.getElementById("messageConfirm");
        },
        ready: function() {
            this.resize();
            this.setState(states.game);
            this.textures["noise"].wrapS = THREE.RepeatWrapping;
            this.textures["noise"].wrapT = THREE.RepeatWrapping;
        },
        showMessage: function(text, button, cb) {
            this.messageText.innerHTML = text;
            this.messageConfirm.textContent = button || "OK";

            this.messageContainer.style.display = "block";
            this.messageContainer.style.left = (this.width - this.messageContainer.clientWidth)/2 + "px";
            this.messageContainer.style.top = (this.height - this.messageContainer.clientHeight)/2 + "px";

            var self = this;
            var el = function(){
                self.messageConfirm.removeEventListener("click", el);
                self.messageContainer.style.display = "none";
                if(typeof cb === "function") {
                    cb();
                }
            };
            this.messageConfirm.addEventListener("click", el);
        },
        resize: function(){
            this.messageContainer.style.left = (this.width - this.messageContainer.clientWidth)/2 + "px";
            this.messageContainer.style.top = (this.height - this.messageContainer.clientHeight)/2 + "px";
        }
    });
});