export default function handler(req, res) {
  res.status(200).json({ ok: true, service: 'PeerDrop support API', dataPath: 'peer-to-peer', timestamp: new Date().toISOString() });
}
