---
title: "Stéganographie OCaml"
description: "Programme OCaml pour la stéganographie"
pubDate: "April 30 2024"
updatedDate: "Sept 23 2024"
heroImage: "/projects/steganography/steganography-hero.png"
heroGif: ""
lang: "fr"
isVisible: true
---

## 1. Introduction

Ce projet réalisé dans le cadre du module Algorithmique et Complexité consiste à implémenter un algorithme de stéganographie en OCaml avec chiffrement RSA.

La stéganographie sert à dissimuler un message dans un média anodin. Ici, le texte est caché dans une image `.ppm`. Le message est chiffré avec RSA afin de garantir sa confidentialité : seule la personne possédant la clé privée pourra le déchiffrer.

## 2. Analyse initiale

La technique employée consiste à insérer le message dans les bits de poids faible de chaque canal de couleur de l'image, soit trois bits par pixel. Un en-tête de 30 bits indique la longueur du message pour pouvoir l'extraire sans parcourir toute l'image.

![Figure 1.1](/projects/steganography/leastbit.png)

_Figure 1.1 : modification du bit de poids faible de chaque pixel._

Le message est converti en binaire puis inséré dans l'image chargée en mémoire. L'image modifiée est enregistrée sous `output.ppm`.

## 3. Encodage dans l'image

Une image PPM contient un en-tête suivi des valeurs RGB de chaque pixel. La longueur du message est encodée sur 30 bits puis suivie du message chiffré.

## 4. Conclusion

Ce projet montre comment la stéganographie et le chiffrement peuvent être combinés pour transmettre un message de manière discrète et sécurisée.
