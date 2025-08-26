# Rev - Revolt Motors Voice Assistant

Rev is a real-time conversational assistant for **Revolt Motors**. It provides users with information about Revolt products, pricing, bookings, test rides, showrooms, and related app features. The assistant supports both voice and text interactions, leveraging the **Google Gemini Live API** for real-time AI responses.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture / Flow Diagram](#architecture--flow-diagram)
- [Directory Structure](#directory-structure)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API / WebSocket / Integration Details](#api--websocket--integration-details)
- [Audio / Media / File Format Notes](#audio--media--file-format-notes)
- [Troubleshooting](#troubleshooting)
- [Notes](#notes)
- [References](#references)
- [License](#license)

---

## Project Overview

Rev is a browser-based AI assistant tailored for Revolt Motors. Users can:

- Ask questions about **RV400**, pricing, and features.
- Book test rides or explore showroom locations.
- Receive responses in **real-time voice or text**.

**Target Audience:** Revolt Motors customers, sales teams, and support staff.

---

## Features

- Real-time voice chat with the assistant
- Text fallback support
- Audio streaming from browser to server
- Gemini Live API integration
- Display assistant text responses
- Play assistant audio responses
- Interrupt or stop ongoing AI responses

---

## Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, Audio Worklet
- **Backend:** Node.js, Express
- **WebSocket:** `ws` for real-time communication
- **API:** Google Gemini Live API
- **Environment Management:** `dotenv`
- **Audio Processing:** PCM16, WAV conversion

---

## Architecture / Flow Diagram

The data flow in Rev:

Browser (Mic & Text)
│
▼


WebSocket → Node.js Server
│
▼


Google Gemini Live API
│
▼


Node.js Server → WebSocket
│
▼


Browser (Audio + Text)


---

## Setup & Installation

### Prerequisites

- Node.js v18+
- npm or yarn
- Google Gemini API key

### Steps

1. Clone the repository:

```bash
git clone <repo-url>
cd <repo-folder>
