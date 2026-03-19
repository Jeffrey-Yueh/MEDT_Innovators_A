# Spirometer Packet Protocol Documentation

**Author:** Sepanta Yalameha (@Sepanta-Yalameha)  
**Version:** 1.0  
**Date:** March 2026

## Overview

This document describes the binary packet protocol used for communication between the spirometer device and the software interface. The protocol is designed for reliable, real-time transmission of respiratory measurement data.

## Packet Structure

Each packet is **17 bytes** in length with the following layout:

```
┌─────────────┬─────────┬───────────┬───────────────────────────────┬──────────┐
│   HEADER    │         │           │           PAYLOAD             │  FOOTER  │
├─────────────┼─────────┼───────────┼───────────┬──────────┬────────┼──────────┤
│ Start Byte  │Packet ID│ Timestamp │ Flow Rate │  Volume  │ Status │ Checksum │
│   1 byte    │ 1 byte  │  4 bytes  │  4 bytes  │ 4 bytes  │ 1 byte │  2 bytes │
│   Offset 0  │ Offset 1│ Offset 2  │ Offset 6  │ Offset 10│Offset14│ Offset 15│
└─────────────┴─────────┴───────────┴───────────┴──────────┴────────┴──────────┘
```

### Byte Order

All multi-byte values use **little-endian** byte ordering (LSB first).

## Field Descriptions

### Start Byte (1 byte)
- **Offset:** 0
- **Value:** `0xAA` (170 decimal)
- **Purpose:** Packet boundary marker for stream synchronization

### Packet ID (1 byte)
- **Offset:** 1
- **Type:** Unsigned 8-bit integer (uint8)
- **Range:** 0–255
- **Purpose:** Sequential packet identifier, wraps from 255 to 0

### Timestamp (4 bytes)
- **Offset:** 2
- **Type:** Unsigned 32-bit integer (uint32)
- **Unit:** Milliseconds since session start
- **Range:** 0–4,294,967,295 (≈49.7 days)
- **Purpose:** Precise timing for sample reconstruction

### Flow Rate (4 bytes)
- **Offset:** 6
- **Type:** IEEE 754 single-precision float (float32)
- **Unit:** Liters per second (L/s)
- **Range:** -16.0 to +16.0 L/s
- **Sign:** Positive = inspiratory, Negative = expiratory
- **Purpose:** Instantaneous airflow measurement

### Volume (4 bytes)
- **Offset:** 10
- **Type:** IEEE 754 single-precision float (float32)
- **Unit:** Liters (L)
- **Range:** -10.0 to +10.0 L
- **Purpose:** Cumulative volume (integrated from flow)

### Status (1 byte)
- **Offset:** 14
- **Type:** Unsigned 8-bit bitfield (uint8)
- **Purpose:** Device status flags

#### Status Bit Definitions

| Bit | Mask | Name | Description |
|-----|------|------|-------------|
| 0 | 0x01 | READY | Device is ready for measurement |
| 1 | 0x02 | MEASURING | Measurement currently in progress |
| 2 | 0x04 | CALIBRATION_NEEDED | Device requires calibration |
| 3 | 0x08 | LOW_BATTERY | Low battery warning |
| 4-7 | - | Reserved | Reserved for future use |

### Checksum (2 bytes)
- **Offset:** 15
- **Type:** Unsigned 16-bit integer (uint16)
- **Algorithm:** CRC-16-CCITT
- **Polynomial:** 0x1021
- **Initial Value:** 0xFFFF
- **Scope:** Bytes 0–14 (all fields except checksum)
- **Purpose:** Error detection for data integrity

## CRC-16-CCITT Algorithm

```typescript
const CRC_POLYNOMIAL = 0x1021;
const CRC_INIT = 0xFFFF;

function calculateCRC16(data: Uint8Array): number {
  let crc = CRC_INIT;
  
  for (const byte of data) {
    crc ^= (byte << 8);
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ CRC_POLYNOMIAL) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  
  return crc;
}
```

## Example Packet

**Input Data:**
- Packet ID: 42
- Timestamp: 1000 ms
- Flow Rate: 5.5 L/s
- Volume: 2.3 L
- Status: MEASURING (0x02)

**Binary Representation (hex):**
```
AA 2A E8 03 00 00 00 00 B0 40 33 33 13 40 02 XX XX
│  │  │           │           │           │  │
│  │  │           │           │           │  └─ Checksum (2 bytes)
│  │  │           │           │           └──── Status: 0x02
│  │  │           │           └──────────────── Volume: 2.3 (float32 LE)
│  │  │           └──────────────────────────── Flow Rate: 5.5 (float32 LE)
│  │  └──────────────────────────────────────── Timestamp: 1000 (uint32 LE)
│  └─────────────────────────────────────────── Packet ID: 42
└────────────────────────────────────────────── Start Byte: 0xAA
```

## Error Handling

### Packet Validation

1. **Check start byte:** If byte at position 0 is not `0xAA`, skip to next byte
2. **Check length:** Ensure 17 bytes are available for reading
3. **Verify checksum:** Calculate CRC-16 over bytes 0–14 and compare with stored value
4. **Validate values:** Check for NaN/Infinity in float fields

### Stream Resynchronization

When an invalid packet is detected:
1. Advance by 1 byte from the failed start position
2. Search for next `0xAA` byte
3. Attempt to decode packet at new position
4. Repeat until valid packet found or end of buffer

### Error Types

| Error Code | Description | Recovery Action |
|------------|-------------|-----------------|
| INVALID_START_BYTE | First byte is not 0xAA | Skip 1 byte, resync |
| INVALID_LENGTH | Buffer too short | Wait for more data |
| CHECKSUM_MISMATCH | CRC validation failed | Skip 1 byte, resync |
| INVALID_FLOW_RATE | Flow rate is NaN/Infinity | Discard packet |
| INVALID_VOLUME | Volume is NaN/Infinity | Discard packet |
| INVALID_TIMESTAMP | Timestamp out of range | Discard packet |

## Streaming Protocol

For continuous data reception, the recommended approach is:

1. Maintain a receive buffer
2. Append incoming bytes to buffer
3. Search for packets from buffer start
4. Extract valid packets
5. Remove processed bytes, keep remainder
6. Repeat when new data arrives

## Typical Sampling Rate

- **Expected rate:** 100–500 packets/second
- **Packet interval:** 2–10 ms
- **Byte rate:** ~1.7–8.5 KB/s

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | March 2026 | Initial protocol specification |
