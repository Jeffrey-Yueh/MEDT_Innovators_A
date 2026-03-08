# MEDT_Innovators_A

# Spirometer Software Development

This project involves developing a **software interface for a spirometer**, including:
- Data packet design
- Data formatting and processing
- Communication with the device
- A graphical user interface (GUI) for visualization

Team members can **claim tasks by assigning themselves to an item or opening an issue referencing it.**

## Task Assignments

<details>
<summary>Click to Expand Task Assignment Table</summary>

| Task Category | Task | Assigned To | Status |
|---|---|---|---|
| Project Setup | Set up GitHub repository structure | @Jeffrey-Yueh | 🟨 In Progress |
| Project Setup | Define coding standards | @Jeffrey-Yueh | 🟨 In Progress |
| Architecture | Create system architecture diagram | @username | ⬜ Not Started |
| Architecture | Define data flow (sensor → packets → GUI) | @username | ⬜ Not Started |
| Data Packets | Define packet structure | @username | ⬜ Not Started |
| Data Packets | Implement packet encoder | @username | ⬜ Not Started |
| Data Packets | Implement packet decoder | @username | ⬜ Not Started |
| Data Processing | Implement flow → volume integration | @username | ⬜ Not Started |
| Communication | Implement serial/USB communication | @username | ⬜ Not Started |
| Communication | Implement packet parsing pipeline | @username | ⬜ Not Started |
| GUI | Design GUI layout/wireframe | @username | ⬜ Not Started |
| GUI | Implement real-time airflow graph | @username | ⬜ Not Started |
| GUI | Implement volume vs time graph | @username | ⬜ Not Started |
| GUI | Add start/stop measurement controls | @username | ⬜ Not Started |
| GUI | Implement data export feature | @username | ⬜ Not Started |
| Testing | Create simulated spirometer data generator | @username | ⬜ Not Started |
| Testing | Test packet error handling | @username | ⬜ Not Started |
| Documentation | Write packet protocol documentation | @username | ⬜ Not Started |
| Documentation | Write GUI user guide | @username | ⬜ Not Started |

</details>


# Project Task Checklist

## 1. Project Setup
- [x] Set up GitHub repository structure
- [ ] Create issue tracker and labels
- [ ] Define coding standards
- [x] Create project README and documentation structure

---

## 2. System Architecture
- [ ] Create high-level system architecture diagram
- [ ] Define data flow (sensor → packets → processing → GUI)
- [ ] Select programming language and GUI framework
- [ ] Define module structure for the codebase

---

## 3. Data Packet Design
- [ ] Define packet structure (header, payload, checksum)
- [ ] Define byte size and data types for each field
- [ ] Decide endian format
- [ ] Implement checksum or CRC error detection
- [ ] Document packet protocol

Example packet structure:
| Start Byte | Packet ID | Timestamp | Flow Rate | Volume | Status | Checksum |


---

## 4. Data Formatting & Processing
- [ ] Define measurement units (flow rate, volume, timestamps)
- [ ] Implement packet encoder
- [ ] Implement packet decoder
- [ ] Implement error handling for corrupted packets
- [ ] Implement flow → volume integration
- [ ] Implement basic filtering/smoothing

---

## 5. Communication Interface
- [ ] Implement serial/USB communication module
- [ ] Create data packet parsing pipeline
- [ ] Implement logging for incoming data
- [ ] Handle dropped or invalid packets
- [ ] Implement device connection status detection

---

## 6. GUI Development
- [ ] Design GUI layout / wireframe
- [ ] Implement real-time airflow graph
- [ ] Implement volume vs time graph
- [ ] Display key spirometry metrics (FVC, FEV1, etc.)
- [ ] Add start/stop measurement controls
- [ ] Implement data save/export functionality
- [ ] Implement error/status display

---

## 7. Testing
- [ ] Create simulated spirometer data generator
- [ ] Unit test packet encoding/decoding
- [ ] Test real-time plotting performance
- [ ] Test communication reliability
- [ ] Test error handling with corrupted packets

---

## 8. Documentation
- [ ] Packet protocol documentation
- [ ] GUI user guide
- [ ] Developer setup instructions
- [ ] Final system architecture diagram
- [ ] Project summary and usage instructions

---

# Contributing

1. Pick a task from the checklist above.
2. Create an issue referencing the task.
3. Assign yourself to the issue.
4. Submit a pull request when complete.

---

# Project Goal

Develop a reliable software system capable of:
- Receiving spirometer data
- Processing respiratory measurements
- Displaying real-time spirometry results
- Storing measurement data for later analysis
