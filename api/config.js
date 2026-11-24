export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({ app: 'PeerDrop', maxFileSizeMB: 50, chunkSizeKB: 48, transport: 'WebRTC P2P', storesUserFiles: false });
}
