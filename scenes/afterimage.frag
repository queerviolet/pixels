precision highp float;
uniform sampler2D uInput;
varying vec3 vPosition;
uniform float uStep;

vec4 flow() {
  vec4 self = texture2D(uInput, vec2(vPosition));
  float mass = 0.0;
  for (float dx = -1.0; dx <= 1.1; ++dx) {
    for (float dy = -1.0; dy <= 1.1; ++dy) {
      if (dx == 0.0 && dy == 0.0) continue;
      vec4 val = texture2D(uInput,
        vec2(vPosition) + vec2(
          uStep * dx,
          uStep * dy
        )
      );
      mass += length(val);
    }
  }
  vec4 color = vec4(0., 0., 0., 0.);
  for (float dx = -1.0; dx <= 1.1; ++dx) {
    for (float dy = -1.0; dy <= 1.1; ++dy) {
      if (dx == 0.0 && dy == 0.0) continue;
      vec4 val = texture2D(uInput,
        vec2(vPosition) + vec2(
          uStep * dx,
          uStep * dy
        )
      );      
      color += val * (length(val) / mass);
    }
  }

  return color;
}

void main() {
  gl_FragColor = flow();
}