# CAGED diagram

A table to show the caged shapes in scale shapes

## Manual Deploy
```
start on main
pnpm run build
mv dist ../
git ch gh-pages
rm .
mv ../dist/* .
rmdir ../dist
```