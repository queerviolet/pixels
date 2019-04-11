precision highp float;
uniform sampler2D uInput;
varying vec3 vPosition;
uniform float uStep;

void main() {
  gl_FragColor = texture2D(uInput, vec2(vPosition));
}