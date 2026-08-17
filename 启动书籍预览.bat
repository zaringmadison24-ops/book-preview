@echo off
rem 启动书籍预览 4.0 —— 双击后自动开浏览器到 v4 书架
rem 在静态站点根目录起本地服务器，/v4/ 即预览 4.0
cd /d "%~dp0"
start "" "http://127.0.0.1:8787/v4/"
python -m http.server 8787
