precision highp float;
uniform sampler2D uInput;
varying vec3 vPosition;
uniform vec2 uStep;

vec4 bleed() {
  vec4 self = texture2D(uInput, vec2(vPosition));
  vec4 bleedColor = self;
  for (float dx = -1.0; dx <= 1.1; ++dx) {
    for (float dy = -1.0; dy <= 1.1; ++dy) {
      vec4 val = texture2D(uInput,
        vec2(vPosition) + vec2(
          uStep.x * dx,
          uStep.y * dy
        )
      );
      float distance = val.a + length(vec2(dx, dy)) / 500.0;
      float delta = distance - self.a;
      if (delta < 0.0) {
        bleedColor = vec4(val.rgb, distance);
      }
    }
  }
  return bleedColor;
}

void main() {
  gl_FragColor = bleed();
}