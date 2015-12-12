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
            this.loadTexture("noise");
        },
        ready: function() {
            this.setState(states.game);
            this.textures["noise"].wrapS = THREE.RepeatWrapping;
            this.textures["noise"].wrapT = THREE.RepeatWrapping;
        }
    });
});