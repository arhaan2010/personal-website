/* ═══════════════════════════════════════════════════════════════
   THIS IS THE ONLY FILE YOU EDIT.

   Required per project:  id, name, status, blurb, specs
   Optional:              tagline, year, tags, links, media, body, code

   media types:  "model" (.glb)  |  "image"  |  "video" (.mp4/.webm)
   ALL media paths are relative to public/ — NEVER src/assets.
       public/models/rocket.glb   →   src: "/models/rocket.glb"
   Filenames: no spaces, no parentheses, no tildes. Use dashes.
   ═══════════════════════════════════════════════════════════════ */

export const PROFILE = {
  handle: "Arhaan_Sharma",
  node: "projects",
  sector: "Gurugram, India",
  role: "Embedded systems · control loops · Rockets & drones · Machine learning",
  summary:
    "I like making robots, UAVs, rockets and everything in between. I build the layer where software meets hardware. Currently writing a flight controller from bare metal because the off-the-shelf stack didn't speak to my IMU.",
  links: [
    { label: "GITHUB", href: "https://github.com/arhaan2010" },
    { label: "EMAIL", href: "mailto:arhaanprojects@gmail.com" },
    { label: "LINKEDIN", href: "https://www.linkedin.com/in/arhaan-sharma-9510b7313/" },
  ],
};

export const PROJECTS = [
  {
    id: "fc",
    name: "STM32 Custom Flight Controller",
    status: "ACTIVE",
    year: "2026",
    tagline: "Bare-metal flight control firmware, board up",
    tags: ["firmware", "c", "hardware", "uav"],
    blurb:
      "A flight controller built from scratch, board up. Started because the BMI323 wasn't supported in the mainline Betaflight tree, so the driver got written by hand.",
    specs: [
      ["MCU", "STM32F411CEU6 (Black Pill)"],
      ["IMU", "BMI323 — custom SPI driver"],
      ["LINK", "HGLRC ELRS · CRSF"],
      ["OUTPUT", "DShot / PWM mixer"],
    ],
    queue: ["CRSF parser", "motor mixer", "arming + failsafe logic"],
    links: [{ label: "REPO", href: "https://github.com/arhaan2010" }],
    media: [
      {
        type: "model",
        src: "/models/flight-controller.glb",
        caption: "Board revision B — drag to orbit",
      },
      {
        type: "image",
        src: "/img/fc-bringup.jpg",
        caption: "First successful gyro read over SPI",
      },
    ],
    body: [
      {
        heading: "WHY BUILD IT",
        text: "Betaflight's mainline tree has no BMI323 target. Rather than swap the IMU for something supported, I wrote the driver — which meant learning the register map, the SPI timing constraints, and how the sensor's internal FIFO actually behaves under load. The constraint turned out to be the point.",
      },
      {
        heading: "WHERE IT STANDS",
        text: "The sensor reads clean at 8kHz and the bias estimator converges within about two seconds of power-on. The control loop runs but nothing is mixed to motors yet — CRSF parsing is next, then the mixer, then arming logic. Nothing flies until failsafe is provably correct.",
      },
    ],
    code: [
      {
        label: "bmi323.c",
        lang: "c",
        code: `/* Burst-read gyro + accel in one transaction.
   BMI323 prefixes reads with a dummy byte — drop it. */
static int bmi323_read_imu(imu_sample_t *out) {
    uint8_t tx[16] = { BMI323_REG_ACC_X | 0x80 };
    uint8_t rx[16] = { 0 };

    gpio_clear(CS_PORT, CS_PIN);
    if (spi_xfer(SPI1, tx, rx, sizeof(rx)) != SPI_OK) {
        gpio_set(CS_PORT, CS_PIN);
        return -EIO;
    }
    gpio_set(CS_PORT, CS_PIN);

    /* rx[0] = addr echo, rx[1] = dummy, payload starts at 2 */
    out->acc[0] = (int16_t)(rx[3] << 8 | rx[2]);
    out->acc[1] = (int16_t)(rx[5] << 8 | rx[4]);
    out->acc[2] = (int16_t)(rx[7] << 8 | rx[6]);
    out->gyr[0] = (int16_t)(rx[9] << 8 | rx[8]);
    out->gyr[1] = (int16_t)(rx[11] << 8 | rx[10]);
    out->gyr[2] = (int16_t)(rx[13] << 8 | rx[12]);
    return 0;
}`,
      },
      {
        label: "crsf.c",
        lang: "c",
        code: `/* CRSF frame: [addr][len][type][payload...][crc8]
   len counts type + payload + crc. */
bool crsf_parse(const uint8_t *buf, size_t n) {
    if (n < 4 || buf[0] != CRSF_ADDR_FC) return false;

    uint8_t len = buf[1];
    if (len < 2 || len + 2 > n) return false;

    uint8_t crc = crc8_dvb_s2(&buf[2], len - 1);
    if (crc != buf[len + 1]) return false;

    if (buf[2] == CRSF_TYPE_RC_CHANNELS)
        unpack_channels_11bit(&buf[3], rc_channels);

    return true;
}`,
      },
    ],
  },

  {
    id: "rocket",
    name: "TITAN",
    status: "ACTIVE",
    year: "2026",
    tagline: "K-class high-power rocket, 2km apogee",
    tags: ["rocketry", "hardware", "cad"],
    blurb:
      "High-power rocket targeting 2km apogee on a K-class motor, with dual-deploy recovery. Currently working the ejection timing problem before adding active maneuvering.",
    specs: [
      ["MOTOR", "K class"],
      ["APOGEE", "2 km"],
      ["RECOVERY", "Dual deploy — drogue + main"],
    ],
    queue: ["add maneuvering capabilities", "solve pre-ejection problems"],
    media: [
      {
        type: "model",
        src: "/models/rocket-assembly.glb",
        caption: "Full stack assembly — drag to orbit",
      },
      {
        type: "image",
        src: "/img/titan-pad.jpg",
        caption: "On the pad before the first static test",
      },
      {
        type: "video",
        src: "/video/titan-launch.mp4",
        caption: "Launch footage",
      },
    ],
  },

  {
    id: "war",
    name: "Bahubali",
    status: "ACTIVE",
    year: "2025",
    tagline: "8kg dual-disk combat robot",
    tags: ["robotics", "hardware", "combat"],
    blurb:
      "An 8kg double-disk war robot running two 1.5kg disks. Custom-fabricated ESCs, titanium disks, and custom aluminium and GFRP parts — the most technologically advanced robot in the Indian combat robotics scene.",
    specs: [
      ["WEIGHT", "8 kg"],
      ["WEAPON", "2 × 1.5 kg titanium disks"],
      ["CHASSIS", "Aluminium + GFRP"],
      ["ELECTRONICS", "Custom-fabricated ESCs"],
    ],
    queue: ["titanium support rod fabrication", "custom ESC firmware development"],
    media: [
      { type: "image", src: "/img/bahubali.jpg", caption: "Add a photo at public/img/bahubali.jpg" },
    ],
  },

  {
    id: "robo",
    name: "RoboSphere",
    status: "ACTIVE",
    year: "2025",
    tagline: "Robotics education for underprivileged students",
    tags: ["nonprofit", "education", "robotics"],
    blurb:
      "Spreading the gift of robotics and the ability to create things to the underprivileged. A non-profit initiative helping students learn robotics and programming through workshops, competitions and mentorship.",
    specs: [
      ["WORKSHOPS", "—"],
      ["VIDEOS", "—"],
      ["CITIES", "—"],
    ],
    queue: ["Create new kits", "Conduct workshops in new cities"],
  },

  {
    id: "sahayak",
    name: "Sahayak",
    status: "BUILD",
    year: "2025",
    tagline: "Survival toolkit for rural migrant labourers",
    tags: ["web", "social", "ml"],
    blurb:
      "A place to empower rural migrant labourers with the knowledge to survive in Indian metropolitan cities. A one-stop solution for the problems they face, with a particular focus on women's empowerment.",
    specs: [
      ["TOPICS", "Skill development, interview prep, multilingual support"],
      ["ENTERPRISE", "Business plans, funding, marketing, legal support"],
    ],
    queue: ["Real-time translation for job interviews", "Lighter UI/UX for low-end devices"],
  },

  {
    id: "inv",
    name: "Inventory Management System",
    status: "ACTIVE",
    year: "2025",
    tagline: "Parts tracking for the school robotics club",
    tags: ["web", "tooling"],
    blurb:
      "An inventory system for the school robotics club — tracks every part and component, and which robot or project each one is currently committed to.",
    specs: [
      ["PARTS", "245"],
      ["USERS", "20+"],
      ["COMPONENTS", "102"],
    ],
    queue: ["Email notifications for lending requests", "Discord bot for inventory management"],
  },

  {
    id: "wattaware",
    name: "WattAware",
    status: "BUILD",
    year: "2026",
    tagline: "Live laptop power draw → cumulative CO₂",
    tags: ["desktop", "javascript", "tooling"],
    blurb:
      "Desktop app that reads live laptop power draw and turns it into cumulative CO₂. Started life as Python sidecars spawned from Electron, then got rewritten as pure Node.",
    specs: [
      ["RUNTIME", "Electron · Node"],
      ["STORE", "Firestore, per-device"],
      ["ID", "node-machine-id"],
      ["CHARTS", "Chart.js"],
    ],
    queue: ["idle-draw calibration", "export to CSV"],
    
  },
  {
    id: "LFR1",
    name: "LFR v1",
    status: "ACTIVE",
    year: "2023",
    tagline: "Basic line-following robot for competitions",
    tags: ["robotics", "hardware", "combat"],
    blurb:
      "A basic line-following robot built for competitions. It uses simple IR sensors to detect the line and a PID controller to follow it accurately.",
    specs: [
      ["AlGORITHM", "PID controller"],
      ["ARRAY", "4 individual IR sensors"],
      ["CHASSIS", "Acrylic frame with 3D printed mounts"],
      ["ELECTRONICS", "Custom-fabricated ESCs"],
    ],
    queue: ["titanium support rod fabrication", "custom ESC firmware development"],
    media: [
      { type: "image", src: "/img/bahubali.jpg", caption: "Add a photo at public/img/bahubali.jpg" },
    ],
  },
  {
    id: "LFR2",
    name: "LFRV2",
    status: "ACTIVE",
    year: "2025",
    tagline: "5 IR SENSOR ARRAYS WITH BOTH BLACK AND WHITE LINE DETECTION",
    tags: ["robotics", "hardware", "autonomous"],
    blurb:
      "An 8kg double-disk war robot running two 1.5kg disks. Custom-fabricated ESCs, titanium disks, and custom aluminium and GFRP parts — the most technologically advanced robot in the Indian combat robotics scene.",
    specs: [
      ["WEIGHT", "8 kg"],
      ["WEAPON", "2 × 1.5 kg titanium disks"],
      ["CHASSIS", "Aluminium + GFRP"],
      ["ELECTRONICS", "Custom-fabricated ESCs"],
    ],
    queue: ["titanium support rod fabrication", "custom ESC firmware development"],
    media: [
      { type: "image", src: "/img/bahubali.jpg", caption: "Add a photo at public/img/bahubali.jpg" },
    ],
  },
];

export const STACK = [
  { name: "C / EMBEDDED", level: 92, note: "Bare-metal, HAL, interrupt-driven loops" },
  { name: "PYTHON", level: 88, note: "Tooling, telemetry, data plumbing" },
  { name: "JAVASCRIPT / NODE", level: 84, note: "Electron, app layer, dashboards" },
  { name: "PCB / HARDWARE", level: 70, note: "Schematic capture, bring-up, debug" },
];

export const SECTIONS = [
  { id: "system", label: "SYSTEM" },
  { id: "projects", label: "PROJECTS" },
  { id: "stack", label: "STACK" },
  { id: "contact", label: "CONTACT" },
];

export const BOOT_LINES = [
  "POST ......................... OK",
  "clock tree 96MHz ............. OK",
  "spi1 @ 10MHz ................. OK",
  "bmi323 whoami 0x43 ........... OK",
  "gyro bias estimate ........... OK",
  "crsf uart2 420000 ............ OK",
  "control loop 8kHz ............ ARMED",
  "",
  "ready. type `help` for commands.",
];

export const LOG_POOL = [
  "gyro_z drift corrected +0.004 rad/s",
  "crsf frame 0x16 · 16ch decoded",
  "rx link quality 100% · rssi -41dBm",
  "loop jitter 12us · within budget",
  "esc telemetry m3 · 21.4C",
  "vbat 16.42V · cells nominal",
  "failsafe armed · 500ms timeout",
  "attitude estimate converged",
];