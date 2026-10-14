---
title: "De Proxmox à IncusOS : un homelab entièrement déclaratif"
description: "Retour d'expérience sur la migration complète d'un homelab Proxmox vers IncusOS : un OS immuable, des pools ZFS chiffrés, OpenTofu, cloud-init et Git comme seule source de vérité. Avec tous les pièges rencontrés en route."
pubDate: "Oct 15 2026"
heroImage: "/blog/homelab-incusos/homelab-incusos-hero.webp"
slug: "homelab-incusos-fr"
lang: "fr"
isVisible: false
---

### Pourquoi tout casser

Mon homelab tournait depuis des années sur un seul serveur (i5-13500, 64 Go de RAM, une Intel Arc A380 pour le transcodage, 4 disques de 4 To). Dessus : Proxmox VE 7.4, neuf VM, et un TrueNAS virtualisé avec les disques passés un par un.

Ça marchait. Mais :

- Proxmox 7.4 n'était plus maintenu ;
- il n'y avait **aucune sauvegarde** : ni vzdump, ni snapshot TrueNAS ;
- tout avait été configuré à la main, au fil des années, et personne (moi compris) ne savait plus vraiment ce qui tournait où.

L'objectif était simple à formuler : **un homelab qu'on peut reconstruire de zéro à partir d'un dépôt Git**. Si le serveur brûle, je réinstalle, je lance une commande, et tout revient.

### L'état des lieux : les surprises

Avant de toucher à quoi que ce soit, j'ai inventorié l'existant en lecture seule : API Proxmox, API TrueNAS, et les disques des VM arrêtées montés en `ro,noload`. Quelques découvertes :

- Les « 12 To à évacuer » étaient la **capacité** du pool, pas son usage : **435 Go** seulement étaient occupés. Ça a tout changé, car on pouvait recréer le stockage au lieu de le traîner.
- La « DMZ » n'en était pas une : un seul LAN plat, le firewall Proxmox désactivé, et seul un `ufw` dans la VM du reverse proxy filtrait l'entrée.
- Toutes les VM avaient une **IPv6 publique** (SLAAC de la box), y compris le serveur Minecraft, sans aucun firewall.
- Deux VM avaient **la même IP**. L'une était morte depuis 2023.
- Le PrivateBin en production n'était **pas** celui décrit par le `docker-compose.yml` : un `docker run` lancé à la main pointait vers un autre dossier, vide. J'ai d'abord cru les données perdues ; elles étaient dans le dossier du compose. Leçon : **vérifier le contenu, pas seulement la configuration**.
- La sauvegarde Minecraft coupait le serveur chaque nuit pour zipper le monde… sur le même pool que l'original.

### Pourquoi IncusOS

[IncusOS](https://linuxcontainers.org/incus-os/) est un OS **immuable** dédié à [Incus](https://linuxcontainers.org/incus/) (le fork communautaire de LXD). Pas de shell, pas de paquets à installer : tout passe par l'API. Il s'appuie sur Secure Boot et le TPM, et ses pools ZFS sont **chiffrés** d'office, avec des clés que l'on récupère et que l'on garde hors du serveur.

Pour un homelab déclaratif, c'est idéal : l'hôte n'a plus d'état « bricolé ». Tout ce qui compte est soit dans l'API (donc pilotable par OpenTofu), soit dans les volumes de données.

On garde l'essentiel de ce que faisait Proxmox : des **conteneurs système** et des **VM**, des snapshots ZFS planifiés, le partage du GPU entre instances, et une interface web.

### L'architecture cible

```
IncusOS (SSD 240 Go)
├── pool fast    NVMe 2 To       configs, état des services, Minecraft — snapshots quotidiens
├── pool scratch NVMe 1 To       téléchargements en cours, cache de transcodage — jetable
└── pool tank    4×4 To raidz1   médias, données perso, archives (~11,6 To utiles)

Instances
├── proxy       (conteneur, réseau dmz isolé)  Traefik, seul point d'entrée depuis Internet
├── apps        (VM Debian)                    une quinzaine de stacks Docker
├── media       (conteneur + GPU Arc)          Jellyfin, Radarr/Sonarr…
├── samba       (conteneur)                    partages SMB
├── minecraft   (conteneur)                    le serveur du moment
└── monitoring  (conteneur)                    Prometheus, Loki, Grafana
```

Traefik est le seul à être sur un réseau `dmz` isolé, avec des ACL Incus qui ne le laissent joindre que les ports nécessaires. Le reste n'est accessible que depuis le LAN.

### Le dépôt : une seule source de vérité

```
homelab/
├── incusos/seed/       installation automatique d'IncusOS (réseau, certificat client, applications)
├── incusos/pools/      définition des pools ZFS, appliquée par phase
├── tofu/               OpenTofu + provider lxc/incus : réseaux, profils, volumes, instances
├── cloud-init/         la « golden image » + un fichier par rôle
├── stacks/<instance>/  les compose Docker, poussés tels quels dans les instances
└── secrets/            SOPS + age, chiffrés dans Git
```

Quelques briques qui rendent le tout réellement déclaratif :

- **La golden image** : chaque instance part de l'image Debian 13 « cloud » officielle, et cloud-init lui applique une base commune : utilisateur, durcissement SSH, mises à jour automatiques, et **Grafana Alloy**, qui pousse métriques et logs vers le monitoring. Une nouvelle instance apparaît donc toute seule dans Grafana.
- **Les stacks Docker** : OpenTofu pousse les fichiers `compose.yaml` dans les instances. Un petit script, `stacks-up`, calcule un hash par stack et ne recrée que celles qui ont changé. Modifier un fichier dans le repo puis lancer `make apply`, c'est déployer.
- **Les secrets** : un seul fichier `secrets.sops.yaml`, chiffré avec [age](https://github.com/FiloSottile/age). OpenTofu le déchiffre en mémoire et génère les `.env` des stacks. Le state OpenTofu est lui aussi chiffré nativement, et commité.
- **La configuration des applis** : là où c'est possible, elle passe par leurs API, via des scripts idempotents qu'on peut relancer sans effet de bord.

Le test de vérité : `tofu plan` doit répondre « No changes ». Aujourd'hui, c'est le cas.

### Le jour J : big-bang

Un seul serveur, impossible de faire tourner les deux systèmes en parallèle. La bascule s'est donc faite en big-bang :

1. **tout archiver** sur un SSD USB (328 Go, 178 000 fichiers) ;
2. **vérifier** l'archive ;
3. installer IncusOS sur le SSD système ;
4. créer les pools NVMe, restaurer, valider ;
5. **seulement ensuite**, effacer les 4 disques durs pour créer le pool `tank`.

L'archive a réservé son lot de leçons :

- **Fichiers creux** : un dossier de téléchargements avortés pesait 1,6 Go réels mais 111 Go apparents. Sans `--sparse`, rsync écrivait 110 Go de zéros.
- **SSD USB lent** : un NVMe QLC sans DRAM dans un boîtier qui refuse le cache en écriture différée. Avec deux copies en parallèle, le débit tombait entre 0 et 40 Mo/s. Il fallait écrire **une copie à la fois**, gros fichiers d'abord.
- **NFS et root squash** : certains dossiers étaient illisibles depuis le serveur de copie. Il a fallu autoriser root **temporairement** sur les exports, avec la configuration d'origine sauvegardée puis restaurée.
- **Vérification ciblée** : un manifeste sha256 complet aurait pris deux heures. J'ai vérifié en profondeur ce qui était irremplaçable : les 205 945 chunks des régions du monde Minecraft décompressés un par un, les zips de sauvegarde, les photos. Zéro erreur.
- **Une clé USB sur deux** était défectueuse : la relecture de l'image ne donnait pas le même sha256. **Toujours relire une clé d'installation.**

L'installation d'IncusOS a demandé trois essais. L'installeur identifiait les disques SATA par leur WWN et non par leur nom habituel, puis des partitions partielles laissées par un échec faisaient planter le démarrage suivant. Un Secure Erase du SSD depuis le BIOS a tout débloqué. Côté Secure Boot, il faut effacer toutes les clés d'usine pour passer en *setup mode* : IncusOS enrôle alors les siennes.

### Les pièges de la reconstruction

C'est là que j'ai le plus appris. Les plus instructifs :

**cloud-init ne fusionne pas vendor-data et user-data.** Ma golden image était dans le vendor-data du profil, et chaque rôle avait son user-data. Résultat : Alloy n'était installé **nulle part**. Une clé de premier niveau du user-data (`runcmd`, `write_files`…) remplace celle du vendor-data au lieu de s'y ajouter. La correction : OpenTofu fusionne lui-même base et rôle, listes concaténées, avant de passer le tout à cloud-init.

**virtiofs ne supporte pas le mmap partagé.** Dans la VM `apps`, les volumes Incus sont montés en virtiofs. SQLite en mode WAL (Uptime Kuma, Memos) et BoltDB (File Browser) échouaient avec `ENODEV`. La solution : un volume **bloc** (un zvol), formaté en ext4 par cloud-init au premier démarrage.

**IncusOS n'embarque pas les firmwares GPU.** L'Arc A380 était « wedged », inutilisable : il manquait `i915/dg2_guc_70.bin`. L'application officielle `gpu-support` fournit linux-firmware ; une fois ajoutée au seed, une réinstallation l'inclut d'office. Résultat : transcodage d'une 4K HEVC en 1080p AV1 à **474 images par seconde**.

**Un disque dur ne sait pas « oublier » rapidement.** Pour réutiliser les 4 disques de l'ancien TrueNAS, IncusOS exige qu'ils soient vierges. Son outil d'effacement envoie un *discard*, instantané sur un SSD. Sur un disque dur, le noyau se rabat sur l'écriture de zéros : **6 heures par disque**. J'ai voulu l'interrompre, mais cette écriture ne s'annule pas, et elle a bloqué l'arrêt du serveur. Il a fallu couper la prise connectée. Aucun dégât : les instances s'arrêtent avant les disques, et ZFS reste cohérent. Mais la bonne méthode était d'effacer seulement les signatures, c'est-à-dire le début et la fin de chaque disque, depuis un conteneur temporaire avec accès direct aux disques : quelques secondes.

**`prevent_destroy` m'a sauvé.** Pour déplacer les volumes de données vers le nouveau pool, j'ai copié les volumes puis réimporté les nouveaux dans le state OpenTofu. Avec le mauvais format d'ID d'import, le state retenait des attributs en trop, et le plan voulait **détruire et recréer** les trois volumes de données. Le verrou `prevent_destroy` a bloqué l'opération. Toujours le mettre sur les volumes qui contiennent des données.

**IPv6 et Java.** Le serveur Minecraft refusait de démarrer : `Address family not supported by protocol`. La golden image coupe IPv6, mais Java essayait d'écouter sur `::`. La correction : `-Djava.net.preferIPv4Stack=true`.

### Le monitoring

Le conteneur `monitoring` fait tourner Prometheus, Loki et Grafana. Grâce à la golden image, chaque instance envoie ses métriques système et ses logs (journald, Docker) sans configuration manuelle. Prometheus lit aussi les métriques d'Incus lui-même (CPU, RAM, disque, réseau par instance), celles de Traefik, et celles des applis via des exporteurs. Les dashboards sont provisionnés depuis le repo.

### La médiathèque

La partie média a été refaite de zéro : Jellyfin pour la lecture (avec Infuse sur Apple TV et iPhone), Radarr et Sonarr pour la gestion de la bibliothèque, et [Recyclarr](https://recyclarr.dev) pour appliquer les profils de qualité des [TRaSH Guides](https://trash-guides.info). J'utilise leurs profils « French MULTi.VF », qui privilégient les versions avec la VF et la VO. Deux anecdotes :

- **Radarr lit « VO » comme du français.** Son parseur range « VO » parmi les marqueurs de version française (VFF, TRUEFRENCH…). Une release russe dont le titre contenait « VO » a donc été prise pour une VF. J'ai ajouté un format personnalisé qui rejette tout titre contenant « VO » ou de l'alphabet cyrillique sans vrai marqueur français. Sur un seul film, il a écarté 59 releases.
- **Les collections Jellyfin** : une option de la bibliothèque, suivie d'un scan complet, regroupe automatiquement les sagas (James Bond, The Dark Knight…) selon les données de TMDb.

### Bilan

Ce qui a changé :

| | Avant | Après |
|---|---|---|
| Hôte | Proxmox 7.4, en fin de vie | IncusOS immuable, mis à jour tout seul |
| Configuration | à la main, dispersée | un dépôt Git, `tofu plan` = « No changes » |
| Stockage | TrueNAS virtualisé, non chiffré | ZFS natif chiffré, clés hors du serveur |
| Réseau | LAN plat, IPv6 publique partout | un seul service exposé, sur un réseau isolé ; IPv6 coupée sur les instances |
| Monitoring | aucun | métriques et logs de toutes les instances, automatiquement |
| Secrets | dans des fichiers `.env` | SOPS + age, chiffrés dans Git |

Ce qui reste à faire, pour être honnête :

- **Les sauvegardes hors du serveur.** Les snapshots ZFS protègent des erreurs, pas d'une panne ni d'un incendie. C'est le prochain chantier, avec restic.
- **Quelques réglages applicatifs** (Jellyfin, Seerr) sont encore faits à la main. Ils survivent dans les volumes de données, mais une reconstruction depuis zéro devrait les rejouer automatiquement.

### Ce que je retiens

1. **Inventorier avant de décider.** La décision la plus structurante (recréer le stockage) est venue d'un chiffre que je croyais connaître.
2. **Vérifier les données, pas la configuration.** Une sauvegarde n'existe que si on a relu ce qu'elle contient.
3. **Les outils déclaratifs ont des angles morts.** cloud-init qui ne fusionne pas, un provider qui ne repousse pas un fichier modifié… Le test `tofu plan` = « No changes » est le seul juge.
4. **Mettre des verrous là où sont les données.** `prevent_destroy` coûte une ligne et m'a évité de perdre trois volumes.
5. **Tenir un journal pendant le chantier.** C'est grâce à lui que cet article existe, et c'est lui que je relirai le jour où il faudra tout reconstruire.
