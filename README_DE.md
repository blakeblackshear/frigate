<p align="center">
  <img align="center" alt="logo" src="docs/static/img/frigate.png">
</p>

# Frigate – NVR mit Echtzeit-Objekterkennung für IP-Kameras

<a href="https://hosted.weblate.org/engage/frigate-nvr/">
<img src="https://hosted.weblate.org/widget/frigate-nvr/language-badge.svg" alt="Translation status" />
</a>

/[Deutsch/] | [English](https://github.com/blakeblackshear/frigate/blob/dev/README.md) | [简体中文](https://github.com/blakeblackshear/frigate/blob/dev/README_CN.md)

Ein vollständiges und lokales NVR-System, entwickelt für [Home Assistant](https://www.home-assistant.io) mit KI-gestützter Objekterkennung. Nutzt OpenCV und Tensorflow, um Objekterkennung in Echtzeit lokal für IP-Kameras durchzuführen.

Die Verwendung einer GPU oder eines KI-Beschleunigers wie [Google Coral](https://coral.ai/products/) oder [Hailo](https://hailo.ai/) wird dringend empfohlen. KI-Beschleuniger übertreffen selbst die besten CPUs mit minimalem Overhead.

- Enge Integration mit Home Assistant über eine [benutzerdefinierte Komponente](https://github.com/blakeblackshear/frigate-hass-integration)
- Entwickelt, um den Ressourcenverbrauch zu minimieren und die Leistung zu maximieren, indem Objekte nur dann und dort erkannt werden, wo es notwendig ist
- Nutzt Multiprocessing intensiv mit Fokus auf Echtzeit statt Verarbeitung jedes einzelnen Frames
- Sehr ressourcenschonende Bewegungserkennung, um festzustellen, wo Objekterkennung ausgeführt werden soll
- Objekterkennung mit TensorFlow läuft in separaten Prozessen für maximale FPS
- Kommunikation über MQTT für einfache Integration in andere Systeme
- Videoaufzeichnung mit Aufbewahrungseinstellungen basierend auf erkannten Objekten
- 24/7-Aufzeichnung
- Re-Streaming via RTSP zur Reduzierung der Verbindungen zur Kamera
- WebRTC- & MSE-Unterstützung für latenzarme Live-Ansicht

## Dokumentation

Die vollständige Dokumentation findest du unter: https://docs.frigate.video

## Spenden

Wenn du die Entwicklung unterstützen möchtest, kannst du dies über [Github Sponsors](https://github.com/sponsors/blakeblackshear) tun.

## Screenshots

### Live-Dashboard

<div>
<img width="800" alt="Live-Dashboard" src="https://github.com/blakeblackshear/frigate/assets/569905/5e713cb9-9db5-41dc-947a-6937c3bc376e">
</div>

### Optimierter Überprüfungs-Workflow

<div>
<img width="800" alt="Optimierter Überprüfungs-Workflow" src="https://github.com/blakeblackshear/frigate/assets/569905/6fed96e8-3b18-40e5-9ddc-31e6f3c9f2ff">
</div>

### Multi-Kamera-Scrubbing

<div>
<img width="800" alt="Multi-Kamera-Scrubbing" src="https://github.com/blakeblackshear/frigate/assets/569905/d6788a15-0eeb-4427-a8d4-80b93cae3d74">
</div>

### Integrierter Masken- und Zonen-Editor

<div>
<img width="800" alt="Integrierter Masken- und Zonen-Editor" src="https://github.com/blakeblackshear/frigate/assets/569905/d7885fc3-bfe6-452f-b7d0-d957cb3e31f5">
</div>

## Übersetzungen

Wir nutzen [Weblate](https://hosted.weblate.org/projects/frigate-nvr/) zur Unterstützung von Sprachübersetzungen. Beiträge sind jederzeit willkommen!

<a href="https://hosted.weblate.org/engage/frigate-nvr/">
<img src="https://hosted.weblate.org/widget/frigate-nvr/multi-auto.svg" alt="Translation status" />
</a>
