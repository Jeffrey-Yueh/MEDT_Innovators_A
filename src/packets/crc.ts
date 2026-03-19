/**
 * CRC-16 Checksum Implementation
 * 
 * Uses CRC-16-CCITT polynomial (0x1021) for error detection.
 * This is a widely used standard for communication protocols.
 * 
 * @author Sepanta Yalameha (@Sepanta-Yalameha)
 */

// CRC-16-CCITT polynomial
const CRC_POLYNOMIAL = 0x1021;
const CRC_INIT = 0xFFFF;

// Pre-computed CRC lookup table for faster calculation
const crcTable: number[] = new Array(256);

// Initialize the CRC lookup table
(function initCrcTable() {
  for (let i = 0; i < 256; i++) {
    let crc = i << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ CRC_POLYNOMIAL) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
    crcTable[i] = crc;
  }
})();

/**
 * Calculate CRC-16-CCITT checksum for a byte array.
 * 
 * @param data - The byte array to calculate checksum for
 * @param start - Starting index (default: 0)
 * @param length - Number of bytes to include (default: entire array from start)
 * @returns The 16-bit CRC value
 */
export function calculateCRC16(
  data: Uint8Array,
  start: number = 0,
  length?: number
): number {
  const end = length !== undefined ? start + length : data.length;
  let crc = CRC_INIT;

  for (let i = start; i < end; i++) {
    const tableIndex = ((crc >> 8) ^ data[i]) & 0xFF;
    crc = ((crc << 8) ^ crcTable[tableIndex]) & 0xFFFF;
  }

  return crc;
}

/**
 * Verify that a packet's checksum matches its data.
 * 
 * @param data - The complete packet data including checksum
 * @param checksumOffset - Byte offset where the checksum is stored
 * @returns True if checksum is valid, false otherwise
 */
export function verifyCRC16(
  data: Uint8Array,
  checksumOffset: number
): boolean {
  // Calculate CRC over data portion (everything before checksum)
  const calculatedCrc = calculateCRC16(data, 0, checksumOffset);
  
  // Read stored checksum (little-endian)
  const storedCrc = data[checksumOffset] | (data[checksumOffset + 1] << 8);
  
  return calculatedCrc === storedCrc;
}
