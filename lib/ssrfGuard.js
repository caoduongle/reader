import { lookup } from 'dns/promises';
import net from 'net';

/**
 * Checks if a given IP address is private, loopback, link-local, carrier-grade NAT, or reserved.
 * Covers:
 * - IPv4: 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16 (metadata),
 *         172.16.0.0/12, 192.168.0.0/16, >= 224.0.0.0 (multicast/reserved).
 * - IPv6: ::1, ::, fc00::/7 (unique local), fe80::/10 (link-local), and IPv4-mapped IPv6 (::ffff:a.b.c.d).
 *
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateOrReservedIp(ip) {
  if (!ip || typeof ip !== 'string') {
    return true;
  }

  const cleanIp = ip.trim().toLowerCase();

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:192.168.1.1 or ::ffff:127.0.0.1)
  if (cleanIp.startsWith('::ffff:') || cleanIp.startsWith('0:0:0:0:0:ffff:')) {
    const ipv4Part = cleanIp.replace(/^.*:ffff:/, '');
    if (net.isIPv4(ipv4Part)) {
      return isPrivateOrReservedIp(ipv4Part);
    }
  }

  // IPv4 inspection
  if (net.isIPv4(cleanIp)) {
    const octets = cleanIp.split('.').map(Number);
    if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) {
      return true;
    }
    const [b0, b1] = octets;

    // 0.0.0.0/8: Current network
    if (b0 === 0) return true;

    // 10.0.0.0/8: Private network (RFC 1918)
    if (b0 === 10) return true;

    // 100.64.0.0/10: Shared Address Space / Carrier-Grade NAT (RFC 6598)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

    // 127.0.0.0/8: Loopback (RFC 1122)
    if (b0 === 127) return true;

    // 169.254.0.0/16: Link-Local, includes cloud metadata 169.254.169.254 (RFC 3927)
    if (b0 === 169 && b1 === 254) return true;

    // 172.16.0.0/12: Private network (RFC 1918) (172.16.0.0 - 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

    // 192.168.0.0/16: Private network (RFC 1918)
    if (b0 === 192 && b1 === 168) return true;

    // >= 224.0.0.0: Multicast (224.0.0.0/4) and Reserved for Future Use (240.0.0.0/4)
    if (b0 >= 224) return true;

    return false;
  }

  // IPv6 inspection
  if (net.isIPv6(cleanIp)) {
    // Loopback ::1 or 0:0:0:0:0:0:0:1
    if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;

    // Unspecified :: or 0:0:0:0:0:0:0:0
    if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true;

    // Unique local addresses fc00::/7 (fc00:... and fd00:...)
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;

    // Link-local unicast fe80::/10 (fe80:... to febf:...)
    if (
      cleanIp.startsWith('fe8') ||
      cleanIp.startsWith('fe9') ||
      cleanIp.startsWith('fea') ||
      cleanIp.startsWith('feb')
    ) {
      return true;
    }

    return false;
  }

  // Not a valid IP format
  return true;
}

/**
 * Asserts that a target hostname resolves strictly to public internet IP addresses.
 * Throws an error if hostname is localhost, a private IP literal, or resolves via DNS
 * to any private/reserved IPv4 or IPv6 address.
 *
 * NOTE ON KNOWN ARCHITECTURAL LIMITATION (DNS REBINDING):
 * This SSRF protection performs DNS lookup prior to fetch. In theory, an attacker
 * could attempt a DNS rebinding attack by having a malicious domain resolve to a
 * public IP during assertPublicHost(), then rapidly changing DNS records to resolve
 * to 127.0.0.1 or a private IP during the actual fetch() execution.
 * To achieve complete immunity against DNS rebinding, custom IP validation at the
 * http.Agent/https.Agent socket connection level would be required. This pre-fetch
 * validation provides standard application-level protection against direct SSRF scanning.
 *
 * @param {string} hostname
 * @returns {Promise<void>}
 */
export async function assertPublicHost(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    throw new Error('Hostname is invalid');
  }

  const normalized = hostname.trim().toLowerCase();

  // Reject localhost and local development names immediately
  if (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local')
  ) {
    throw new Error('Access to local host is forbidden');
  }

  // If hostname is already an IP address literal, validate directly
  if (net.isIP(normalized)) {
    if (isPrivateOrReservedIp(normalized)) {
      throw new Error('Access to private or reserved IP is forbidden');
    }
    return;
  }

  // Resolve all DNS A and AAAA records for domain name
  let addresses;
  try {
    addresses = await lookup(normalized, { all: true });
  } catch {
    // If DNS resolution fails (e.g. non-existent domain), let fetch() handle connection failure
    return;
  }

  if (addresses && addresses.length > 0) {
    for (const record of addresses) {
      if (isPrivateOrReservedIp(record.address)) {
        throw new Error(`Hostname resolved to private or reserved IP: ${record.address}`);
      }
    }
  }
}