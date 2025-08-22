---
trigger: manual
---

if the directoy is fully and i got this error ! like this The directory * contains files that could conflict:

so fix it by :
 npx create-next-app@latest tmp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cp -r tmp/* tmp/.* . 2>/dev/null || true
rm -rf tmp
