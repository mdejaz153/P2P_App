# PeerDrop — Secure Decentralised P2P File Sharing

**Your files. Your devices. No cloud in between.**

PeerDrop is a decentralised browser-to-browser file sharing application built using **WebRTC and Trystero**. Users join the same private room and transfer files directly between connected devices.

GitHub Pages only hosts the static application. Public signaling infrastructure helps peers discover each other, while the actual file data travels through the WebRTC peer-to-peer connection. PeerDrop does not use an application database or file-storage server.

## Live App

**https://mdejaz153.github.io/P2P_App/submissions/peerdrop-team/**

## Members

| Name | SAP ID | What they did |
| --- | --- | --- |
| **MD Ejaz** | 590025513 | Core development and integration, WebRTC file-transfer workflow, chunked transfer, transfer cancellation, file verification, UI/UX design, debugging and GitHub Pages deployment |
| **Vedansh Pandey** | 590025371 | Room joining and peer-connection flow, private room/password functionality, connection-state handling and cross-device functional testing |
| **Shreyansh Dubey** | 590024664 | Input validation and error handling, file-transfer and responsive testing, usability checks and project documentation |

## Features

- Direct browser-to-browser file sharing using WebRTC
- Private P2P rooms
- Optional room passwords
- Random hard-to-guess room IDs
- Shareable room invite links
- Multiple connected peer support
- Drag-and-drop file selection
- Multiple file selection
- Chunked file transfer
- Live transfer progress
- Transfer speed and ETA
- Cancel an active file transfer
- Received file-size verification
- Safe rendering of peer-controlled content
- Maximum 2 GB application-level file limit
- Responsive desktop and mobile interface
- Live peer connection status
- Animated nature-inspired interface

## How to Use

1. Open the live PeerDrop link on the first device.
2. Enter your display name.
3. Use the generated Room ID or generate a new one.
4. Optionally enter a room password.
5. Click **Enter PeerDrop**.
6. Click **Copy invite link** and open the link on another device.
7. On the second device, enter a different display name and the same room password.
8. Wait until both devices show **P2P connected**.
9. Select or drag a file into the transfer area.
10. The file is transferred directly to the connected peer.
11. The receiving device gets a **Download file** option after the transfer is successfully verified.

A transfer can also be stopped using the **Cancel** button while it is in progress.

## How PeerDrop Works

PeerDrop uses the following flow:

```text
GitHub Pages
     |
     | serves HTML/CSS/JavaScript
     v
Browser A                         Browser B
     |                                |
     +------ Signaling / Discovery ---+
     |                                |
     +========= WebRTC ===============+
              Direct P2P
              File Data
```

GitHub Pages serves the application files but does not handle user file transfers.

Trystero provides peer discovery/signaling and creates the WebRTC connection. After peers connect, file data is exchanged directly between their browsers.

## Libraries and Services

- **Trystero 0.26.0** — WebRTC peer discovery and communication
- **WebRTC Data Channels** — direct browser-to-browser data transfer
- **Public signaling infrastructure used by Trystero** — peer discovery
- **Browser Web Crypto API** — random room/transfer identifiers
- **GitHub Pages** — static application hosting
- **Google Fonts** — interface typography

No application database or cloud file-storage service is used.

## Assignment Problems Addressed

### 1. Large files can crash the browser tab

**Why it happens:**  
Reading an entire large file into memory before sending can consume a large amount of browser memory.

**Our solution:**  
PeerDrop reads the outgoing file using `Blob.slice()` and transfers it in smaller **48 KB chunks**.

Only a small part of the outgoing file needs to be read at a time.

---

### 2. Strangers can enter a room

**Why it happens:**  
Simple room names can be guessed by another user.

**Our solution:**  
PeerDrop generates random room IDs using `crypto.getRandomValues()` and also supports an optional shared room password.

The room ID can be shared through an invite link instead of manually using an easy-to-guess name.

---

### 3. Malicious or invalid peer input

**Why it happens:**  
In a decentralised application there is no central server validating every incoming value. A peer may send unexpected or unsafe data.

**Our solution:**  

- Peer-controlled text is inserted using safe DOM operations such as `textContent`.
- Incoming file metadata is validated.
- File sizes are checked against the application limit.
- Display names and room IDs have length/character restrictions.
- Invalid transfer information is rejected.

---

### 4. Corrupted or incomplete file transfers

**Why it happens:**  
A network interruption, malformed transfer or incorrect binary handling can result in an incomplete received file.

**Our solution:**  
PeerDrop keeps track of the expected file size and the number of bytes actually received.

The download is only created when the received byte count matches the expected file size. If verification fails, the transfer is marked as failed instead of presenting a corrupted file to the user.

---

### Additional Problem — Unwanted transfer already started

A user may accidentally select the wrong file after a transfer has already started.

PeerDrop provides a **Cancel** control for active transfers. Cancellation state is communicated to the peer and the incomplete incoming data is discarded.

## Security and Privacy

PeerDrop is designed around direct peer-to-peer communication.

- Files are not uploaded to an application server.
- No application database stores transferred files.
- Room passwords can be used for private rooms.
- Random room IDs reduce accidental room discovery.
- Peer-provided text is rendered safely.
- Incoming metadata and file sizes are validated.
- Received files are size-verified before download.

WebRTC connections provide encrypted transport between peers.

## Problems We Faced While Building

### 1. GitHub Pages has no backend for peer discovery

**Problem:**  
GitHub Pages can only host static files.

**Why it happened:**  
Two browsers need a way to discover each other before a direct WebRTC connection can be established.

**What we tried:**  
We first separated the hosting requirement from the actual peer-to-peer data path.

**Final solution:**  
We used Trystero for peer discovery/signaling while keeping actual file transfers peer-to-peer over WebRTC.

---

### 2. The application did not work correctly when opening the HTML file directly

**Problem:**  
Opening `index.html` using `file://` did not provide the environment expected by the WebRTC application.

**Why it happened:**  
The application is intended to run from a served web origin.

**What we tried:**  
We tested through a local development server.

**Final solution:**  
We added detection and instructions for localhost/HTTPS and deployed the final application through GitHub Pages.

---

### 3. A room could be active without another peer connected

**Problem:**  
Entering a room successfully did not necessarily mean another device was connected.

**Why it happened:**  
Joining the signaling room and establishing an actual peer connection are separate events.

**What we tried:**  
Initially the connection state was not clear enough to the user.

**Final solution:**  
We added separate **Room live**, **Waiting**, and **P2P connected** states along with connected-device information.

---

### 4. Initial file downloads were corrupted or 0 bytes

**Problem:**  
During cross-device testing, a transferred image could download as a 0-byte or corrupted file.

**Why it happened:**  
The original binary chunk transfer structure did not reliably reconstruct the actual received file bytes.

**What we tried:**  
We tested the transfer on separate devices and inspected the resulting downloaded file size.

**Final solution:**  
We changed the transfer protocol to send raw binary chunks through the WebRTC action, track the received byte count and verify the final size before creating the download.

---

### 5. Accidentally selected files could not be stopped

**Problem:**  
Once a user selected the wrong file, the transfer continued.

**Why it happened:**  
The initial transfer flow had no cancellation state.

**What we tried:**  
We first added a local Cancel button.

**Final solution:**  
We added transfer IDs and cancellation signaling so an active transfer can be cancelled and the receiving peer can discard its incomplete data.

---

### 6. Large outgoing files should not be loaded entirely into memory

**Problem:**  
Reading a complete large file before transmission could consume excessive memory.

**Why it happened:**  
Large browser `ArrayBuffer` allocations become expensive.

**Final solution:**  
The application uses `Blob.slice()` to read and send the file incrementally in small chunks.

## Testing

PeerDrop was tested using separate browser/device sessions.

### Peer Connection Test

1. Open the live site on two devices.
2. Join the same Room ID.
3. Enter the same password.
4. Verify that both devices display **P2P connected**.

### File Transfer Test

1. Connect two peers.
2. Send an image or document.
3. Observe transfer progress.
4. Download the file on the receiving device.
5. Verify that the downloaded file opens correctly.

### Cancellation Test

1. Start transferring a sufficiently large file.
2. Press **Cancel** before completion.
3. Verify that the transfer is marked cancelled.
4. Verify that an incomplete file is not offered as a successful download.

### Invalid Room Test

Join using different room IDs or passwords and verify that the devices do not establish the intended P2P session.

### Responsive Test

Open PeerDrop on desktop and mobile browsers and verify that the interface remains usable at different screen sizes.

## Known Limitations

- Files are available only while a peer holding them is online.
- PeerDrop does not provide permanent cloud storage.
- Display names are user-provided labels and are not cryptographically verified identities.
- Very restrictive college/office networks may block direct WebRTC connectivity and can require a TURN fallback.
- Full-mesh P2P rooms are best suited to a small number of connected devices.
- The current application verifies transferred file size but does not perform full cryptographic file-hash verification.

## Running Locally

Do not open `index.html` directly using `file://`.

Use a local static server such as VS Code Live Server or:

```bash
npx serve .
```

For actual cross-device testing, the deployed HTTPS GitHub Pages version is recommended.

## Project Structure

```text
peerdrop-team/
├── index.html
├── style.css
├── app.js
├── package.json
└── README.md
```

## Deployment

The application is deployed using **GitHub Pages** from the repository's `main` branch.

Live application:

**https://mdejaz153.github.io/P2P_App/submissions/peerdrop-team/**

---

**PeerDrop — direct files, private rooms, no cloud file server.**
