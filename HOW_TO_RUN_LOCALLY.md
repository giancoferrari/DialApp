# How to Run Locally

## Prerequisites
- [Node.js](https://nodejs.org) installed (v18 or later)

## Steps

1. Open a terminal and navigate to this folder:
   ```
   cd dial-app
   ```
   > If your terminal is already inside `dial-app`, skip this step.

2. Install dependencies (only needed once):
   ```
   npm install
   ```

3. Start the dev server:
   ```
   npm run dev
   ```

4. Open your browser and go to:
   ```
   http://localhost:5173
   ```

## Stop the server

Press `Ctrl + C` in the terminal.

---

## How to push changes to GitHub (and go live)

Run these three commands every time you want your changes to go live on Vercel:

```
git add .
```
```
git commit -m "describe what you changed"
```
```
git push
```

Vercel will automatically deploy within ~1 minute.

> Your `.env` file is never pushed — it's protected by `.gitignore`. Keep it only on your computer.
