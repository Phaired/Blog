---
title: "From Proxmox to IncusOS: a fully declarative homelab"
description: "Lessons from migrating a whole Proxmox homelab to IncusOS: an immutable OS, encrypted ZFS pools, OpenTofu, cloud-init, and Git as the single source of truth. Including every trap I fell into along the way."
pubDate: "Oct 15 2026"
heroImage: "/blog/homelab-incusos/homelab-incusos-hero.webp"
slug: "homelab-incusos-en"
lang: "en"
isVisible: false
---

### Why tear it all down

My homelab had been running for years on a single server (i5-13500, 64 GB of RAM, an Intel Arc A380 for transcoding, four 4 TB drives). On it: Proxmox VE 7.4, nine VMs, and a virtualized TrueNAS with the drives passed through one by one.

It worked. But:

- Proxmox 7.4 was no longer maintained;
- there were **no backups at all**: no vzdump, no TrueNAS snapshots;
- everything had been configured by hand over the years, and nobody (me included) really knew what was running where anymore.

The goal was easy to state: **a homelab that can be rebuilt from scratch out of a Git repository**. If the server burns down, I reinstall, run one command, and everything comes back.

### Taking inventory: the surprises

Before touching anything, I inventoried the existing setup read-only: the Proxmox API, the TrueNAS API, and the disks of stopped VMs mounted with `ro,noload`. A few findings:

- The "12 TB to evacuate" was the pool's **capacity**, not its usage: only **435 GB** were actually used. That changed everything, since the storage could be recreated instead of dragged along.
- The "DMZ" wasn't one: a single flat LAN, the Proxmox firewall disabled, and only a `ufw` inside the reverse proxy VM filtering inbound traffic.
- Every VM had a **public IPv6 address** (SLAAC from the ISP router), including the Minecraft server, with no firewall whatsoever.
- Two VMs had **the same IP**. One of them had been dead since 2023.
- The PrivateBin running in production was **not** the one described by its `docker-compose.yml`: a hand-launched `docker run` pointed at another folder, which was empty. I first thought the data was lost; it was in the compose folder all along. Lesson: **check the content, not just the configuration**.
- The Minecraft backup stopped the server every night to zip the world… onto the same pool as the original.

### Why IncusOS

[IncusOS](https://linuxcontainers.org/incus-os/) is an **immutable** OS dedicated to [Incus](https://linuxcontainers.org/incus/) (the community fork of LXD). No shell, no packages to install: everything goes through the API. It relies on Secure Boot and the TPM, and its ZFS pools are **encrypted** by default, with keys you retrieve and keep off the server.

For a declarative homelab, that's ideal: the host no longer carries any hand-tweaked state. Everything that matters is either in the API (and therefore driven by OpenTofu) or in the data volumes.

It keeps most of what Proxmox offered: **system containers** and **VMs**, scheduled ZFS snapshots, GPU sharing between instances, and a web UI.

### The target architecture

```
IncusOS (240 GB SSD)
├── pool fast    2 TB NVMe        configs, service state, Minecraft — daily snapshots
├── pool scratch 1 TB NVMe        in-progress downloads, transcoding cache — disposable
└── pool tank    4×4 TB raidz1    media, personal data, archives (~11.6 TB usable)

Instances
├── proxy       (container, isolated dmz network)  Traefik, the only entry point from the Internet
├── apps        (Debian VM)                        about fifteen Docker stacks
├── media       (container + Arc GPU)              Jellyfin, Radarr/Sonarr…
├── samba       (container)                        SMB shares
├── minecraft   (container)                        the current server
└── monitoring  (container)                        Prometheus, Loki, Grafana
```

Traefik is the only instance on an isolated `dmz` network, with Incus ACLs that only let it reach the ports it needs. Everything else is reachable from the LAN only.

### The repository: a single source of truth

```
homelab/
├── incusos/seed/       unattended IncusOS install (network, client certificate, applications)
├── incusos/pools/      ZFS pool definitions, applied in phases
├── tofu/               OpenTofu + the lxc/incus provider: networks, profiles, volumes, instances
├── cloud-init/         the "golden image" + one file per role
├── stacks/<instance>/  Docker compose files, pushed as-is into the instances
└── secrets/            SOPS + age, encrypted in Git
```

A few building blocks make the whole thing truly declarative:

- **The golden image**: every instance starts from the official Debian 13 "cloud" image, and cloud-init applies a common base: user, SSH hardening, automatic updates, and **Grafana Alloy**, which pushes metrics and logs to the monitoring stack. A new instance therefore shows up in Grafana on its own.
- **The Docker stacks**: OpenTofu pushes the `compose.yaml` files into the instances. A small script, `stacks-up`, computes a hash per stack and only recreates the ones that changed. Editing a file in the repo and running `make apply` is a deployment.
- **The secrets**: a single `secrets.sops.yaml` file, encrypted with [age](https://github.com/FiloSottile/age). OpenTofu decrypts it in memory and generates the stacks' `.env` files. The OpenTofu state is natively encrypted too, and committed.
- **Application configuration**: wherever possible, it goes through the apps' own APIs, via idempotent scripts that can be re-run safely.

The acid test: `tofu plan` must answer "No changes". Today, it does.

### D-Day: big bang

With a single server, running both systems side by side was impossible. So the switch was a big bang:

1. **archive everything** to a USB SSD (328 GB, 178,000 files);
2. **verify** the archive;
3. install IncusOS on the system SSD;
4. create the NVMe pools, restore, validate;
5. **only then**, wipe the four hard drives to create the `tank` pool.

The archive came with its share of lessons:

- **Sparse files**: a folder of aborted downloads weighed 1.6 GB on disk but 111 GB apparent. Without `--sparse`, rsync was writing 110 GB of zeros.
- **Slow USB SSD**: a DRAM-less QLC NVMe in an enclosure that refuses write-back caching. With two copies in parallel, throughput dropped to 0–40 MB/s. The fix was to write **one copy at a time**, largest files first.
- **NFS root squash**: some folders were unreadable from the copy server. Root access had to be allowed **temporarily** on the exports, with the original configuration saved and restored afterwards.
- **Targeted verification**: a full sha256 manifest would have taken two hours. Instead I verified in depth what was irreplaceable: all 205,945 chunks of the Minecraft world's regions decompressed one by one, the backup zips, the photos. Zero errors.
- **One USB stick out of two** was faulty: reading the image back gave a different sha256. **Always read back an install stick.**

Installing IncusOS took three attempts. The installer identified SATA disks by their WWN rather than their usual name, then partial partitions left by a failure crashed the next boot. A Secure Erase of the SSD from the BIOS unblocked everything. On the Secure Boot side, you need to clear all factory keys to enter *setup mode*: IncusOS then enrolls its own.

### The rebuild traps

This is where I learned the most. The most instructive ones:

**cloud-init doesn't merge vendor-data and user-data.** My golden image lived in the profile's vendor-data, and each role had its own user-data. Result: Alloy was installed **nowhere**. A top-level key in user-data (`runcmd`, `write_files`…) replaces the vendor-data one instead of adding to it. The fix: OpenTofu merges base and role itself, concatenating lists, before handing everything to cloud-init.

**virtiofs doesn't support shared mmap.** In the `apps` VM, Incus volumes are mounted over virtiofs. SQLite in WAL mode (Uptime Kuma, Memos) and BoltDB (File Browser) failed with `ENODEV`. The solution: a **block** volume (a zvol), formatted as ext4 by cloud-init on first boot.

**IncusOS doesn't ship GPU firmware.** The Arc A380 was "wedged", unusable: `i915/dg2_guc_70.bin` was missing. The official `gpu-support` application provides linux-firmware; once added to the seed, a reinstall includes it automatically. Result: transcoding a 4K HEVC file to 1080p AV1 at **474 frames per second**.

**A hard drive can't "forget" quickly.** To reuse the four drives from the old TrueNAS, IncusOS requires them to be blank. Its wipe tool sends a *discard*, which is instant on an SSD. On a hard drive, the kernel falls back to writing zeros: **6 hours per drive**. I tried to interrupt it, but that write can't be cancelled, and it blocked the server's shutdown. I had to cut power with the smart plug. No damage: instances stop before the disks, and ZFS stays consistent. But the right method was to wipe only the signatures, meaning the start and end of each drive, from a temporary container with direct disk access: a few seconds.

**`prevent_destroy` saved me.** To move the data volumes to the new pool, I copied the volumes and re-imported the new ones into the OpenTofu state. With the wrong import ID format, the state kept extra attributes, and the plan wanted to **destroy and recreate** all three data volumes. The `prevent_destroy` lock blocked it. Always put it on volumes that hold data.

**IPv6 and Java.** The Minecraft server refused to start: `Address family not supported by protocol`. The golden image disables IPv6, but Java was trying to listen on `::`. The fix: `-Djava.net.preferIPv4Stack=true`.

### Monitoring

The `monitoring` container runs Prometheus, Loki and Grafana. Thanks to the golden image, every instance ships its system metrics and logs (journald, Docker) without any manual configuration. Prometheus also reads Incus's own metrics (CPU, RAM, disk, network per instance), Traefik's, and the apps' through exporters. Dashboards are provisioned from the repo.

### The media library

The media side was rebuilt from scratch: Jellyfin for playback (with Infuse on Apple TV and iPhone), Radarr and Sonarr to manage the library, and [Recyclarr](https://recyclarr.dev) to apply the [TRaSH Guides](https://trash-guides.info) quality profiles. I use their "French MULTi.VF" profiles, which favor releases carrying both the French dub and the original audio. Two anecdotes:

- **Radarr reads "VO" as French.** Its parser lists "VO" among French-version markers (VFF, TRUEFRENCH…). A Russian release whose title contained "VO" was therefore taken for a French one. I added a custom format that rejects any title containing "VO" or Cyrillic script without a genuine French marker. On a single film, it filtered out 59 releases.
- **Jellyfin collections**: one library option, followed by a full scan, automatically groups sagas (James Bond, The Dark Knight…) based on TMDb data.

### Results

What changed:

| | Before | After |
|---|---|---|
| Host | Proxmox 7.4, end of life | Immutable IncusOS, self-updating |
| Configuration | by hand, scattered | one Git repo, `tofu plan` = "No changes" |
| Storage | virtualized TrueNAS, unencrypted | native encrypted ZFS, keys off the server |
| Network | flat LAN, public IPv6 everywhere | a single exposed service, on an isolated network; IPv6 off on instances |
| Monitoring | none | metrics and logs for every instance, automatically |
| Secrets | in `.env` files | SOPS + age, encrypted in Git |

What's left, to be honest:

- **Off-server backups.** ZFS snapshots protect against mistakes, not against hardware failure or a fire. That's the next project, with restic.
- **A few application settings** (Jellyfin, Seerr) are still done by hand. They survive in the data volumes, but a rebuild from scratch should replay them automatically.

### Takeaways

1. **Take inventory before deciding.** The most structural decision (recreating the storage) came from a number I thought I knew.
2. **Check the data, not the configuration.** A backup only exists once you've read back what's in it.
3. **Declarative tools have blind spots.** cloud-init that doesn't merge, a provider that doesn't re-push a modified file… `tofu plan` = "No changes" is the only judge.
4. **Put locks where the data is.** `prevent_destroy` costs one line and kept me from losing three volumes.
5. **Keep a journal during the project.** It's the reason this article exists, and it's what I'll reread the day I have to rebuild everything.
