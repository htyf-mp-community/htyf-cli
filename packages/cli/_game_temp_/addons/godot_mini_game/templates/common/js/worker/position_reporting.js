// Audio position-reporting worker used by the mini-game audio pipeline.
//
// On real WeChat runtimes the AudioWorkletNode produced by Godot's
// `connectPositionWorklet` cannot be connected to native AudioNodes, so the
// exporter neutralises that call inside `godot.js`. The mini-game runtime
// still requires the directory referenced by `game.json → workers.path` to
// exist, so we ship a minimal fallback worker that mirrors the behaviour
// expected by the engine when it IS able to wire the worklet up.

let position = 0;
let lastPostTime = 0;

worker.onMessage((event) => {
  if (event.type === "ended") {
    position = 0;
    lastPostTime = 0;
    return;
  }

  if (event.type === "init") {
    position = 0;
    lastPostTime = event.currentTime || 0;
    return;
  }

  if (event.type === "process") {
    position += event.inputLength || 0;
    if ((event.currentTime || 0) - lastPostTime > 0.1) {
      lastPostTime = event.currentTime;
      worker.postMessage({ type: "position", data: position });
    }
  }
});
