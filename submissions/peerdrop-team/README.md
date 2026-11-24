# PeerDrop — Secure Decentralised P2P File Sharing

**Tagline:** Your files. Your devices. No cloud in between.

PeerDrop is a static GitHub Pages web application that lets users in the same private room transfer files directly between browsers using WebRTC data channels through Trystero. Public signaling infrastructure is used for peer discovery; the application itself has no backend or database that stores or forwards user files.

## Team
- Vedansh Pandey — Batch 4 — SAP ID 590025371
- Shreyansh Dubey — Batch 4 — SAP ID 590024664
- Md Ejaz — Batch 5 — SAP ID 590025513

## Features
- Direct peer-to-peer WebRTC file transfer
- Multiple connected devices in a room
- Password-protected rooms
- Random hard-to-guess room IDs
- Shareable invite links
- Drag-and-drop and multi-file selection
- Live sending/receiving progress
- Chunked transfer (48 KB chunks)
- Safe rendering with textContent
- 2 GB per-file application limit with chunked transfer, live throughput and ETA
- Responsive glass/aurora UI
- Clear connection diagnostics for localhost/HTTPS deployment

## Problems addressed from the assignment
1. **Large files crash the tab:** files are read and sent in chunks instead of reading the whole outgoing file into one ArrayBuffer.
2. **Strangers in your room:** generated room IDs are hard to guess and rooms support a shared password.
3. **Malicious input:** peer-controlled names and filenames are rendered as text, not HTML, and incoming metadata is validated.
4. **Peers cannot connect:** the UI explains HTTPS/deployment requirements and connection state. WebRTC/STUN/signaling is handled by Trystero; restrictive networks can still require TURN.
5. **Too many people in one room:** the interface exposes connected peer count; this project is intended for small-room direct sharing.
6. **Nobody online has the file:** the UI makes the limitation explicit: a peer must be online for direct transfer because PeerDrop deliberately has no file-storage server.

## How to run correctly
Do **not** double-click `index.html` and run it as `file://`.

### GitHub Pages (recommended)
Place this folder inside your required `submissions/<group-name>/` folder, push it to the fork, then enable GitHub Pages from the `main` branch. Open the HTTPS Pages URL on two different devices.

### Local development
From this folder, use any static HTTP server, for example VS Code Live Server. Then open the localhost URL. Cross-device testing is best done on the deployed HTTPS GitHub Pages URL.

## Demo procedure
1. Deploy the project to GitHub Pages.
2. Open the same live URL on two devices.
3. On Device A, enter a name, generate a room, enter a password, and join.
4. Copy the invite link to Device B.
5. Device B enters a different name and the **same password**.
6. Wait until both show **P2P connected**.
7. Drag a file onto Device A.
8. Watch live progress on both devices and download the received file on Device B.

## Libraries/services
- Trystero `0.26.0` via `https://esm.run/trystero@0.26.0`
- Browser WebRTC data channels (through Trystero)
- Trystero's public signaling strategy / browser WebRTC ICE infrastructure
- GitHub Pages for static hosting

## Important limitation
PeerDrop intentionally does not store files in a cloud/database. If no device holding a file is online, another user cannot retrieve it. Some restrictive campus/office networks may also block direct WebRTC paths; a production system would configure a TURN fallback.

## Suggested genuine contribution split
### Vedansh Pandey
- Build the responsive UI and animated background
- Room/join/invite experience
- Connection status and deployment diagnostics

### Shreyansh Dubey
- Trystero/WebRTC room integration
- Peer join/leave and identity exchange
- Transfer metadata/progress logic

### Md Ejaz
- Chunked file transfer and download handling
- Validation/security checks
- README testing and deployment documentation

Each member should actually make and push their own changes from their own GitHub account so Git history accurately reflects their work.

## Problems faced while building
1. **A static site has no backend to introduce peers.** Solved with Trystero's public signaling approach.
2. **Opening the HTML directly can look offline.** Added explicit `file://` detection and instructions to use localhost or HTTPS GitHub Pages.
3. **A peer room can be joined but still have no second device.** Added separate room-live and P2P-connected states instead of a vague offline label.
4. **Reading an entire outgoing file wastes memory.** Switched to `Blob.slice()` chunk reads before each send.
5. **Peer-controlled filenames/names could be unsafe in the DOM.** Rendered them with `textContent` and validated metadata.
6. **Direct WebRTC may fail on restrictive networks.** Documented the limitation and TURN as the production fallback.

## Frontend + backend architecture
PeerDrop is intentionally designed so the backend never stores or forwards user files. This is required by the assignment. The frontend uses WebRTC/Trystero for peer discovery and direct encrypted data channels. An optional Vercel support API is included under `api/` for health/configuration endpoints only.

### Optional API endpoints (Vercel)
- `GET /api/health` — deployment/support API health status.
- `GET /api/config` — public application limits/configuration.

These endpoints never receive file bytes, chat content, room passwords, or transfer payloads.

### Deployment options
**Required/ideal for assignment:** deploy the static frontend to GitHub Pages. No custom backend is needed for P2P transfer.

**Optional full-stack demonstration:** import the same folder into Vercel. Vercel serves the frontend and the two serverless API endpoints. File transfer still remains browser-to-browser.
