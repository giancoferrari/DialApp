# How to Deploy Changes

Every time you update the code and want it to go live, run these 3 commands:

```
git add .
```
```
git commit -m "describe what you changed"
```
```
git push
```

Vercel deploys automatically within ~1 minute.

> Never push the `.env` file — it's protected automatically.
