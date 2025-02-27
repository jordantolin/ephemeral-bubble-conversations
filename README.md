
# Bubble Trouble

## Project info

Bubble Trouble is an ephemeral chat application where conversations expire after a certain period of time. Join conversations that matter, share your thoughts, and connect with others through temporary bubbles.

## How can I edit this code?

There are several ways of editing this application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd bubble-trouble

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (for authentication, database, and storage)
- Three.js (for bubble visualization)

## How to deploy this project

You can deploy this project to any hosting service that supports static sites, such as:

- Vercel
- Netlify
- GitHub Pages
- Firebase Hosting

Before deploying, make sure to build the project:

```sh
npm run build
```

This will create a `dist` folder with the compiled application.

## Features

- Real-time chat in ephemeral bubbles
- 3D bubble visualization
- User profiles with avatars
- Media sharing (images, videos, audio)
- Topic-based conversations
- Mobile-responsive design
