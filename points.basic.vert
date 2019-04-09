uniform mat4 uProjection;
attribute vec2 pos;
attribute float force;
attribute vec4 color;

varying vec4 vColor;

void transform() {
  gl_Position = uProjection * vec4(pos, 0.0, 1.0);
  gl_PointSize = 5.0 * force * 10.0;
  vColor = color;
}