/**
 * Spirometer Packet Encoder
 * 
 * Encodes SpirometryPacket objects into binary format for transmission.
 * 
 * @author Sepanta Yalameha (@Sepanta-Yalameha)
 */

import {
  SpirometryPacket,
  PacketOffsets,
  PacketFieldSizes,
  PACKET_START_BYTE,
  PACKET_SIZE,
  MeasurementRanges,
} from './types';
import { calculateCRC16 } from './crc';

/**
 * Input data for creating a packet (without auto-generated fields).
 */
export interface PacketInput {
  /** Sequential packet identifier (0-255) */
  packetId: number;
  
  /** Timestamp in milliseconds since session start */
  timestamp: number;
  
  /** Flow rate in L/s */
  flowRate: number;
  
  /** Volume in L */
  volume: number;
  
  /** Device status flags */
  status: number;
}

/**
 * Result of packet encoding operation.
 */
export interface EncodeResult {
  /** Whether encoding was successful */
  success: boolean;
  
  /** Encoded packet bytes (only present if successful) */
  data?: Uint8Array;
  
  /** Error message (only present if failed) */
  error?: string;
}

/**
 * Encode a spirometry packet into binary format.
 * 
 * The encoder:
 * 1. Validates input values are within acceptable ranges
 * 2. Writes fields in little-endian byte order
 * 3. Calculates and appends CRC-16 checksum
 * 
 * @param input - The packet data to encode
 * @returns EncodeResult with the binary packet or error message
 */
export function encodePacket(input: PacketInput): EncodeResult {
  // Validate input ranges
  const validationError = validateInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Allocate buffer for the packet
  const buffer = new Uint8Array(PACKET_SIZE);
  const view = new DataView(buffer.buffer);

  // Write start byte
  buffer[PacketOffsets.START_BYTE] = PACKET_START_BYTE;

  // Write packet ID (uint8)
  buffer[PacketOffsets.PACKET_ID] = input.packetId & 0xFF;

  // Write timestamp (uint32, little-endian)
  view.setUint32(PacketOffsets.TIMESTAMP, input.timestamp, true);

  // Write flow rate (float32, little-endian)
  view.setFloat32(PacketOffsets.FLOW_RATE, input.flowRate, true);

  // Write volume (float32, little-endian)
  view.setFloat32(PacketOffsets.VOLUME, input.volume, true);

  // Write status (uint8)
  buffer[PacketOffsets.STATUS] = input.status & 0xFF;

  // Calculate and write CRC-16 checksum (little-endian)
  const checksum = calculateCRC16(buffer, 0, PacketOffsets.CHECKSUM);
  view.setUint16(PacketOffsets.CHECKSUM, checksum, true);

  return { success: true, data: buffer };
}

/**
 * Encode multiple packets in batch.
 * 
 * @param inputs - Array of packet inputs to encode
 * @returns Array of EncodeResults, one per input
 */
export function encodePackets(inputs: PacketInput[]): EncodeResult[] {
  return inputs.map(input => encodePacket(input));
}

/**
 * Create a complete SpirometryPacket object from input data.
 * Useful for creating packet objects without encoding to binary.
 * 
 * @param input - The packet input data
 * @returns Complete SpirometryPacket with all fields
 */
export function createPacket(input: PacketInput): SpirometryPacket {
  const encoded = encodePacket(input);
  if (!encoded.success || !encoded.data) {
    throw new Error(`Failed to create packet: ${encoded.error}`);
  }

  // Read back the checksum from the encoded data
  const view = new DataView(encoded.data.buffer);
  const checksum = view.getUint16(PacketOffsets.CHECKSUM, true);

  return {
    startByte: PACKET_START_BYTE,
    packetId: input.packetId,
    timestamp: input.timestamp,
    flowRate: input.flowRate,
    volume: input.volume,
    status: input.status,
    checksum,
  };
}

/**
 * Validate packet input values.
 * 
 * @param input - The packet input to validate
 * @returns Error message if invalid, undefined if valid
 */
function validateInput(input: PacketInput): string | undefined {
  // Validate packet ID (0-255)
  if (input.packetId < 0 || input.packetId > 255) {
    return `Packet ID must be 0-255, got ${input.packetId}`;
  }

  // Validate timestamp (uint32 range)
  if (input.timestamp < 0 || input.timestamp > MeasurementRanges.MAX_TIMESTAMP) {
    return `Timestamp must be 0-${MeasurementRanges.MAX_TIMESTAMP}, got ${input.timestamp}`;
  }

  // Validate flow rate
  if (!Number.isFinite(input.flowRate)) {
    return `Flow rate must be a finite number, got ${input.flowRate}`;
  }
  if (input.flowRate < MeasurementRanges.FLOW_RATE.MIN || 
      input.flowRate > MeasurementRanges.FLOW_RATE.MAX) {
    return `Flow rate must be ${MeasurementRanges.FLOW_RATE.MIN} to ${MeasurementRanges.FLOW_RATE.MAX} L/s, got ${input.flowRate}`;
  }

  // Validate volume
  if (!Number.isFinite(input.volume)) {
    return `Volume must be a finite number, got ${input.volume}`;
  }
  if (input.volume < MeasurementRanges.VOLUME.MIN || 
      input.volume > MeasurementRanges.VOLUME.MAX) {
    return `Volume must be ${MeasurementRanges.VOLUME.MIN} to ${MeasurementRanges.VOLUME.MAX} L, got ${input.volume}`;
  }

  // Validate status (uint8)
  if (input.status < 0 || input.status > 255) {
    return `Status must be 0-255, got ${input.status}`;
  }

  return undefined;
}
