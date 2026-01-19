@echo off
setlocal EnableExtensions

cd /d "%~dp0"

REM 1) 优先项目目录的 .claude；没有就用用户目录
if exist "%CD%\.claude\" (
  set "CLAUDE_CONFIG_DIR=%CD%\.claude"
) else (
  set "CLAUDE_CONFIG_DIR=%USERPROFILE%\.claude"
)

REM 2) 判断是否存在可续的会话文件（不限定扩展名，避免版本差异）
if exist "%CLAUDE_CONFIG_DIR%\conversations\*" (
  echo [Claude-CLI] Found conversations in "%CLAUDE_CONFIG_DIR%". Continuing...
  claude --dangerously-skip-permissions -c
) else (
  echo [Claude-CLI] No conversations in "%CLAUDE_CONFIG_DIR%". Starting new session...
  claude --dangerously-skip-permissions
)

endlocal
