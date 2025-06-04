---
title: "Simulation N-corps MPI"
description: "Programme C++ utilisant MPI pour la simulation N-corps"
pubDate: "Jan 11 2024"
updatedDate: "April 2 2024"
heroImage: "/projects/nbody/nbody-hero.png"
heroGif: "/projects/nbody/nbody-gif.gif"
lang: "fr"
altSlug: "nbodysimulation"
isVisible: true
---

## Simulation N-corps

### Introduction

Dans ce projet, nous étudions le problème des N-corps, sujet classique de la physique qui consiste à calculer les mouvements d'objets soumis à la gravitation. L'objectif est de créer une simulation 2D distribuée afin d'optimiser les calculs. Des références à une troisième dimension apparaissent parfois car nous souhaitions étendre le sujet initial, sans toutefois avoir le temps de le réaliser.

### Analyse du sujet

Ce projet vise à développer une simulation N-corps en programmation parallèle avec MPI (Message Passing Interface) en C++. Cette approche est choisie pour traiter efficacement les calculs intensifs requis par le problème N-corps (complexité O(n²)), où la position et la vitesse de chaque corps sont calculées en fonction de la gravitation exercée par tous les autres.

### Structures de données et algorithmes

Le code utilise une structure `Body` pour représenter chaque corps avec sa masse, sa position et sa vitesse. La fonction principale `calculateForces` calcule les forces gravitationnelles exercées entre un sous-ensemble de corps et l'ensemble général. Chaque nœud ne traite que ses propres corps et MPI se charge de synchroniser positions et vitesses après chaque étape.

### Paradigme choisi

Le paradigme de programmation parallèle MPI est retenu. Il est justifié par la nature fortement parallèle du problème N-corps, où les calculs pour chaque corps peuvent être effectués indépendamment. L'utilisation d'un paradigme type Map‑Reduce n'aurait pas de sens ici, le volume de données échangé étant faible au regard de la charge de calcul.

Le projet nécessitant une grande puissance de calcul, le choix d'un langage bas niveau comme le C++ (plutôt que Java) est approprié. Chaque nœud ne travaillant que sur sa portion de données, aucun mécanisme particulier de concurrence n'est requis.

MPI permet ainsi de répartir les calculs sur plusieurs nœuds pour traiter efficacement des simulations de grande ampleur.

### Décomposition en sous-problèmes

Le problème est découpé comme suit :

- Initialisation des corps
- Calcul des forces et accélérations sur chaque corps
- Mise à jour des positions

### Code d'initialisation des corps

La fonction `initBodies` initialise un vecteur de structures `Body`. Chaque `Body` représente un objet de masse donnée avec position et vitesse. Nous simulons un corps massif au centre entouré d'un anneau de corps plus légers placés aléatoirement. Pour l'expérimentation, on peut modifier les paramètres d'accélération des corps (vx, vy, vz).

```cpp
void initBodies(std::vector<Body>& bodies) {
    if (!bodies.empty()) {
        bodies[0].mass = 100000.0;
        bodies[0].x = 0;
        bodies[0].y = 0;
        bodies[0].z = 0;
        bodies[0].vx = 0;
        bodies[0].vy = 0;
        bodies[0].vz = 0;
    }

    int externalDiameter = 80000;
    int internalDiameter = 40000;

    for (size_t i = 1; i < bodies.size(); ++i) {
        double r = (internalDiameter + (rand()
        % (externalDiameter - internalDiameter)));

        double theta = (rand() % 360) * (M_PI / 180);
        double x = r * cos(theta);
        double y = r * sin(theta);

        bodies[i].mass = 1.0;
        bodies[i].x = x;
        bodies[i].y = y;
        bodies[i].z = 0;
        bodies[i].vx = 10;
        bodies[i].vy = -10;
        bodies[i].vz = 0;
    }
}
```

_Fonction d'initialisation du système stellaire simulé_

Structure `Body` :

```cpp
struct Body {
    double mass;
    double x, y, z; // Coordonnées
    double vx, vy, vz; // Vitesses

    Body() : mass(0), x(0), y(0), z(0), vx(0), vy(0), vz(0) {}
    Body(double m, double _x, double _y, double _z,
    double _vx, double _vy, double _vz)
        : mass(m), x(_x), y(_y), z(_z), vx(_vx), vy(_vy), vz(_vz) {}

};
```

#### Méthode `calculateForces`

La fonction `calculateForces` évalue les forces agissant sur un sous‑ensemble d'objets (selon le rang) par rapport à l'ensemble complet stocké dans le vecteur de `Body`.

Cette méthode applique la formule de Newton :

$$
F = G * (m1 * m2) / (d^2)
$$

Elle reçoit en paramètre le vecteur de `Body`, le rang du nœud courant (`rank`) ainsi que le nombre total de nœuds (`numProcesses`). On commence par déterminer la portion de corps à traiter pour chaque nœud en divisant le nombre total de corps par le nombre de processus. Cela équilibre la charge et optimise l'utilisation des ressources.

Pour chaque corps traité par un nœud, on calcule la force résultant de l'interaction avec tous les autres corps. Pour éviter de calculer la force d'un corps sur lui‑même, on vérifie `if (i != j)`. La force est évaluée à l'aide de la gravitation universelle, où `dx` et `dy` représentent la différence de position. On ajoute une petite valeur `epsilon` au dénominateur pour éviter une division par zéro lorsque deux corps sont très proches.

Après le calcul de la force, la vitesse de chaque corps est mise à jour. On tient compte de la masse via un multiplicateur pour ajuster l'effet de la force sur la vitesse. Cette mise à jour est essentielle pour simuler correctement le mouvement des corps.

On ajoute la valeur `epsilon` pour limiter les valeurs extrêmes lorsque deux particules sont presque en collision, ce qui éviterait des forces tendant vers l'infini.

```cpp
void calculateForces(
    std::vector<Body>& bodies,
    int rank,
    int numProcesses
) {
    const long massMultiplier = 1e12;
    int numBodies = bodies.size();
    int bodiesPerProcess = numBodies / numProcesses;
    int startIdx = rank * bodiesPerProcess;
    int endIdx = startIdx + bodiesPerProcess;

    for (int i = startIdx; i < endIdx; ++i) {
        for (int j = 0; j < numBodies; ++j) {
            if (i != j) {
                double dx = bodies[j].x - bodies[i].x;
                double dy = bodies[j].y - bodies[i].y;
                double dist = sqrt(dx * dx + dy * dy);
                double epsilon = 1e-10;
                double force = (
                    G * bodies[i].mass * massMultiplier
                    * bodies[j].mass * massMultiplier
                ) / (dist * dist * dist + epsilon);
                double fx = force * dx;
                double fy = force * dy;
                bodies[i].vx += fx / (bodies[i].mass * massMultiplier);
                bodies[i].vy += fy / (bodies[i].mass * massMultiplier);
            }
        }
    }
}
```

Fonction de calcul des forces

#### Méthode `updatePositions`

Pour chaque nœud, `updatePositions` met à jour la position en fonction de la vitesse courante et de l'intervalle de temps `dt` pour les corps de son sous‑ensemble. Les nouvelles positions sont obtenues en ajoutant le produit de la vitesse (x, y) par `dt` à la position actuelle.

```cpp
void updatePositions(
    std::vector<Body>& bodies,
    double dt,
    int rank,
    int numProcesses
) {
    int numBodies = bodies.size();
    int bodiesPerProcess = numBodies / numProcesses;
    int startIdx = rank * bodiesPerProcess;
    int endIdx = startIdx + bodiesPerProcess;

    for (int i = startIdx; i < endIdx; ++i) {
        bodies[i].x += bodies[i].vx * dt;
        bodies[i].y += bodies[i].vy * dt;
        //bodies[i].z += bodies[i].vz * dt;
    }
}
```

Mise à jour de la position des corps

#### Initialisation MPI

La simulation démarre par l'initialisation de l'environnement MPI, indispensable au fonctionnement parallèle :

- `MPI_Init(&argc, &argv);` initialise MPI pour chaque processus.
- `MPI_Comm_rank` et `MPI_Comm_size` récupèrent le rang et le nombre total de processus.
- `MPI_Get_processor_name` obtient le nom d'hôte de chaque processus.
- `MPI_Comm_set_errhandler` définit le gestionnaire d'erreurs du communicateur.

#### Paramétrage de la simulation

Les paramètres comme l'intervalle de temps (`dt`), le nombre total de corps (`total_bodies`) et le nombre d'étapes (`num_steps`) sont définis et peuvent être ajustés via la ligne de commande.

#### Initialisation et diffusion des corps

Les corps sont initialisés dans un vecteur `bodies` puis les données sont diffusées à tous les nœuds via `MPI_Bcast`.

#### Boucle de simulation

La simulation est orchestrée par une boucle `for` dont chaque itération représente une étape. Les fonctions MPI assurent la synchronisation et la communication entre nœuds :

- `MPI_Bcast` : diffuse les données des corps depuis le nœud principal (rang 0) vers tous les autres pour débuter l'étape avec des informations à jour.
- `MPI_Allgather` : après mise à jour des positions et vitesses par chaque nœud, collecte et redistribue les données afin que tous disposent de l'ensemble complet pour l'étape suivante.
- Gestion des erreurs : `MPI_Comm_set_errhandler` permet de définir des gestionnaires personnalisés pour mieux traiter les erreurs de communication.

#### Gestion des sorties

Le processus de rang 0 gère un tampon de sortie et un thread d'écriture pour enregistrer les résultats dans un fichier, minimisant ainsi les opérations de disque.

#### Synchronisation et communication

`MPI_Allgather` est utilisé pour synchroniser les données mises à jour sur tous les nœuds afin que chacun dispose des informations nécessaires à l'étape suivante.

#### Finalisation

À la fin de la simulation, toutes les ressources MPI sont libérées et l'environnement est clôturé via `MPI_Finalize`.

Cette décomposition permet de traiter le problème étape par étape en veillant à optimiser chaque partie pour un environnement parallèle.

#### Conclusion de l'analyse

Le choix du C++ avec MPI répond au besoin de gérer efficacement de lourds calculs. La structure du code, les choix algorithmiques et le paradigme parallèle visent tous à obtenir une simulation précise et performante du problème N-corps.

Une [vidéo présentant le résultat du programme](https://youtube.com/shorts/L-RjCFGIovc) est disponible.

#### Script d'hôtes

Le script ci-dessous facilite l'identification et la gestion des hôtes disponibles dans un réseau. Il vise à déterminer le nombre de processeurs sur chaque machine via un script Python utilisant notamment `ssh` et `nproc`.

La fonction principale `handle_host` se connecte à chaque hôte pour récupérer le nombre de threads disponibles. Les résultats sont cumulés puis enregistrés, permettant de connaître la capacité de calcul totale du réseau.

Un mécanisme de threads permet de traiter plusieurs hôtes simultanément. Enfin, le script affiche le nombre moyen de cœurs par machine et le total de processeurs disponibles pour une vue d'ensemble.

Dans sa version initiale, le script ne gérait pas le multithreading et était donc moins efficace. La version actuelle parallélise la collecte d'informations, améliorant nettement les performances.

#### Réduction du temps de calcul par symétrie

Une piste d'amélioration aurait été d'exploiter la symétrie de la force gravitationnelle (la force de A sur B est l'opposée de celle de B sur A) afin de réduire les calculs via une implémentation en anneau. Faute de temps, cette optimisation n'a pas été réalisée.

#### Tolérance aux pannes

Grâce à l'implémentation C++ d'OpenMPI, il était possible de définir une gestion des erreurs avec `MPI_Comm_set_errhandler` pour lever une `MPI::Exception` en cas de défaillance. Cela aurait permis d'identifier un nœud inactif, de l'exclure puis de relancer l'étape précédente. Cette solution n'a pas été mise en œuvre par manque de temps.

