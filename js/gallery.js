
"use strict";

const imageFiles = [
  "1.jpg",
  "2.jpg",
  "3.jpg",
  "4.jpg",
  "5.jpg",
  "6.jpg",
  "7.jpg",
  "8.jpg",
  "9.jpg",
  "10.JPG",
  "11.jpg",
  "12.JPG",
  "13.jpg"
];

const gallery = document.getElementById("galleryGrid");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const totalCount = document.getElementById("totalCount");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const resetFilterBtn = document.getElementById("resetFilterBtn");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxCounter = document.getElementById("lightboxCounter");
const lightboxFileName = document.getElementById("lightboxFileName");

const downloadBtn = document.getElementById("downloadBtn");
const slideshowBtn = document.getElementById("slideshowBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const closeBtn = document.getElementById("closeBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const FAVORITES_KEY = "koleksi-foto-favorites";

const photos = imageFiles.map((file, index) => ({
  id: index,
  file,
  title: `Foto ${index + 1}`,
  group:
    index < 5 ? "group-1" :
    index < 10 ? "group-2" : "group-3",
  src: `image/${file}`,
  card: null,
  image: null
}));

let favorites = loadFavorites();
let currentIndex = 0;
let slideshowTimer = null;
let slideshowPlaying = false;
let previousFocus = null;

// Favorit disimpan di browser, bukan di server.
function loadFavorites() {
  try {
    const data = JSON.parse(
      localStorage.getItem(FAVORITES_KEY) || "[]"
    );

    if (!Array.isArray(data)) return new Set();

    return new Set(
      data.filter(
        id => Number.isInteger(id) &&
          id >= 0 && id < imageFiles.length
      )
    );
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify([...favorites])
    );
  } catch {
    // Galeri tetap dapat digunakan jika penyimpanan tidak tersedia.
  }
}

// Membuat elemen tanpa memasukkan data foto melalui innerHTML.
function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

function buildGallery() {
  const fragment = document.createDocumentFragment();

  photos.forEach(photo => {
    const card = makeElement("article", "photo-card");
    card.dataset.name = photo.title.toLowerCase();
    card.dataset.group = photo.group;

    const media = makeElement("div", "photo-media");

    const image = makeElement("img", "photo-image is-loading");
    image.src = photo.src;
    image.alt = photo.title;
    image.loading = "lazy";
    image.decoding = "async";
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `Lihat ${photo.title}`);

    image.addEventListener("load", () => {
      image.classList.remove("is-loading", "is-broken");
      updateMasonry(card);
    });

    image.addEventListener("error", () => {
      image.classList.remove("is-loading");
      image.classList.add("is-broken");
      image.alt = `${photo.title} tidak dapat dimuat. Periksa file ${photo.file}.`;
      image.style.height = "180px";
      updateMasonry(card);
    });

    image.addEventListener("click", () => openLightbox(photo.id));

    image.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(photo.id);
      }
    });

    const overlay = makeElement("div", "photo-overlay");
    overlay.setAttribute("aria-label", `Kontrol ${photo.title}`);

    const indexLabel = makeElement(
      "span",
      "photo-index",
      String(photo.id + 1).padStart(2, "0")
    );

    const favoriteBtn = makeElement("button", "favorite-btn");
    favoriteBtn.type = "button";
    favoriteBtn.addEventListener("click", () => {
      toggleFavorite(photo.id);
    });

    overlay.append(indexLabel, favoriteBtn);
    media.append(image, overlay);

    const caption = makeElement("div", "photo-caption");
    const title = makeElement("h3", "", photo.title);
    const number = makeElement(
      "span",
      "",
      `ARCHIVE / ${String(photo.id + 1).padStart(2, "0")}`
    );

    caption.append(title, number);
    card.append(media, caption);
    fragment.append(card);

    photo.card = card;
    photo.image = image;
    photo.favoriteBtn = favoriteBtn;

    updateFavoriteButton(photo);
  });

  gallery.replaceChildren(fragment);
  totalCount.textContent = String(photos.length).padStart(2, "0");
  applyFilters();
}

// Menghitung tinggi setiap item agar susunannya menyerupai masonry.
function updateMasonry(card) {
  if (!card || card.hidden) return;

  const rowHeight = 8;
  const rowGap = parseFloat(
    getComputedStyle(gallery).rowGap
  ) || 0;

  const height = card.getBoundingClientRect().height;

  if (height <= 0) return;

  const span = Math.max(
    1,
    Math.ceil((height + rowGap) / (rowHeight + rowGap))
  );

  card.style.setProperty("--row-span", span);
}

function updateAllMasonry() {
  photos.forEach(photo => {
    if (!photo.card.hidden) updateMasonry(photo.card);
  });
}

function updateFavoriteButton(photo) {
  const active = favorites.has(photo.id);
  const button = photo.favoriteBtn;

  if (!button) return;

  button.textContent = active ? "♥" : "♡";
  button.classList.toggle("is-favorite", active);
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute(
    "aria-label",
    `${active ? "Hapus" : "Tambahkan"} ${photo.title} ${
      active ? "dari" : "ke"
    } favorit`
  );
}

function toggleFavorite(id) {
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }

  saveFavorites();
  updateFavoriteButton(photos[id]);
  applyFilters();
}

function applyFilters() {
  const query = searchInput.value.trim().toLocaleLowerCase("id");
  const filter = filterSelect.value;

  let visible = 0;

  photos.forEach(photo => {
    const matchesName = photo.title.toLocaleLowerCase("id")
      .includes(query);

    const matchesGroup =
      filter === "all" ||
      filter === "favorites" ||
      photo.group === filter;

    const matchesFavorite =
      filter !== "favorites" ||
      favorites.has(photo.id);

    const show = matchesName && matchesGroup && matchesFavorite;

    photo.card.hidden = !show;

    if (show) {
      visible++;
      updateMasonry(photo.card);
    }
  });

  resultCount.textContent =
    `Menampilkan ${visible} dari ${photos.length} foto`;

  emptyState.hidden = visible !== 0;
  gallery.hidden = visible === 0;
}

function openLightbox(id) {
  stopSlideshow();

  currentIndex = id;
  previousFocus = document.activeElement;

  lightbox.inert = false;
  lightbox.setAttribute("aria-hidden", "false");
  lightbox.classList.add("is-open");
  document.body.classList.add("lightbox-open");

  showPhoto(currentIndex);
  closeBtn.focus();
}

function showPhoto(id) {
  currentIndex = (id + photos.length) % photos.length;

  const photo = photos[currentIndex];

  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.title;
  lightboxCaption.textContent = photo.title;
  lightboxFileName.textContent = photo.file;

  lightboxCounter.textContent =
    `${String(currentIndex + 1).padStart(2, "0")} / ` +
    `${String(photos.length).padStart(2, "0")}`;

  downloadBtn.href = photo.src;
  downloadBtn.download = photo.file;

  prevBtn.disabled = photos.length < 2;
  nextBtn.disabled = photos.length < 2;
}

function closeLightbox() {
  stopSlideshow();

  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.inert = true;

  document.body.classList.remove("lightbox-open");
  lightboxImage.removeAttribute("src");

  if (previousFocus && previousFocus.isConnected) {
    previousFocus.focus();
  }
}

function updateSlideshowControls() {
  slideshowBtn.textContent = slideshowPlaying
    ? "Ⅱ Jeda slideshow"
    : "↗ Mulai slideshow";

  playPauseBtn.innerHTML = slideshowPlaying
    ? "Ⅱ <span>Jeda</span>"
    : "▶ <span>Putar</span>";
}

function stopSlideshow() {
  if (slideshowTimer !== null) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }

  slideshowPlaying = false;
  updateSlideshowControls();
}

function startSlideshow() {
  if (photos.length < 2) return;

  if (!lightbox.classList.contains("is-open")) {
    const firstVisible = photos.find(
      photo => !photo.card.hidden
    );

    openLightbox(firstVisible ? firstVisible.id : 0);
  }

  stopSlideshow();
  slideshowPlaying = true;
  updateSlideshowControls();

  slideshowTimer = setInterval(() => {
    showPhoto(currentIndex + 1);
  }, 3000);
}

function toggleSlideshow() {
  if (slideshowPlaying) {
    stopSlideshow();
  } else {
    startSlideshow();
  }
}

// Pencarian dan filter.
searchInput.addEventListener("input", applyFilters);
filterSelect.addEventListener("change", applyFilters);

resetFilterBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterSelect.value = "all";
  applyFilters();
});

// Navigasi lightbox.
prevBtn.addEventListener("click", () => {
  showPhoto(currentIndex - 1);
});

nextBtn.addEventListener("click", () => {
  showPhoto(currentIndex + 1);
});

closeBtn.addEventListener("click", closeLightbox);
slideshowBtn.addEventListener("click", toggleSlideshow);
playPauseBtn.addEventListener("click", toggleSlideshow);

document.getElementById("lightboxBrand").addEventListener(
  "click",
  event => {
    event.preventDefault();
    closeLightbox();
  }
);

// Klik area kosong untuk menutup lightbox.
lightbox.addEventListener("click", event => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

// Keyboard.
document.addEventListener("keydown", event => {
  if (!lightbox.classList.contains("is-open")) return;

  if (event.key === "Escape") {
    closeLightbox();
  } else if (event.key === "ArrowLeft") {
    showPhoto(currentIndex - 1);
  } else if (event.key === "ArrowRight") {
    showPhoto(currentIndex + 1);
  } else if (event.code === "Space" &&
             !["INPUT", "BUTTON", "A"].includes(
               event.target.tagName
             )) {
    event.preventDefault();
    toggleSlideshow();
  }
});

// Jangan biarkan slideshow terus berjalan di tab yang tidak aktif.
document.addEventListener("visibilitychange", () => {
  if (document.hidden && slideshowPlaying) {
    stopSlideshow();
  }
});

let resizeFrame = null;

window.addEventListener("resize", () => {
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);

  resizeFrame = requestAnimationFrame(() => {
    updateAllMasonry();
    resizeFrame = null;
  });
});

if ("ResizeObserver" in window) {
  const observer = new ResizeObserver(entries => {
    entries.forEach(entry => {
      updateMasonry(entry.target);
    });
  });

  // Perhatikan perubahan ukuran card dan gambar.
  const observeCards = () => {
    photos.forEach(photo => {
      if (photo.card) observer.observe(photo.card);
    });
  };

  // Dipanggil setelah elemen galeri dibuat.
  window.addEventListener("load", observeCards, { once: true });
}

buildGallery();
updateSlideshowControls();
