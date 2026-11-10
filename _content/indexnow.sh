#!/bin/sh
# Tells Bing (and so ChatGPT search), Yandex and other IndexNow engines about every page in
# sitemap.xml. Run after each publish, once GitHub Pages has deployed the new page.
cd "$(dirname "$0")/.."
KEY=6f057ff5743f8d5e2fdb641b0a1c569c
URLS=$(grep -o '<loc>[^<]*' sitemap.xml | sed 's/<loc>//' | sed 's/.*/"&"/' | paste -sd, -)
curl -s -o /dev/null -w "IndexNow: %{http_code}\n" -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"rohithhn.github.io\",\"key\":\"$KEY\",\"keyLocation\":\"https://rohithhn.github.io/moneyos-site/$KEY.txt\",\"urlList\":[$URLS]}"
