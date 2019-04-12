precision highp float;
uniform sampler2D uInput;
varying vec3 vPosition;
uniform vec2 uStep;

vec4 grow() {
  int sum = 0;
  vec4 color = vec4(0., 0., 0., 0.);
  
  for (float dx = -1.0; dx <= 1.1; ++dx) {
    for (float dy = -1.0; dy <= 1.1; ++dy) {
      if (dx == 0.0 && dy == 0.0) continue;      
      vec4 val = texture2D(uInput,
        vec2(vPosition) + vec2(
          uStep.x * dx,
          uStep.y * dy
        )
      );
      if (length(val) > 0.5) {
        sum++;
        color += val;
      }
    }
  }

  if (sum == 3) {
    return normalize(color) * 1.01;
  }

  if (sum == 2) {
    vec4 self = texture2D(uInput, vec2(vPosition));
    return self; //normalize(self);
  }

  return vec4(normalize(color).rgb * 0.2, 0.1);
}

void main() {
  gl_FragColor = grow();
}