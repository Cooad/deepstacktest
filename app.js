var videoEl;
var imageEl;
var videoCanvasEl;
var imageCanvasEl;

var run;

window.onload = function () {
  videoEl = document.getElementById("video");
  imageEl = document.getElementById("image");
  videoCanvasEl = document.getElementById("videoCanvas");
  imageCanvasEl = document.getElementById("imageCanvas");

  document.getElementById("start").addEventListener("click", start);
  document.getElementById("stop").addEventListener("click", stop);
  document
    .getElementById("addPerson")
    .addEventListener("click", registerPerson);
  document.getElementById("list").addEventListener("click", listFaces);
  document.getElementById("delete").addEventListener("click", deleteAllFaces);

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.applyConstraints({ width: 640, height: 480, frameRate: 10 });
      videoEl.srcObject = stream;
      //   videoEl.addEventListener("canplay", start);
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
    context.drawImage(imageEl, 0, 0, imageData.width, imageData.height);
    for (let p of preditions) {
      context.strokeText(p.userid + " " + p.confidence, p.x_min, p.y_min - 7);
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

async function registerPerson() {
  const file = document.getElementById("file").files[0];
  const name = document.getElementById("name").value;
  var form = new FormData();
  form.append("image", file);
  form.append("userid", name);
  const response = await fetch("v1/vision/face/register", {
    method: "POST",
    body: form,
  });
  const jsonResponse = await response.json();
  console.log(response);
}

async function listFaces() {
  const response = await fetch("v1/vision/face/list", { method: "POST" });
  const jsonResponse = await response.json();
  document.getElementById("listText").value = JSON.stringify(jsonResponse);
}

async function deleteAllFaces() {
  const response = await fetch("v1/vision/face/list", { method: "POST" });
  const jsonResponse = await response.json();
  const faces = jsonResponse.faces;
  for (let face of faces) {
    var form = new FormData();
    form.append("userid", face);
    await fetch("v1/vision/face/delete", { method: "POST", body: form });
  }
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
  const response = await fetch("v1/vision/face/recognize", {
    method: "POST",
    body: form,
  });
  const jsonResponse = await response.json();
  if (!jsonResponse.success) throw new Error(jsonResponse.error);
  return jsonResponse.predictions;
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
