const recordButton = document.querySelector("#record-action");
const recorderStatus = document.querySelector("#recorder-status");
document.documentElement.classList.add("js-ready");
const heroVideo = document.querySelector("#hero-video");
const showcaseTitle = document.querySelector("#showcase-title");
const showcaseCount = document.querySelector("#showcase-count");
const heroVideoLink = document.querySelector("#hero-video-link");
const showcaseVideos = [...document.querySelectorAll(".showcase-video")];
showcaseVideos.forEach((button, index) => {
  button.setAttribute("aria-controls", "hero-video");
  button.addEventListener("click", () => {
    showcaseVideos.forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    if (showcaseCount) showcaseCount.textContent = `0${index + 1} / 0${showcaseVideos.length}`;
    if (showcaseTitle && button.dataset.title) showcaseTitle.textContent = button.dataset.title;
    if (heroVideoLink && button.dataset.videoId) heroVideoLink.href = `https://www.youtube.com/watch?v=${button.dataset.videoId}`;
    if (heroVideo && button.dataset.videoId) {
      const start = Number(button.dataset.start ?? 0);
      const end = Number(button.dataset.end ?? 0);
      const range = start && end ? `&start=${start}&end=${end}` : "";
      heroVideo.src = `https://www.youtube-nocookie.com/embed/${button.dataset.videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${button.dataset.videoId}&modestbranding=1&rel=0&playsinline=1&cc_load_policy=0${range}`;
    }
  });
  button.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + showcaseVideos.length) % showcaseVideos.length;
    showcaseVideos[nextIndex].focus();
    showcaseVideos[nextIndex].click();
  });
});
const interfaceImage = document.querySelector("#interface-image");
const interfaceCaption = document.querySelector("#interface-caption");
const interfaceTabs = [...document.querySelectorAll(".interface-tab")];
interfaceTabs.forEach((button) => {
  button.setAttribute("role", "tab");
  button.setAttribute("aria-selected", String(button.classList.contains("active")));
  button.addEventListener("click", () => {
    interfaceTabs.forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-selected", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    if (interfaceImage && button.dataset.image) {
      interfaceImage.classList.add("is-changing");
      window.setTimeout(() => {
        interfaceImage.src = `assets/ui/${button.dataset.image}`;
        interfaceImage.alt = `Ultimate Macro ${button.dataset.label ?? "interface"} interface`;
        interfaceImage.classList.remove("is-changing");
      }, 160);
    }
    if (interfaceCaption && button.dataset.label) interfaceCaption.textContent = button.dataset.label;
  });
});
const revealObserver = "IntersectionObserver" in window ? new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { rootMargin: "0px 0px -8%" }) : null;
document.querySelectorAll("main>section:not(.hero)").forEach((section) => {
  if (revealObserver) revealObserver.observe(section);
  else section.classList.add("is-visible");
});
recordButton?.addEventListener("click", () => {
  recordButton.textContent = "✓ Action recorded";
  recorderStatus.textContent = "New action added to this run";
  recordButton.disabled = true;
});
