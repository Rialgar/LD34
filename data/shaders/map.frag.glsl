uniform float scale;
uniform float t;
uniform float cooldown;
uniform float bomb;

uniform vec2 offset;
uniform vec2 size;
uniform vec2 player;

uniform vec3 explosion;

uniform sampler2D mapData;
uniform sampler2D noise;

const vec3 innerColorLight = vec3(216.0, 217.0, 181.0)/255.0;
const vec3 innerColorDark = vec3(203.0, 181.0, 134.0)/255.0;
const vec3 skinColorLight = vec3(194.0, 66.0, 5.0)/255.0;
const vec3 skinColorDark = vec3(143.0, 28.0, 0.0)/255.0;
const vec3 backgroundColor = vec3(0.0,0.3,0.0);

const float skinThickness = 0.2;
const float spikes = 6.0;

#define M_PI 3.1415926535897932384626433832795

vec4 sampleData(vec2 coords) {
    vec2 sampleCoords = coords/size;
    if(sampleCoords.x >= 0.0 && sampleCoords.x <= 1.0 && sampleCoords.y >= 0.0 && sampleCoords.y <= 1.0){
        return texture2D(mapData, sampleCoords);
    } else {
        return vec4(0.0, 0.0, 0.0, 0.0);
    }
}

vec3 fillDist(vec2 coords, vec2 off, vec4 data){
    coords = coords;
    vec2 delta = abs(0.5 - mod(coords, 1.0) - off);
    float dist = max(length(delta)/1.3, max(delta.x, delta.y));
    return vec3(
        data.x == 0.0 ? 5.0 : dist - data.x * 0.5 - skinThickness*1.1,
        data.y == 0.0 ? 5.0 : dist - 0.5 - skinThickness*1.1,
        distance(player, floor(coords-off))
    );
}

vec4 renderSpeedPickup(vec4 baseColor, vec2 coords, float addScale){
    coords = (coords-0.5) / (1.0 + sin(t*3.141)/5.0) / (addScale * 2.0 + 1.0) + 0.5;
    float inset = min(coords.x, min(coords.y, min(1.1-coords.x, 1.0-coords.y)));
    if(coords.y > 0.5){
        coords.y = 1.0 - coords.y;
    }
    if(coords.x > 0.5){
        coords.x -= 0.5;
    }
    float v = 0.5 - coords.x + coords.y;
    v = (v-0.4) * 5.0;
    v = min(v, coords.x*10.0);
    v = min(v, inset*10.0);
    v = max(v, 0.0);
    v *= (1.0 - addScale);

    return mix(baseColor, vec4(1.0,1.0,1.0,1.0), clamp(v, 0.0, 1.0));;
}

float renderBoom(vec2 coords, float spikeNumber){
    float dist = length(coords);

    if(dist <= 0.5){//early out to avoid useless atan
        float angle = atan(coords.x, coords.y) + M_PI + t;
        angle = mod(angle*spikeNumber/M_PI, 2.0); //0-2 per spike
        if(angle > 1.0){
            angle = 2.0 - angle; //0-1 signifying height in spike
        }
        float v = 0.75 + angle/4.0 - pow(dist*2.0, 0.5);
        v *= 3.0;
        return v;
    } else {
        return 0.0;
    }
}

vec4 renderBombPickup(vec4 baseColor, vec2 coords, float addScale){
    coords = (coords-0.5) / (1.5 + sin(t*3.141)/5.0) / (addScale * 2.0 + 1.0);
    float inset = min(coords.x+0.5, min(coords.y+0.5, min(0.5-coords.x, 0.5-coords.y)));

    float v = renderBoom(coords, spikes);
    if(v > 0.0){
        v *= (1.0 - addScale);
        v = min(v, inset*10.0);
        v = max(v, 0.0);
        return mix(baseColor, vec4(1.0,1.0,1.0,1.0), clamp(v, 0.0, 1.0));;
    } else {
        return baseColor;
    }
}

void main() {
    vec2 coords = (gl_FragCoord.xy - offset)/scale;
    if(coords.x < -1.0 || coords.x > size.x+1.0 || coords.y < -1.0 || coords.y > size.y+1.0){
        gl_FragColor.rgb = backgroundColor;
    }

    vec4 noiseValue = texture2D(noise, coords/30.0);

    vec3 minDist = vec3(10.0, 10.0, 10.0);
    bool self = false;

    vec4 iconColor = vec4(0.0,0.0,0.0,0.0);
    for(float x = -1.0; x <= 1.0; x += 1.0){
        for(float y = -1.0; y <= 1.0; y += 1.0){
            vec2 off = vec2(x, y);
            vec4 data = sampleData(coords - off);
            vec3 comp = fillDist(coords, off, data);
            if(minDist.x > comp.x){
                minDist.x = comp.x;
                minDist.z = comp.z;
            }
            minDist.y = min(minDist.y, comp.y);

            float icon = data.z*255.0;
            if( icon > 100.0 && icon <= 200.0){
                iconColor = renderSpeedPickup(iconColor, mod(coords, 1.0)+off, (200.0-icon)/100.0);
            } else if (icon > 0.0 && icon <= 100.0){
                iconColor = renderBombPickup(iconColor, mod(coords, 1.0)+off, (100.0-icon)/100.0);
            }
        }
    }

    vec3 color;
    vec3 innerColor = mix(innerColorDark, innerColorLight, min(noiseValue.x+0.5,1.0));
    vec3 skinColor = mix(skinColorDark, skinColorLight, noiseValue.x);

    if(minDist.x <= 0.0){
        color = mix(innerColor, skinColor, clamp((minDist.x + skinThickness)*6.0, 0.0, 1.0));
        if(bomb > 0.0 && minDist.z < 5.0){
            color = mix(color, vec3(1.0,0.5,0.0), 0.5);
        }
    } else{
        vec3 outerColor;
        if(minDist.y < 0.0) {
            outerColor = mix(innerColor, skinColor, clamp((minDist.y + skinThickness)*6.0, 0.0, 1.0));
        } else {
            outerColor = mix(skinColor, backgroundColor, clamp(1.0+(minDist.y - skinThickness)*6.0, 0.0, 1.0));
        }
        outerColor = mix(outerColor, backgroundColor, 0.6);

        color = mix(skinColor, outerColor, clamp(1.0+(minDist.x - skinThickness)*6.0, 0.0, 1.0));
    }
    color = mix(color, iconColor.rgb, iconColor.a);

    vec2 playerDelta = coords - (player+0.5);
    float l = length(playerDelta);
    vec3 playerColor = vec3(1.0,1.0,1.0);

    if(l < 1.0){ //early out to avoid uselesss calculations
        if( atan(playerDelta.x, -playerDelta.y)+M_PI < cooldown*2.0*M_PI){
            playerColor = vec3(0.0,0.0,0.0);
        };
        if(bomb != 0.0 && l < 1.0 - bomb){
            playerColor = vec3(1.0,0.5,0.0);
        }
    }

    l = clamp((l-0.6)*2.5, 0.0, 1.0);
    gl_FragColor.rgb = mix(playerColor, color, l);

    if(explosion.z > 0.0){
        float lowerHalf = min(explosion.z*2.0, 1.0);
        float v  = renderBoom((coords-explosion.xy)/40.0/(1.0-explosion.z), 6.0);
        vec3 boomColor = mix(vec3(1.0, 0.5, 0.0), vec3(1.0,1.0,1.0), clamp(v, 0.0, 1.0));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, boomColor, clamp(v*2.0, 0.0, 1.0)*lowerHalf);
    }
}