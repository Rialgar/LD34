uniform float scale;

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

vec4 sampleData(vec2 coords) {
    vec2 sampleCoords = coords/size;
    if(sampleCoords.x >= 0.0 && sampleCoords.x <= 1.0 && sampleCoords.y >= 0.0 && sampleCoords.y <= 1.0){
        return texture2D(mapData, sampleCoords);
    } else {
        return vec4(0.0, 0.0, 0.0, 0.0);
    }
}

vec2 fillDist(vec2 coords, vec2 off){
    coords = coords;
    vec4 data = sampleData(coords - off);
    vec2 delta = abs(0.5 - mod(coords, 1.0) - off);
    float dist = max(length(delta)/1.3, max(delta.x, delta.y));
    return vec2(
        data.x == 0.0 ? 5.0 : dist - data.x * 0.5 - skinThickness*1.1,
        data.y == 0.0 ? 5.0 : dist - 0.5 - skinThickness*1.1
    );
}

void main() {
    vec2 coords = (gl_FragCoord.xy - offset)/scale;
    if(coords.x < -1.0 || coords.x > size.x+1.0 || coords.y < -1.0 || coords.y > size.y+1.0){
        gl_FragColor.rgb = backgroundColor;
    }

    vec4 noiseValue = texture2D(noise, coords/30.0);

    vec2 minDist = vec2(5.0, 5.0);
    bool self = false;

    for(float x = -1.0; x <= 1.0; x += 1.0){
        for(float y = -1.0; y <= 1.0; y += 1.0){
            minDist = min(minDist, fillDist(coords, vec2(x, y)));
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
        outerColor = mix(vec3(1.0,1.0,1.0), outerColor, clamp((distance(coords, player+0.5)-0.2)*2.0, 0.0, 1.0));

        color = mix(skinColor, outerColor, clamp(1.0+(minDist.x - skinThickness)*6.0, 0.0, 1.0));
    }

    gl_FragColor.rgb = color;

}