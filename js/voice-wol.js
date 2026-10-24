/* ===== JARVIS OFFICE – VOICE WAKE-ON-LAN ===== */
/* Sprachbefehl "PC an" (oder "Jarvis PC an") → WoL Magic Packet via Sync-Server.
   Nutzt Web Speech API (funktioniert in Chrome/Edge/Android-Browser, nicht Firefox). */

const JarvisVoice = (() => {

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.info('Spracheingabe: nicht unterstützt (kein Chrome/Edge?)');
    return { supported: false, start() {}, stop() {} };
  }

  const rec = new SpeechRecognition();
  rec.lang = 'de-DE';
  rec.continuous = true;
  rec.interimResults = false;
  rec.maxAlternatives = 3;

  let active = false;

  // Phrasen die WoL auslösen
  const WOL_PHRASES = ['pc an', 'computer an', 'rechner an', 'jarvis pc an', 'pc einschalten', 'pc starten'];

  function matchesWoL(text) {
    const t = text.toLowerCase().trim();
    return WOL_PHRASES.some(p => t.includes(p));
  }

  rec.onresult = async (evt) => {
    for (let i = evt.resultIndex; i < evt.results.length; i++) {
      const result = evt.results[i];
      if (!result.isFinal) continue;
      for (let a = 0; a < result.length; a++) {
        const text = result[a].transcript;
        console.log('Sprache erkannt:', text);
        if (matchesWoL(text)) {
          showToast('🖥️ PC wird geweckt…');
          const ok = await JarvisSync.wakePC();
          showToast(ok ? '✅ Magic Packet gesendet' : '❌ WoL fehlgeschlagen');
          return;
        }
      }
    }
  };

  rec.onerror = (e) => {
    if (e.error !== 'no-speech') console.warn('Sprache Fehler:', e.error);
  };

  rec.onend = () => {
    if (active) {
      // Neustart nach kurzer Pause (Browser stoppt nach Stille)
      setTimeout(() => { try { rec.start(); } catch (_) {} }, 500);
    }
  };

  function showToast(msg) {
    let t = document.getElementById('jarvis-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'jarvis-toast';
      t.style.cssText = [
        'position:fixed', 'bottom:36px', 'left:50%', 'transform:translateX(-50%)',
        'background:rgba(0,0,0,.85)', 'color:#fff', 'padding:10px 20px',
        'border-radius:20px', 'font-size:14px', 'z-index:99999',
        'pointer-events:none', 'transition:opacity .4s',
      ].join(';');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
  }

  // ── Mikrofon-Button ────────────────────────────────────────────────────────
  function createMicButton() {
    const btn = document.createElement('button');
    btn.id = 'voice-wol-btn';
    btn.title = 'Sprachsteuerung (sag: "PC an")';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
      <rect x="9" y="2" width="6" height="11" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/>
    </svg>`;
    btn.style.cssText = [
      'position:fixed', 'bottom:14px', 'right:32px', 'z-index:9999',
      'width:36px', 'height:36px', 'border-radius:50%', 'border:none',
      'background:var(--accent, #6366f1)', 'color:#fff', 'cursor:pointer',
      'display:flex', 'align-items:center', 'justify-content:center',
      'box-shadow:0 2px 8px rgba(0,0,0,.3)', 'transition:background .2s',
    ].join(';');

    btn.addEventListener('click', () => {
      if (!active) {
        start();
        btn.style.background = '#ef4444';
        btn.title = 'Mikrofon aktiv – nochmal klicken zum Stoppen';
        showToast('🎙️ Höre zu… sag "PC an"');
      } else {
        stop();
        btn.style.background = 'var(--accent, #6366f1)';
        btn.title = 'Sprachsteuerung (sag: "PC an")';
        showToast('🔇 Sprachsteuerung aus');
      }
    });

    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(btn));
    return btn;
  }

  function start() {
    active = true;
    try { rec.start(); } catch (_) {}
  }

  function stop() {
    active = false;
    try { rec.stop(); } catch (_) {}
  }

  createMicButton();

  return { supported: true, start, stop, get active() { return active; } };

})();
