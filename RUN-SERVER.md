# How to Start the Server

Since Node.js is installed via **nvm**, your terminal needs to load it first. Use one of these methods:

---

## Option 1: Run the start script (easiest)

In Terminal, run:

```bash
cd /Users/nrk/college
./start-server.sh
```

Or double-click `start-server.sh` in Finder (you may need to right-click → Open the first time).

---

## Option 2: Add nvm to your shell (works every time)

Add these lines to `~/.zshrc` (create the file if it doesn't exist):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Then run:

```bash
source ~/.zshrc
cd /Users/nrk/college
npm start
```

After this, new terminals will have `npm` available and you can just run `npm start`.

---

## Option 3: One-line command

```bash
source ~/.nvm/nvm.sh && cd /Users/nrk/college && npm start
```

---

Server runs at **http://localhost:3000** — open `user.html` or `admin.html` in your browser.
