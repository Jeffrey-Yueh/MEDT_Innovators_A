/**
 * Spirometer Data Packet Types
 * 
 * This module defines the packet structure for communication between
 * the spirometer device and the software interface.
 * 
 * @author Sepanta Yalameha (@Sepanta-Yalameha)
 */

/**
 * Raw spirometry packet as received from/sent to the device.
 * 
 * Packet Layout (20 bytes total):
 * ┌─────────────┬─────────┬───────────┬───────────────────────────────┬──────────┐
 * │   HEADER    │         │           │           PAYLOAD             │  FOOTER  │
 * ├─────────────┼─────────┼───────────┼───────────┬──────────┬────────┼──────────┤
 * │ Start Byte  │Packet ID│ Timestamp │ Flow Rate │  Volume  │ Status │ Checksum │
 * │   1 byte    │ 1 byte  │  4 bytes  │  4 bytes  │ 4 bytes  │ 1 byte │  2 bytes │
 * │   0xAA      │  0-255  │   uint32  │  float32  │ float32  │ uint8  │  uint16  │
 * └─────────────┴─────────┴───────────┴───────────┴──────────┴────────┴──────────┘
 * 
 * Byte order: Little-endian (LSB first)
 */
export interface SpirometryPacket {
  /** Start byte marker (always 0xAA) */
  startByte: number;
  
  /** Sequential packet identifier (0-255, wraps around) */
  packetId: number;
  
  /** Timestamp in milliseconds since session start (uint32) */
  timestamp: number;
  
  /** Instantaneous flow rate in liters per second (L/s) */
  flowRate: number;
  
  /** Cumulative volume in liters (L), integrated from flow */
  volume: number;
  
  /** Device status flags */
  status: PacketStatus;
  
  /** CRC-16 checksum for error detection */
  checksum: number;
}

// ============================================================================
// PACKET CONSTANTS
// ============================================================================

/** Magic start byte to identify packet boundaries */
export const PACKET_START_BYTE = 0xAA;

/** Total packet size in bytes */
export const PACKET_SIZE = 17;

/** Byte offsets for each field within the packet */
export const PacketOffsets = {
  START_BYTE: 0,
  PACKET_ID: 1,
  TIMESTAMP: 2,
  FLOW_RATE: 6,
  VOLUME: 10,
  STATUS: 14,
  CHECKSUM: 15,
} as const;

/** Size in bytes for each field */
export const PacketFieldSizes = {
  START_BYTE: 1,
  PACKET_ID: 1,
  TIMESTAMP: 4,
  FLOW_RATE: 4,
  VOLUME: 4,
  STATUS: 1,
  CHECKSUM: 2,
} as const;

// ============================================================================
// STATUS FLAGS
// ============================================================================

/**
 * Device status byte encoding.
 * Bit layout:
 *   Bit 7: Reserved
 *   Bit 6: Reserved
 *   Bit 5: Reserved
 *   Bit 4: Reserved
 *   Bit 3: Low battery warning
 *   Bit 2: Calibration needed
 *   Bit 1: Measurement in progress
 *   Bit 0: Device ready
 */
export enum PacketStatus {
  /** Device is ready for measurement */
  READY = 0x01,
  
  /** Measurement currently in progress */
  MEASURING = 0x02,
  
  /** Device requires calibration */
  CALIBRATION_NEEDED = 0x04,
  
  /** Low battery warning */
  LOW_BATTERY = 0x08,
}

/** Status bit masks for checking individual flags */
export const StatusMasks = {
  READY: 0x01,
  MEASURING: 0x02,
  CALIBRATION_NEEDED: 0x04,
  LOW_BATTERY: 0x08,
} as const;

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/** Result of packet validation */
export interface PacketValidationResult {
  /** Whether the packet is valid */
  valid: boolean;
  
  /** Error message if validation failed */
  error?: string;
  
  /** The validated packet (only present if valid) */
  packet?: SpirometryPacket;
}

/** Possible packet parsing errors */
export enum PacketError {
  INVALID_START_BYTE = 'INVALID_START_BYTE',
  INVALID_LENGTH = 'INVALID_LENGTH',
  CHECKSUM_MISMATCH = 'CHECKSUM_MISMATCH',
  INVALID_TIMESTAMP = 'INVALID_TIMESTAMP',
  INVALID_FLOW_RATE = 'INVALID_FLOW_RATE',
  INVALID_VOLUME = 'INVALID_VOLUME',
}

// ============================================================================
// MEASUREMENT RANGES
// ============================================================================

/**
 * Valid measurement ranges for spirometry data.
 * These values are based on typical spirometer specifications.
 */
export const MeasurementRanges = {
  /** Flow rate range in L/s (typical spirometer range) */
  FLOW_RATE: {
    MIN: -16.0,  // Maximum expiratory flow
    MAX: 16.0,   // Maximum inspiratory flow
  },
  
  /** Volume range in L */
  VOLUME: {
    MIN: -10.0,  // Allow for bidirectional measurement
    MAX: 10.0,   // Maximum expected lung capacity
  },
  
  /** Maximum timestamp value (uint32 max) */
  MAX_TIMESTAMP: 0xFFFFFFFF,
} as const;
