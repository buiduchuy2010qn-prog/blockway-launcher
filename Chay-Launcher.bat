@echo off
title BlockWay Launcher v41.2.0 PRO - Every World, One Place
echo Dang khoi dong BlockWay Launcher v41.2.0 PRO...
if not exist "node_modules" (
  echo Dang cai dat thu vien lan dau...
  call npm install
)
call npm start
