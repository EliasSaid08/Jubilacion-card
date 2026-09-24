// ============================================================
// Invitación de jubilación — configuración rápida
// ============================================================
const CONFIG = {
  eventDate: '2026-11-13T10:00:00',    // fecha y hora del acto (para la cuenta regresiva)
  fechaTexto: 'Viernes 13 de Noviembre', // fecha que aparece en el mensaje de WhatsApp
  precioTarjeta: 45000,                // valor de cada tarjeta (entrada) en pesos
  fechaLimitePago: '10 de octubre',    // fecha límite para abonar la tarjeta (aviso resaltado)
  maxEntradas: 10,                     // máximo que se puede confirmar de una vez
  // WhatsApp de cada contacto (código de país + área + número, sin + ni espacios)
  telefonos: {
    marcela: '5493863407739',
    josefa: '5493865606657',   // <- pasar el número de Josefa
    naty: '5493816202599',     // <- pasar el número de Naty
  },
};

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Cuenta regresiva ----------
  const targetDate = new Date(CONFIG.eventDate);
  const cd = {
    d: document.getElementById('cd-dias'),
    h: document.getElementById('cd-horas'),
    m: document.getElementById('cd-min'),
    s: document.getElementById('cd-seg'),
  };
  const pad2 = (n) => String(n).padStart(2, '0');

  const updateCountdown = () => {
    const diff = targetDate - new Date();
    let d = 0, h = 0, m = 0, s = 0;
    if (diff > 0) {
      d = Math.floor(diff / 86400000);
      h = Math.floor((diff / 3600000) % 24);
      m = Math.floor((diff / 60000) % 60);
      s = Math.floor((diff / 1000) % 60);
    }
    cd.d.textContent = d;
    cd.h.textContent = pad2(h);
    cd.m.textContent = pad2(m);
    cd.s.textContent = pad2(s);
  };
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ---------- Visor de fotos a pantalla completa ----------
  const Lightbox = (() => {
    const root = document.getElementById('lightbox');
    const img = root.querySelector('.lb-img');
    const counter = root.querySelector('.lb-counter');
    const btnPrev = root.querySelector('.lb-prev');
    const btnNext = root.querySelector('.lb-next');
    const btnClose = root.querySelector('.lb-close');

    let items = [];
    let index = 0;
    let onClose = null;
    let lastFocus = null;

    const preload = (i) => {
      if (items.length < 2) return;
      const p = new Image();
      p.src = items[(i + items.length) % items.length].src;
    };

    const render = () => {
      const item = items[index];
      img.src = item.src;
      img.alt = item.alt || '';
      const multi = items.length > 1;
      btnPrev.hidden = !multi;
      btnNext.hidden = !multi;
      counter.hidden = !multi;
      counter.textContent = `${index + 1} / ${items.length}`;
      preload(index + 1);
      preload(index - 1);
    };

    const go = (step) => {
      if (items.length < 2) return;
      index = (index + step + items.length) % items.length;
      render();
    };

    const isOpen = () => root.classList.contains('open');

    const open = (list, start = 0, callback = null) => {
      if (!list.length) return;
      items = list;
      index = start;
      onClose = callback;
      lastFocus = document.activeElement;
      render();
      root.classList.add('open');
      root.setAttribute('aria-hidden', 'false');
      btnClose.focus({ preventScroll: true });
    };

    const close = () => {
      if (!isOpen()) return;
      root.classList.remove('open');
      root.setAttribute('aria-hidden', 'true');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
      const cb = onClose;
      onClose = null;
      if (cb) cb(index);
    };

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', () => go(-1));
    btnNext.addEventListener('click', () => go(1));

    // Tocar el fondo (fuera de la foto) cierra el visor
    root.addEventListener('click', (e) => {
      if (e.target === root || e.target.classList.contains('lb-stage')) close();
    });

    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });

    // Deslizar con el dedo para cambiar de foto
    let touchX = null;
    root.addEventListener('touchstart', (e) => {
      touchX = e.touches.length === 1 ? e.touches[0].clientX : null;
    }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    }, { passive: true });

    return { open, close };
  })();

  // ---------- Fotos de las jubiladas: tocar para ampliar ----------
  document.querySelectorAll('.mujer-photo').forEach((fig) => {
    const photo = fig.querySelector('img');
    fig.addEventListener('click', () => {
      if (fig.classList.contains('no-photo') || !photo.naturalWidth) return;
      Lightbox.open([{ src: photo.currentSrc || photo.src, alt: photo.alt }], 0);
    });
  });

  // ---------- Carruseles ----------
  const initCarousel = (root, autoplayDelay) => {
    const track = root.querySelector('.carousel-track');
    const slides = Array.from(root.querySelectorAll('.carousel-slide'));
    const dotsWrap = root.querySelector('.carousel-dots');
    const prevBtn = root.querySelector('.carousel-prev'); // ya no existen las flechas (null)
    const nextBtn = root.querySelector('.carousel-next');
    const zoomBtn = root.querySelector('.carousel-zoom');
    let index = 0;
    let timer = null;
    let suppressClick = false;

    // Fondo difuminado con la misma foto (rellena los costados si la foto no es horizontal)
    slides.forEach((slide) => {
      const photo = slide.querySelector('img');
      slide.style.setProperty('--photo', `url("${photo.getAttribute('src')}")`);
    });

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Ir a la foto ${i + 1}`);
      b.addEventListener('click', () => { goTo(i); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, n) => d.classList.toggle('active', n === index));
    }
    function start() { stop(); timer = setInterval(() => goTo(index + 1), autoplayDelay); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    function restart() { start(); }

    if (prevBtn) prevBtn.addEventListener('click', () => { goTo(index - 1); restart(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { goTo(index + 1); restart(); });

    // Ampliar la foto: abre el visor con todas las fotos que cargaron
    function openZoom(from) {
      const list = [];
      let startAt = -1;
      slides.forEach((slide, n) => {
        const photo = slide.querySelector('img');
        if (slide.classList.contains('no-photo') || !photo.naturalWidth) return;
        if (n === from) startAt = list.length;
        list.push({ src: photo.currentSrc || photo.src, alt: photo.alt, slide: n });
      });
      if (startAt < 0) return;
      stop();
      Lightbox.open(list, startAt, (lastIndex) => {
        goTo(list[lastIndex].slide); // el carrusel queda en la última foto vista
        start();
      });
    }

    track.addEventListener('click', (e) => {
      if (suppressClick) return;
      const slide = e.target.closest('.carousel-slide');
      if (slide) openZoom(slides.indexOf(slide));
    });
    if (zoomBtn) zoomBtn.addEventListener('click', () => openZoom(index));

    // Deslizar con el dedo
    let startX = null;
    root.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stop(); }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (startX !== null) {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) {
          goTo(index + (dx < 0 ? 1 : -1));
          // que un deslizamiento no se interprete como toque para ampliar
          suppressClick = true;
          setTimeout(() => { suppressClick = false; }, 350);
        }
      }
      startX = null;
      start();
    });

    goTo(0);
    start();
  };

  document.querySelectorAll('[data-carousel]').forEach((el, i) => initCarousel(el, 4200 + i * 700));

  // ---------- Foto de la portada: el marco se adapta a las proporciones de la imagen ----------
  const heroPhoto = document.querySelector('.hero-photo');
  if (heroPhoto) {
    const heroImg = heroPhoto.querySelector('img');
    const fitHeroPhoto = () => {
      if (!heroImg.naturalWidth || !heroImg.naturalHeight) return;
      const ratio = heroImg.naturalWidth / heroImg.naturalHeight;
      // ancho máximo del marco, y alto máximo según la pantalla (así entra completa y sin recortes)
      heroPhoto.style.width = `min(88%, 340px, calc(clamp(110px, 24dvh, 220px) * ${ratio}))`;
      heroPhoto.classList.add('fitted');
    };
    if (heroImg.complete) fitHeroPhoto();
    else heroImg.addEventListener('load', fitHeroPhoto);
  }

  // ---------- Aparición al entrar en pantalla ----------
  const container = document.querySelector('.invitation-container');
  const sections = document.querySelectorAll('.snap-section');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in-view'); });
    }, { root: container, threshold: 0.35 });
    sections.forEach((s) => io.observe(s));
  } else {
    sections.forEach((s) => s.classList.add('in-view'));
  }

  // ---------- Confirmación: entradas + precio a pagar ----------
  const guestNameInput = document.getElementById('guestNameInput');
  const ticketsCountEl = document.getElementById('ticketsCount');
  const rsvpSummaryText = document.getElementById('rsvp-summary-text');
  const rsvpErrorText = document.getElementById('rsvp-error');
  const tarjetaBreakdownEl = document.getElementById('tarjeta-breakdown');
  const tarjetaTotalText = document.getElementById('tarjeta-total-text');
  const nombres = Array.from(document.querySelectorAll('[data-nombre]')).map((n) => n.textContent.trim());

  let tickets = 1;

  const pluralize = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
  const formatARS = (n) => n.toLocaleString('es-AR');

  // Precio en todos los lugares donde se muestra
  document.querySelectorAll('[data-precio]').forEach((el) => { el.textContent = `$${formatARS(CONFIG.precioTarjeta)}`; });

  // Fecha límite de pago en el aviso resaltado
  document.querySelectorAll('[data-fecha-pago]').forEach((el) => { el.textContent = CONFIG.fechaLimitePago; });

  const updateRsvpUI = () => {
    const total = CONFIG.precioTarjeta * tickets;
    ticketsCountEl.textContent = tickets;
    rsvpSummaryText.innerHTML = `CONFIRMÁS PARA<br>${pluralize(tickets, 'entrada', 'entradas')}`;
    tarjetaBreakdownEl.innerHTML = `<p>Entradas: ${tickets} × $${formatARS(CONFIG.precioTarjeta)} = $${formatARS(total)}</p>`;
    tarjetaTotalText.textContent = tickets === 1
      ? `Total por tu entrada: $${formatARS(total)}`
      : `Total: $${formatARS(total)}`;
  };

  document.querySelectorAll('.counter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      tickets = btn.dataset.action === 'inc'
        ? Math.min(CONFIG.maxEntradas, tickets + 1)
        : Math.max(1, tickets - 1);
      updateRsvpUI();
    });
  });

  const showRsvpError = (msg) => { rsvpErrorText.textContent = msg; rsvpErrorText.classList.add('visible'); };
  const hideRsvpError = () => rsvpErrorText.classList.remove('visible');
  guestNameInput.addEventListener('input', hideRsvpError);
  updateRsvpUI();

  // ---------- Confirmación por WhatsApp (Marcela / Josefa / Naty) ----------
  const homenajeadas = nombres.length > 1
    ? nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1]
    : nombres[0];

  document.querySelectorAll('.rsvp-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = guestNameInput.value.trim();
      if (!name) {
        showRsvpError('Por favor ingresá tu nombre antes de confirmar.');
        guestNameInput.focus();
        return;
      }

      const telefono = CONFIG.telefonos[btn.dataset.contacto];
      if (!telefono) {
        showRsvpError('Este contacto todavía no está disponible. Probá con otro.');
        return;
      }
      hideRsvpError();

      const singular = tickets === 1;
      const lead = singular ? 'Soy' : 'Somos';
      const confirmVerb = singular ? 'confirmo' : 'confirmamos';
      const possessive = singular ? 'mi' : 'nuestra';

      const message = encodeURIComponent(
        `¡Hola! ${lead} ${name} y les ${confirmVerb} con mucho cariño ${possessive} asistencia por ` +
        `${pluralize(tickets, 'entrada', 'entradas')} para la celebración de jubilación de ${homenajeadas} el ${CONFIG.fechaTexto}. ` +
        `Total: $${formatARS(CONFIG.precioTarjeta * tickets)}. ¡Las queremos mucho!`
      );
      window.open(`https://wa.me/${telefono}?text=${message}`, '_blank');
    });
  });

  // ---------- Música ----------
  const audio = document.getElementById('bg-audio');
  const musicBtn = document.getElementById('music-toggle-btn');
  const musicIcon = document.getElementById('music-icon-wrapper');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');

  const setPlaying = (playing) => {
    iconPlay.style.display = playing ? 'none' : 'block';
    iconPause.style.display = playing ? 'block' : 'none';
    musicIcon.classList.toggle('spinning', playing);
    musicBtn.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
  };

  // Si no existe assets/musica.mp3, se oculta el botón
  const hideIfNoMusic = () => { if (audio.error || audio.networkState === 3) musicBtn.classList.add('hidden'); };
  audio.addEventListener('error', hideIfNoMusic);
  hideIfNoMusic();
  window.addEventListener('load', () => setTimeout(hideIfNoMusic, 300));
  musicBtn.addEventListener('click', () => {
    if (audio.paused) { audio.play().then(() => setPlaying(true)).catch(() => {}); }
    else { audio.pause(); setPlaying(false); }
  });

  // ---------- Sobre de apertura ----------
  const envelope = document.getElementById('envelope-screen');

  // Pétalos que caen de fondo
  const petalsWrap = document.getElementById('petals');
  for (let n = 0; n < 16; n++) {
    const p = document.createElement('span');
    const size = 8 + Math.random() * 12;
    p.className = 'petal' + (n % 5 === 0 ? ' gold' : '');
    p.style.left = `${Math.random() * 100}%`;
    p.style.width = `${size}px`;
    p.style.height = `${size * 1.35}px`;
    p.style.animationDuration = `${9 + Math.random() * 8}s`;
    p.style.animationDelay = `-${Math.random() * 14}s`;
    petalsWrap.appendChild(p);
  }

  document.getElementById('sealBtn').addEventListener('click', () => {
    envelope.classList.add('opening');
    audio.play().then(() => setPlaying(true)).catch(() => {});
    // la solapa se abre, sale la tarjeta y luego se muestra la invitación
    setTimeout(() => envelope.classList.add('hidden'), 2700);
  });
});