var videoEl;
var imageEl;
var videoCanvasEl;
var imageCanvasEl;
var startB;
var stopB;
var run;

window.onload = function () {
  videoEl = document.getElementById("video");
  imageEl = document.getElementById("image");
  videoCanvasEl = document.getElementById("videoCanvas");
  imageCanvasEl = document.getElementById("imageCanvas");

  startB = document.getElementById("start");
  stopB = document.getElementById("stop");
  startB.addEventListener("click", start);
  stopB.addEventListener("click", stop);

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.applyConstraints({ width: 640, height: 480, frameRate: 10 });
      videoEl.srcObject = stream;
      videoEl.addEventListener("canplay", start);
    });
  }
};

async function start() {
  run = true;
  while (run) {
    const imageData = await getImage();
    const preditions = await getPredictions(imageData.blob);
    imageCanvasEl.width = imageData.width;
    imageCanvasEl.height = imageData.height;
    const context = imageCanvasEl.getContext("2d");
    await setImage(imageData);
    console.log(imageData);
    context.drawImage(imageEl, 0, 0, imageData.width, imageData.height);
    for (let p of preditions) {
      context.strokeText(p.label + " " + p.confidence, p.x_min, p.y_min - 7);
      context.strokeRect(
        p.x_min,
        p.y_min,
        p.x_max - p.x_min,
        p.y_max - p.y_min
      );
    }
    const imageWithLabels = await getBlob(imageCanvasEl).then((blob) => ({
      blob,
      width: imageData.width,
      height: imageData.height,
    }));
    await setImage(imageWithLabels);
  }
}

function stop() {
  run = false;
}

function setImage(imageData) {
  imageEl.width = imageData.width;
  imageEl.height = imageData.height;
  const dataUrl = window.URL.createObjectURL(imageData.blob);
  return new Promise((resolve, reject) => {
    const listener = () => {
      resolve();
      imageEl.removeEventListener("load", listener);
      window.URL.revokeObjectURL(dataUrl);
    };
    imageEl.addEventListener("load", listener);
    imageEl.src = dataUrl;
  });
}

function getImage() {
  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;
  videoCanvasEl.width = width;
  videoCanvasEl.height = height;
  var context = videoCanvasEl.getContext("2d");
  context.drawImage(video, 0, 0, width, height);

  return getBlob(videoCanvasEl).then((blob) => ({ blob, width, height }));
}

function getBlob(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.5)
  );
}

async function getPredictions(blob) {
  var form = new FormData();
  form.append("image", blob);
  const response = await fetch("v1/vision/face", {
    method: "POST",
    body: form,
    cache: "no-cache",
  });
  const jsonResponse = await response.json();
  if (!jsonResponse.success) throw new Error(jsonResponse.error);
  return jsonResponse.predictions;
}
// for (let p of predictions) {

// }
