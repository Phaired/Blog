---
title: "Blog avec hébergement VPS : guide pratique"
description: "Apprenez à créer votre propre blog : un guide étape par étape pour héberger le code source sur GitHub et votre site sur le VPS de votre choix"
pubDate: "Sept 25 2023"
updatedDate: "April 2 2024"
heroImage: "/blog/blog-with-vps/blog-with-vps-hero.webp"
lang: "fr"
isVisible: true
---

### Pour commencer

Tout d'abord, vous aurez besoin d'un dépôt GitHub pour héberger votre code source. Installez ensuite [astrojs](https://astro.build) ou tout autre framework de site statique de votre choix. J'utilise personnellement GitHub Actions pour construire et déployer automatiquement à chaque push sur la branche principale. Pour mettre en place ces actions, créez un dossier `.github/workflows` à la racine de votre projet puis créez le fichier `build-and-deploy.yml` et ajoutez le code suivant :

```yml
name: Build and Deploy

on:
    push:
        branches:
            - main

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - name: Checkout code
              uses: actions/checkout@v3

            - name: Install Node.js
              uses: actions/setup-node@v3
              with:
                  node-version: 20

            - name: Install dependencies
              run: npm ci

            - name: Build
              run: npm run build

            - name: Add robots.txt
              run: echo 'User-agent:*' > ./dist/robots.txt && echo 'Disallow:' > ./dist/robots.txt

            - name: Copy files via SCP
              uses: appleboy/scp-action@v0.1.4
              with:
                  host: ${{ secrets.HOST }}
                  username: ${{ secrets.USERNAME }}
                  key: ${{ secrets.SSHKEY }}
                  port: ${{ secrets.PORT }}
                  source: ./dist/*
                  target: ${{ secrets.SERVER_FOLDER }}
                  strip_components: 1
                  rm: true
```

La syntaxe de GitHub Actions est assez simple. Cette action se déclenche lors d'un push sur la branche **main**. Le job `deploy` s'exécute sur Ubuntu. Chaque étape comporte un **name**, **uses** ou **run**, et parfois **with** :

- **name** : l'identifiant de l'étape dans les logs
- **uses** : appelle une action existante
- **run** : exécute une commande en ligne de commande
- **with** : définit les paramètres de l'étape

Par exemple, l'étape "Checkout code" récupère le dépôt sur le runner. L'étape "Install Node.js" installe Node.js en spécifiant la version 20.

L'étape "Copy files via SCP" est particulièrement intéressante. SCP (Secure Copy Protocol) permet de transférer des fichiers de manière sécurisée entre un hôte local et un hôte distant. Ici, nous utilisons les secrets du dépôt pour transférer les fichiers générés vers le serveur. L'action `appleboy/scp-action@v0.1.4` simplifie ce processus.
