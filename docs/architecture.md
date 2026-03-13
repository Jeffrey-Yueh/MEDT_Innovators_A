# Spirometer System Architecture

This document captures Nicolas Tran's architecture deliverables for the spirometer software project. It turns the current repo from a static UI mockup into an implementation blueprint the rest of the team can build against.

![Spirometer system architecture](./architecture-diagram.png)

## Current Repo State

- `README.md` defines project scope, ownership, and the required workstreams.
- `index.html` and `style.css` provide a static dashboard prototype for the eventual GUI layer.
- No communication, packet, processing, export, or documentation modules exist yet.

## Architecture Summary

The target system is a desktop-oriented spirometer application built with TypeScript and an Electron-hosted web UI. The current HTML/CSS mockup can evolve into the renderer layer, while the device streams measurements over serial/USB. Incoming bytes are framed into packets, validated, converted into processed respiratory samples, and then published to the dashboard and export pipeline.

### Default Assumptions

- The primary target is a desktop app used during a live spirometry session.
- The implementation stack should be TypeScript, with Electron as the default desktop shell and the existing HTML/CSS/JS mockup serving as the starting point for the renderer UI.
- The spirometer connects through serial/USB.
- The device is expected to emit flow samples at a consistent firmware-controlled sampling rate, with enough timing information in each packet to reconstruct sample spacing.
- Real-time charts and exported reports both consume processed session data, not raw packets.
- The processing layer should treat device timestamps and sample order as the source of truth; the UI may render at a lower refresh rate than the incoming samples.
- The current HTML/CSS mockup is a GUI prototype only; it is not the final application architecture.

### Sampling Assumptions

- Sampling originates at the spirometer device, not in the UI layer.
- Each packet should include a timestamp or sample index so processing can preserve the original measurement cadence.
- Flow-to-volume integration should use packet timing from the sampled data stream, not screen refresh timing or button events.

## Subsystems

| Subsystem | Responsibility | Inputs | Outputs |
|---|---|---|---|
| Spirometer Device | Produces flow samples and device status signals | Patient breath data | Raw bytes over serial/USB |
| `comm/` | Opens the device connection, reads byte streams, tracks connection state | Serial/USB stream | `RawByteStream`, `ConnectionState` |
| `packets/` | Frames data, decodes fields, validates checksum, rejects malformed packets | Raw bytes | `SpirometryPacket` |
| `processing/` | Converts validated packets into usable samples and session metrics | `SpirometryPacket` | `ValidatedSample`, `SessionMetrics` |
| `ui/` | Displays live charts, metrics, controls, and status feedback | Processed samples, session metrics, connection/errors | Dashboard state |
| `export/` | Saves complete session data for later review | Finalized session metrics and sample history | CSV/JSON/report artifacts |
| `docs/` | Stores shared architecture and protocol references | Team decisions | Project documentation |

## Data Flow

### Normal Flow

1. The spirometer device samples the patient's breath and emits encoded measurements.
2. The communication layer reads bytes from the serial/USB connection and exposes them as a `RawByteStream`.
3. The packet layer detects packet boundaries, decodes fields, and verifies checksum integrity.
4. Valid packets are converted into `ValidatedSample` records with normalized measurement units.
5. The processing layer integrates flow over time to derive volume and computes session metrics such as FEV1, FVC, and PEF.
6. The UI layer consumes processed samples and metrics to update the live airflow graph, volume-over-time graph, session controls, and device status.
7. At the end of a session, the export layer receives the finalized session timeline and metrics and writes them to a report format.

### Failure and Recovery Flow

| Event | Detected In | Expected System Behavior |
|---|---|---|
| Invalid checksum | `packets/` | Drop the packet, log the error, increment an error counter, keep reading the stream |
| Malformed or partial packet | `packets/` | Resynchronize at the next valid start byte without crashing the session |
| Device disconnect | `comm/` | Transition `ConnectionState` to disconnected, notify the UI, stop live updates cleanly |
| Delayed packets | `comm/` or `processing/` | Preserve timestamps, mark timing gaps if needed, avoid inventing data |
| Empty session | `processing/` and `ui/` | Show no-result state, disable export until a valid measurement session exists |

## Core Interfaces

These are architecture-level contracts for the later implementation. They are not final API signatures, but they define what each subsystem is expected to exchange.

```ts
type RawByteStream = Uint8Array;

type SpirometryPacket = {
  startByte: number;
  packetId: number;
  timestamp: number;
  flowRate: number;
  volume?: number;
  status: number;
  checksum: number;
};

type ValidatedSample = {
  timestamp: number;
  flowRate: number;
  volume: number;
  status: "ok" | "warning" | "error";
};

type SessionMetrics = {
  fev1: number;
  fvc: number;
  pef: number;
  duration: number;
};

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
```

## Proposed Module Structure

```text
docs/
  architecture.md
  architecture-diagram.png

src/
  comm/
  packets/
  processing/
  ui/
  export/
```

### Module Notes

- `comm/` owns physical device connection, byte intake, reconnect behavior, and connection status.
- `packets/` owns packet structure, endian choice, checksum validation, encoding, and decoding.
- `processing/` owns measurement units, flow-to-volume integration, filtering, and respiratory metrics.
- `ui/` owns charts, controls, patient/session panels, and user-visible status.
- `export/` owns saved session output such as CSV, JSON, or report generation.

## Team Task Mapping

| README Workstream | Primary Module | Notes |
|---|---|---|
| System architecture diagram | `docs/` | Nicolas deliverable |
| Data flow definition | `docs/` | Nicolas deliverable |
| Packet structure / encoder / decoder | `packets/` | Depends on architecture packet boundary decisions |
| Flow-to-volume integration | `processing/` | Consumes validated packets |
| Serial/USB communication | `comm/` | Feeds the packet pipeline |
| Packet parsing pipeline | `comm/` + `packets/` | Communication owns stream intake; packets own validation |
| GUI layout and charts | `ui/` | Consumes processed samples and metrics |
| Start/stop controls | `ui/` + `comm/` | UI issues commands; communication owns device state |
| Data export | `export/` | Receives finalized sessions from processing/UI state |
| Simulated data generator | `packets/` + `processing/` test support | Should emit representative packet sequences |
| Packet error handling tests | `packets/` | Validate checksum and resynchronization behavior |
| Packet protocol documentation | `docs/` + `packets/` | Built from the packet structure decisions |
| GUI user guide | `docs/` + `ui/` | Written after the interactive UI is implemented |

## Mapping to the Current Mockup

The existing `index.html` and `style.css` files already suggest the shape of the future GUI:

- The live chart area maps to `ui/` real-time airflow and volume visualizations.
- The metric cards map to processed `SessionMetrics`.
- The device status badge maps to `ConnectionState`.
- The export button maps to `export/`, but it should operate on finalized processed sessions rather than placeholder values.

The mockup should therefore be treated as a visual starting point for the UI workstream, while the actual data ownership and device integration follow the architecture defined here.
