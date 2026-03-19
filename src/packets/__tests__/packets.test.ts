/**
 * Packet Encoder/Decoder Tests
 * 
 * Tests for verifying packet encoding and decoding functionality.
 * Run with: npx ts-node src/packets/__tests__/packets.test.ts
 * Or with a test runner like Jest/Vitest
 * 
 * @author Sepanta Yalameha (@Sepanta-Yalameha)
 */

import {
  encodePacket,
  decodePacket,
  parseStream,
  PacketStreamDecoder,
  createPacket,
  PacketInput,
  SpirometryPacket,
  PACKET_START_BYTE,
  PACKET_SIZE,
  PacketStatus,
  PacketError,
  calculateCRC16,
} from '../index';

// Test utilities
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertClose(a: number, b: number, epsilon: number, message: string): void {
  const diff = Math.abs(a - b);
  assert(diff < epsilon, `${message} (diff: ${diff})`);
}

// ============================================================================
// TEST CASES
// ============================================================================

console.log('\n========================================');
console.log('Spirometer Packet Tests');
console.log('========================================\n');

// Test 1: Basic encode/decode round-trip
console.log('Test 1: Encode/Decode Round-Trip');
{
  const input: PacketInput = {
    packetId: 42,
    timestamp: 123456789,
    flowRate: 5.5,
    volume: 2.3,
    status: PacketStatus.MEASURING,
  };

  const encoded = encodePacket(input);
  assert(encoded.success, 'Encoding should succeed');
  assert(encoded.data !== undefined, 'Encoded data should exist');
  assert(encoded.data!.length === PACKET_SIZE, `Packet size should be ${PACKET_SIZE} bytes`);
  assert(encoded.data![0] === PACKET_START_BYTE, 'First byte should be start byte');

  const decoded = decodePacket(encoded.data!);
  assert(decoded.success, 'Decoding should succeed');
  assert(decoded.packet !== undefined, 'Decoded packet should exist');
  assert(decoded.packet!.packetId === input.packetId, 'Packet ID should match');
  assert(decoded.packet!.timestamp === input.timestamp, 'Timestamp should match');
  assertClose(decoded.packet!.flowRate, input.flowRate, 0.001, 'Flow rate should match');
  assertClose(decoded.packet!.volume, input.volume, 0.001, 'Volume should match');
  assert(decoded.packet!.status === input.status, 'Status should match');
}

// Test 2: Edge cases - zero values
console.log('\nTest 2: Edge Cases - Zero Values');
{
  const input: PacketInput = {
    packetId: 0,
    timestamp: 0,
    flowRate: 0.0,
    volume: 0.0,
    status: 0,
  };

  const encoded = encodePacket(input);
  assert(encoded.success, 'Encoding zero values should succeed');

  const decoded = decodePacket(encoded.data!);
  assert(decoded.success, 'Decoding zero values should succeed');
  assert(decoded.packet!.flowRate === 0, 'Zero flow rate should decode correctly');
  assert(decoded.packet!.volume === 0, 'Zero volume should decode correctly');
}

// Test 3: Edge cases - maximum values
console.log('\nTest 3: Edge Cases - Maximum Values');
{
  const input: PacketInput = {
    packetId: 255,
    timestamp: 0xFFFFFFFF,
    flowRate: 16.0,
    volume: 10.0,
    status: 255,
  };

  const encoded = encodePacket(input);
  assert(encoded.success, 'Encoding max values should succeed');

  const decoded = decodePacket(encoded.data!);
  assert(decoded.success, 'Decoding max values should succeed');
  assert(decoded.packet!.packetId === 255, 'Max packet ID should decode correctly');
  assert(decoded.packet!.timestamp === 0xFFFFFFFF, 'Max timestamp should decode correctly');
}

// Test 4: Negative flow rate (expiration)
console.log('\nTest 4: Negative Flow Rate (Expiration)');
{
  const input: PacketInput = {
    packetId: 10,
    timestamp: 5000,
    flowRate: -8.5, // Expiratory flow
    volume: 3.2,
    status: PacketStatus.MEASURING,
  };

  const encoded = encodePacket(input);
  assert(encoded.success, 'Encoding negative flow rate should succeed');

  const decoded = decodePacket(encoded.data!);
  assert(decoded.success, 'Decoding negative flow rate should succeed');
  assertClose(decoded.packet!.flowRate, -8.5, 0.001, 'Negative flow rate should match');
}

// Test 5: Checksum validation
console.log('\nTest 5: Checksum Validation');
{
  const input: PacketInput = {
    packetId: 1,
    timestamp: 1000,
    flowRate: 3.0,
    volume: 1.5,
    status: PacketStatus.READY,
  };

  const encoded = encodePacket(input);
  assert(encoded.success, 'Encoding should succeed');

  // Corrupt a byte in the middle
  const corrupted = new Uint8Array(encoded.data!);
  corrupted[5] = corrupted[5] ^ 0xFF; // Flip all bits

  const decoded = decodePacket(corrupted);
  assert(!decoded.success, 'Decoding corrupted packet should fail');
  assert(decoded.error === PacketError.CHECKSUM_MISMATCH, 'Error should be checksum mismatch');
}

// Test 6: Invalid start byte
console.log('\nTest 6: Invalid Start Byte');
{
  const data = new Uint8Array(PACKET_SIZE);
  data[0] = 0x00; // Invalid start byte

  const decoded = decodePacket(data);
  assert(!decoded.success, 'Decoding with invalid start byte should fail');
  assert(decoded.error === PacketError.INVALID_START_BYTE, 'Error should be invalid start byte');
  assert(decoded.bytesConsumed === 1, 'Should consume 1 byte for resync');
}

// Test 7: Buffer too short
console.log('\nTest 7: Buffer Too Short');
{
  const data = new Uint8Array(5); // Less than PACKET_SIZE
  data[0] = PACKET_START_BYTE;

  const decoded = decodePacket(data);
  assert(!decoded.success, 'Decoding short buffer should fail');
  assert(decoded.error === PacketError.INVALID_LENGTH, 'Error should be invalid length');
}

// Test 8: Stream parsing with multiple packets
console.log('\nTest 8: Stream Parsing - Multiple Packets');
{
  const packets: PacketInput[] = [
    { packetId: 1, timestamp: 100, flowRate: 1.0, volume: 0.5, status: PacketStatus.MEASURING },
    { packetId: 2, timestamp: 200, flowRate: 2.0, volume: 1.0, status: PacketStatus.MEASURING },
    { packetId: 3, timestamp: 300, flowRate: 3.0, volume: 1.5, status: PacketStatus.MEASURING },
  ];

  // Encode all packets
  const encodedPackets = packets.map(p => encodePacket(p).data!);
  
  // Concatenate into a stream
  const totalLength = encodedPackets.reduce((sum, p) => sum + p.length, 0);
  const stream = new Uint8Array(totalLength);
  let offset = 0;
  for (const encoded of encodedPackets) {
    stream.set(encoded, offset);
    offset += encoded.length;
  }

  const result = parseStream(stream);
  assert(result.packets.length === 3, 'Should decode 3 packets');
  assert(result.checksumErrors === 0, 'Should have no checksum errors');
  assert(result.malformedPackets === 0, 'Should have no malformed packets');
  assert(result.remainder.length === 0, 'Should have no remainder');
}

// Test 9: Stream parsing with garbage data
console.log('\nTest 9: Stream Parsing - With Garbage Data');
{
  const input: PacketInput = {
    packetId: 99,
    timestamp: 5000,
    flowRate: 4.0,
    volume: 2.0,
    status: PacketStatus.MEASURING,
  };

  const encoded = encodePacket(input).data!;
  
  // Add garbage before and after
  const garbage1 = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A]);
  const garbage2 = new Uint8Array([0xBC, 0xDE, 0xF0]);
  
  const stream = new Uint8Array(garbage1.length + encoded.length + garbage2.length);
  stream.set(garbage1, 0);
  stream.set(encoded, garbage1.length);
  stream.set(garbage2, garbage1.length + encoded.length);

  const result = parseStream(stream);
  assert(result.packets.length === 1, 'Should find 1 valid packet');
  assert(result.packets[0].packetId === 99, 'Should decode correct packet');
}

// Test 10: PacketStreamDecoder class
console.log('\nTest 10: PacketStreamDecoder - Chunked Data');
{
  const decoder = new PacketStreamDecoder();

  const input: PacketInput = {
    packetId: 50,
    timestamp: 2500,
    flowRate: 6.0,
    volume: 3.0,
    status: PacketStatus.MEASURING,
  };

  const encoded = encodePacket(input).data!;

  // Split into chunks
  const chunk1 = encoded.slice(0, 8);
  const chunk2 = encoded.slice(8);

  // First chunk shouldn't produce packets
  let packets = decoder.push(chunk1);
  assert(packets.length === 0, 'First chunk should not produce packets');

  // Second chunk should complete the packet
  packets = decoder.push(chunk2);
  assert(packets.length === 1, 'Second chunk should produce 1 packet');
  assert(packets[0].packetId === 50, 'Should decode correct packet ID');

  const stats = decoder.getStats();
  assert(stats.packetsDecoded === 1, 'Stats should show 1 packet decoded');
  assert(stats.bufferedBytes === 0, 'Buffer should be empty after complete packet');
}

// Test 11: Input validation - out of range
console.log('\nTest 11: Input Validation');
{
  // Invalid packet ID
  let result = encodePacket({
    packetId: 300, // > 255
    timestamp: 0,
    flowRate: 0,
    volume: 0,
    status: 0,
  });
  assert(!result.success, 'Packet ID > 255 should fail');

  // Invalid flow rate
  result = encodePacket({
    packetId: 0,
    timestamp: 0,
    flowRate: 20.0, // > 16 L/s
    volume: 0,
    status: 0,
  });
  assert(!result.success, 'Flow rate > 16 should fail');

  // Invalid volume
  result = encodePacket({
    packetId: 0,
    timestamp: 0,
    flowRate: 0,
    volume: 15.0, // > 10 L
    status: 0,
  });
  assert(!result.success, 'Volume > 10 should fail');
}

// Test 12: createPacket helper
console.log('\nTest 12: createPacket Helper');
{
  const input: PacketInput = {
    packetId: 33,
    timestamp: 7500,
    flowRate: 2.5,
    volume: 1.25,
    status: PacketStatus.READY | PacketStatus.MEASURING,
  };

  const packet = createPacket(input);
  assert(packet.startByte === PACKET_START_BYTE, 'Start byte should be set');
  assert(packet.packetId === 33, 'Packet ID should match');
  assert(packet.checksum !== 0, 'Checksum should be calculated');
}

// Test 13: CRC calculation consistency
console.log('\nTest 13: CRC Consistency');
{
  const data = new Uint8Array([0xAA, 0x01, 0x02, 0x03, 0x04, 0x05]);
  const crc1 = calculateCRC16(data);
  const crc2 = calculateCRC16(data);
  assert(crc1 === crc2, 'Same data should produce same CRC');

  const data2 = new Uint8Array([0xAA, 0x01, 0x02, 0x03, 0x04, 0x06]); // Different last byte
  const crc3 = calculateCRC16(data2);
  assert(crc1 !== crc3, 'Different data should produce different CRC');
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
