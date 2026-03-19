/**
 * Spirometer Packet Module
 * 
 * This module handles encoding and decoding of spirometer data packets.
 * 
 * @author Sepanta Yalameha (@Sepanta-Yalameha)
 * @module packets
 */

// Types and constants
export {
  SpirometryPacket,
  PacketValidationResult,
  PacketError,
  PacketStatus,
  StatusMasks,
  PacketOffsets,
  PacketFieldSizes,
  MeasurementRanges,
  PACKET_START_BYTE,
  PACKET_SIZE,
} from './types';

// Encoder
export {
  encodePacket,
  encodePackets,
  createPacket,
  PacketInput,
  EncodeResult,
} from './encoder';

// Decoder
export {
  decodePacket,
  parseStream,
  findPacketStarts,
  PacketStreamDecoder,
  DecodeResult,
  StreamParseResult,
} from './decoder';

// CRC utilities
export {
  calculateCRC16,
  verifyCRC16,
} from './crc';
