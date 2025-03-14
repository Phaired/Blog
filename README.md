# Personal Blog & Portfolio

[![Build and Deploy](https://github.com/Phaired/Blog/actions/workflows/build-and-deploy.yml/badge.svg?branch=main)](https://github.com/Phaired/Blog/actions/workflows/build-and-deploy.yml)

A personal blog and portfolio website built with Astro.js, showcasing technical articles and projects. The site is automatically deployed to a VPS using GitHub Actions.

Visit the live site: [remybarranco.fr](https://remybarranco.fr)

## 🚀 Features

- Fast, static site generation with Astro.js
- Blog posts with MDX support
- Project portfolio showcase
- Mathematical content support with KaTeX
- Responsive design
- Automatic asset optimization
- Internationalization support
- RSS feed generation
- Sitemap generation
- Automatic deployment via GitHub Actions

## 🛠️ Technologies Used

- [Astro.js](https://astro.build) - Static site generator
- [MDX](https://mdxjs.com/) - Enhanced Markdown for components
- [KaTeX](https://katex.org/) - Math typesetting
- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- GitHub Actions - CI/CD pipeline
- SCP - Secure file transfer to VPS

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Phaired/Blog.git
   cd Blog
   ```

2. Install dependencies:
   ```bash
   # Using npm
   npm install

   # Or using Bun
   bun install
   ```

## 🖥️ Development

Start the development server:

```bash
# Using npm
npm run dev

# Or using Bun
bun run dev
```

The site will be available at `http://localhost:4321`.

## 🏗️ Building

Build the site for production:

```bash
# Using npm
npm run build

# Or using Bun
bun run build
```

Preview the production build:

```bash
# Using npm
npm run preview

# Or using Bun
bun run preview
```

## 🚢 Deployment

The site is automatically deployed to a VPS when changes are pushed to the main branch. The deployment process is handled by GitHub Actions and uses SCP to transfer the built files to the server.

To set up your own deployment:

1. Configure the following secrets in your GitHub repository:
   - `HOST`: Your server's hostname or IP address
   - `USERNAME`: SSH username
   - `SSHKEY`: SSH private key
   - `PORT`: SSH port (usually 22)
   - `SERVER_FOLDER`: Target directory on the server

2. Push to the main branch to trigger the deployment.

## 📝 Adding Content

### Blog Posts

Add new blog posts as Markdown or MDX files in the `src/content/blog/` directory.

Each post should include frontmatter with metadata:

```markdown
---
title: "Your Post Title"
description: "A brief description of your post"
pubDate: "Month Day Year"
updatedDate: "Month Day Year" # Optional
heroImage: "/path/to/image.webp" # Optional
---

Your content here...
```

### Projects

Add new projects as Markdown or MDX files in the `src/content/projects/` directory.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.