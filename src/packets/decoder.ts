/**
 * Spirometer Packet Decoder
 * 
 * Decodes binary data into SpirometryPacket objects.
 * Handles stream parsing, checksum validation, and error recovery.
 * 
 * @author Sepanta Yalameha (@Sepanta-Yalameha)
 */

import {
  SpirometryPacket,
  PacketOffsets,
  PACKET_START_BYTE,
  PACKET_SIZE,
  PacketValidationResult,
  PacketError,
  MeasurementRanges,
} from './types';
import { verifyCRC16, calculateCRC16 } from './crc';

/**
 * Result of decoding a single packet from a buffer.
 */
export interface DecodeResult {
  /** Whether decoding was successful */
  success: boolean;
  
  /** The decoded packet (only present if successful) */
  packet?: SpirometryPacket;
  
  /** Error type if decoding failed */
  error?: PacketError;
  
  /** Human-readable error message */
  errorMessage?: string;
  
  /** Number of bytes consumed from the buffer */
  bytesConsumed: number;
}

/**
 * Result of parsing a stream of bytes for multiple packets.
 */
export interface StreamParseResult {
  /** Successfully decoded packets */
  packets: SpirometryPacket[];
  
  /** Number of packets that failed checksum validation */
  checksumErrors: number;
  
  /** Number of malformed packets encountered */
  malformedPackets: number;
  
  /** Remaining bytes that couldn't form a complete packet */
  remainder: Uint8Array;
  
  /** Total bytes processed */
  bytesProcessed: number;
}

/**
 * Decode a single packet from a byte buffer.
 * 
 * @param data - The byte buffer containing packet data
 * @param offset - Starting offset in the buffer (default: 0)
 * @returns DecodeResult with the packet or error information
 */
export function decodePacket(data: Uint8Array, offset: number = 0): DecodeResult {
  // Check minimum length
  if (data.length - offset < PACKET_SIZE) {
    return {
      success: false,
      error: PacketError.INVALID_LENGTH,
      errorMessage: `Buffer too short: need ${PACKET_SIZE} bytes, have ${data.length - offset}`,
      bytesConsumed: 0,
    };
  }

  // Validate start byte
  if (data[offset + PacketOffsets.START_BYTE] !== PACKET_START_BYTE) {
    return {
      success: false,
      error: PacketError.INVALID_START_BYTE,
      errorMessage: `Invalid start byte: expected 0x${PACKET_START_BYTE.toString(16).toUpperCase()}, got 0x${data[offset].toString(16).toUpperCase()}`,
      bytesConsumed: 1, // Skip one byte for resync
    };
  }

  // Create a view for reading multi-byte values
  const view = new DataView(data.buffer, data.byteOffset + offset, PACKET_SIZE);

  // Verify checksum before parsing
  const packetSlice = data.slice(offset, offset + PACKET_SIZE);
  if (!verifyCRC16(packetSlice, PacketOffsets.CHECKSUM)) {
    const calculatedCrc = calculateCRC16(packetSlice, 0, PacketOffsets.CHECKSUM);
    const storedCrc = view.getUint16(PacketOffsets.CHECKSUM, true);
    return {
      success: false,
      error: PacketError.CHECKSUM_MISMATCH,
      errorMessage: `Checksum mismatch: calculated 0x${calculatedCrc.toString(16).toUpperCase()}, stored 0x${storedCrc.toString(16).toUpperCase()}`,
      bytesConsumed: 1, // Skip one byte for resync
    };
  }

  // Parse all fields
  const packet: SpirometryPacket = {
    startByte: data[offset + PacketOffsets.START_BYTE],
    packetId: data[offset + PacketOffsets.PACKET_ID],
    timestamp: view.getUint32(PacketOffsets.TIMESTAMP, true),
    flowRate: view.getFloat32(PacketOffsets.FLOW_RATE, true),
    volume: view.getFloat32(PacketOffsets.VOLUME, true),
    status: data[offset + PacketOffsets.STATUS],
    checksum: view.getUint16(PacketOffsets.CHECKSUM, true),
  };

  // Validate parsed values
  const validationError = validatePacketValues(packet);
  if (validationError) {
    return {
      success: false,
      error: validationError.error,
      errorMessage: validationError.message,
      bytesConsumed: PACKET_SIZE, // Consume the invalid packet
    };
  }

  return {
    success: true,
    packet,
    bytesConsumed: PACKET_SIZE,
  };
}

/**
 * Parse a stream of bytes for multiple packets.
 * 
 * This function handles:
 * - Finding packet boundaries using start bytes
 * - Skipping corrupted data to resynchronize
 * - Collecting all valid packets from the stream
 * 
 * @param data - The byte stream to parse
 * @returns StreamParseResult with packets and statistics
 */
export function parseStream(data: Uint8Array): StreamParseResult {
  const packets: SpirometryPacket[] = [];
  let checksumErrors = 0;
  let malformedPackets = 0;
  let position = 0;

  while (position < data.length) {
    // Look for start byte
    if (data[position] !== PACKET_START_BYTE) {
      position++;
      continue;
    }

    // Check if we have enough bytes for a complete packet
    if (data.length - position < PACKET_SIZE) {
      break; // Not enough data, return remainder
    }

    // Try to decode packet at current position
    const result = decodePacket(data, position);

    if (result.success && result.packet) {
      packets.push(result.packet);
      position += PACKET_SIZE;
    } else {
      // Track error type
      if (result.error === PacketError.CHECKSUM_MISMATCH) {
        checksumErrors++;
      } else {
        malformedPackets++;
      }
      // Move past the invalid start byte to resync
      position += result.bytesConsumed;
    }
  }

  // Calculate remainder
  const remainder = data.slice(position);

  return {
    packets,
    checksumErrors,
    malformedPackets,
    remainder,
    bytesProcessed: position,
  };
}

/**
 * Validate the parsed values of a packet.
 * 
 * @param packet - The packet to validate
 * @returns Error information or undefined if valid
 */
function validatePacketValues(packet: SpirometryPacket): { error: PacketError; message: string } | undefined {
  // Validate timestamp
  if (packet.timestamp > MeasurementRanges.MAX_TIMESTAMP) {
    return {
      error: PacketError.INVALID_TIMESTAMP,
      message: `Invalid timestamp: ${packet.timestamp}`,
    };
  }

  // Validate flow rate (check for NaN/Infinity)
  if (!Number.isFinite(packet.flowRate)) {
    return {
      error: PacketError.INVALID_FLOW_RATE,
      message: `Invalid flow rate: ${packet.flowRate}`,
    };
  }

  // Validate volume (check for NaN/Infinity)
  if (!Number.isFinite(packet.volume)) {
    return {
      error: PacketError.INVALID_VOLUME,
      message: `Invalid volume: ${packet.volume}`,
    };
  }

  return undefined;
}

/**
 * Streaming packet decoder class for continuous data reception.
 * 
 * Maintains an internal buffer and emits packets as they become complete.
 * Handles partial packets across multiple data chunks.
 */
export class PacketStreamDecoder {
  private buffer: Uint8Array = new Uint8Array(0);
  private checksumErrors: number = 0;
  private malformedPackets: number = 0;
  private packetsDecoded: number = 0;

  /**
   * Add data to the decoder buffer and extract any complete packets.
   * 
   * @param data - New data to add to the buffer
   * @returns Array of successfully decoded packets
   */
  push(data: Uint8Array): SpirometryPacket[] {
    // Append new data to existing buffer
    const newBuffer = new Uint8Array(this.buffer.length + data.length);
    newBuffer.set(this.buffer);
    newBuffer.set(data, this.buffer.length);

    // Parse the combined buffer
    const result = parseStream(newBuffer);

    // Update stats
    this.checksumErrors += result.checksumErrors;
    this.malformedPackets += result.malformedPackets;
    this.packetsDecoded += result.packets.length;

    // Keep the remainder for next push
    this.buffer = result.remainder;

    return result.packets;
  }

  /**
   * Reset the decoder state.
   */
  reset(): void {
    this.buffer = new Uint8Array(0);
    this.checksumErrors = 0;
    this.malformedPackets = 0;
    this.packetsDecoded = 0;
  }

  /**
   * Get statistics about the decoder's operation.
   */
  getStats(): {
    bufferedBytes: number;
    checksumErrors: number;
    malformedPackets: number;
    packetsDecoded: number;
  } {
    return {
      bufferedBytes: this.buffer.length,
      checksumErrors: this.checksumErrors,
      malformedPackets: this.malformedPackets,
      packetsDecoded: this.packetsDecoded,
    };
  }
}

/**
 * Find all potential packet start positions in a buffer.
 * Useful for debugging or manual packet extraction.
 * 
 * @param data - The buffer to search
 * @returns Array of offsets where start bytes were found
 */
export function findPacketStarts(data: Uint8Array): number[] {
  const positions: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] === PACKET_START_BYTE) {
      positions.push(i);
    }
  }
  return positions;
}
