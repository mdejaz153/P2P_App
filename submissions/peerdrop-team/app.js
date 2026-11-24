import { joinRoom, selfId } from 'https://esm.run/trystero@0.26.0';

const APP_ID = 'peerdrop-upes-p2p-files-v2';
const MAX = 2 * 1024 * 1024 * 1024;
const CHUNK = 48 * 1024;

const $ = id => document.getElementById(id);

const S = {
  room: null,
  id: '',
  name: '',
  peers: new Map(),
  a: {},
  incoming: new Map(),
  transfers: new Map(),
  cancelled: new Set()
};

const uid = () =>
  `${selfId}-${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;

const safe = s =>
  s.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);

const randomRoom = () =>
  `drop-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function size(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}

function toast(s) {
  const e = $('toast');
  e.textContent = s;
  e.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => e.classList.remove('show'), 2200);
}

function state(kind, label) {
  $('signalDot').className = 'signal-dot ' + kind;
  $('badge').textContent = label;
}

function peers() {
  const ul = $('peers');
  ul.textContent = '';

  [[selfId, S.name + ' (you)'], ...S.peers].forEach(([id, n]) => {
    const li = document.createElement('li');
    const d = document.createElement('span');
    d.className = 'dot';

    li.append(
      d,
      document.createTextNode(n || `Device ${id.slice(0, 5)}`)
    );

    ul.append(li);
  });

  const connected = S.peers.size > 0;

  $('count').textContent = S.peers.size + 1;

  $('status').textContent = connected
    ? `${S.peers.size} peer device${S.peers.size > 1 ? 's' : ''} connected — ready for direct transfer`
    : 'Room is live. Waiting for another device to join…';

  $('p2pPill').classList.toggle('online', connected);

  $('p2pPill').querySelector('span').textContent =
    connected ? 'P2P connected' : 'Waiting';

  $('connectionHelp').classList.toggle('hidden', connected);

  state(
    connected ? 'online' : 'connecting',
    connected ? 'Direct P2P' : 'Room live'
  );
}

function transfer(id, name, total, direction) {
  $('empty')?.remove();

  const el = document.createElement('div');
  el.className = 'transfer';
  el.id = 't-' + id;

  const top = document.createElement('div');
  top.className = 'transfer-top';

  const left = document.createElement('div');

  const fn = document.createElement('div');
  fn.className = 'filename';
  fn.textContent = name;

  const sm = document.createElement('div');
  sm.className = 'small';
  sm.textContent = `${direction} • ${size(total)}`;

  left.append(fn, sm);

  const pct = document.createElement('div');
  pct.className = 'small';
  pct.textContent = '0%';

  top.append(left, pct);

  const bar = document.createElement('div');
  bar.className = 'bar';

  const fill = document.createElement('div');
  bar.append(fill);

  const stat = document.createElement('div');
  stat.className = 'small';
  stat.textContent = 'Starting…';

  const cancel = document.createElement('button');
  cancel.className = 'cancel-transfer';
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.onclick = () => cancelTransfer(id, direction);

  el.append(top, bar, stat, cancel);
  $('transfers').prepend(el);

  S.transfers.set(id, {
    el,
    fill,
    pct,
    stat,
    cancel,
    total: Math.max(total, 1),
    started: performance.now(),
    lastAt: performance.now(),
    lastBytes: 0,
    speed: 0,
    direction
  });

  return S.transfers.get(id);
}

async function cancelTransfer(id, direction) {
  const t = S.transfers.get(id);

  if (!t || S.cancelled.has(id)) return;

  S.cancelled.add(id);

  t.el.classList.add('cancelled');
  t.fill.style.width = '0%';
  t.pct.textContent = 'Cancelled';
  t.stat.textContent = 'Transfer cancelled';
  t.cancel?.remove();

  S.incoming.delete(id);

  try {
    await S.a.cancelAction?.send({ id });
  } catch {}

  toast(
    direction === 'Sending'
      ? 'File sending cancelled'
      : 'File receiving cancelled'
  );
}

function duration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return 'calculating…';
  if (sec < 60) return Math.ceil(sec) + ' sec';

  if (sec < 3600)
    return Math.floor(sec / 60) + 'm ' + Math.ceil(sec % 60) + 's';

  return (
    Math.floor(sec / 3600) +
    'h ' +
    Math.ceil((sec % 3600) / 60) +
    'm'
  );
}

function progress(id, n, text) {
  const t = S.transfers.get(id);
  if (!t) return;

  const now = performance.now();
  const elapsed = Math.max((now - t.started) / 1000, 0.001);

  const instant =
    (n - t.lastBytes) /
    Math.max((now - t.lastAt) / 1000, 0.001);

  if (now - t.lastAt > 350) {
    t.speed = t.speed
      ? t.speed * 0.72 + instant * 0.28
      : instant;

    t.lastAt = now;
    t.lastBytes = n;
  }

  const avg = n / elapsed;
  const rate = t.speed || avg;
  const remaining = Math.max(0, t.total - n);
  const eta = rate > 0 ? remaining / rate : Infinity;

  const p = Math.min(
    100,
    Math.round((n / t.total) * 100)
  );

  t.fill.style.width = p + '%';
  t.pct.textContent = p + '%';

  const speedText =
    rate > 0 ? size(rate) + '/s' : 'calculating speed…';

  const etaText =
    p >= 100 ? 'Completed' : 'ETA ' + duration(eta);

  t.stat.textContent =
    (text || 'Transferring…') +
    ' • ' +
    speedText +
    ' • ' +
    etaText;
}

function setup() {
  const r = S.room;

  const nameAction = r.makeAction('name');
  const metaAction = r.makeAction('file-meta');

  // IMPORTANT:
  // Binary file bytes travel directly through this action.
  const chunkAction = r.makeAction('file-chunk');

  const doneAction = r.makeAction('file-done');
  const cancelAction = r.makeAction('file-cancel');

  S.a = {
    nameAction,
    metaAction,
    chunkAction,
    doneAction,
    cancelAction
  };

  cancelAction.onMessage = m => {
    if (!m?.id) return;

    S.cancelled.add(m.id);
    S.incoming.delete(m.id);

    const t = S.transfers.get(m.id);

    if (t) {
      t.el.classList.add('cancelled');
      t.fill.style.width = '0%';
      t.pct.textContent = 'Cancelled';
      t.stat.textContent = 'Cancelled by peer';
      t.cancel?.remove();
    }

    toast('Peer cancelled a transfer');
  };

  nameAction.onMessage = (n, { peerId: p }) => {
    S.peers.set(p, String(n).slice(0, 30));
    peers();
  };

  metaAction.onMessage = (m, { peerId: p }) => {
    if (
      !m?.id ||
      typeof m.name !== 'string' ||
      typeof m.size !== 'number' ||
      m.size < 0 ||
      m.size > MAX
    ) {
      return;
    }

    S.incoming.set(m.id, {
      meta: m,
      parts: [],
      got: 0,
      peer: p
    });

    transfer(
      m.id,
      m.name,
      m.size,
      'Receiving'
    );
  };

  /*
    Trystero supports binary payloads directly.

    Metadata contains the transfer id.
    Every binary chunk is sent with metadata { id }.
  */
  chunkAction.onMessage = (data, { peerId: p, meta }) => {
    const id = meta?.id;

    if (!id || S.cancelled.has(id)) return;

    const x = S.incoming.get(id);

    if (!x || x.peer !== p) return;

    let bytes;

    if (data instanceof Uint8Array) {
      bytes = data;
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if (ArrayBuffer.isView(data)) {
      bytes = new Uint8Array(
        data.buffer,
        data.byteOffset,
        data.byteLength
      );
    } else {
      return;
    }

    // Copy bytes so the received buffer remains stable.
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);

    x.parts.push(copy);
    x.got += copy.byteLength;

    progress(
      id,
      x.got,
      'Receiving directly from peer…'
    );
  };

  doneAction.onMessage = (m, { peerId: p }) => {
    if (!m?.id) return;

    const x = S.incoming.get(m.id);

    if (!x || x.peer !== p) return;

    const t = S.transfers.get(m.id);

    if (x.got !== x.meta.size) {
      if (t) {
        t.pct.textContent = 'Failed';
        t.stat.textContent =
          `Transfer incomplete — expected ${size(x.meta.size)}, received ${size(x.got)}. Please resend.`;

        t.cancel?.remove();
      }

      S.incoming.delete(m.id);

      toast('Transfer incomplete — please resend');
      return;
    }

    const blob = new Blob(
      x.parts,
      {
        type:
          x.meta.type ||
          'application/octet-stream'
      }
    );

    // Extra protection: never offer a corrupt-size download.
    if (blob.size !== x.meta.size) {
      if (t) {
        t.pct.textContent = 'Failed';
        t.stat.textContent =
          'File verification failed. Please resend.';
        t.cancel?.remove();
      }

      S.incoming.delete(m.id);
      toast('File verification failed');
      return;
    }

    const a = document.createElement('a');

    a.className = 'download';
    a.href = URL.createObjectURL(blob);
    a.download = x.meta.name;
    a.textContent =
      `Download file (${size(blob.size)})`;

    if (t) {
      t.el.append(a);
      t.cancel?.remove();
    }

    progress(
      m.id,
      x.meta.size || 1,
      'Received — ready to download'
    );

    S.incoming.delete(m.id);

    toast(`${x.meta.name} received`);
  };

  r.onPeerJoin = p => {
    nameAction.send(
      S.name,
      { target: p }
    );

    peers();
    toast('A peer connected');
  };

  r.onPeerLeave = p => {
    S.peers.delete(p);
    peers();
    toast('A peer disconnected');
  };
}

async function join() {
  const name = $('name').value.trim();
  const id = safe($('room').value);
  const password = $('password').value;

  $('error').textContent = '';

  if (!name || !id) {
    $('error').textContent =
      'Enter your name and a room ID.';
    return;
  }

  if (location.protocol === 'file:') {
    $('error').textContent =
      'Do not open index.html directly. Run it on localhost or deploy it to GitHub Pages (HTTPS).';

    state('error', 'Needs HTTPS');
    return;
  }

  try {
    state(
      'connecting',
      'Connecting…'
    );

    S.name = name.slice(0, 30);
    S.id = id;

    S.room = joinRoom(
      {
        appId: APP_ID,
        password:
          password || undefined
      },
      id
    );

    setup();

    localStorage.setItem(
      'peerdrop-name',
      S.name
    );

    localStorage.setItem(
      'peerdrop-room',
      id
    );

    $('joinView').classList.add(
      'hidden'
    );

    $('app').classList.remove(
      'hidden'
    );

    $('roomLabel').textContent = id;

    peers();
  } catch (e) {
    state(
      'error',
      'Connection error'
    );

    $('error').textContent =
      'Could not join the room. Check internet access and try the deployed HTTPS version. ' +
      (e?.message || '');
  }
}

async function send(file) {
  if (!file) return;

  if (file.size > MAX) {
    toast(
      `${file.name}: maximum size is 2 GB`
    );
    return;
  }

  if (!S.peers.size) {
    toast(
      'Connect another device to this room first'
    );
    return;
  }

  const id = uid();

  const m = {
    id,
    name: file.name.slice(0, 180),
    size: file.size,
    type:
      file.type ||
      'application/octet-stream'
  };

  transfer(
    id,
    m.name,
    file.size,
    'Sending'
  );

  await S.a.metaAction.send(m);

  /*
    Give receiver a moment to register metadata before
    the first binary packet arrives.
  */
  await sleep(120);

  if (file.size === 0) {
    await S.a.doneAction.send({ id });

    progress(
      id,
      1,
      'Sent directly to peer'
    );

    S.transfers
      .get(id)
      ?.cancel
      ?.remove();

    return;
  }

  let sent = 0;

  for (
    let offset = 0;
    offset < file.size;
    offset += CHUNK
  ) {
    if (S.cancelled.has(id)) return;

    const ab = await file
      .slice(
        offset,
        Math.min(
          offset + CHUNK,
          file.size
        )
      )
      .arrayBuffer();

    const chunk =
      new Uint8Array(ab);

    /*
      Send the raw Uint8Array directly.
      Transfer id travels as Trystero metadata.
    */
    await S.a.chunkAction.send(
      chunk,
      {
        meta: { id }
      }
    );

    sent += chunk.byteLength;

    progress(
      id,
      sent,
      'Sending directly to peer…'
    );

    // Yield periodically so UI remains responsive.
    if (
      sent %
        (CHUNK * 16) ===
      0
    ) {
      await sleep(0);
    }
  }

  if (S.cancelled.has(id)) return;

  // Receiver only creates the file after this signal.
  await S.a.doneAction.send({
    id,
    size: file.size
  });

  progress(
    id,
    file.size,
    'Sent directly to connected peer(s)'
  );

  S.transfers
    .get(id)
    ?.cancel
    ?.remove();

  toast(
    `${file.name} sent`
  );
}

$('join').onclick = join;

$('random').onclick = () => {
  $('room').value =
    randomRoom();
};

$('file').onchange =
  async e => {
    for (
      const f of e.target.files
    ) {
      await send(f);
    }

    e.target.value = '';
  };

$('copy').onclick =
  async () => {
    const u =
      new URL(location.href);

    u.searchParams.set(
      'room',
      S.id
    );

    try {
      await navigator.clipboard.writeText(
        u.toString()
      );

      toast(
        'Invite link copied'
      );
    } catch {
      prompt(
        'Copy this invite link:',
        u.toString()
      );
    }
  };

$('leave').onclick =
  async () => {
    await S.room?.leave();
    location.reload();
  };

$('clear').onclick =
  () => {
    S.transfers.clear();

    $('transfers').innerHTML =
      '<div id="empty" class="empty"><div>↔</div><b>No transfers yet</b><span>Connect another device, then choose a file.</span></div>';
  };

const dz = $('dropzone');

[
  'dragenter',
  'dragover'
].forEach(x =>
  dz.addEventListener(
    x,
    e => {
      e.preventDefault();
      dz.classList.add('drag');
    }
  )
);

[
  'dragleave',
  'drop'
].forEach(x =>
  dz.addEventListener(
    x,
    e => {
      e.preventDefault();
      dz.classList.remove('drag');
    }
  )
);

dz.addEventListener(
  'drop',
  async e => {
    for (
      const f of
      e.dataTransfer.files
    ) {
      await send(f);
    }
  }
);

const q =
  new URLSearchParams(
    location.search
  );

$('name').value =
  localStorage.getItem(
    'peerdrop-name'
  ) || 'MD Ejaz';

$('room').value =
  q.get('room') ||
  localStorage.getItem(
    'peerdrop-room'
  ) ||
  '';

if (!$('room').value) {
  $('room').value =
    randomRoom();
}

if (
  location.protocol ===
  'file:'
) {
  state(
    'error',
    'Needs HTTPS'
  );

  $('error').textContent =
    'This app needs to be served, not opened as a local file. Deploy to GitHub Pages or run a local web server.';
}

// Nature-inspired drifting leaves, particles and cursor tail

const canvas =
  document.getElementById(
    'particles'
  );

if (canvas) {
  const ctx =
    canvas.getContext('2d');

  let pts = [];
  let leaves = [];

  function resize() {
    canvas.width =
      innerWidth *
      devicePixelRatio;

    canvas.height =
      innerHeight *
      devicePixelRatio;

    ctx.setTransform(
      devicePixelRatio,
      0,
      0,
      devicePixelRatio,
      0,
      0
    );

    pts = Array.from(
      {
        length: Math.min(
          42,
          Math.floor(
            innerWidth / 30
          )
        )
      },
      () => ({
        x:
          Math.random() *
          innerWidth,
        y:
          Math.random() *
          innerHeight,
        r:
          Math.random() *
            1.7 +
          0.5,
        vx:
          (Math.random() -
            0.5) *
          0.12,
        vy:
          (Math.random() -
            0.5) *
          0.12
      })
    );

    leaves = Array.from(
      {
        length: Math.min(
          38,
          Math.max(
            18,
            Math.floor(
              innerWidth / 42
            )
          )
        )
      },
      () => ({
        x:
          Math.random() *
          innerWidth,
        y:
          Math.random() *
          innerHeight,
        s:
          Math.random() *
            7 +
          5,
        vy:
          Math.random() *
            0.42 +
          0.18,
        vx:
          (Math.random() -
            0.5) *
          0.28,
        a:
          Math.random() *
          Math.PI *
          2,
        spin:
          (Math.random() -
            0.5) *
          0.012,
        phase:
          Math.random() *
          6.28
      })
    );
  }

  function leaf(p, t) {
    ctx.save();

    ctx.translate(
      p.x,
      p.y
    );

    ctx.rotate(
      p.a +
        Math.sin(
          t * 0.0007 +
            p.phase
        ) *
          0.35
    );

    ctx.scale(
      1,
      0.58
    );

    ctx.beginPath();

    ctx.moveTo(
      -p.s,
      0
    );

    ctx.quadraticCurveTo(
      0,
      -p.s * 0.9,
      p.s,
      0
    );

    ctx.quadraticCurveTo(
      0,
      p.s * 0.9,
      -p.s,
      0
    );

    ctx.fillStyle =
      'rgba(83,107,69,.30)';

    ctx.fill();

    ctx.beginPath();

    ctx.moveTo(
      -p.s * 0.75,
      0
    );

    ctx.lineTo(
      p.s * 0.8,
      0
    );

    ctx.strokeStyle =
      'rgba(23,63,53,.24)';

    ctx.lineWidth =
      0.7;

    ctx.stroke();

    ctx.restore();
  }

  function draw(t = 0) {
    ctx.clearRect(
      0,
      0,
      innerWidth,
      innerHeight
    );

    ctx.fillStyle =
      'rgba(79,120,144,.18)';

    for (const p of pts) {
      p.x += p.vx;
      p.y += p.vy;

      if (
        p.x < 0 ||
        p.x > innerWidth
      ) {
        p.vx *= -1;
      }

      if (
        p.y < 0 ||
        p.y > innerHeight
      ) {
        p.vy *= -1;
      }

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
        p.r,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    for (
      const p of leaves
    ) {
      p.y += p.vy;

      p.x +=
        p.vx +
        Math.sin(
          t * 0.001 +
            p.phase
        ) *
          0.16;

      p.a += p.spin;

      if (
        p.y >
        innerHeight + 20
      ) {
        p.y = -25;

        p.x =
          Math.random() *
          innerWidth;
      }

      if (p.x < -30)
        p.x =
          innerWidth + 20;

      if (
        p.x >
        innerWidth + 30
      )
        p.x = -20;

      leaf(p, t);
    }

    requestAnimationFrame(
      draw
    );
  }

  addEventListener(
    'resize',
    resize
  );

  resize();

  if (
    !matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
  ) {
    draw();
  } else {
    draw(0);
  }
}

const cd =
  document.querySelector(
    '.cursor-dot'
  );

const ct =
  document.querySelector(
    '.cursor-tail'
  );

if (
  cd &&
  ct &&
  matchMedia(
    '(pointer:fine)'
  ).matches
) {
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;

  addEventListener(
    'mousemove',
    e => {
      tx = e.clientX;
      ty = e.clientY;

      cd.style.left =
        tx + 'px';

      cd.style.top =
        ty + 'px';
    }
  );

  (function follow() {
    cx +=
      (tx - cx) *
      0.16;

    cy +=
      (ty - cy) *
      0.16;

    ct.style.left =
      cx + 'px';

    ct.style.top =
      cy + 'px';

    requestAnimationFrame(
      follow
    );
  })();
}
