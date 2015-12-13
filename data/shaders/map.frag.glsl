uniform float scale;
uniform float t;
uniform float cooldown;

uniform vec2 offset;
uniform vec2 size;
uniform vec2 player;

uniform sampler2D mapData;
uniform sampler2D noise;

const vec3 innerColorLight = vec3(216.0, 217.0, 181.0)/255.0;
const vec3 innerColorDark = vec3(203.0, 181.0, 134.0)/255.0;
const vec3 skinColorLight = vec3(194.0, 66.0, 5.0)/255.0;
const vec3 skinColorDark = vec3(143.0, 28.0, 0.0)/255.0;
const vec3 backgroundColor = vec3(0.0,0.3,0.0);

const float skinThickness = 0.2;

#define M_PI 3.1415926535897932384626433832795

vec4 sampleData(vec2 coords) {
    vec2 sampleCoords = coords/size;
    if(sampleCoords.x >= 0.0 && sampleCoords.x <= 1.0 && sampleCoords.y >= 0.0 && sampleCoords.y <= 1.0){
        return texture2D(mapData, sampleCoords);
    } else {
        return vec4(0.0, 0.0, 0.0, 0.0);
    }
}

vec2 fillDist(vec2 coords, vec2 off, vec4 data){
    coords = coords;
    vec2 delta = abs(0.5 - mod(coords, 1.0) - off);
    float dist = max(length(delta)/1.3, max(delta.x, delta.y));
    return vec2(
        data.x == 0.0 ? 5.0 : dist - data.x * 0.5 - skinThickness*1.1,
        data.y == 0.0 ? 5.0 : dist - 0.5 - skinThickness*1.1
    );
}

vec4 renderSpeedPickup(vec4 baseColor, vec2 coords, float addScale){
    addScale /= 100.0;
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
    v = min(v, inset*10.0);
    v = max(v, 0.0);

    v *= (1.0 - addScale);

    vec3 c = mix(baseColor.rgb, vec3(1.0,1.0,1.0), clamp((v-baseColor.a)/v, 0.0, 1.0));

    return vec4(c, v+baseColor.a);
}

void main() {
    vec2 coords = (gl_FragCoord.xy - offset)/scale;
    if(coords.x < -1.0 || coords.x > size.x+1.0 || coords.y < -1.0 || coords.y > size.y+1.0){
        gl_FragColor.rgb = backgroundColor;
    }

    vec4 noiseValue = texture2D(noise, coords/30.0);

    vec2 minDist = vec2(5.0, 5.0);
    bool self = false;

    vec4 iconColor = vec4(0.0,0.0,0.0,0.0);
    for(float x = -1.0; x <= 1.0; x += 1.0){
        for(float y = -1.0; y <= 1.0; y += 1.0){
            vec2 off = vec2(x, y);
            vec4 data = sampleData(coords - off);
            minDist = min(minDist, fillDist(coords, off, data));
            float icon = data.z*255.0;
            if( icon > 100.0 && icon <= 200.0){
                iconColor = renderSpeedPickup(iconColor, mod(coords, 1.0)+off, 200.0-icon);
            }
        }
    }

    vec3 color;
    vec3 innerColor = mix(innerColorDark, innerColorLight, min(noiseValue.x+0.5,1.0));
    vec3 skinColor = mix(skinColorDark, skinColorLight, noiseValue.x);

    if(minDist.x <= 0.0){
        color = mix(innerColor, skinColor, clamp((minDist.x + skinThickness)*6.0, 0.0, 1.0));
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

    vec3 playerColor = vec3(1.0,1.0,1.0);
    vec2 playerDelta = coords - (player+0.5);

    if( atan(playerDelta.x, -playerDelta.y)+M_PI < cooldown*2.0*M_PI){
        playerColor = vec3(0.0,0.0,0.0);
    };

    gl_FragColor.rgb = mix(playerColor, color, clamp((length(playerDelta)-0.2)*2.0, 0.0, 1.0));
}