const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif

#define GLSLIFY 1

varying vec4 color;
varying vec2 v_texCoord; 
uniform sampler2D tmu;

void main() {
    gl_FragColor = texture2D(tmu,v_texCoord);
}`;