import createContext from '2d-context';

const twoDContext = createContext();
const twoDCanvas = twoDContext.canvas;

/**
 * Called each frame to update the Module
 * @param  {Object}                   Module        A 2D Module
 * @param  {HTMLCanvas}               canvas        The Canvas to draw to
 * @param  {CanvasRenderingContext2D} context       The Context of the Canvas
 * @param  {HTMLVideoElement}         video         The video stream requested by modV
 * @param  {Array<MeydaFeatures>}     meydaFeatures Requested Meyda features
 * @param  {Meyda}                    meyda         The Meyda instance
 *                                                  (for Windowing functions etc.)
 *
 * @param  {DOMHighResTimeStamp}      delta         Timestamp returned by requestAnimationFrame
 * @param  {Number}                   bpm           The detected or tapped BPM
 * @param  {Boolean}                  kick          Indicates if BeatDetektor detected a kick in
 *                                                  the audio stream
 */
function render2d({
  Module,
  canvas,
  context,
  video,
  features,
  meyda,
  delta,
  bpm,
  kick,
}) {
  twoDCanvas.width = canvas.width;
  twoDCanvas.height = canvas.height;
  twoDContext.drawImage(canvas, 0, 0, canvas.width, canvas.height);

  twoDContext.save();
  Module.draw({
    canvas: twoDCanvas,
    context: twoDContext,
    video,
    features,
    meyda,
    delta,
    bpm,
    kick,
  });
  twoDContext.restore();

  let alpha = 1;
  let compositeOperation = 'normal';

  if (Module.meta) {
    alpha = Module.meta.alpha;
    compositeOperation = Module.meta.compositeOperation;
  }

  context.save();
  context.globalAlpha = alpha;
  context.globalCompositeOperation = compositeOperation;
  context.drawImage(twoDCanvas, 0, 0, canvas.width, canvas.height);
  context.restore();
}

const definition = {
  name: '2d',
  render: render2d,
};

export default definition;
