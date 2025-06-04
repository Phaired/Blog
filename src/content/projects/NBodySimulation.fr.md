---
title: "Simulation N-corps MPI"
description: "Programme C++ utilisant MPI pour simuler un système de corps en interaction"
pubDate: "Jan 11 2024"
updatedDate: "April 2 2024"
heroImage: "/projects/nbody/nbody-hero.png"
heroGif: "/projects/nbody/nbody-gif.gif"
lang: "fr"
isVisible: true
---

## Simulation N-corps

### Introduction

Ce projet traite du problème des N-corps, classique en physique, qui consiste à calculer les mouvements d'objets soumis à la gravitation. L'objectif est de créer une simulation 2D distribuée afin d'optimiser les calculs.

### Analyse du sujet

Nous développons une simulation parallèle en C++ à l'aide de MPI (Message Passing Interface). Cette approche permet d'effectuer efficacement les calculs intensifs nécessaires, la position et la vitesse de chaque corps dépendant de l'attraction exercée par les autres.

### Structures de données et algorithmes

Chaque corps est représenté par une structure `Body` (masse, position, vitesse). La fonction principale `calculateForces` calcule les forces gravitationnelles sur un sous-ensemble de corps puis synchronise les résultats via MPI.

### Paradigme choisi

Le parallélisme MPI est adapté à ce problème hautement parallèle. Les calculs pour chaque corps étant indépendants, on répartit le travail sur plusieurs nœuds.

### Décomposition en sous-problèmes

- Initialisation des corps
- Calcul des forces et accélérations
- Mise à jour des positions

### Conclusion

La parallélisation avec MPI permet de traiter efficacement des simulations de grande taille. Le choix du C++ offre de bonnes performances et un contrôle précis des ressources.
