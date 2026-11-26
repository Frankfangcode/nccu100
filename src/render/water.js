/**
 * 水面著色器共用的時間參數。
 */

/* 醉夢溪與噴水池共用時間與日夜色溫參數 */
const waterU={t:{value:0},dusk:{value:0},night:{value:0}};
const WV='varying vec3 vW;varying vec2 vUv;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';

export { WV, waterU };
