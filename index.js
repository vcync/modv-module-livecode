import Vue from 'vue/dist/vue.common.js';
import { codemirror } from 'vue-codemirror-lite/dist/vuecodemirror.min.js';

import 'codemirror/mode/javascript/javascript';

import createLoop from 'canvas-loop';
import createContext from '2d-context';
import SimplexNoise from 'simplex-noise';

import twoDRenderer from './2d-renderer.js';
import getUserMedia from 'get-user-media-promise';
import Meyda from 'meyda';

let analyzer;

const simplex = new SimplexNoise(Math.random());

const div = document.createElement('div');
div.id = 'app';

document.body.appendChild(div);

Vue.component('codemirror', codemirror);

new Vue({
  el: '#app',

  watch: {
    code(value) {
      this.setModule(value);
    },
  },

  created() {
    const { renderers } = this;

    renderers[twoDRenderer.name] = twoDRenderer;

    const context = createContext();
    const canvas = context.canvas;
    canvas.style.backgroundColor = '#000';

    document.body.appendChild(canvas);

    let time = 0;

    this.app = createLoop(canvas, {
      scale: window.devicePixelRatio,
    });

    this.app.on('tick', (delta) => {
      const { module, renderers } = this;
      const { width, height } = context.canvas;

      context.clearRect(0, 0, width, height);
      const features = analyzer.get(['rms', 'energy']) || {};

      time += delta / 1000;

      const renderContext = {
        canvas,
        context,
        features,
        delta: time,
      };

      if (renderers[module.meta.type]) {
        renderContext.Module = module;
        renderers[module.meta.type].render(renderContext);
      }
    });
  },

  async mounted() {
    const { app } = this;
    let stream;

    try {
      stream = await getUserMedia({ video: false, audio: true });
    } catch (e) {
      console.error(e);
      return;
    }

    const audioContext = new window.AudioContext({
      latencyHint: 'playback',
    });

    const gainNode = audioContext.createGain();

    // Mute the node
    gainNode.gain.value = 0;

    // Create the audio input stream (audio)
    const audioStream = audioContext.createMediaStreamSource(stream);

    // Connect the audio stream to the gain node (audio->(analyser)->gain)
    audioStream.connect(gainNode);

    // Connect the gain node to the output (audio->(analyser)->gain->destination)
    gainNode.connect(audioContext.destination);

    analyzer = Meyda.createMeydaAnalyzer({
      audioContext: audioContext,
      source: audioStream,
      bufferSize: 512,
    });

    analyzer.start();
    app.start();

    this.setModule(this.code);
  },

  methods: {
    registerModule(module) {
      const newModule = Object.assign(this.module, module);
      this.module = Object.assign(this.module.props, newModule);
      this.props = this.module.props;
    },

    setModule(value) {
      var module = function(str){
        return eval(`(${str})`);
      }.call(this, value);

      this.registerModule(module);
    },
  },

  template: `
    <div>
      <codemirror v-model="code" :options="cmOptions"></codemirror>
      <div v-for="(prop, name) in props" style="z-index:1;position:relative;color:#fff">
        <label v-if="typeof prop === 'number'">{{ name }} <input type="range" v-model.number="module[name]"> {{ module[name] }}</label>
        <label v-if="typeof prop === 'string'">{{ name }} <input type="text"  v-model.text="module[name]"> {{ module[name] }}</label>
        <label v-if="typeof prop === 'boolean'" >{{ name }} <input type="checkbox" v-model.boolean="module[name]"> {{ module[name] }}</label>
      </div>
    </div>
  `,

  data() {
    return {
      renderers: {},
      module: {},
      props: {},
      app: null,

      cmOptions: {
        mode: 'javascript',
        lineNumbers: true,
        extraKeys: { 'Ctrl-Space': 'autocomplete' },
      },

            code: `{
  meta: {
    type: '2d',
  },

  drawPoint(
    context,
    currentPoint,
    totalPoints,
    x,
    y,
    radius,
    size,
    draw,
  ) {
    const i = currentPoint;
    const theta = ((Math.PI * 2) / totalPoints);

    const pointX = ((radius * Math.cos(theta * i)) + x);
    const pointY = ((radius * Math.sin(theta * i)) + y);

    if (draw) {
      context.beginPath();
      context.arc(pointX, pointY, size, 0, 2 * Math.PI);
      context.stroke();
    }

    return [pointX, pointY];
  },

  props: {
    numPoints: 10,
    lineWidth: 0.5,
    spread: 1,
    mod: 0,
    colors: true,
    animatePoints: false,
  },

  draw({ canvas, context, delta, features: { rms, energy } }) {
    const { width, height } = canvas;
    const { numPoints, lineWidth, spread, mod, colors, animatePoints } = this;

    const dpr = window.devicePixelRatio;

    // context.fillStyle = 'rgba(0,0,0,0.02)';
    // context.fillRect(0, 0, width, height);

    context.strokeStyle = '#fff';
    context.lineWidth = lineWidth;
    const points = [];
    for (let i = 0; i < numPoints; i += 1) {
      points.push(
        this.drawPoint(
          context,
          animatePoints ? i * Math.sin(delta / 4000) : i,
          numPoints,
          (width / 2) + ((simplex.noise2D(i, delta / 10) * 80)),
          (height / 2) + ((simplex.noise2D(i, delta / 20) * 80)),
          (spread * 400) + (Math.sin(delta / (6000)) * 100) +
            (i % 0 === 0 ? (Math.cos(delta / (3000)) * 100) : 0) + energy*3,
          dpr * energy*3,
          true,
        ),
      );
    }

    for (let i = 0; i < points.length; i += 1) {
      const x = points[i][0];
      const y = points[i][1];

      context.beginPath();
      // context.moveTo(x, y);
      for (let j = 0; j < points.length; j += 1) {
        if (colors) {
          context.globalCompositeOperation = 'overlay';
          context.fillStyle = context.strokeStyle = \`hsla(\${(((i * j) / points.length) * 360+delta)}, 50%, 50%, 1)\`;
        }
        const x2 = points[j][0];
        const y2 = points[j][1];

        context.lineTo(x, y);
        context.lineTo(x2, y2);

        if (mod === 0) {

        } else if (j % mod === 0) {
          context.stroke();
        }
      }
      context.closePath();
      // context.fill();
      // context.strokeStyle = '#000';
      context.stroke();
    }
  },
}`,
    };
  },
});

