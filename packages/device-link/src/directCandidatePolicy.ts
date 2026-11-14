/** Benchmark-only IPv4 space commonly assigned by fake-IP/TUN proxies.
 * Keep ordinary LAN, VPN, mDNS and IPv6 candidates eligible for direct ICE. */
export function isBlockedDirectAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  if (address.includes(':')) {
    try {
      // URL canonicalization also recognizes dotted IPv4-mapped IPv6 forms.
      const host = new URL(`http://[${address}]/`).hostname;
      return /^\[::ffff:c6(?:12|13):[0-9a-f]+\]$/i.test(host);
    } catch { return false; }
  }
  const octets = address.split('.');
  return octets.length === 4 && octets.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
    && Number(octets[0]) === 198 && (Number(octets[1]) === 18 || Number(octets[1]) === 19);
}

/** Both outgoing and incoming SDP use the same policy, including old peers.
 * Preserve line endings and all non-address negotiation attributes verbatim. */
export function filterDirectSdp(sdp: string): string {
  return sdp.split('\n').filter(line => {
    const fields = line.trim().split(/\s+/);
    if (!fields[0].startsWith('a=candidate:')) return true;
    if (isBlockedDirectAddress(fields[4])) return false;
    const related = fields.indexOf('raddr', 8);
    return related < 0 || !isBlockedDirectAddress(fields[related + 1]);
  }).map(line => {
    // The default connection address may name the filtered candidate as well.
    const fields = line.trim().split(/\s+/);
    if (fields[0] === 'c=IN' && isBlockedDirectAddress(fields[2])) {
      return `c=IN ${fields[1]} ${fields[1] === 'IP6' ? '::' : '0.0.0.0'}${line.endsWith('\r') ? '\r' : ''}`;
    }
    return line;
  }).join('\n');
}
