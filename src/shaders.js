import { ShaderMount, paperTextureFragmentShader, pulsingBorderFragmentShader, getShaderColorFromString as rgba, getShaderNoiseTexture, emptyPixel } from '@paper-design/shaders';

export async function mountShaders(surface, rim) {
  const mounts = [];
  const sizing = { u_fit: 1, u_scale: 1, u_rotation: 0, u_originX: .5, u_originY: .5, u_offsetX: 0, u_offsetY: 0, u_worldWidth: 0, u_worldHeight: 0 };
  let paper, border, previous = '', disposed = false;
  const noise = getShaderNoiseTexture();
  const image = new Image(); image.src = emptyPixel;
  try { await Promise.all([noise.decode(), image.decode()]); } catch { return { update() {}, dispose() {} }; }
  function mount(element, shader, uniforms, pixels) {
    try {
      const instance = new ShaderMount(element, shader, uniforms, { alpha: true }, 0, 0, 1, pixels);
      const lost = event => { event.preventDefault(); if (instance === paper) paper = null; if (instance === border) border = null; instance.dispose(); element.replaceChildren(); };
      instance.canvasElement.addEventListener('webglcontextlost', lost);
      mounts.push({ instance, lost });
      return instance;
    } catch (error) { element.replaceChildren(); console.info('Using the CSS surface fallback.'); return null; }
  }
  paper = mount(surface, paperTextureFragmentShader, {
    ...sizing, u_image: image, u_isImage: false, u_colorBack: rgba('#f1eddf'), u_colorPaper: rgba('#fffaf0'), u_colorShadow: rgba('#d4cebc'),
    u_blending: 1, u_distortion: 0, u_clip: false, u_angle: 0, u_seed: 455, u_roughness: .3, u_roughnessSize: .5, u_roughnessRows: .6,
    u_fiber: .25, u_fiberSize: 1, u_folds: 0, u_foldSizeX: 0, u_foldSizeY: .44, u_foldOffsetX: 0, u_foldOffsetY: 0,
    u_wrinkles: 0, u_wrinkleSize: 0, u_crumples: 0, u_crumpleCount: 6, u_drops: 0, u_noiseTexture: noise,
  }, 350000);
  border = mount(rim, pulsingBorderFragmentShader, {
    ...sizing, u_colorBack: rgba('#00000000'), u_colors: ['#df634c', '#367b70', '#c99b34'].map(rgba), u_colorsCount: 3,
    u_roundness: .12, u_thickness: .025, u_marginLeft: .01, u_marginRight: .01, u_marginTop: .01, u_marginBottom: .01,
    u_aspectRatio: 0, u_softness: .65, u_intensity: .05, u_bloom: .12, u_spots: 2, u_spotSize: .6, u_pulse: 0, u_smoke: .04, u_smokeSize: .5, u_noiseTexture: noise,
  }, 500000);
  return {
    update(charge, energy, paused, reduced) {
      if (disposed) return;
      const key = `${charge.toFixed(2)}:${energy.toFixed(2)}:${paused}:${reduced}`;
      if (key === previous) return; previous = key;
      paper?.setUniforms({ u_angle: charge * 14, u_colorShadow: rgba(charge > .5 ? '#c9c0aa' : '#d4cebc') });
      border?.setUniforms({ u_intensity: .05 + energy * .3, u_bloom: .12 + energy * .25, u_pulse: reduced ? 0 : energy * .25 });
      border?.setSpeed(!paused && !reduced && energy > .02 ? .2 : 0);
    },
    dispose() {
      disposed = true;
      mounts.forEach(({ instance, lost }) => { instance.canvasElement.removeEventListener('webglcontextlost', lost); instance.dispose(); });
    },
  };
}
