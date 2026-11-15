#!/usr/bin/env python3
"""Jarvis Studio — lokaler Medien-Dienst für Jarvis Office.

Nur Python-Standardbibliothek + ffmpeg/ffprobe. Lauscht ausschließlich auf
127.0.0.1 und verlangt bei jeder Anfrage ein Token. Aufgaben:

  * Medienbibliothek (~/JarvisMedia): Upload bis 5 GB, Vorschaubilder, Wellenform
  * Analyse: Pausen, Schwarzbild, Szenenwechsel, Lautstärke-Highlights
  * Export: Schnitt, Format, Look, Ton, Text, MP4/WebM/GIF/MP3
  * Automatik / KI-Regie: Textbefehl -> Schnittplan -> fertiges Video
  * Teilen: Ordner zeigen, Plattform öffnen, Handy-Freigabe im WLAN mit QR-Code

Start:  jarvis_media.py --ensure   (startet den Dienst bei Bedarf, gibt "PORT TOKEN" aus)
        jarvis_media.py --serve    (Dienst im Vordergrund)
"""
import base64
import hashlib
import hmac
import json
import math
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

VERSION = '2.1'
ROOT = Path(os.environ.get('JARVIS_MEDIA_DIR') or (Path.home() / 'JarvisMedia'))
LIB = ROOT / 'Bibliothek'
EXP = ROOT / 'Exporte'
CACHE = ROOT / '.cache'
STATE = ROOT / '.server.json'
CONFIG = ROOT / '.config.json'
MAX_UPLOAD = 5 * 1024 ** 3
PORT_BASE = 47615
IDLE_EXIT = 20 * 60          # Sekunden ohne Anfrage, danach beendet sich der Dienst
BATCH = 20                   # Clips pro ffmpeg-Durchlauf
AI_URL = os.environ.get('JARVIS_AI_URL', 'https://api.anthropic.com/v1/messages')
AI_MODEL = 'claude-sonnet-5-5'

EXT = {
    'video': {'mp4', 'mov', 'm4v', 'mkv', 'webm', 'avi', 'mpg', 'mpeg', 'wmv', 'flv',
              '3gp', 'ts', 'mts', 'm2ts', 'ogv', 'vob'},
    'image': {'jpg', 'jpeg', 'png', 'webp', 'bmp', 'tif', 'tiff', 'avif', 'heic', 'heif'},
    'gif': {'gif'},
    'audio': {'mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'flac', 'wma'},
}
KIND_BY_EXT = {e: k for k, s in EXT.items() for e in s}
MIME = {
    'mp4': 'video/mp4', 'm4v': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm',
    'mkv': 'video/x-matroska', 'avi': 'video/x-msvideo', 'ogv': 'video/ogg',
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp',
    'gif': 'image/gif', 'bmp': 'image/bmp', 'avif': 'image/avif', 'tif': 'image/tiff',
    'tiff': 'image/tiff', 'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'm4a': 'audio/mp4',
    'aac': 'audio/aac', 'ogg': 'audio/ogg', 'oga': 'audio/ogg', 'opus': 'audio/ogg',
    'flac': 'audio/flac',
}

# Formatvorlagen. "hint" sind Richtwerte der Plattformen, keine Garantie.
PRESETS = [
    {'key': 'original', 'name': 'Original', 'w': 0, 'h': 0, 'fit': 'contain', 'hint': 'Größe wie die Quelle'},
    {'key': 'youtube', 'name': 'YouTube (16:9)', 'w': 1920, 'h': 1080, 'fit': 'contain', 'hint': 'Full HD quer'},
    {'key': 'vertical', 'name': 'TikTok / Reels / Shorts (9:16)', 'w': 1080, 'h': 1920, 'fit': 'blur',
     'hint': 'Hochkant. Shorts: höchstens 3 Minuten'},
    {'key': 'insta', 'name': 'Instagram-Beitrag (4:5)', 'w': 1080, 'h': 1350, 'fit': 'blur', 'hint': 'Hochformat im Feed'},
    {'key': 'square', 'name': 'Quadrat (1:1)', 'w': 1080, 'h': 1080, 'fit': 'blur', 'hint': 'Passt fast überall'},
    {'key': 'hd', 'name': 'HD 720p (16:9)', 'w': 1280, 'h': 720, 'fit': 'contain',
     'hint': 'Kleiner, gut für X, WhatsApp, Telegram, E-Mail'},
]
PRESET = {p['key']: p for p in PRESETS}

# Nur diese Adressen darf der Dienst im Standardbrowser öffnen.
PLATFORMS = {
    'youtube': 'https://www.youtube.com/upload',
    'tiktok': 'https://www.tiktok.com/upload',
    'instagram': 'https://www.instagram.com/',
    'facebook': 'https://www.facebook.com/',
    'x': 'https://x.com/compose/post',
    'whatsapp': 'https://web.whatsapp.com/',
    'telegram': 'https://web.telegram.org/',
    'linkedin': 'https://www.linkedin.com/feed/?shareActive=true',
    'pinterest': 'https://www.pinterest.com/pin-creation-tool/',
    'vimeo': 'https://vimeo.com/upload',
    'reddit': 'https://www.reddit.com/submit',
    'threads': 'https://www.threads.net/',
    'bluesky': 'https://bsky.app/',
    'discord': 'https://discord.com/channels/@me',
}

_lock = threading.RLock()
_last_request = time.time()


# ───────────────────────────── Helfer ─────────────────────────────

def ensure_dirs():
    for d in (ROOT, LIB, EXP, CACHE):
        d.mkdir(parents=True, exist_ok=True)


def read_json(path, default):
    try:
        return json.loads(Path(path).read_text('utf-8'))
    except Exception:
        return default


def write_json(path, data, private=False):
    tmp = Path(str(path) + '.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False), 'utf-8')
    if private:
        os.chmod(tmp, 0o600)
    os.replace(tmp, path)


def have(binary):
    return shutil.which(binary) is not None


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def num(v, default=0.0):
    try:
        f = float(v)
        return f if math.isfinite(f) else default
    except (TypeError, ValueError):
        return default


def safe_name(name):
    name = os.path.basename(str(name).replace('\\', '/')).strip()
    name = re.sub(r'[\x00-\x1f<>:"|?*]', '_', name).lstrip('.')
    return name[:180] or 'Datei'


def unique_path(folder, name):
    stem, ext = os.path.splitext(name)
    p, i = folder / name, 2
    while p.exists():
        p = folder / f'{stem} ({i}){ext}'
        i += 1
    return p


def fmt_err(lines):
    tail = [l for l in lines if l.strip()][-4:]
    return ' | '.join(tail) or 'ffmpeg ist fehlgeschlagen'


# ───────────────────────────── Bibliothek ─────────────────────────────

_index = None


def _load_index():
    global _index
    if _index is None:
        _index = read_json(CACHE / 'index.json', {})
    return _index


def probe(path):
    """Liest Dauer, Größe, Codecs per ffprobe. None, wenn es keine Mediendatei ist."""
    try:
        out = subprocess.run(
            ['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', str(path)],
            capture_output=True, text=True, timeout=60)
        data = json.loads(out.stdout or '{}')
    except Exception:
        return None
    streams = data.get('streams') or []
    fmt = data.get('format') or {}
    v = next((s for s in streams if s.get('codec_type') == 'video'
              and not (s.get('disposition') or {}).get('attached_pic')), None)
    a = next((s for s in streams if s.get('codec_type') == 'audio'), None)
    if not v and not a:
        return None
    meta = {'duration': num(fmt.get('duration')), 'format': fmt.get('format_name', '')}
    if v:
        rot = 0
        for sd in v.get('side_data_list') or []:
            if 'rotation' in sd:
                rot = int(num(sd['rotation']))
        rot = int(num((v.get('tags') or {}).get('rotate'), rot)) % 360
        w, h = int(num(v.get('width'))), int(num(v.get('height')))
        if rot in (90, 270):
            w, h = h, w
        fr = (v.get('avg_frame_rate') or '0/1').split('/')
        fps = num(fr[0]) / num(fr[1], 1) if len(fr) == 2 and num(fr[1]) else 0
        meta.update(width=w, height=h, fps=round(fps, 3), vcodec=v.get('codec_name', ''),
                    vidx=v.get('index', 0), pix=v.get('pix_fmt', ''))
        if not meta['duration']:
            meta['duration'] = num(v.get('duration'))
    if a:
        meta.update(acodec=a.get('codec_name', ''), aidx=a.get('index', 0))
    return meta


def item_id(folder, name):
    return hashlib.sha1(f'{folder}/{name}'.encode()).hexdigest()[:14]


def build_item(folder, path):
    ext = path.suffix.lower().lstrip('.')
    kind = KIND_BY_EXT.get(ext)
    if not kind:
        return None
    try:
        st = path.stat()
    except OSError:
        return None
    key = f'{folder}/{path.name}'
    idx = _load_index()
    cached = idx.get(key)
    if cached and cached.get('size') == st.st_size and cached.get('mtime') == int(st.st_mtime):
        meta = cached['meta']
    else:
        meta = probe(path)
        idx[key] = {'size': st.st_size, 'mtime': int(st.st_mtime), 'meta': meta}
        write_json(CACHE / 'index.json', idx)
    if not meta:
        return None
    if kind == 'video' and 'width' not in meta:
        kind = 'audio'
    playable = True
    if kind == 'video':
        playable = (meta.get('vcodec') in ('h264', 'vp8', 'vp9', 'av1')
                    and meta.get('acodec', 'aac') in ('aac', 'mp3', 'opus', 'vorbis', 'flac')
                    and ext in ('mp4', 'm4v', 'mov', 'webm', 'mkv')
                    and '10' not in meta.get('pix', '') and '422' not in meta.get('pix', ''))
    elif kind == 'gif':
        playable = False
    elif kind == 'image':
        playable = ext not in ('tif', 'tiff', 'heic', 'heif')
    item = {'id': item_id(folder, path.name), 'name': path.name, 'folder': folder, 'kind': kind,
            'size': st.st_size, 'mtime': int(st.st_mtime), 'ext': ext, 'playable': playable,
            'hasAudio': 'acodec' in meta, 'path': str(path)}
    for k in ('duration', 'width', 'height', 'fps', 'vcodec', 'acodec'):
        if k in meta:
            item[k] = meta[k]
    item['_meta'] = meta
    return item


def list_items():
    with _lock:
        items = []
        for folder, d in (('lib', LIB), ('exp', EXP)):
            try:
                entries = sorted(d.iterdir())
            except OSError:
                entries = []
            for p in entries:
                if p.is_file() and not p.name.startswith('.') and not p.name.endswith('.part'):
                    it = build_item(folder, p)
                    if it:
                        items.append(it)
        items.sort(key=lambda i: -i['mtime'])
        return items


def get_item(iid):
    for it in list_items():
        if it['id'] == iid:
            return it
    return None


def public(item):
    return {k: v for k, v in item.items() if k not in ('_meta', 'path')}


def cache_file(item, suffix):
    return CACHE / f"{item['id']}-{item['size']}-{item['mtime']}{suffix}"


_cache_locks = {}


def cached(item, suffix, make):
    """Erzeugt eine abgeleitete Datei (Vorschaubild, Wellenform …) genau einmal."""
    out = cache_file(item, suffix)
    with _lock:
        lk = _cache_locks.setdefault(str(out), threading.Lock())
    with lk:
        if not out.exists() or out.stat().st_size == 0:
            tmp = out.with_name('tmp-' + out.name)
            try:
                make(tmp)
                if tmp.exists() and tmp.stat().st_size:
                    os.replace(tmp, out)
            finally:
                if tmp.exists():
                    tmp.unlink()
    return out if out.exists() else None


def ff_quiet(args, timeout=600):
    return subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', *args],
                          capture_output=True, timeout=timeout)


def make_thumb(item):
    if item['kind'] == 'audio':
        return None
    ss = min(item.get('duration', 0) * 0.1, 8) if item['kind'] == 'video' else 0

    def run(tmp):
        seek = ['-ss', f'{ss:.2f}'] if ss > 0 else []      # -ss 0 liefert bei Standbildern eine leere Datei
        ff_quiet([*seek, '-i', item['path'], '-frames:v', '1',
                  '-vf', 'scale=360:360:force_original_aspect_ratio=decrease', '-q:v', '5', '-f', 'mjpeg', str(tmp)], 120)
    return cached(item, '.thumb.jpg', run)


def make_wave(item):
    if not item.get('hasAudio'):
        return None

    def run(tmp):
        ff_quiet(['-i', item['path'], '-filter_complex',
                  'aformat=channel_layouts=mono,showwavespic=s=2400x96:colors=0x9d5cf5',
                  '-frames:v', '1', '-f', 'image2', '-c:v', 'png', str(tmp)], 1800)
    return cached(item, '.wave.png', run)


def make_conv(item):
    """PNG-Fassung für Bildformate, die der Browser nicht selbst lesen kann."""
    def run(tmp):
        ff_quiet(['-i', item['path'], '-frames:v', '1', '-f', 'image2', '-c:v', 'png', str(tmp)], 120)
    return cached(item, '.conv.png', run)


# ───────────────────────────── Aufträge ─────────────────────────────

class Canceled(Exception):
    pass


class Job:
    def __init__(self, kind, title):
        self.id = secrets.token_hex(6)
        self.kind, self.title = kind, title
        self.state, self.progress, self.message = 'queued', 0.0, 'Wartet …'
        self.result, self.error, self.proc, self.cancel = None, None, None, False
        self.created = time.time()
        self.tmp = None

    def set(self, progress=None, message=None):
        if self.cancel:
            raise Canceled()
        if progress is not None:
            self.progress = clamp(progress, 0, 1)
        if message is not None:
            self.message = message

    def tmpdir(self):
        if not self.tmp:
            self.tmp = Path(tempfile.mkdtemp(prefix='jarvis-', dir=str(CACHE)))
        return self.tmp

    def json(self):
        return {'id': self.id, 'kind': self.kind, 'title': self.title, 'state': self.state,
                'progress': round(self.progress, 4), 'message': self.message,
                'result': self.result, 'error': self.error, 'created': self.created}


JOBS = OrderedDict()
_heavy = threading.Semaphore(2)


def start_job(kind, title, fn, *args):
    job = Job(kind, title)
    with _lock:
        JOBS[job.id] = job
        while len(JOBS) > 60:
            old = next(iter(JOBS))
            if JOBS[old].state in ('queued', 'running'):
                break
            del JOBS[old]

    def run():
        with _heavy:
            try:
                if job.cancel:
                    raise Canceled()
                job.state, job.message = 'running', 'Läuft …'
                job.result = fn(job, *args)
                job.state, job.progress, job.message = 'done', 1.0, 'Fertig'
            except Canceled:
                job.state, job.message = 'canceled', 'Abgebrochen'
            except Exception as e:  # noqa: BLE001 — Fehlertext geht an die Oberfläche
                job.state, job.error, job.message = 'error', str(e), 'Fehler'
            finally:
                if job.tmp:
                    shutil.rmtree(job.tmp, ignore_errors=True)

    threading.Thread(target=run, daemon=True).start()
    return job


def run_ff(job, args, total=0, p0=0.0, p1=1.0, on_line=None):
    """Startet ffmpeg, meldet Fortschritt und bricht bei job.cancel ab."""
    proc = subprocess.Popen(['ffmpeg', '-hide_banner', '-nostdin', '-y', '-progress', 'pipe:1', '-nostats', *args],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors='replace')
    job.proc = proc
    err = []

    def read_err():
        for line in proc.stderr:
            line = line.rstrip()
            if on_line:
                on_line(line)
            err.append(line)
            del err[:-60]

    t = threading.Thread(target=read_err, daemon=True)
    t.start()
    try:
        for line in proc.stdout:
            if job.cancel:
                proc.terminate()
                break
            if line.startswith('out_time_us=') or line.startswith('out_time_ms='):
                us = num(line.split('=', 1)[1], -1)
                if us >= 0 and total > 0:
                    job.progress = clamp(p0 + (p1 - p0) * (us / 1e6 / total), 0, 1)
        proc.wait()
        t.join(timeout=5)
    finally:
        if proc.poll() is None:
            proc.kill()
        job.proc = None
    if job.cancel:
        raise Canceled()
    if proc.returncode != 0:
        raise RuntimeError(fmt_err(err))
    job.progress = p1
    return err


# ───────────────────────────── Analyse ─────────────────────────────

def detect_silence(job, item, noise=-35.0, mind=0.6, p0=0.0, p1=1.0):
    found, start = [], [None]

    def on_line(line):
        m = re.search(r'silence_start: (-?[\d.]+)', line)
        if m:
            start[0] = max(0.0, float(m.group(1)))
        m = re.search(r'silence_end: ([\d.]+)', line)
        if m and start[0] is not None:
            found.append((start[0], float(m.group(1))))
            start[0] = None

    run_ff(job, ['-i', item['path'], '-vn', '-af', f'silencedetect=noise={noise}dB:d={mind}', '-f', 'null', '-'],
           item.get('duration', 0), p0, p1, on_line)
    if start[0] is not None:
        found.append((start[0], item.get('duration', start[0])))
    return found


def detect_black(job, item, mind=0.4, p0=0.0, p1=1.0):
    found = []

    def on_line(line):
        m = re.search(r'black_start:([\d.]+) black_end:([\d.]+)', line)
        if m:
            found.append((float(m.group(1)), float(m.group(2))))

    run_ff(job, ['-i', item['path'], '-an', '-vf', f'scale=320:-2,blackdetect=d={mind}:pix_th=0.10', '-f', 'null', '-'],
           item.get('duration', 0), p0, p1, on_line)
    return found


def detect_scenes(job, item, threshold=0.35, p0=0.0, p1=1.0):
    cuts = []

    def on_line(line):
        if 'showinfo' in line:
            m = re.search(r'pts_time:([\d.]+)', line)
            if m:
                cuts.append(float(m.group(1)))

    run_ff(job, ['-i', item['path'], '-an', '-vf', f"scale=320:-2,select='gt(scene,{threshold})',showinfo",
                 '-f', 'null', '-'], item.get('duration', 0), p0, p1, on_line)
    return cuts


def loudness_curve(job, item, p0=0.0, p1=1.0):
    """Lautstärke (dB) je halbe Sekunde."""
    out = job.tmpdir() / 'rms.txt'
    run_ff(job, ['-i', item['path'], '-vn', '-af',
                 'aresample=8000,aformat=channel_layouts=mono,asetnsamples=n=4000,'
                 f'astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file={out}',
                 '-f', 'null', '-'], item.get('duration', 0), p0, p1)
    curve, t = [], None
    for line in out.read_text(errors='replace').splitlines():
        m = re.search(r'pts_time:([\d.]+)', line)
        if m:
            t = float(m.group(1))
        elif 'RMS_level=' in line and t is not None:
            v = line.split('=', 1)[1].strip()
            curve.append((t, -90.0 if v in ('-inf', 'nan') else clamp(num(v, -90), -90, 0)))
    return curve


def merge_ranges(ranges, gap=0.0):
    out = []
    for s, e in sorted(ranges):
        if out and s <= out[-1][1] + gap:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out


def subtract(keep, cut, pad=0.0):
    """Entfernt die Bereiche `cut` (um `pad` verkleinert) aus `keep`."""
    res = [list(k) for k in keep]
    for cs, ce in cut:
        cs, ce = cs + pad, ce - pad
        if ce <= cs:
            continue
        nxt = []
        for s, e in res:
            if ce <= s or cs >= e:
                nxt.append([s, e])
                continue
            if cs > s:
                nxt.append([s, cs])
            if ce < e:
                nxt.append([ce, e])
        res = nxt
    return res


def tidy(ranges, dur, min_len=0.3):
    out = []
    for s, e in merge_ranges(ranges, 0.05):
        s, e = clamp(s, 0, dur), clamp(e, 0, dur)
        if e - s >= min_len:
            out.append([round(s, 3), round(e, 3)])
    return out


def pick_highlights(curve, dur, target, clip=5.0):
    """Wählt die lautesten Abschnitte, bis `target` Sekunden erreicht sind."""
    if dur <= target:
        return [[0, dur]]
    n = max(1, int(math.ceil(dur / clip)))
    scores = [0.0] * n
    counts = [0] * n
    for t, db in curve:
        i = min(n - 1, int(t / clip))
        scores[i] += 10 ** (db / 10)
        counts[i] += 1
    want = max(1, int(round(target / clip)))
    if not curve or max(scores) <= 0:
        chosen = sorted({int(i * n / want) for i in range(want)})   # ohne Ton: gleichmäßig verteilt
    else:
        avg = [scores[i] / counts[i] if counts[i] else 0 for i in range(n)]
        chosen = sorted(sorted(range(n), key=lambda i: -avg[i])[:want])
    return tidy([[i * clip, min(dur, (i + 1) * clip)] for i in chosen], dur)


def limit_total(ranges, maximum):
    out, total = [], 0.0
    for s, e in ranges:
        if total >= maximum:
            break
        e = min(e, s + maximum - total)
        out.append([s, e])
        total += e - s
    return out


def analyze_job(job, iid, kind, params):
    item = need_item(iid)
    dur = item.get('duration', 0)
    params = params or {}
    if kind == 'silence':
        if not item.get('hasAudio'):
            raise RuntimeError('Diese Datei hat keinen Ton – Pausen lassen sich nicht erkennen.')
        job.set(message='Suche Pausen …')
        sil = detect_silence(job, item, num(params.get('db'), -35), clamp(num(params.get('min'), 0.6), 0.2, 10))
        keep = tidy(subtract([[0, dur]], sil, 0.12), dur)
        return {'segments': keep, 'removed': round(dur - sum(e - s for s, e in keep), 2)}
    if kind == 'black':
        job.set(message='Suche Schwarzbild …')
        keep = tidy(subtract([[0, dur]], detect_black(job, item)), dur)
        return {'segments': keep, 'removed': round(dur - sum(e - s for s, e in keep), 2)}
    if kind == 'scenes':
        job.set(message='Suche Szenenwechsel …')
        cuts = [c for c in detect_scenes(job, item, clamp(num(params.get('threshold'), 0.35), 0.05, 0.9)) if 0.3 < c < dur - 0.3]
        pts = [0.0] + cuts + [dur]
        return {'segments': [[round(a, 3), round(b, 3)] for a, b in zip(pts, pts[1:]) if b - a > 0.2], 'removed': 0}
    if kind == 'highlights':
        job.set(message='Messe Lautstärke …')
        curve = loudness_curve(job, item) if item.get('hasAudio') else []
        target = clamp(num(params.get('target'), 60), 3, 3600)
        keep = pick_highlights(curve, dur, target, clamp(num(params.get('clip'), 5), 1, 30))
        return {'segments': keep, 'removed': round(dur - sum(e - s for s, e in keep), 2)}
    raise RuntimeError('Unbekannte Analyse')


# ───────────────────────────── Export ─────────────────────────────

def need_item(iid):
    it = get_item(iid)
    if not it:
        raise RuntimeError('Datei nicht gefunden – wurde sie gelöscht oder umbenannt?')
    return it


def even(v):
    return max(2, int(round(v / 2)) * 2)


def atempo_chain(speed):
    parts = []
    while speed > 2.0:
        parts.append('atempo=2.0')
        speed /= 2.0
    while speed < 0.5:
        parts.append('atempo=0.5')
        speed /= 0.5
    if abs(speed - 1) > 1e-3:
        parts.append(f'atempo={speed:.4f}')
    return parts


def find_font():
    try:
        out = subprocess.run(['fc-match', '-f', '%{file}', 'sans:bold'], capture_output=True, text=True, timeout=10)
        f = out.stdout.strip()
        if f and os.path.exists(f) and not re.search(r"[:'\\,\[\];]", f):
            return f
    except Exception:
        pass
    return None


def normalize_project(proj):
    """Prüft das Projekt und füllt Standardwerte."""
    segs = []
    for s in proj.get('segments') or []:
        item = need_item(s.get('src'))
        kind = item['kind']
        if kind == 'image':
            start, end = 0.0, clamp(num(s.get('end'), 4) - num(s.get('start'), 0), 0.2, 600)
        else:
            dur = item.get('duration', 0)
            start = clamp(num(s.get('start'), 0), 0, max(0, dur - 0.05))
            end = clamp(num(s.get('end'), dur), start + 0.05, max(dur, start + 0.05))
        segs.append({'item': item, 'kind': kind, 'start': start, 'end': end,
                     'speed': clamp(num(s.get('speed'), 1), 0.1, 16),
                     'volume': clamp(num(s.get('volume'), 1), 0, 4)})
    if not segs:
        raise RuntimeError('Das Projekt enthält keine Clips.')
    out = dict(proj.get('output') or {})
    cont = out.get('container', 'mp4')
    if cont not in ('mp4', 'webm', 'gif', 'mp3'):
        cont = 'mp4'
    visual = [s for s in segs if s['kind'] != 'audio']
    if cont != 'mp3' and not visual:
        cont = 'mp3'
    look = dict(proj.get('look') or {})
    fmt = dict(proj.get('format') or {})
    w, h = int(num(fmt.get('width'))), int(num(fmt.get('height')))
    rot = int(num(look.get('rotate'))) % 360
    if (w <= 0 or h <= 0) and visual:
        first = visual[0]['item']
        w, h = first.get('width', 1280), first.get('height', 720)
        if rot in (90, 270):
            w, h = h, w
    w, h = even(clamp(w or 1280, 16, 4096)), even(clamp(h or 720, 16, 4096))
    fps = num(fmt.get('fps'))
    if fps <= 0:
        fps = next((s['item'].get('fps', 0) for s in segs if s['kind'] == 'video' and s['item'].get('fps')), 30)
    fps = clamp(fps, 5, 60)
    if cont == 'gif':
        gw = clamp(int(num(out.get('gifWidth'), 480)), 80, 1280)
        if w > gw:
            w, h = even(gw), even(h * gw / w)
        fps = min(fps, clamp(num(out.get('gifFps'), 12), 2, 30))
    audio = dict(proj.get('audio') or {})
    music = None
    if (audio.get('music') or {}).get('id'):
        mi = need_item(audio['music']['id'])
        if not mi.get('hasAudio'):
            raise RuntimeError('Die gewählte Musikdatei hat keinen Ton.')
        music = {'path': mi['path'], 'volume': clamp(num(audio['music'].get('volume'), 0.5), 0, 4)}
    text = dict(proj.get('text') or {})
    total = sum((s['end'] - s['start']) / s['speed'] for s in segs)
    return {
        'name': safe_name(proj.get('name') or 'Export'), 'segs': segs, 'container': cont,
        'w': w, 'h': h, 'fps': fps, 'fit': fmt.get('fit') if fmt.get('fit') in ('contain', 'cover', 'blur') else 'contain',
        'rotate': rot, 'flipH': bool(look.get('flipH')),
        'brightness': clamp(num(look.get('brightness')), -1, 1), 'contrast': clamp(num(look.get('contrast'), 1), 0.2, 3),
        'saturation': clamp(num(look.get('saturation'), 1), 0, 3), 'enhance': bool(look.get('enhance')),
        'stabilize': bool(look.get('stabilize')), 'denoise': bool(look.get('denoise')),
        'mute': bool(audio.get('mute')), 'volume': clamp(num(audio.get('volume'), 1), 0, 4),
        'normalize': bool(audio.get('normalize')), 'music': music,
        'fadeIn': clamp(num(proj.get('fadeIn')), 0, 10), 'fadeOut': clamp(num(proj.get('fadeOut')), 0, 10),
        'text': str(text.get('content') or '').strip()[:300],
        'textPos': text.get('position') if text.get('position') in ('top', 'center', 'bottom') else 'bottom',
        'textSize': clamp(num(text.get('size'), 6), 2, 20), 'textColor': text.get('color') if re.fullmatch(r'#[0-9a-fA-F]{6}', str(text.get('color') or '')) else '#ffffff',
        'textStart': max(0, num(text.get('start'))), 'textEnd': num(text.get('end')),
        'quality': out.get('quality') if out.get('quality') in ('high', 'medium', 'small') else 'medium',
        'targetMB': clamp(num(out.get('targetMB')), 0, 100000), 'fast': bool(out.get('fast')),
        'total': total,
    }


def seg_graph(p, segs, want_v, want_a):
    """Filtergraph für eine Clip-Gruppe. Liefert (Eingaben, Filterteile)."""
    W, H, FPS = p['w'], p['h'], p['fps']
    inputs, parts, labels = [], [], []
    for i, s in enumerate(segs):
        it, meta = s['item'], s['item']['_meta']
        d = s['end'] - s['start']
        outd = d / s['speed']
        if s['kind'] == 'image':
            inputs += ['-loop', '1', '-framerate', f'{FPS:.3f}', '-t', f'{d:.3f}', '-i', it['path']]
        else:
            inputs += ['-ss', f"{s['start']:.3f}", '-t', f'{d:.3f}', '-i', it['path']]
        if want_v:
            if s['kind'] == 'audio':
                parts.append(f'color=c=black:s={W}x{H}:r={FPS:.3f}:d={outd:.3f},format=yuv420p[v{i}]')
            else:
                c = []
                if s['kind'] == 'video':
                    if p['stabilize']:
                        c.append('deshake')
                    if p['denoise']:
                        c.append('hqdn3d=3:3:6:6')
                c.append(f"setpts=(PTS-STARTPTS)/{s['speed']:.4f}")
                c.append(f'fps={FPS:.3f}')
                if p['rotate'] == 90:
                    c.append('transpose=1')
                elif p['rotate'] == 180:
                    c += ['hflip', 'vflip']
                elif p['rotate'] == 270:
                    c.append('transpose=2')
                if p['flipH']:
                    c.append('hflip')
                src = f"[{i}:{meta.get('vidx', 0)}]" + ','.join(c)
                if p['fit'] == 'cover':
                    src += f',scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}'
                elif p['fit'] == 'blur':
                    parts.append(src + f'[s{i}];[s{i}]split[b{i}][f{i}];'
                                 f'[b{i}]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=24:2[bg{i}];'
                                 f'[f{i}]scale={W}:{H}:force_original_aspect_ratio=decrease[fg{i}];'
                                 f'[bg{i}][fg{i}]overlay=(W-w)/2:(H-h)/2[o{i}]')
                    src = f'[o{i}]null'
                else:
                    src += (f',scale={W}:{H}:force_original_aspect_ratio=decrease,'
                            f'pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black')
                tail = ['setsar=1']
                if p['enhance']:
                    tail.append('normalize=smoothing=40:strength=0.5')
                if abs(p['brightness']) > 1e-3 or abs(p['contrast'] - 1) > 1e-3 or abs(p['saturation'] - 1) > 1e-3:
                    tail.append(f"eq=brightness={p['brightness']:.3f}:contrast={p['contrast']:.3f}:saturation={p['saturation']:.3f}")
                tail.append('format=yuv420p')
                parts.append(src + ',' + ','.join(tail) + f'[v{i}]')
        if want_a:
            if 'aidx' in meta and s['kind'] != 'image' and s['volume'] > 0 and not p['mute']:
                c = ['aresample=48000', 'aformat=sample_fmts=fltp:channel_layouts=stereo', 'asetpts=PTS-STARTPTS']
                c += atempo_chain(s['speed'])
                if abs(s['volume'] - 1) > 1e-3:
                    c.append(f"volume={s['volume']:.3f}")
                parts.append(f"[{i}:{meta['aidx']}]" + ','.join(c) + f'[a{i}]')
            else:
                parts.append(f'anullsrc=r=48000:cl=stereo,atrim=0:{outd:.3f},aformat=sample_fmts=fltp,asetpts=PTS-STARTPTS[a{i}]')
        labels.append((f'[v{i}]' if want_v else '') + (f'[a{i}]' if want_a else ''))
    parts.append(''.join(labels) + f'concat=n={len(segs)}:v={1 if want_v else 0}:a={1 if want_a else 0}'
                 + ('[vc]' if want_v else '') + ('[ac]' if want_a else ''))
    return inputs, parts


def video_post(p, job, offset, length):
    """Blenden und Text; `offset` ist der Beginn dieser Gruppe im fertigen Film."""
    c, T = [], p['total']
    if p['fadeIn'] > 0 and offset < p['fadeIn']:
        c.append(f"fade=t=in:st=0:d={p['fadeIn']:.2f}")
    if p['fadeOut'] > 0 and offset + length >= T - 0.05:
        c.append(f"fade=t=out:st={max(0, T - p['fadeOut'] - offset):.3f}:d={p['fadeOut']:.2f}")
    if p['text']:
        tf = job.tmpdir() / 'text.txt'
        tf.write_text(p['text'], 'utf-8')
        font = find_font()
        size = max(10, int(p['h'] * p['textSize'] / 100))
        y = {'top': 'h*0.07', 'center': '(h-text_h)/2', 'bottom': 'h*0.93-text_h'}[p['textPos']]
        a = p['textStart'] - offset
        b = (p['textEnd'] if p['textEnd'] > p['textStart'] else T) - offset
        c.append(f"drawtext=textfile='{tf}':" + (f"fontfile='{font}':" if font else 'font=Sans:')
                 + f"fontcolor={p['textColor']}:fontsize={size}:x=(w-text_w)/2:y={y}:"
                   f"borderw={max(2, size // 14)}:bordercolor=black@0.75:line_spacing={size // 5}:"
                   f"enable='between(t,{a:.3f},{b:.3f})'")
    return c


def audio_post(p, music_input):
    """Musik, Gesamtlautstärke, Blenden, Normalisierung. Eingang [ac], Ausgang [ao]."""
    T, parts, cur = p['total'], [], '[ac]'
    if music_input is not None:
        parts.append(f"[{music_input}:a:0]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
                     f"volume={p['music']['volume']:.3f},atrim=0:{T:.3f}[mus]")
        parts.append(f'{cur}[mus]amix=inputs=2:duration=first:normalize=0[am]')
        cur = '[am]'
    c = []
    if abs(p['volume'] - 1) > 1e-3:
        c.append(f"volume={p['volume']:.3f}")
    if p['fadeIn'] > 0:
        c.append(f"afade=t=in:st=0:d={p['fadeIn']:.2f}")
    if p['fadeOut'] > 0:
        c.append(f"afade=t=out:st={max(0, T - p['fadeOut']):.3f}:d={p['fadeOut']:.2f}")
    if p['normalize']:
        c += ['loudnorm=I=-14:TP=-1.5:LRA=11', 'aresample=48000']
    parts.append(cur + (','.join(c) or 'anull') + '[ao]')
    return parts


GIF_TAIL = 'split[g1][g2];[g1]palettegen=stats_mode=diff[gp];[g2][gp]paletteuse=dither=bayer:bayer_scale=4'


def video_codec(p, final=True):
    cont = p['container']
    if cont == 'gif' and final:
        return ['-loop', '0']
    if cont == 'webm' and final:
        crf = {'high': 28, 'medium': 33, 'small': 40}[p['quality']]
        return ['-c:v', 'libvpx-vp9', '-crf', str(crf), '-b:v', '0', '-row-mt', '1', '-cpu-used', '4', '-pix_fmt', 'yuv420p']
    if cont != 'mp4':                      # Zwischenstufe für WebM/GIF: fast verlustfrei
        return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p']
    args = ['-c:v', 'libx264', '-preset', 'fast' if p['quality'] == 'high' else 'veryfast', '-pix_fmt', 'yuv420p']
    if p['targetMB'] > 0 and p['total'] > 0:
        kbps = max(120, int(p['targetMB'] * 8192 / p['total'] - (0 if p['mute'] else 136)))
        args += ['-b:v', f'{kbps}k', '-maxrate', f'{int(kbps * 1.4)}k', '-bufsize', f'{kbps * 2}k']
    else:
        args += ['-crf', str({'high': 18, 'medium': 22, 'small': 27}[p['quality']])]
    return args


def audio_codec(p):
    return {'mp4': ['-c:a', 'aac', '-b:a', '128k' if p['targetMB'] else '160k'],
            'webm': ['-c:a', 'libopus', '-b:a', '128k'],
            'mp3': ['-c:a', 'libmp3lame', '-q:a', '2'], 'gif': []}[p['container']]


def export_fast(job, p, out):
    """Schnitt ohne Neukodierung: sehr schnell, schneidet aber nur an Schlüsselbildern."""
    tmp = job.tmpdir()
    parts = []
    for i, s in enumerate(p['segs']):
        if s['kind'] != 'video':
            raise RuntimeError('Der Blitz-Schnitt geht nur mit Videoclips.')
        part = tmp / f'part{i:04d}.mkv'
        run_ff(job, ['-ss', f"{s['start']:.3f}", '-t', f"{s['end'] - s['start']:.3f}", '-i', s['item']['path'],
                     '-map', '0:v:0', '-map', '0:a?', '-c', 'copy', '-avoid_negative_ts', 'make_zero', str(part)],
               0, 0, 0)
        parts.append(part)
        job.set(0.9 * (i + 1) / len(p['segs']), f'Schneide Clip {i + 1} von {len(p["segs"])} …')
    lst = tmp / 'list.txt'
    lst.write_text(''.join(f"file '{x}'\n" for x in parts), 'utf-8')
    run_ff(job, ['-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(out)], p['total'], 0.9, 1.0)


def export_project(job, proj, p0=0.0, p1=1.0):
    p = normalize_project(proj)
    cont = p['container']
    want_v, want_a = cont != 'mp3', cont != 'gif'
    if p['fast'] and cont == 'mp4':
        exts = {s['item']['ext'] for s in p['segs']}
        ext = exts.pop() if len(exts) == 1 and next(iter(exts)) in ('mp4', 'mov', 'mkv', 'webm', 'm4v') else 'mkv'
    else:
        ext = cont
    stem = os.path.splitext(p['name'])[0]
    with _lock:
        out = unique_path(EXP, f'{stem}.{ext}')
        out.touch()
    tmp_out = EXP / f'.{out.name}.part'
    span = p1 - p0
    try:
        if shutil.disk_usage(EXP).free < 300 * 1024 ** 2:
            raise RuntimeError('Zu wenig freier Speicherplatz für den Export.')
        if p['fast'] and cont == 'mp4':
            job.set(message='Blitz-Schnitt ohne Neukodierung …')
            tmp_out = EXP / f'.{out.stem}.part.{ext}'
            export_fast(job, p, tmp_out)
        else:
            fmt_flag = ['-f', {'mp4': 'mp4', 'webm': 'webm', 'gif': 'gif', 'mp3': 'mp3'}[cont]]
            extra = ['-movflags', '+faststart'] if cont == 'mp4' else []
            groups = [p['segs'][i:i + BATCH] for i in range(0, len(p['segs']), BATCH)]
            music_args = ['-stream_loop', '-1', '-i', p['music']['path']] if (p['music'] and want_a) else []
            if len(groups) == 1:
                job.set(message='Rendere …')
                inputs, parts = seg_graph(p, groups[0], want_v, want_a)
                maps = []
                if want_v:
                    vp = video_post(p, job, 0, p['total']) + ([GIF_TAIL] if cont == 'gif' else [])
                    parts.append('[vc]' + (','.join(vp) or 'null') + '[vo]')
                    maps += ['-map', '[vo]']
                if want_a:
                    parts += audio_post(p, len(groups[0]) if music_args else None)
                    maps += ['-map', '[ao]']
                run_ff(job, [*inputs, *music_args, '-filter_complex', ';'.join(parts), *maps,
                             *(video_codec(p) if want_v else ['-vn']), *audio_codec(p), *extra,
                             '-t', f"{p['total']:.3f}", *fmt_flag, str(tmp_out)], p['total'], p0, p1)
            else:
                tmp, files, offset = job.tmpdir(), [], 0.0
                for gi, g in enumerate(groups):
                    glen = sum((s['end'] - s['start']) / s['speed'] for s in g)
                    job.set(message=f'Rendere Teil {gi + 1} von {len(groups)} …')
                    inputs, parts = seg_graph(p, g, want_v, want_a)
                    maps = []
                    if want_v:
                        parts.append('[vc]' + (','.join(video_post(p, job, offset, glen)) or 'null') + '[vo]')
                        maps += ['-map', '[vo]']
                    if want_a:
                        maps += ['-map', '[ac]']
                    part = tmp / f'part{gi:04d}.mkv'
                    run_ff(job, [*inputs, '-filter_complex', ';'.join(parts), *maps,
                                 *(video_codec(p, final=False) if want_v else ['-vn']),
                                 *(['-c:a', 'flac'] if want_a else []), str(part)],
                           glen, p0 + span * 0.9 * offset / p['total'], p0 + span * 0.9 * (offset + glen) / p['total'])
                    files.append(part)
                    offset += glen
                lst = tmp / 'list.txt'
                lst.write_text(''.join(f"file '{x}'\n" for x in files), 'utf-8')
                job.set(message='Füge Teile zusammen …')
                parts, maps, vargs = [], [], ['-vn']
                if want_v:
                    if cont == 'mp4':
                        maps, vargs = ['-map', '0:v:0'], ['-c:v', 'copy']
                    else:
                        parts.append('[0:v:0]' + (GIF_TAIL if cont == 'gif' else 'null') + '[vo]')
                        maps, vargs = ['-map', '[vo]'], video_codec(p)
                if want_a:
                    parts.append('[0:a:0]anull[ac]')
                    parts += audio_post(p, 1 if music_args else None)
                    maps += ['-map', '[ao]']
                run_ff(job, ['-f', 'concat', '-safe', '0', '-i', str(lst), *music_args,
                             *(['-filter_complex', ';'.join(parts)] if parts else []), *maps, *vargs,
                             *audio_codec(p), *extra, '-t', f"{p['total']:.3f}", *fmt_flag, str(tmp_out)],
                       p['total'], p0 + span * 0.9, p1)
        os.replace(tmp_out, out)
    except BaseException:
        for f in (tmp_out, out):
            try:
                f.unlink()
            except OSError:
                pass
        raise
    item = build_item('exp', out)
    if not item:
        raise RuntimeError('Der Export wurde geschrieben, ist aber nicht lesbar.')
    return public(item)


# ───────────────────────────── Automatik & KI ─────────────────────────────

DEFAULT_RECIPE = {
    'removeSilence': True, 'removeBlack': True, 'highlights': 0, 'maxDuration': 0, 'keep': None,
    'preset': 'original', 'fit': None, 'normalize': True, 'enhance': False, 'stabilize': False, 'denoise': False,
    'speed': 1, 'mute': False, 'text': '', 'textPosition': 'bottom', 'fadeIn': 0, 'fadeOut': 0,
    'container': 'mp4', 'quality': 'medium', 'targetMB': 0, 'rotate': 0,
}


def clean_recipe(r):
    """Übernimmt nur bekannte Felder in erlaubten Grenzen."""
    r = r if isinstance(r, dict) else {}
    out = dict(DEFAULT_RECIPE)
    for k in ('removeSilence', 'removeBlack', 'normalize', 'enhance', 'stabilize', 'denoise', 'mute'):
        if k in r:
            out[k] = bool(r[k])
    out['highlights'] = clamp(num(r.get('highlights')), 0, 7200)
    out['maxDuration'] = clamp(num(r.get('maxDuration')), 0, 36000)
    if isinstance(r.get('keep'), list) and r['keep']:
        keep = [[num(a), num(b)] for a, b in (x for x in r['keep'] if isinstance(x, (list, tuple)) and len(x) == 2)]
        out['keep'] = [k for k in keep if k[1] > k[0]] or None
    if r.get('preset') in PRESET:
        out['preset'] = r['preset']
    if r.get('fit') in ('contain', 'cover', 'blur'):
        out['fit'] = r['fit']
    out['speed'] = clamp(num(r.get('speed'), 1), 0.25, 8)
    out['text'] = str(r.get('text') or '')[:200]
    if r.get('textPosition') in ('top', 'center', 'bottom'):
        out['textPosition'] = r['textPosition']
    out['fadeIn'], out['fadeOut'] = clamp(num(r.get('fadeIn')), 0, 5), clamp(num(r.get('fadeOut')), 0, 5)
    if r.get('container') in ('mp4', 'webm', 'gif', 'mp3'):
        out['container'] = r['container']
    if r.get('quality') in ('high', 'medium', 'small'):
        out['quality'] = r['quality']
    out['targetMB'] = clamp(num(r.get('targetMB')), 0, 100000)
    out['rotate'] = int(num(r.get('rotate'))) % 360 if int(num(r.get('rotate'))) % 90 == 0 else 0
    return out


def rules_recipe(prompt):
    """Versteht einfache deutsche Befehle ohne KI-Schlüssel."""
    t = ' ' + (prompt or '').lower() + ' '
    r, notes = dict(DEFAULT_RECIPE), []

    def has(*words):
        return any(w in t for w in words)

    if has('tiktok', 'reel', 'short', 'hochkant', 'story', 'vertikal', '9:16'):
        r['preset'] = 'vertical'; notes.append('Hochkant 9:16')
    elif has('quadrat', '1:1'):
        r['preset'] = 'square'; notes.append('Quadrat 1:1')
    elif has('instagram', 'insta', '4:5'):
        r['preset'] = 'insta'; notes.append('Instagram 4:5')
    elif has('youtube', '16:9', 'full hd', '1080'):
        r['preset'] = 'youtube'; notes.append('YouTube 16:9')
    elif has('whatsapp', 'telegram', 'twitter', ' x ', 'e-mail', 'email', 'mail', '720'):
        r['preset'] = 'hd'; r['quality'] = 'small'; notes.append('HD 720p, kompakt')
    m = re.search(r'(\d+(?:[.,]\d+)?)\s*(sekunden|sekunde|sek|sec|s|minuten|minute|min)\b', t)
    if m:
        secs = float(m.group(1).replace(',', '.')) * (60 if m.group(2).startswith('min') else 1)
        r['highlights'] = secs
        notes.append(f'Kurzfassung mit den lautesten Stellen, etwa {int(secs)} s')
    elif has('highlight', 'kurzfassung', 'zusammenfass', 'best of', 'das beste'):
        r['highlights'] = 60; notes.append('Kurzfassung, etwa 60 s')
    if has('ungeschnitten', 'nicht schneiden', 'ohne schnitt', 'komplett lassen'):
        r['removeSilence'] = r['removeBlack'] = False; notes.append('kein Schnitt')
    elif not r['highlights']:
        notes.append('Pausen und Schwarzbild raus')
    m = re.search(r'(\d+)\s*mb\b', t)
    if m:
        r['targetMB'] = float(m.group(1)); notes.append(f'Zielgröße {m.group(1)} MB')
    elif has('klein', 'komprim', 'verklein', 'platz sparen'):
        r['quality'] = 'small'; notes.append('klein komprimiert')
    elif has('beste qualität', 'hohe qualität', 'maximale qualität'):
        r['quality'] = 'high'; notes.append('hohe Qualität')
    if has(' gif'):
        r['container'] = 'gif'; notes.append('als GIF')
    elif has('mp3', 'nur ton', 'nur audio', 'tonspur'):
        r['container'] = 'mp3'; notes.append('nur Ton als MP3')
    elif has('webm'):
        r['container'] = 'webm'; notes.append('als WebM')
    if has('stumm', 'ohne ton', 'ton aus', 'ton weg'):
        r['mute'] = True; notes.append('ohne Ton')
    if has('zeitraffer', 'doppelt so schnell', 'doppelte geschwindigkeit'):
        r['speed'] = 2; notes.append('doppelte Geschwindigkeit')
    elif has('schneller'):
        r['speed'] = 1.5; notes.append('1,5-fache Geschwindigkeit')
    elif has('zeitlupe', 'langsamer', 'halbe geschwindigkeit'):
        r['speed'] = 0.5; notes.append('Zeitlupe')
    if has('stabil', 'verwackel', 'wackel'):
        r['stabilize'] = True; notes.append('stabilisiert')
    if has('rausch', 'entrausch'):
        r['denoise'] = True; notes.append('entrauscht')
    if has('farbe', 'verbesser', 'aufhübsch', 'optimier', 'schöner', 'kontrast'):
        r['enhance'] = True; notes.append('Farben automatisch verbessert')
    if has('einblend', 'ausblend', 'blende', 'fade'):
        r['fadeIn'] = r['fadeOut'] = 0.6; notes.append('Ein- und Ausblenden')
    if has('drehen', 'gedreht', 'rotier'):
        r['rotate'] = 270 if has('links') else 180 if has('180', 'kopf') else 90
        notes.append(f"um {r['rotate']}° gedreht")
    m = re.search(r'(?:titel|text|schriftzug|überschrift)\s*[:=]?\s*["„“\'»]([^"“”\'«]{1,120})["“”\'«]', prompt or '', re.I)
    if m:
        r['text'] = m.group(1).strip(); notes.append(f'Text „{r["text"]}“')
    return r, 'Regeln: ' + ', '.join(notes) + '.'


def config():
    return read_json(CONFIG, {})


def ai_ready():
    return bool(config().get('aiKey'))


def ai_call(system, content, max_tokens=1500):
    """Fragt die Claude-API. Wirft RuntimeError mit lesbarem deutschem Text."""
    cfg = config()
    key = cfg.get('aiKey')
    if not key:
        raise RuntimeError('Kein KI-Schlüssel hinterlegt.')
    body = json.dumps({'model': cfg.get('aiModel') or AI_MODEL, 'max_tokens': max_tokens,
                       'system': system, 'messages': [{'role': 'user', 'content': content}]}).encode()
    req = urllib.request.Request(AI_URL, data=body, method='POST', headers={
        'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01'})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        detail = ''
        try:
            detail = (json.loads(e.read().decode('utf-8')).get('error') or {}).get('message', '')
        except Exception:
            pass
        if e.code == 401:
            raise RuntimeError('Der KI-Schlüssel wurde abgelehnt (401).') from None
        raise RuntimeError(f'KI-Dienst meldet Fehler {e.code}. {detail}'.strip()) from None
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f'KI-Dienst nicht erreichbar: {e}') from None
    text = ''.join(b.get('text', '') for b in data.get('content', []) if b.get('type') == 'text')
    m = re.search(r'\{.*\}', text, re.S)
    if not m:
        raise RuntimeError('Die KI hat keine verwertbare Antwort geliefert.')
    try:
        return json.loads(m.group(0))
    except ValueError:
        raise RuntimeError('Die KI-Antwort war kein gültiges JSON.') from None


def grab_frame(item, t, width=384):
    r = ff_quiet([*(['-ss', f'{t:.2f}'] if t > 0 else []), '-i', item['path'], '-frames:v', '1', '-vf', f'scale={width}:-2',
                  '-q:v', '7', '-f', 'mjpeg', '-'], 60)
    return r.stdout if r.returncode == 0 and r.stdout else None


AI_VIDEO_SYSTEM = """Du bist die Regie in einem Videoschnittprogramm. Der Nutzer beschreibt auf Deutsch, was aus
seinem Video werden soll. Du antwortest NUR mit einem JSON-Objekt:
{"recipe": {...}, "explanation": "ein bis zwei kurze deutsche Sätze, was du machst",
 "caption": "kurzer Beschreibungstext zum Teilen", "hashtags": ["..."]}

Felder von recipe (alle optional):
 removeSilence (bool)  Sprechpausen entfernen
 removeBlack (bool)    Schwarzbild entfernen
 highlights (Sekunden) Kurzfassung dieser Länge aus den lautesten Stellen; 0 = aus
 maxDuration (Sekunden) Ergebnis hart auf diese Länge kürzen; 0 = aus
 keep [[start,ende],...] genaue Bereiche in Sekunden der Quelle, die bleiben sollen; setzt sich gegen
                       removeSilence/highlights durch. Nur verwenden, wenn der Nutzer Stellen nennt oder
                       die Standbilder klar zeigen, was wichtig ist.
 preset  "original" | "youtube" (1920x1080) | "vertical" (1080x1920, TikTok/Reels/Shorts) |
         "insta" (1080x1350) | "square" (1080x1080) | "hd" (1280x720)
 fit     "contain" (Balken) | "cover" (zuschneiden) | "blur" (unscharfer Hintergrund)
 normalize, enhance, stabilize, denoise, mute (bool)
 speed (0.25–8), rotate (0|90|180|270), fadeIn, fadeOut (Sekunden)
 text (Schriftzug im Bild), textPosition "top"|"center"|"bottom"
 container "mp4"|"webm"|"gif"|"mp3", quality "high"|"medium"|"small", targetMB (Zahl; 0 = aus)

Ohne besonderen Wunsch: removeSilence und removeBlack an, normalize an, preset "original", mp4."""


def ai_video_plan(job, item, prompt, analysis):
    content = []
    if config().get('sendFrames', True) and item['kind'] in ('video', 'gif'):
        dur = item.get('duration', 0)
        for i in range(6):
            t = dur * (i + 0.5) / 6
            frame = grab_frame(item, t)
            if frame:
                content.append({'type': 'text', 'text': f'Standbild bei {t:.1f} s:'})
                content.append({'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg',
                                                             'data': base64.b64encode(frame).decode()}})
    info = {k: item.get(k) for k in ('name', 'kind', 'duration', 'width', 'height', 'fps', 'hasAudio')}
    info.update(analysis)
    content.append({'type': 'text', 'text': 'Datei und Analyse:\n' + json.dumps(info, ensure_ascii=False)
                                            + '\n\nWunsch des Nutzers:\n' + (prompt or 'Bitte sinnvoll automatisch schneiden.')})
    return ai_call(AI_VIDEO_SYSTEM, content)


def auto_job(job, iid, prompt, recipe, run):
    """Automatik: Plan (KI oder Regeln) -> Analyse -> Projekt -> optional Export."""
    item = need_item(iid)
    if item['kind'] == 'image':
        raise RuntimeError('Fotos werden im Foto-Editor automatisch verbessert.')
    dur = item.get('duration', 0)
    visual = item['kind'] in ('video', 'gif')
    notes, source, caption, hashtags = '', 'regeln', '', []
    silence = black = curve = None

    if recipe is None:
        if ai_ready():
            job.set(0.02, 'Analysiere für die KI …')
            analysis = {}
            if item.get('hasAudio'):
                silence = detect_silence(job, item, p0=0.02, p1=0.12)
                analysis['pausen'] = {'anzahl': len(silence), 'sekunden': round(sum(e - s for s, e in silence), 1),
                                      'bereiche': [[round(s, 1), round(e, 1)] for s, e in silence[:80]]}
                curve = loudness_curve(job, item, 0.12, 0.2)
                step = max(1, len(curve) // 120)
                analysis['lautstaerke_dB'] = [[round(t), round(db)] for t, db in curve[::step]]
            try:
                job.set(0.2, 'Die KI plant den Schnitt …')
                ans = ai_video_plan(job, item, prompt, analysis)
                recipe = clean_recipe(ans.get('recipe'))
                notes, source = str(ans.get('explanation') or ''), 'ki'
                caption = str(ans.get('caption') or '')
                hashtags = [str(h) for h in (ans.get('hashtags') or [])][:15]
            except RuntimeError as e:
                recipe, notes = rules_recipe(prompt)
                notes = f'KI nicht verfügbar ({e}) – {notes}'
        else:
            recipe, notes = rules_recipe(prompt)
    else:
        recipe, notes = clean_recipe(recipe), 'Eigene Einstellungen.'

    base = 0.25 if source == 'ki' else 0.0
    keep = [[0.0, dur]]
    if recipe['keep']:
        keep = tidy(recipe['keep'], dur)
    elif recipe['highlights'] and dur > recipe['highlights']:
        job.set(base, 'Suche die besten Stellen …')
        if curve is None and item.get('hasAudio'):
            curve = loudness_curve(job, item, base, 0.4)
        keep = pick_highlights(curve or [], dur, recipe['highlights'])
    else:
        if recipe['removeSilence'] and item.get('hasAudio'):
            job.set(base, 'Suche Pausen …')
            if silence is None:
                silence = detect_silence(job, item, p0=base, p1=0.3)
            keep = subtract(keep, silence, 0.12)
        if recipe['removeBlack'] and visual:
            job.set(0.3, 'Suche Schwarzbild …')
            black = detect_black(job, item, p0=0.3, p1=0.4)
            keep = subtract(keep, black)
        keep = tidy(keep, dur)
    if not keep:
        keep = [[0.0, dur]]
        notes += ' Achtung: Nach dem Schnitt wäre nichts übrig geblieben – das Video bleibt ungeschnitten.'
    if recipe['maxDuration']:
        keep = limit_total(keep, recipe['maxDuration'] * recipe['speed'])

    pre = PRESET[recipe['preset']]
    stem = os.path.splitext(item['name'])[0]
    project = {
        'name': f'{stem} – Auto',
        'segments': [{'src': item['id'], 'start': s, 'end': e, 'speed': recipe['speed'], 'volume': 1} for s, e in keep],
        'format': {'preset': pre['key'], 'width': pre['w'], 'height': pre['h'], 'fit': recipe['fit'] or pre['fit']},
        'look': {'brightness': 0, 'contrast': 1, 'saturation': 1, 'rotate': recipe['rotate'], 'flipH': False,
                 'enhance': recipe['enhance'], 'stabilize': recipe['stabilize'], 'denoise': recipe['denoise']},
        'audio': {'mute': recipe['mute'], 'volume': 1, 'normalize': recipe['normalize'] and item.get('hasAudio', False), 'music': None},
        'fadeIn': recipe['fadeIn'], 'fadeOut': recipe['fadeOut'],
        'text': {'content': recipe['text'], 'position': recipe['textPosition'], 'size': 6, 'color': '#ffffff', 'start': 0, 'end': 0},
        'output': {'container': recipe['container'], 'quality': recipe['quality'], 'targetMB': recipe['targetMB'], 'fast': False},
    }
    kept = sum(e - s for s, e in keep)
    result = {'project': project, 'notes': notes.strip(), 'source': source, 'caption': caption, 'hashtags': hashtags,
              'kept': round(kept, 2), 'removed': round(max(0, dur - kept), 2), 'clips': len(keep), 'sourceId': item['id']}
    if run:
        job.set(0.4, 'Rendere …')
        result['item'] = export_project(job, project, 0.4, 1.0)
    return result


AI_PHOTO_SYSTEM = """Du bist Bildbearbeiter. Du siehst ein Foto und den Wunsch des Nutzers. Antworte NUR mit JSON:
{"adjust": {"brightness": -100..100, "contrast": -100..100, "saturation": -100..100, "warmth": -100..100,
            "sharpen": 0..100, "blur": 0..100, "vignette": 0..100,
            "filter": "none"|"bw"|"sepia"|"vintage"|"cool"|"warm"|"dramatic"|"fade",
            "auto": bool, "rotate": 0|90|180|270, "flipH": bool,
            "crop": {"x":0..1,"y":0..1,"w":0..1,"h":0..1} oder null,
            "text": "" , "textPosition": "top"|"center"|"bottom"},
 "explanation": "ein kurzer deutscher Satz", "caption": "kurzer Text zum Teilen", "hashtags": ["..."]}
crop ist relativ zum Bild (0..1, linke obere Ecke + Breite/Höhe). Sei zurückhaltend: natürliche Ergebnisse."""


def ai_photo(item, prompt):
    r = ff_quiet(['-i', item['path'], '-frames:v', '1', '-vf', 'scale=768:768:force_original_aspect_ratio=decrease',
                  '-q:v', '5', '-f', 'mjpeg', '-'], 60)
    if r.returncode != 0 or not r.stdout:
        raise RuntimeError('Das Foto konnte nicht gelesen werden.')
    return ai_call(AI_PHOTO_SYSTEM, [
        {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': base64.b64encode(r.stdout).decode()}},
        {'type': 'text', 'text': 'Wunsch: ' + (prompt or 'Bitte das Foto natürlich verbessern.')}], 800)


def ai_caption(item, platform, hint):
    content = []
    if item['kind'] != 'audio' and config().get('sendFrames', True):
        frame = grab_frame(item, min(item.get('duration', 0) * 0.3, 20)) if item['kind'] != 'image' else None
        if item['kind'] == 'image':
            r = ff_quiet(['-i', item['path'], '-frames:v', '1', '-vf', 'scale=512:512:force_original_aspect_ratio=decrease',
                          '-q:v', '6', '-f', 'mjpeg', '-'], 60)
            frame = r.stdout if r.returncode == 0 else None
        if frame:
            content.append({'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg',
                                                         'data': base64.b64encode(frame).decode()}})
    content.append({'type': 'text', 'text': f"Datei: {item['name']}\nPlattform: {platform or 'allgemein'}\n"
                                            f"Hinweis des Nutzers: {hint or '-'}"})
    return ai_call('Du schreibst kurze deutsche Beitragstexte für soziale Medien. Antworte NUR mit JSON: '
                   '{"caption": "ein bis drei Sätze, ehrlich, ohne Werbefloskeln", "hashtags": ["#..."]} '
                   '– höchstens 8 Hashtags, passend zur Plattform.', content, 500)


# ───────────────────────────── QR-Code ─────────────────────────────

def _gf_tables():
    exp, log, x = [0] * 512, [0] * 256, 1
    for i in range(255):
        exp[i], log[x] = x, i
        x <<= 1
        if x & 0x100:
            x ^= 0x11d
    for i in range(255, 512):
        exp[i] = exp[i - 255]
    return exp, log


_EXP, _LOG = _gf_tables()
# Version: (Datenbytes, Fehlerkorrekturbytes) für Stufe L, ein Block (Version 1–5)
_QR = {1: (19, 7), 2: (34, 10), 3: (55, 15), 4: (80, 20), 5: (108, 26)}


def _rs(data, n):
    gen = [1]
    for i in range(n):
        nxt = [0] * (len(gen) + 1)
        for j, g in enumerate(gen):
            nxt[j] ^= g
            nxt[j + 1] ^= _EXP[_LOG[g] + i] if g else 0
        gen = nxt
    rem = list(data) + [0] * n
    for i in range(len(data)):
        f = rem[i]
        if f:
            for j in range(1, len(gen)):
                if gen[j]:
                    rem[i + j] ^= _EXP[_LOG[gen[j]] + _LOG[f]]
    return rem[len(data):]


def qr_matrix(text):
    data = text.encode('utf-8')
    ver = next((v for v, (cap, _) in _QR.items() if len(data) + 2 <= cap), None)
    if ver is None:
        raise ValueError('Text zu lang für den QR-Code')
    cap, ecn = _QR[ver]
    bits = [0, 1, 0, 0] + [(len(data) >> i) & 1 for i in range(7, -1, -1)]
    for b in data:
        bits += [(b >> i) & 1 for i in range(7, -1, -1)]
    bits += [0] * min(4, cap * 8 - len(bits))
    bits += [0] * (-len(bits) % 8)
    cw = [int(''.join(map(str, bits[i:i + 8])), 2) for i in range(0, len(bits), 8)]
    pad = 0
    while len(cw) < cap:
        cw.append((0xEC, 0x11)[pad % 2])
        pad += 1
    cw += _rs(cw, ecn)
    stream = [(c >> i) & 1 for c in cw for i in range(7, -1, -1)]

    n = 17 + 4 * ver
    m = [[None] * n for _ in range(n)]

    def finder(r, c):
        for dr in range(-1, 8):
            for dc in range(-1, 8):
                rr, cc = r + dr, c + dc
                if 0 <= rr < n and 0 <= cc < n:
                    inside = 0 <= dr <= 6 and 0 <= dc <= 6
                    m[rr][cc] = 1 if inside and (dr in (0, 6) or dc in (0, 6) or (2 <= dr <= 4 and 2 <= dc <= 4)) else 0

    finder(0, 0), finder(0, n - 7), finder(n - 7, 0)
    if ver >= 2:
        a = n - 7
        for dr in range(-2, 3):
            for dc in range(-2, 3):
                m[a + dr][a + dc] = 1 if max(abs(dr), abs(dc)) != 1 else 0
    for i in range(8, n - 8):
        m[6][i] = m[i][6] = 1 - i % 2
    m[n - 8][8] = 1
    fmt_cells = ([(8, i) for i in (0, 1, 2, 3, 4, 5, 7, 8)] + [(i, 8) for i in (7, 5, 4, 3, 2, 1, 0)],
                 [(n - 1 - i, 8) for i in range(7)] + [(8, n - 8 + i) for i in range(8)])
    for cells in fmt_cells:
        for r, c in cells:
            if m[r][c] is None:
                m[r][c] = 0
    free = [[m[r][c] is None for c in range(n)] for r in range(n)]

    k, col, up = 0, n - 1, True
    while col > 0:
        if col == 6:
            col -= 1
        for r in (range(n - 1, -1, -1) if up else range(n)):
            for c in (col, col - 1):
                if free[r][c]:
                    m[r][c] = stream[k] if k < len(stream) else 0
                    k += 1
        up, col = not up, col - 2

    masks = [lambda r, c: (r + c) % 2 == 0, lambda r, c: r % 2 == 0, lambda r, c: c % 3 == 0,
             lambda r, c: (r + c) % 3 == 0, lambda r, c: (r // 2 + c // 3) % 2 == 0,
             lambda r, c: (r * c) % 2 + (r * c) % 3 == 0, lambda r, c: ((r * c) % 2 + (r * c) % 3) % 2 == 0,
             lambda r, c: ((r + c) % 2 + (r * c) % 3) % 2 == 0]

    def build(mi):
        g = [[(m[r][c] ^ 1 if free[r][c] and masks[mi](r, c) else m[r][c]) for c in range(n)] for r in range(n)]
        d = (0b01 << 3) | mi
        rem = d << 10
        for i in range(14, 9, -1):
            if rem >> i & 1:
                rem ^= 0x537 << (i - 10)
        f = ((d << 10) | rem) ^ 0x5412
        fb = [(f >> i) & 1 for i in range(14, -1, -1)]
        for cells in fmt_cells:
            for (r, c), b in zip(cells, fb):
                g[r][c] = b
        return g

    def penalty(g):
        score = 0
        for lines in (g, list(zip(*g))):
            for line in lines:
                run = 1
                for i in range(1, n):
                    if line[i] == line[i - 1]:
                        run += 1
                    else:
                        score += run - 2 if run >= 5 else 0
                        run = 1
                score += run - 2 if run >= 5 else 0
                s = ''.join(map(str, line))
                score += 40 * (s.count('10111010000') + s.count('00001011101'))
        for r in range(n - 1):
            for c in range(n - 1):
                if g[r][c] == g[r][c + 1] == g[r + 1][c] == g[r + 1][c + 1]:
                    score += 3
        dark = sum(map(sum, g)) * 100 // (n * n)
        return score + 10 * (abs(dark - 50) // 5)

    return min((build(i) for i in range(8)), key=penalty)


def qr_svg(text):
    g = qr_matrix(text)
    n = len(g)
    path = ''.join(f'M{c + 4} {r + 4}h1v1h-1z' for r in range(n) for c in range(n) if g[r][c])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n + 8} {n + 8}" shape-rendering="crispEdges">'
            f'<rect width="100%" height="100%" fill="#fff"/><path d="{path}" fill="#000"/></svg>')


# ───────────────────────────── Handy-Freigabe ─────────────────────────────

SHARES = {}          # token -> {'path', 'name', 'kind', 'expires'}
_share_server = None
SHARE_TTL = 2 * 3600


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def send_file(h, path, ctype, download=None, head=False):
    """Liefert eine Datei mit Range-Unterstützung (nötig zum Spulen im Video)."""
    try:
        size = os.path.getsize(path)
        f = open(path, 'rb')
    except OSError:
        h.send_error(404)
        return
    with f:
        start, end, status = 0, size - 1, 200
        m = re.match(r'bytes=(\d*)-(\d*)$', h.headers.get('Range', '') or '')
        if m and (m.group(1) or m.group(2)):
            if m.group(1):
                start = int(m.group(1))
                end = min(int(m.group(2)), size - 1) if m.group(2) else size - 1
            else:
                start = max(0, size - int(m.group(2)))
            if start > end or start >= size:
                h.send_response(416)
                h.send_header('Content-Range', f'bytes */{size}')
                h.end_headers()
                return
            status = 206
        h.send_response(status)
        h.send_header('Content-Type', ctype)
        h.send_header('Accept-Ranges', 'bytes')
        h.send_header('Content-Length', str(end - start + 1))
        if status == 206:
            h.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        if download:
            h.send_header('Content-Disposition', "attachment; filename*=UTF-8''" + urllib.parse.quote(download))
        h.send_header('Cache-Control', 'private, max-age=3600')
        h.cors()
        h.end_headers()
        if head:
            return
        f.seek(start)
        left = end - start + 1
        try:
            while left > 0:
                chunk = f.read(min(262144, left))
                if not chunk:
                    break
                h.wfile.write(chunk)
                left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError, socket.timeout):
            pass


class ShareHandler(BaseHTTPRequestHandler):
    """Öffentlich im WLAN erreichbar – liefert ausschließlich freigegebene Dateien."""
    protocol_version = 'HTTP/1.1'

    def log_message(self, *a):
        pass

    def cors(self):
        pass

    def do_GET(self):
        m = re.fullmatch(r'/s/([A-Za-z0-9_-]{8,})(/file)?', urllib.parse.urlsplit(self.path).path)
        sh = SHARES.get(m.group(1)) if m else None
        if not sh or sh['expires'] < time.time() or not os.path.exists(sh['path']):
            body = '<meta charset="utf-8"><h3>Diese Freigabe gibt es nicht (mehr).</h3>'.encode()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        ext = os.path.splitext(sh['name'])[1].lower().lstrip('.')
        if m.group(2):
            dl = 'dl=1' in (urllib.parse.urlsplit(self.path).query or '')
            send_file(self, sh['path'], MIME.get(ext, 'application/octet-stream'), sh['name'] if dl else None)
            return
        name = (sh['name'].replace('&', '&amp;').replace('<', '&lt;'))
        src = f"/s/{m.group(1)}/file"
        prev = (f'<video src="{src}" controls playsinline></video>' if sh['kind'] == 'video'
                else f'<img src="{src}" alt="">' if sh['kind'] in ('image', 'gif')
                else f'<audio src="{src}" controls></audio>')
        size = os.path.getsize(sh['path']) / 1048576
        body = f"""<!doctype html><html lang="de"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{name}</title>
<style>body{{margin:0;font-family:system-ui,sans-serif;background:#0d0d1a;color:#e2e8f0;padding:20px;text-align:center}}
video,img{{max-width:100%;max-height:60vh;border-radius:12px;background:#000}}audio{{width:100%}}
h1{{font-size:17px;word-break:break-word}}p{{color:#8b9cb5;font-size:14px;line-height:1.5}}
a.b{{display:block;background:#7c3aed;color:#fff;text-decoration:none;padding:16px;border-radius:12px;font-weight:600;font-size:17px;margin:18px 0}}</style>
<h1>{name}</h1>{prev}
<a class="b" href="{src}?dl=1" download>Herunterladen ({size:.1f} MB)</a>
<p>Danach in der Galerie oder im Dateimanager auf „Teilen“ tippen – so geht die Datei an jede App auf dem Handy.</p>
</html>""".encode()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    do_HEAD = do_GET


def share_start(item):
    global _share_server
    ip = lan_ip()
    if not ip or ip.startswith('127.'):
        raise RuntimeError('Kein Netzwerk gefunden. Der Rechner muss im selben WLAN/LAN wie das Handy sein.')
    with _lock:
        if _share_server is None:
            _share_server = ThreadingHTTPServer(('0.0.0.0', 0), ShareHandler)
            _share_server.daemon_threads = True
            threading.Thread(target=_share_server.serve_forever, daemon=True).start()
        token = secrets.token_urlsafe(9)
        SHARES[token] = {'path': item['path'], 'name': item['name'], 'kind': item['kind'],
                         'expires': time.time() + SHARE_TTL}
        url = f'http://{ip}:{_share_server.server_address[1]}/s/{token}'
    return {'url': url, 'qr': qr_svg(url), 'minutes': SHARE_TTL // 60}


def share_stop():
    global _share_server
    with _lock:
        SHARES.clear()
        srv, _share_server = _share_server, None
    if srv:
        threading.Thread(target=lambda: (srv.shutdown(), srv.server_close()), daemon=True).start()


def reveal(path):
    """Zeigt die Datei im Dateimanager (markiert, wenn der Dateimanager das kann)."""
    uri = Path(path).as_uri()
    try:
        r = subprocess.run(['dbus-send', '--session', '--dest=org.freedesktop.FileManager1', '--type=method_call',
                            '/org/freedesktop/FileManager1', 'org.freedesktop.FileManager1.ShowItems',
                            f'array:string:{uri}', 'string:'], capture_output=True, timeout=5)
        if r.returncode == 0:
            return True
    except Exception:
        pass
    if have('xdg-open'):
        subprocess.Popen(['xdg-open', str(Path(path).parent)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    return False


# ───────────────────────────── HTTP ─────────────────────────────

TOKEN = ''


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'JarvisMedia/' + VERSION

    def log_message(self, *a):
        pass

    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')

    def reply(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.cors()
        self.end_headers()
        self.wfile.write(body)

    def fail(self, status, msg):
        self.close_connection = True
        self.reply({'error': msg}, status)

    def body_json(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n > 2 * 1024 * 1024:
            raise ValueError('Anfrage zu groß')
        return json.loads(self.rfile.read(n).decode('utf-8') or '{}') if n else {}

    def authed(self):
        host = (self.headers.get('Host') or '').split(':')[0]
        if host not in ('127.0.0.1', 'localhost'):
            return False
        given = self.q.get('t') or self.headers.get('X-Jarvis-Token') or ''
        return hmac.compare_digest(given.encode(), TOKEN.encode())

    def route(self, method):
        global _last_request
        _last_request = time.time()
        parts = urllib.parse.urlsplit(self.path)
        self.q = dict(urllib.parse.parse_qsl(parts.query))
        path = parts.path
        if not self.authed():
            return self.fail(403, 'Zugriff verweigert')
        try:
            self.dispatch(method, path)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except RuntimeError as e:
            self.fail(400, str(e))
        except Exception as e:  # noqa: BLE001
            self.fail(500, f'Interner Fehler: {e}')

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Jarvis-Token')
        self.send_header('Access-Control-Max-Age', '86400')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        self.route('GET')

    def do_HEAD(self):
        self.route('HEAD')

    def do_POST(self):
        self.route('POST')

    def do_PUT(self):
        self.route('PUT')

    def do_DELETE(self):
        self.route('DELETE')

    # ── Routen ──
    def dispatch(self, method, path):
        if path == '/api/ping':
            cfg = config()
            free = shutil.disk_usage(ROOT).free
            return self.reply({'ok': True, 'version': VERSION, 'ffmpeg': have('ffmpeg') and have('ffprobe'),
                               'maxUpload': MAX_UPLOAD, 'free': free, 'root': str(ROOT), 'presets': PRESETS,
                               'platforms': sorted(PLATFORMS), 'ai': bool(cfg.get('aiKey')),
                               'aiModel': cfg.get('aiModel') or AI_MODEL, 'sendFrames': cfg.get('sendFrames', True),
                               'shares': len(SHARES)})
        if path == '/api/library' and method == 'GET':
            return self.reply({'items': [public(i) for i in list_items()]})
        if path == '/api/upload' and method == 'PUT':
            return self.upload(LIB)
        if path == '/api/photo' and method == 'PUT':
            return self.upload(EXP, 300 * 1024 ** 2)
        if path == '/api/jobs' and method == 'GET':
            return self.reply({'jobs': [j.json() for j in reversed(JOBS.values())]})
        if path == '/api/config' and method == 'POST':
            return self.set_config()
        if path == '/api/share/stop' and method == 'POST':
            share_stop()
            return self.reply({'ok': True})

        m = re.fullmatch(r'/api/job/([0-9a-f]+)(/cancel)?', path)
        if m:
            job = JOBS.get(m.group(1))
            if not job:
                return self.fail(404, 'Auftrag nicht gefunden')
            if m.group(2) and method == 'POST':
                job.cancel = True
                if job.proc:
                    try:
                        job.proc.terminate()
                    except OSError:
                        pass
            return self.reply(job.json())

        m = re.fullmatch(r'/media/([0-9a-f]+)(?:/(thumb|wave|proxy|conv))?', path)
        if m and method in ('GET', 'HEAD'):
            return self.media(m.group(1), m.group(2), method == 'HEAD')

        if method == 'POST':
            body = self.body_json()
            if path == '/api/analyze':
                item = need_item(body.get('id'))
                names = {'silence': 'Pausen suchen', 'black': 'Schwarzbild suchen', 'scenes': 'Szenen suchen',
                         'highlights': 'Highlights suchen'}
                kind = body.get('kind')
                if kind not in names:
                    return self.fail(400, 'Unbekannte Analyse')
                return self.reply(start_job('analyze', f"{names[kind]}: {item['name']}", analyze_job,
                                            item['id'], kind, body.get('params')).json())
            if path == '/api/export':
                proj = body.get('project') or {}
                return self.reply(start_job('export', 'Export: ' + safe_name(proj.get('name') or 'Video'),
                                            export_project, proj).json())
            if path == '/api/auto':
                item = need_item(body.get('id'))
                run = body.get('run', True)
                title = ('Automatik: ' if run else 'Schnittplan: ') + item['name']
                return self.reply(start_job('auto', title, auto_job, item['id'], str(body.get('prompt') or ''),
                                            body.get('recipe'), bool(run)).json())
            if path == '/api/proxy':
                item = need_item(body.get('id'))
                return self.reply(start_job('proxy', 'Vorschau: ' + item['name'], proxy_job, item['id']).json())
            if path == '/api/ai/photo':
                return self.reply(ai_photo(need_item(body.get('id')), str(body.get('prompt') or '')))
            if path == '/api/ai/caption':
                return self.reply(ai_caption(need_item(body.get('id')), str(body.get('platform') or ''),
                                             str(body.get('hint') or '')))
            if path == '/api/reveal':
                target = need_item(body['id'])['path'] if body.get('id') else str(ROOT)
                return self.reply({'ok': reveal(target), 'path': target})
            if path == '/api/open':
                url = PLATFORMS.get(body.get('platform'))
                if not url:
                    return self.fail(400, 'Unbekannte Plattform')
                item = get_item(body.get('id')) if body.get('id') else None
                opened = False
                if have('xdg-open'):
                    subprocess.Popen(['xdg-open', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    opened = True
                return self.reply({'ok': opened, 'url': url, 'revealed': bool(item and reveal(item['path']))})
            if path == '/api/share/lan':
                return self.reply(share_start(need_item(body.get('id'))))
            m = re.fullmatch(r'/api/item/([0-9a-f]+)/rename', path)
            if m:
                return self.rename(m.group(1), body)

        m = re.fullmatch(r'/api/item/([0-9a-f]+)', path)
        if m and method == 'DELETE':
            item = need_item(m.group(1))
            os.remove(item['path'])
            for f in CACHE.glob(item['id'] + '-*'):
                f.unlink(missing_ok=True)
            return self.reply({'ok': True})
        self.fail(404, 'Nicht gefunden')

    def upload(self, folder, limit=MAX_UPLOAD):
        self.close_connection = True       # bei Abbruch nie Reste des Uploads als nächste Anfrage lesen
        n = int(self.headers.get('Content-Length') or -1)
        name = safe_name(self.q.get('name') or 'Datei')
        ext = os.path.splitext(name)[1].lower().lstrip('.')
        if n < 0:
            return self.fail(411, 'Dateigröße fehlt')
        if n > limit:
            return self.fail(413, f'Die Datei ist größer als {limit / 1024 ** 3:.0f} GB.')
        if ext not in KIND_BY_EXT:
            return self.fail(415, f'Dateityp .{ext} wird nicht unterstützt.')
        if shutil.disk_usage(folder).free < n + 200 * 1024 ** 2:
            return self.fail(507, 'Nicht genug freier Speicherplatz auf der Festplatte.')
        part = folder / f'.{secrets.token_hex(6)}.part'
        try:
            left = n
            with open(part, 'wb') as f:
                while left > 0:
                    chunk = self.rfile.read(min(1048576, left))
                    if not chunk:
                        raise ConnectionError('Upload abgebrochen')
                    f.write(chunk)
                    left -= len(chunk)
            with _lock:
                dest = unique_path(folder, name)
                os.replace(part, dest)
            item = build_item('lib' if folder == LIB else 'exp', dest)
            if not item:
                dest.unlink(missing_ok=True)
                return self.fail(415, 'Die Datei ist keine lesbare Bild-, Video- oder Tondatei.')
            self.reply(public(item))
        finally:
            part.unlink(missing_ok=True)

    def rename(self, iid, body):
        item = need_item(iid)
        new = safe_name(body.get('name') or '')
        if '.' not in new or os.path.splitext(new)[1].lower().lstrip('.') != item['ext']:
            new = os.path.splitext(new)[0] + '.' + item['ext']
        src = Path(item['path'])
        dest = unique_path(src.parent, new)
        os.replace(src, dest)
        self.reply(public(build_item(item['folder'], dest)))

    def media(self, iid, sub, head):
        item = get_item(iid)
        if not item:
            return self.fail(404, 'Datei nicht gefunden')
        if sub == 'thumb':
            f = make_thumb(item)
            return send_file(self, f, 'image/jpeg', head=head) if f else self.fail(404, 'Kein Vorschaubild')
        if sub == 'wave':
            f = make_wave(item)
            return send_file(self, f, 'image/png', head=head) if f else self.fail(404, 'Keine Wellenform')
        if sub == 'conv':
            f = make_conv(item)
            return send_file(self, f, 'image/png', head=head) if f else self.fail(404, 'Nicht umwandelbar')
        if sub == 'proxy':
            f = cache_file(item, '.proxy.mp4')
            return send_file(self, f, 'video/mp4', head=head) if f.exists() else self.fail(404, 'Keine Vorschau')
        send_file(self, item['path'], MIME.get(item['ext'], 'application/octet-stream'),
                  item['name'] if self.q.get('dl') else None, head)

    def set_config(self):
        body = self.body_json()
        cfg = config()
        if 'aiKey' in body:
            key = str(body['aiKey'] or '').strip()
            if key:
                cfg['aiKey'] = key
            else:
                cfg.pop('aiKey', None)
        if 'aiModel' in body:
            cfg['aiModel'] = re.sub(r'[^A-Za-z0-9._-]', '', str(body['aiModel'] or ''))[:60] or AI_MODEL
        if 'sendFrames' in body:
            cfg['sendFrames'] = bool(body['sendFrames'])
        write_json(CONFIG, cfg, private=True)
        self.reply({'ok': True, 'ai': bool(cfg.get('aiKey'))})


def proxy_job(job, iid):
    """Kleine H.264-Vorschau für Formate, die der Browser nicht abspielen kann."""
    item = need_item(iid)
    out = cache_file(item, '.proxy.mp4')
    if not out.exists():
        tmp = out.with_name('tmp-' + out.name)
        try:
            job.set(message='Erzeuge Vorschau …')
            run_ff(job, ['-i', item['path'], '-map', f"0:{item['_meta'].get('vidx', 0)}", '-map', '0:a:0?',
                         '-vf', "scale='min(854,iw)':-2", '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
                         '-pix_fmt', 'yuv420p', '-g', '30', '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
                         '-movflags', '+faststart', '-f', 'mp4', str(tmp)], item.get('duration', 0))
            os.replace(tmp, out)
        finally:
            tmp.unlink(missing_ok=True)
    return {'id': item['id']}


# ───────────────────────────── Start ─────────────────────────────

def ping(port, token):
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/ping?t={token}', timeout=1.5) as r:
            return json.loads(r.read().decode()).get('ok') is True
    except Exception:
        return False


def cleanup_cache():
    """Räumt Reste abgebrochener Aufträge und alte abgeleitete Dateien weg."""
    now = time.time()
    for p in CACHE.iterdir():
        try:
            if p.is_dir() and p.name.startswith('jarvis-'):
                shutil.rmtree(p, ignore_errors=True)
            elif p.is_file() and p.name != 'index.json' and now - p.stat().st_atime > 30 * 86400:
                p.unlink()
        except OSError:
            pass
    for d in (LIB, EXP):
        for p in d.glob('.*.part*'):
            try:
                if now - p.stat().st_mtime > 3600:
                    p.unlink()
            except OSError:
                pass


def serve():
    global TOKEN
    ensure_dirs()
    cleanup_cache()
    old = read_json(STATE, {})
    TOKEN = old.get('token') or secrets.token_urlsafe(24)
    server = None
    for port in range(PORT_BASE, PORT_BASE + 20):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
            break
        except OSError:
            continue
    if server is None:
        sys.exit('Kein freier Port gefunden.')
    server.daemon_threads = True
    write_json(STATE, {'port': server.server_address[1], 'token': TOKEN, 'pid': os.getpid()}, private=True)

    def watchdog():
        while True:
            time.sleep(30)
            for tok in [t for t, s in SHARES.items() if s['expires'] < time.time()]:
                SHARES.pop(tok, None)
            if _share_server and not SHARES:
                share_stop()
            busy = any(j.state in ('queued', 'running') for j in JOBS.values()) or SHARES
            if not busy and time.time() - _last_request > IDLE_EXIT:
                os._exit(0)

    threading.Thread(target=watchdog, daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


def ensure():
    ensure_dirs()
    st = read_json(STATE, {})
    if st.get('port') and st.get('token') and ping(st['port'], st['token']):
        print(st['port'], st['token'])
        return 0
    log = open(CACHE / 'server.log', 'ab')
    subprocess.Popen([sys.executable, os.path.abspath(__file__), '--serve'], stdin=subprocess.DEVNULL,
                     stdout=log, stderr=log, start_new_session=True)
    for _ in range(60):
        time.sleep(0.1)
        st = read_json(STATE, {})
        if st.get('port') and st.get('token') and ping(st['port'], st['token']):
            print(st['port'], st['token'])
            return 0
    print('Der Medien-Dienst ist nicht gestartet. Protokoll: ' + str(CACHE / 'server.log'), file=sys.stderr)
    return 1


if __name__ == '__main__':
    if '--ensure' in sys.argv:
        sys.exit(ensure())
    serve()
