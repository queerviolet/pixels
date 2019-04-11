attribute vec3 aPosition;
varying vec3 vPosition;

void main() {
  vPosition = (aPosition + vec3(1.0, 1.0, 0.0)) / 2.0;
  gl_Position = vec4(aPosition, 1.0);
}
